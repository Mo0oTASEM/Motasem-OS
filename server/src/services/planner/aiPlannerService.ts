import { aiGateway } from '../ai/aiGateway.js';
import type { PlannerRepositories } from './repository.js';
import type { QuarterWithRelations, QuarterlyGoalWithKeyResults, MonthlyPlanWithRelations, CapacityResult } from './types.js';
import { createCapacityService } from './services.js';

// Alias for external callers
export type MonthlyPlanWithOutcomes = MonthlyPlanWithRelations;

// ── Types ──────────────────────────────────────────────────────────────────

export type AiSuggestionType =
  | 'schedule_suggestion'
  | 'priority_reorder'
  | 'risk_alert'
  | 'capacity_warning'
  | 'goal_insight'
  | 'momentum_tip';

export type AiSuggestionRisk = 'low' | 'medium' | 'high';

export interface AiPlannerSuggestion {
  id: string;
  type: AiSuggestionType;
  title: string;
  explanation: string;
  proposedChange?: AiProposedChange;
  risk: AiSuggestionRisk;
  requiresApproval: boolean;
  affectedEntityType?: 'goal' | 'key_result' | 'monthly_outcome' | 'quarter' | 'monthly_plan';
  affectedEntityId?: string;
  affectedEntityTitle?: string;
  confidence: number;
  generatedAt: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

export interface AiProposedChange {
  operation: 'update_status' | 'update_priority' | 'update_progress' | 'update_dates' | 'reorder' | 'flag_risk';
  entityType: string;
  entityId: string;
  currentValue?: unknown;
  proposedValue?: unknown;
  field?: string;
}

export interface AiRiskAlert {
  goalId: string;
  goalTitle: string;
  riskLevel: 'medium' | 'high';
  reason: string;
  recommendation: string;
}

export interface AiCapacityAnalysis {
  totalPlannedHours: number;
  availableHours: number;
  utilizationPct: number;
  overloadedMonths: string[];
  underloadedMonths: string[];
  recommendation: string;
}

// ── Context builder ────────────────────────────────────────────────────────

const buildQuarterContext = (quarter: QuarterWithRelations): string => {
  const goals = quarter.goals || [];
  const goalSummaries = goals.map(g => {
    const krs = (g.keyResults || []).map(kr => {
      const start = kr.startValue ?? 0;
      const target = kr.targetValue;
      const current = kr.currentValue ?? 0;
      const krProgress = (target && target !== start)
        ? Math.round(Math.max(0, Math.min(100, ((current - start) / (target - start)) * 100)))
        : 0;
      return `    - KR: "${kr.title}" | type=${kr.progressType} | current=${current}/${target ?? '?'} | progress=${krProgress}% | status=${kr.status}`;
    }).join('\n');
    return [
      `  Goal: "${g.title}" | priority=${g.priority} | status=${g.status} | progress=${g.progressPercentage}% | confidence=${g.confidenceScore ?? 'N/A'}%`,
      krs
    ].join('\n');
  }).join('\n');

  return [
    `Quarter: Q${quarter.quarterNumber} ${quarter.year} | status=${quarter.status} | theme="${quarter.theme || 'none'}"`,
    `Period: ${quarter.startDate} → ${quarter.endDate}`,
    `Goals (${goals.length}/5):`,
    goalSummaries || '  (no goals yet)'
  ].join('\n');
};

const buildMonthContext = (plan: MonthlyPlanWithOutcomes): string => {
  const outcomes = (plan.outcomes || []).map((o: MonthlyPlanWithRelations['outcomes'][number]) =>
    `  - "${o.title}" | priority=${o.priority} | status=${o.status} | effort=${o.plannedEffortHours}h planned / ${o.actualEffortHours}h actual | progress=${o.progressPercentage}%`
  ).join('\n');

  return [
    `Monthly Plan: ${plan.monthNumber}/${plan.year} | status=${plan.status} | theme="${plan.theme || 'none'}"`,
    `Capacity: ${plan.plannedCapacityHours}h planned / ${plan.actualCapacityHours}h actual`,
    `Outcomes (${(plan.outcomes || []).length}):`,
    outcomes || '  (no outcomes yet)'
  ].join('\n');
};

// ── ID generator ───────────────────────────────────────────────────────────

const suggestionId = () =>
  `ai-suggest-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

// ── Scheduling Suggestions ─────────────────────────────────────────────────

export const generateSchedulingSuggestions = async (
  quarter: QuarterWithRelations,
  monthlyPlan: MonthlyPlanWithOutcomes | null,
  userId: string
): Promise<AiPlannerSuggestion[]> => {
  const quarterCtx = buildQuarterContext(quarter);
  const monthCtx = monthlyPlan ? buildMonthContext(monthlyPlan) : '(no monthly plan linked)';

  const prompt = [
    'You are an expert personal planning assistant analyzing OKR data for a user.',
    'Based on the quarter and monthly plan data below, suggest 2-4 specific scheduling improvements.',
    'Focus on: task timing, deadline realism, goal sequencing, and effort distribution.',
    'Output ONLY a valid JSON array of suggestion objects with these fields:',
    '  { "type": "schedule_suggestion", "title": string, "explanation": string, "risk": "low"|"medium"|"high", "confidence": 0..1 }',
    '',
    '=== QUARTER CONTEXT ===',
    quarterCtx,
    '',
    '=== MONTHLY CONTEXT ===',
    monthCtx
  ].join('\n');

  const result = await aiGateway.generateText(prompt, {
    requireJson: true
  }, userId);

  const now = new Date().toISOString();
  try {
    const parsed = JSON.parse(result.text) as Array<{
      type?: string; title: string; explanation: string;
      risk?: AiSuggestionRisk; confidence?: number;
    }>;
    return parsed.slice(0, 4).map(item => ({
      id: suggestionId(),
      type: 'schedule_suggestion' as AiSuggestionType,
      title: item.title,
      explanation: item.explanation,
      risk: item.risk ?? 'low',
      requiresApproval: false,
      confidence: item.confidence ?? 0.75,
      generatedAt: now,
      status: 'pending'
    }));
  } catch {
    return [{
      id: suggestionId(),
      type: 'schedule_suggestion',
      title: 'Review your goal timeline',
      explanation: result.ok
        ? result.text.slice(0, 400)
        : 'Connect your Gemini API key to unlock AI scheduling insights.',
      risk: 'low',
      requiresApproval: false,
      confidence: 0.5,
      generatedAt: now,
      status: 'pending'
    }];
  }
};

// ── Prioritization Engine ──────────────────────────────────────────────────

export const generatePrioritizationSuggestions = async (
  quarter: QuarterWithRelations,
  userId: string
): Promise<AiPlannerSuggestion[]> => {
  const goals = quarter.goals || [];
  if (goals.length < 2) return [];

  const prompt = [
    'You are a strategic planning advisor reviewing OKR goals.',
    'Analyze the goals below and identify any misaligned priorities.',
    'Output ONLY a valid JSON array (max 3 items) where each item describes a priority reorder suggestion:',
    '  { "goalId": string, "goalTitle": string, "title": string, "explanation": string, "proposedPriority": "critical"|"high"|"medium"|"low", "risk": "low"|"medium"|"high", "confidence": 0..1 }',
    '',
    '=== GOALS ===',
    goals.map(g => `ID: ${g.id} | "${g.title}" | current priority=${g.priority} | progress=${g.progressPercentage}% | confidence=${g.confidenceScore ?? 'N/A'}%`).join('\n')
  ].join('\n');

  const result = await aiGateway.generateText(prompt, {
    requireJson: true
  }, userId);
  const now = new Date().toISOString();

  try {
    const parsed = JSON.parse(result.text) as Array<{
      goalId: string; goalTitle: string; title: string; explanation: string;
      proposedPriority?: string; risk?: AiSuggestionRisk; confidence?: number;
    }>;
    return parsed.slice(0, 3).map(item => ({
      id: suggestionId(),
      type: 'priority_reorder' as AiSuggestionType,
      title: item.title,
      explanation: item.explanation,
      proposedChange: {
        operation: 'update_priority' as const,
        entityType: 'quarterly_goal',
        entityId: item.goalId,
        currentValue: goals.find(g => g.id === item.goalId)?.priority,
        proposedValue: item.proposedPriority,
        field: 'priority'
      },
      risk: item.risk ?? 'medium',
      requiresApproval: true,
      affectedEntityType: 'goal' as const,
      affectedEntityId: item.goalId,
      affectedEntityTitle: item.goalTitle,
      confidence: item.confidence ?? 0.7,
      generatedAt: now,
      status: 'pending'
    }));
  } catch {
    return [];
  }
};

// ── Risk Detection ─────────────────────────────────────────────────────────

export const detectPlannerRisks = async (
  quarter: QuarterWithRelations,
  userId: string
): Promise<AiPlannerSuggestion[]> => {
  const goals = quarter.goals || [];

  // Rule-based fast path (always runs, no API needed)
  const ruleBasedRisks: AiPlannerSuggestion[] = [];
  const now = new Date().toISOString();
  const today = new Date();
  const endDate = new Date(quarter.endDate);
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / 86_400_000));
  const totalDays = Math.ceil((endDate.getTime() - new Date(quarter.startDate).getTime()) / 86_400_000);
  const pctElapsed = totalDays > 0 ? (1 - daysLeft / totalDays) * 100 : 0;

  for (const goal of goals) {
    // Behind pace: time passed significantly outpaces progress
    if (pctElapsed > 30 && goal.progressPercentage < pctElapsed * 0.5 && goal.status !== 'completed' && goal.status !== 'cancelled') {
      ruleBasedRisks.push({
        id: suggestionId(),
        type: 'risk_alert',
        title: `"${goal.title}" is falling behind`,
        explanation: `${Math.round(pctElapsed)}% of the quarter has passed but this goal is only ${goal.progressPercentage}% complete. At this pace you'll end the quarter significantly below target.`,
        risk: 'high',
        requiresApproval: false,
        affectedEntityType: 'goal',
        affectedEntityId: goal.id,
        affectedEntityTitle: goal.title,
        confidence: 0.9,
        generatedAt: now,
        status: 'pending'
      });
    }

    // Low confidence
    if (typeof goal.confidenceScore === 'number' && goal.confidenceScore < 40 && goal.status !== 'completed' && goal.status !== 'cancelled') {
      ruleBasedRisks.push({
        id: suggestionId(),
        type: 'risk_alert',
        title: `Low confidence on "${goal.title}"`,
        explanation: `Confidence is at ${goal.confidenceScore}%. Consider breaking this goal into smaller milestones or adjusting the target.`,
        risk: 'medium',
        requiresApproval: false,
        affectedEntityType: 'goal',
        affectedEntityId: goal.id,
        affectedEntityTitle: goal.title,
        confidence: 0.85,
        generatedAt: now,
        status: 'pending'
      });
    }

    // No key results
    const krs = goal.keyResults || [];
    if (krs.length === 0 && goal.status === 'active') {
      ruleBasedRisks.push({
        id: suggestionId(),
        type: 'risk_alert',
        title: `"${goal.title}" has no measurable key results`,
        explanation: `Without key results, progress cannot be tracked automatically. Add at least one KR to make this goal measurable.`,
        risk: 'medium',
        requiresApproval: false,
        affectedEntityType: 'goal',
        affectedEntityId: goal.id,
        affectedEntityTitle: goal.title,
        confidence: 1.0,
        generatedAt: now,
        status: 'pending'
      });
    }
  }

  // AI-enhanced risk analysis (optional, gracefully degraded)
  if (goals.length > 0) {
    try {
      const prompt = [
        'You are a risk analyst reviewing OKR goals. Identify 1-2 non-obvious risks not already flagged by rule-based analysis.',
        'Focus on: dependency risks, strategic misalignment, or resource conflicts.',
        'Output ONLY a valid JSON array (max 2 items):',
        '  { "goalId": string, "goalTitle": string, "title": string, "explanation": string, "risk": "medium"|"high", "confidence": 0..1 }',
        '',
        `Quarter: Q${quarter.quarterNumber} ${quarter.year} | ${Math.round(pctElapsed)}% elapsed | ${daysLeft} days remaining`,
        '=== GOALS ===',
        goals.map(g =>
          `ID: ${g.id} | "${g.title}" | priority=${g.priority} | status=${g.status} | progress=${g.progressPercentage}% | KRs=${(g.keyResults || []).length}`
        ).join('\n')
      ].join('\n');

      const result = await aiGateway.generateText(prompt, {
        requireJson: true
      }, userId);

      if (result.ok) {
        const parsed = JSON.parse(result.text) as Array<{
          goalId: string; goalTitle: string; title: string; explanation: string;
          risk?: AiSuggestionRisk; confidence?: number;
        }>;
        const aiRisks = parsed.slice(0, 2).map(item => ({
          id: suggestionId(),
          type: 'risk_alert' as AiSuggestionType,
          title: item.title,
          explanation: item.explanation,
          risk: item.risk ?? 'medium' as AiSuggestionRisk,
          requiresApproval: false,
          affectedEntityType: 'goal' as const,
          affectedEntityId: item.goalId,
          affectedEntityTitle: item.goalTitle,
          confidence: item.confidence ?? 0.7,
          generatedAt: now,
          status: 'pending' as const
        }));
        ruleBasedRisks.push(...aiRisks);
      }
    } catch {
      // AI enrichment is optional — silently skip
    }
  }

  return ruleBasedRisks.slice(0, 8);
};

// ── Capacity Analysis ──────────────────────────────────────────────────────

export const analyzeCapacity = async (
  repos: PlannerRepositories,
  workspaceId: string,
  userId: string,
  startDate: string,
  endDate: string
): Promise<AiPlannerSuggestion[]> => {
  const capacityService = createCapacityService(repos);
  const capacity: CapacityResult = await capacityService.getAvailableCapacity(userId, workspaceId, startDate, endDate);

  const now = new Date().toISOString();
  const suggestions: AiPlannerSuggestion[] = [];

  const availableHours = capacity.totalWorkHours - capacity.meetingHours - capacity.fixedCommitmentHours - capacity.bufferHours;
  const utilizationPct = capacity.totalWorkHours > 0
    ? Math.round(((capacity.totalWorkHours - availableHours) / capacity.totalWorkHours) * 100)
    : 0;

  if (utilizationPct > 85) {
    suggestions.push({
      id: suggestionId(),
      type: 'capacity_warning',
      title: 'Quarter is over-committed',
      explanation: `Your scheduled commitments consume ${utilizationPct}% of available work time. Consider reducing planned outcome hours or extending deadlines to avoid burnout.`,
      risk: 'high',
      requiresApproval: false,
      confidence: 0.95,
      generatedAt: now,
      status: 'pending'
    });
  } else if (utilizationPct < 40) {
    suggestions.push({
      id: suggestionId(),
      type: 'capacity_warning',
      title: 'Significant capacity headroom available',
      explanation: `Only ${utilizationPct}% of your work time is committed. Consider adding more outcomes or stretch goals to maximize this quarter.`,
      risk: 'low',
      requiresApproval: false,
      confidence: 0.85,
      generatedAt: now,
      status: 'pending'
    });
  }

  return suggestions;
};

// ── Goal Insights ──────────────────────────────────────────────────────────

export const generateGoalInsights = async (
  goal: QuarterlyGoalWithKeyResults,
  userId: string
): Promise<AiPlannerSuggestion[]> => {
  if (!goal.keyResults?.length) return [];

  const krsCtx = goal.keyResults.map(kr => {
    const start = kr.startValue ?? 0;
    const target = kr.targetValue;
    const current = kr.currentValue ?? 0;
    const krProgress = (target && target !== start)
      ? Math.round(Math.max(0, Math.min(100, ((current - start) / (target - start)) * 100)))
      : 0;
    return `- "${kr.title}" | type=${kr.progressType} | progress=${krProgress}% | status=${kr.status}`;
  }).join('\n');

  const prompt = [
    'You are a productivity coach analyzing OKR key results for a specific goal.',
    'Provide 1-2 concise, actionable insights to improve goal execution.',
    'Output ONLY a valid JSON array:',
    '  { "title": string, "explanation": string, "confidence": 0..1 }',
    '',
    `Goal: "${goal.title}" | priority=${goal.priority} | overall_progress=${goal.progressPercentage}%`,
    '=== KEY RESULTS ===',
    krsCtx
  ].join('\n');

  const result = await aiGateway.generateText(prompt, {
    requireJson: true
  }, userId);
  const now = new Date().toISOString();

  try {
    const parsed = JSON.parse(result.text) as Array<{ title: string; explanation: string; confidence?: number }>;
    return parsed.slice(0, 2).map(item => ({
      id: suggestionId(),
      type: 'goal_insight' as AiSuggestionType,
      title: item.title,
      explanation: item.explanation,
      risk: 'low' as AiSuggestionRisk,
      requiresApproval: false,
      affectedEntityType: 'goal' as const,
      affectedEntityId: goal.id,
      affectedEntityTitle: goal.title,
      confidence: item.confidence ?? 0.75,
      generatedAt: now,
      status: 'pending'
    }));
  } catch {
    return [];
  }
};
