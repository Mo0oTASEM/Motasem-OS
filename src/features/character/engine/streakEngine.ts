import type { CharacterHabit } from '../types';

export const GRACE_TOKENS_PER_WEEK = 3;

export interface StreakState {
  currentStreak: number;
  maxStreak: number;
  isNewStreak: boolean;
  graceTokenUsed: boolean;
  graceTokensRemaining: number;
  daysSinceLastCompletion: number;
}

export interface WeeklyConsistency {
  weekKey: string;
  completedDays: number;
  totalDays: number;
  percent: number;
}

export function calculateStreak(
  habit: CharacterHabit,
  graceTokensAvailable: number,
): StreakState {
  const today = new Date().toISOString().split('T')[0];
  const lastCompleted = habit.lastCompletedDate?.split('T')[0] ?? null;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (lastCompleted === today) {
    return {
      currentStreak: habit.currentStreak,
      maxStreak: habit.maxStreak,
      isNewStreak: false,
      graceTokenUsed: false,
      graceTokensRemaining: graceTokensAvailable,
      daysSinceLastCompletion: 0,
    };
  }

  const daysSince = lastCompleted
    ? Math.floor((Date.now() - new Date(lastCompleted).getTime()) / 86400000)
    : Infinity;

  if (lastCompleted === yesterday) {
    const newStreak = habit.currentStreak + 1;
    return {
      currentStreak: newStreak,
      maxStreak: Math.max(habit.maxStreak, newStreak),
      isNewStreak: true,
      graceTokenUsed: false,
      graceTokensRemaining: graceTokensAvailable,
      daysSinceLastCompletion: daysSince,
    };
  }

  if (daysSince === 2 && graceTokensAvailable > 0) {
    const newStreak = habit.currentStreak + 1;
    return {
      currentStreak: newStreak,
      maxStreak: Math.max(habit.maxStreak, newStreak),
      isNewStreak: true,
      graceTokenUsed: true,
      graceTokensRemaining: graceTokensAvailable - 1,
      daysSinceLastCompletion: daysSince,
    };
  }

  return {
    currentStreak: 1,
    maxStreak: habit.maxStreak,
    isNewStreak: true,
    graceTokenUsed: false,
    graceTokensRemaining: graceTokensAvailable,
    daysSinceLastCompletion: daysSince,
  };
}

export function weeklyConsistency(
  completedDates: string[],
  habit: CharacterHabit,
  weeksBack = 4,
): WeeklyConsistency[] {
  const weeks: WeeklyConsistency[] = [];
  const now = new Date();

  for (let w = 0; w < weeksBack; w++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - w * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const scheduledDays = habit.scheduledDays;
    const totalDays = scheduledDays?.length ?? 7;

    let completedDays = 0;
    for (const dateStr of completedDates) {
      const d = new Date(dateStr);
      if (d >= weekStart && d <= weekEnd) {
        if (!scheduledDays || scheduledDays.includes(d.getDay())) {
          completedDays++;
        }
      }
    }

    weeks.push({
      weekKey: `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`,
      completedDays,
      totalDays,
      percent: Math.round((completedDays / Math.max(1, totalDays)) * 100),
    });
  }

  return weeks;
}

function getWeekNumber(d: Date): number {
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - startOfYear.getTime();
  return Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
}

export function isOnStreak(habit: CharacterHabit): boolean {
  if (!habit.lastCompletedDate) return false;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const lastDate = habit.lastCompletedDate.split('T')[0];
  return lastDate === today || lastDate === yesterday;
}

export function daysSinceLastCompletion(habit: CharacterHabit): number {
  if (!habit.lastCompletedDate) return Infinity;
  return Math.floor(
    (Date.now() - new Date(habit.lastCompletedDate).getTime()) / 86400000,
  );
}

export function missedDayNote(daysMissed: number, habitTitle: string): string {
  if (daysMissed === 1) return `You missed one day of "${habitTitle}". That is okay — every day is a fresh start.`;
  if (daysMissed <= 3) return `You missed ${daysMissed} days of "${habitTitle}". Your progress is not erased. Just begin again.`;
  return `It has been ${daysMissed} days since "${habitTitle}". Recovery mode is available if you need a gentler restart.`;
}
