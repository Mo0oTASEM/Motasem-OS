import type { CharacterHabit, CharacterQuest, CharacterTrait, CharacterReflection, ActivityLogEntry } from '../types';

export interface AdaptiveInput {
  habits: CharacterHabit[];
  quests: CharacterQuest[];
  traits: CharacterTrait[];
  activityLog: ActivityLogEntry[];
  reflections: CharacterReflection[];
  profile: {
    preferredDifficulty: number;
    recoveryMode: boolean;
    currentLevel: number;
  } | null;
  plannerWorkload: number;
  sleepQuality?: number;
  energyLevel?: number;
}

export interface AdaptiveSuggestion {
  type: 'difficulty_increase' | 'difficulty_decrease' | 'scope_reduce'
    | 'accountability_add' | 'restart' | 'level_progress' | 'recovery_suggest'
    | 'trait_focus' | 'avoidance_pattern';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  reason: string;
  relatedEntityId?: string;
}

export function getAdaptiveSuggestions(input: AdaptiveInput): AdaptiveSuggestion[] {
  const suggestions: AdaptiveSuggestion[] = [];
  const fourteenDaysAgo = Date.now() - 14 * 86400000;
  const thirtyDaysAgo = Date.now() - 30 * 86400000;

  const recentLogs = input.activityLog.filter(
    l => new Date(l.createdAt).getTime() > fourteenDaysAgo,
  );

  const thirtyDayLogs = input.activityLog.filter(
    l => new Date(l.createdAt).getTime() > thirtyDaysAgo,
  );

  const completions = recentLogs.filter(
    l => l.eventType.endsWith('_completed') || l.eventType === 'bad_guy_resisted',
  ).length;

  const attempts = recentLogs.filter(
    l => l.eventType.endsWith('_completed') || l.eventType === 'bad_guy_resisted'
      || l.eventType.endsWith('_triggered') || l.eventType === 'if_then_missed',
  ).length;

  const completionRate = attempts > 0 ? completions / attempts : 0;

  const activeHabits = input.habits.filter(h => h.isActive);
  const activeQuests = input.quests.filter(q => q.status === 'active');
  const avoidedPatterns = recentLogs.filter(l => l.eventType === 'if_then_missed').length;

  if (activeHabits.length === 0 && activeQuests.length === 0) {
    suggestions.push({
      type: 'restart',
      priority: 'high',
      title: 'Get started again',
      description: 'You have no active habits or quests.',
      action: 'Create one small habit or enable recovery mode',
      reason: 'A single small action builds momentum.',
    });
  }

  if (completionRate >= 0.8 && attempts >= 10) {
    suggestions.push({
      type: 'difficulty_increase',
      priority: 'low',
      title: 'Ready for more challenge',
      description: `Your completion rate is ${Math.round(completionRate * 100)}%.`,
      action: 'Try increasing habit difficulty or adding harder quests',
      reason: 'You are ready for a slightly harder challenge.',
    });
  }

  if (completionRate <= 0.4 && attempts >= 5) {
    suggestions.push({
      type: 'difficulty_decrease',
      priority: 'medium',
      title: 'Scope may be too ambitious',
      description: `Your completion rate is ${Math.round(completionRate * 100)}%.`,
      action: 'Reduce difficulty or break quests into smaller steps',
      reason: 'Smaller wins build sustainable momentum.',
    });
  }

  if (avoidedPatterns >= 5) {
    const relatedRule = input.habits[0]?.id;
    suggestions.push({
      type: 'avoidance_pattern',
      priority: 'high',
      title: 'Avoidance pattern detected',
      description: `You have avoided actions ${avoidedPatterns} times.`,
      action: 'Try a smaller version of the action or add accountability',
      reason: 'Avoidance shrinks when the first step is very small.',
      relatedEntityId: relatedRule,
    });
  }

  if (attempts === 0 && input.profile && !input.profile.recoveryMode) {
    suggestions.push({
      type: 'recovery_suggest',
      priority: 'high',
      title: 'Recovery mode available',
      description: 'No character activity in 14 days.',
      action: 'Enable recovery mode for gentler daily requirements',
      reason: 'Recovery mode preserves progress while reducing pressure.',
    });
  }

  if (input.profile && input.profile.currentLevel < 4 && thirtyDayLogs.length >= 15) {
    suggestions.push({
      type: 'level_progress',
      priority: 'low',
      title: 'Near level up',
      description: `You are ${Math.min(100, Math.round(thirtyDayLogs.length / 30 * 100))}% toward the next level.`,
      action: 'Focus on consistency — one extra completion per day helps',
      reason: 'The next level unlocks new titles and capabilities.',
    });
  }

  const topTrait = [...input.traits].sort((a, b) => b.lifetimeXp - a.lifetimeXp)[0];
  if (topTrait && input.traits.length > 0) {
    suggestions.push({
      type: 'trait_focus',
      priority: 'medium',
      title: `Focus on ${topTrait.name}`,
      description: `${topTrait.name} is your strongest trait at rank ${Math.floor(topTrait.lifetimeXp / 100) + 1}.`,
      action: `Create a habit linked to ${topTrait.name} to accelerate growth`,
      reason: 'Building on strengths creates momentum.',
      relatedEntityId: topTrait.id,
    });
  }

  if (completionRate <= 0.3 && attempts >= 5) {
    suggestions.push({
      type: 'accountability_add',
      priority: 'medium',
      title: 'Consider accountability',
      description: 'A contract or if-then rule can help with consistency.',
      action: 'Create an if-then rule or accountability contract',
      reason: 'External structure helps when internal motivation dips.',
    });
  }

  return suggestions;
}

export function filterForRecoveryMode(suggestions: AdaptiveSuggestion[]): AdaptiveSuggestion[] {
  return suggestions.filter(s =>
    s.type === 'restart' || s.type === 'recovery_suggest' || s.type === 'difficulty_decrease'
  );
}
