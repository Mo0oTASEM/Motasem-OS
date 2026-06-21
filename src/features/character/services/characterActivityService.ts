import type { ActivityLogEntry } from '../types';

export type CharacterActivityEventType =
  | 'level_increased'
  | 'boss_fight_completed'
  | 'season_started'
  | 'ladder_completed'
  | 'achievement_unlocked'
  | 'contract_completed'
  | 'bad_guy_resisted'
  | 'power_up_used'
  | 'reflection_saved'
  | 'streak_milestone';

const HIGH_VALUE_EVENTS: CharacterActivityEventType[] = [
  'level_increased',
  'boss_fight_completed',
  'season_started',
  'ladder_completed',
  'achievement_unlocked',
  'contract_completed',
];

const LOW_VALUE_EVENTS: CharacterActivityEventType[] = [
  'bad_guy_resisted',
  'power_up_used',
  'reflection_saved',
];

export function isHighValueEvent(eventType: CharacterActivityEventType): boolean {
  return HIGH_VALUE_EVENTS.includes(eventType);
}

export function shouldShowInFeed(eventType: CharacterActivityEventType, importanceScore: number): boolean {
  if (HIGH_VALUE_EVENTS.includes(eventType)) return true;
  if (LOW_VALUE_EVENTS.includes(eventType) && importanceScore >= 70) return true;
  return false;
}

export function buildActivityEntry(
  eventType: CharacterActivityEventType,
  entityType: string,
  entityId: string,
  note: string,
  xpDelta: number = 0,
  metadata: Record<string, unknown> = {},
): Omit<ActivityLogEntry, 'id' | 'userId' | 'createdAt'> {
  return {
    eventType,
    entityType,
    entityId,
    xpDelta,
    traitImpact: {},
    metadata,
    note,
  };
}
