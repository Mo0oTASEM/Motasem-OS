import type { AiRiskLevel } from './aiSchemas.js';

export interface DetectedIntent {
  intent: string;
  confidence: number;
  risk: AiRiskLevel;
  reason: string;
}

const hasAny = (message: string, terms: string[]) => terms.some(term => message.includes(term));

export const detectIntent = (message: string): DetectedIntent => {
  const normalized = message.toLowerCase();

  if (hasAny(normalized, ['send email', 'email this', 'publish', 'delete', 'remove all', 'bulk', 'charge ', 'invoice', 'contact lead'])) {
    return {
      intent: 'high_risk_action_request',
      confidence: 0.86,
      risk: 'high',
      reason: 'The request appears to involve an external send, deletion, financial update, contact action, or bulk operation.'
    };
  }

  if (hasAny(normalized, ['create goal', 'new goal', 'pursue a goal', 'smart goal', 'annual goal', 'quarterly goal'])) {
    return {
      intent: 'create_goal',
      confidence: 0.82,
      risk: 'medium',
      reason: 'The request asks for goal creation or goal planning.'
    };
  }

  if (hasAny(normalized, ['todo', 'task', 'remind me', 'plan my day', 'daily plan', 'schedule'])) {
    return {
      intent: 'planner_task',
      confidence: 0.78,
      risk: 'low',
      reason: 'The request is about tasks, planning, or reminders.'
    };
  }

  if (hasAny(normalized, ['lead', 'crm', 'client', 'follow up', 'proposal', 'outreach'])) {
    return {
      intent: 'crm_assist',
      confidence: 0.78,
      risk: normalized.includes('send') || normalized.includes('contact') ? 'high' : 'medium',
      reason: 'The request references CRM, leads, clients, proposals, or outreach.'
    };
  }

  if (hasAny(normalized, ['project', 'kanban', 'milestone', 'asset', 'deadline'])) {
    return {
      intent: 'project_assist',
      confidence: 0.76,
      risk: 'low',
      reason: 'The request references project work, milestones, assets, or deadlines.'
    };
  }

  if (hasAny(normalized, ['finance', 'budget', 'expense', 'income', 'transaction', 'burn rate', 'cash'])) {
    return {
      intent: 'finance_review',
      confidence: 0.78,
      risk: normalized.includes('add') || normalized.includes('edit') || normalized.includes('delete') ? 'high' : 'medium',
      reason: 'The request references finances, budgets, or transactions.'
    };
  }

  if (hasAny(normalized, ['remember', 'memory', 'note', 'second brain', 'wiki', 'search'])) {
    return {
      intent: 'memory_search_or_note',
      confidence: 0.75,
      risk: normalized.includes('remember') || normalized.includes('save') ? 'medium' : 'low',
      reason: 'The request references notes, memory, wiki, or search.'
    };
  }

  if (hasAny(normalized, ['brief', 'dashboard', 'summary', 'today', 'weekly report', 'status'])) {
    return {
      intent: 'briefing',
      confidence: 0.72,
      risk: 'low',
      reason: 'The request asks for a summary, dashboard-style brief, or status report.'
    };
  }

  return {
    intent: 'general_assist',
    confidence: 0.58,
    risk: 'low',
    reason: 'No specialized domain intent was detected with high confidence.'
  };
};
