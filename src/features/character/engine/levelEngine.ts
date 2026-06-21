export const LEVEL_CURVE_BASE = 100;
export const LEVEL_CURVE_EXPONENT = 1.5;

export function requiredXpForLevel(level: number): number {
  return Math.round(LEVEL_CURVE_BASE * Math.pow(level, LEVEL_CURVE_EXPONENT));
}

export function levelFromXp(totalXp: number): number {
  for (let lvl = 10; lvl >= 1; lvl--) {
    if (totalXp >= requiredXpForLevel(lvl)) return lvl;
  }
  return 1;
}

export function currentLevelXp(totalXp: number, level: number): number {
  if (level <= 1) return totalXp;
  return totalXp - requiredXpForLevel(level - 1);
}

export function xpToNextLevel(totalXp: number, level: number): number {
  if (level >= 10) return 0;
  const next = requiredXpForLevel(level + 1);
  if (next <= requiredXpForLevel(level)) return 0;
  return next - totalXp;
}

export function levelTitle(level: number): string {
  const titles: Record<number, string> = {
    1: 'Initiate',
    2: 'Consistent Builder',
    3: 'Courage Apprentice',
    4: 'Clear Communicator',
    5: 'Resilient Operator',
    6: 'Calm Leader',
    7: 'Disciplined Creator',
    8: 'Trusted Professional',
    9: 'Respected Guide',
    10: 'Transcendent',
  };
  return titles[level] || `Level ${level}`;
}

export function levelProgressPercent(totalXp: number, level: number): number {
  const current = requiredXpForLevel(level - 1);
  const next = requiredXpForLevel(level);
  const range = next - current;
  if (range <= 0) return 100;
  return Math.min(100, Math.round(((totalXp - current) / range) * 100));
}
