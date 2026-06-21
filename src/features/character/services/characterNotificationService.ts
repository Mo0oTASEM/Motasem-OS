import type { CharacterHabit, CharacterQuest, CharacterContract, CharacterSeason } from '../types';

export type CharacterNotificationType =
  | 'habit_reminder'
  | 'upcoming_quest'
  | 'exposure_reminder'
  | 'weekly_review'
  | 'accountability_checkin'
  | 'season_ending'
  | 'recovery_suggested'
  | 'streak_milestone'
  | 'achievement_unlocked';

export interface CharacterNotification {
  id: string;
  type: CharacterNotificationType;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  read: boolean;
  actionable: boolean;
}

export interface NotificationPreference {
  type: CharacterNotificationType;
  enabled: boolean;
  minIntervalHours: number;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  { type: 'habit_reminder', enabled: true, minIntervalHours: 24 },
  { type: 'upcoming_quest', enabled: true, minIntervalHours: 24 },
  { type: 'exposure_reminder', enabled: true, minIntervalHours: 48 },
  { type: 'weekly_review', enabled: true, minIntervalHours: 168 },
  { type: 'accountability_checkin', enabled: true, minIntervalHours: 72 },
  { type: 'season_ending', enabled: true, minIntervalHours: 168 },
  { type: 'recovery_suggested', enabled: false, minIntervalHours: 24 },
  { type: 'streak_milestone', enabled: true, minIntervalHours: 0 },
  { type: 'achievement_unlocked', enabled: true, minIntervalHours: 0 },
];

export function buildHabitReminder(habit: CharacterHabit): CharacterNotification {
  return {
    id: crypto.randomUUID(),
    type: 'habit_reminder',
    title: 'Habit Reminder',
    message: `Time for your habit: ${habit.title}`,
    entityType: 'habit',
    entityId: habit.id,
    createdAt: new Date().toISOString(),
    read: false,
    actionable: true,
  };
}

export function buildQuestReminder(quest: CharacterQuest): CharacterNotification {
  return {
    id: crypto.randomUUID(),
    type: 'upcoming_quest',
    title: 'Quest Due',
    message: `Quest "${quest.title}" is due. ${quest.description ? `— ${quest.description.slice(0, 100)}` : ''}`,
    entityType: 'quest',
    entityId: quest.id,
    createdAt: new Date().toISOString(),
    read: false,
    actionable: true,
  };
}

export function buildContractCheckin(contract: CharacterContract): CharacterNotification {
  return {
    id: crypto.randomUUID(),
    type: 'accountability_checkin',
    title: 'Accountability Check-In',
    message: `Check in on your contract: "${contract.title}". Report your progress to ${contract.accountabilityPerson || 'your partner'}.`,
    entityType: 'contract',
    entityId: contract.id,
    createdAt: new Date().toISOString(),
    read: false,
    actionable: true,
  };
}

export function buildSeasonEnding(season: CharacterSeason): CharacterNotification {
  return {
    id: crypto.randomUUID(),
    type: 'season_ending',
    title: 'Season Ending Soon',
    message: `Your character season "${season.title}" is ending. Complete your final reflection.`,
    entityType: 'season',
    entityId: season.id,
    createdAt: new Date().toISOString(),
    read: false,
    actionable: true,
  };
}

export function buildStreakMilestone(streakCount: number): CharacterNotification {
  return {
    id: crypto.randomUUID(),
    type: 'streak_milestone',
    title: 'Streak Milestone',
    message: `You've reached a ${streakCount}-day streak! Keep building momentum.`,
    entityType: 'streak',
    entityId: 'streak',
    createdAt: new Date().toISOString(),
    read: false,
    actionable: false,
  };
}
