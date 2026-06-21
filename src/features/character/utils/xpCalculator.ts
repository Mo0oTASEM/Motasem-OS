import { CHARACTER_LEVELS } from '../types';
import type { CharacterHabit } from '../types';
import { requiredXpForLevel, levelFromXp, levelTitle, currentLevelXp as engineLevelXp } from '../engine/levelEngine';

export { requiredXpForLevel, levelFromXp, levelTitle };

export function calculateLevel(totalXp: number): { level: number; xpToNextLevel: number; title: string } {
  const level = levelFromXp(totalXp);
  const next = requiredXpForLevel(level + 1);
  return {
    level,
    xpToNextLevel: next - totalXp,
    title: levelTitle(level),
  };
}

export function calculateTraitLevel(traitXp: number): number {
  return Math.min(10, Math.floor(traitXp / 100) + 1);
}

export function traitXpToNextLevel(traitXp: number): number {
  return 100 - (traitXp % 100);
}

export function xpForDifficulty(difficulty: number): number {
  const map: Record<number, number> = { 1: 10, 2: 25, 3: 50, 4: 100, 5: 200, 6: 400, 7: 800, 8: 1600, 9: 3200, 10: 6400 };
  return map[difficulty] || 50;
}

export function calculateXpReward(args: {
  baseXp: number;
  streak: number;
  powerUpActive?: boolean;
  powerUpBoost?: number;
}): number {
  let xp = args.baseXp;
  if (args.streak >= 30) xp = Math.floor(xp * 1.5);
  else if (args.streak >= 14) xp = Math.floor(xp * 1.3);
  else if (args.streak >= 7) xp = Math.floor(xp * 1.15);
  if (args.powerUpActive && args.powerUpBoost) xp = Math.floor(xp * args.powerUpBoost);
  return xp;
}

export function updateStreak(habit: CharacterHabit): { streak: number; maxStreak: number; isNewStreak: boolean } {
  const today = new Date().toISOString().split('T')[0];
  const lastCompleted = habit.lastCompletedDate?.split('T')[0] ?? null;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (lastCompleted === today) {
    return { streak: habit.currentStreak, maxStreak: habit.maxStreak, isNewStreak: false };
  }

  const isConsecutive = lastCompleted === yesterday;
  const newStreak = isConsecutive ? habit.currentStreak + 1 : 1;
  const newMaxStreak = Math.max(habit.maxStreak, newStreak);

  return { streak: newStreak, maxStreak: newMaxStreak, isNewStreak: true };
}

export function checkLevelUp(prevState: { totalXp: number; level: number }): { didLevelUp: boolean; newLevel: number; newXpToNext: number; title: string } {
  const { level, xpToNextLevel, title } = calculateLevel(prevState.totalXp);
  const didLevelUp = level > prevState.level;
  return { didLevelUp, newLevel: level, newXpToNext: xpToNextLevel, title };
}

export function calculateCurrentLevelXp(totalXp: number, level: number): number {
  return engineLevelXp(totalXp, level);
}

export function xpToNextLevel(level: number): number {
  const next = CHARACTER_LEVELS[level];
  if (!next) return Infinity;
  const current = CHARACTER_LEVELS[level - 1];
  if (!current) return next.xp;
  return next.xp - current.xp;
}
