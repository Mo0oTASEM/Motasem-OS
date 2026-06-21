export type XpCategory =
  | 'consistency'
  | 'courage'
  | 'integrity'
  | 'communication'
  | 'discipline'
  | 'recovery'
  | 'leadership'
  | 'sales'
  | 'general';

export interface XpBreakdown {
  total: number;
  base: number;
  streakBonus: number;
  difficultyBonus: number;
  integrityBonus: number;
  category: XpCategory;
  details: string[];
}

export const HABIT_XP_BY_DIFFICULTY: Record<number, number> = {
  1: 5, 2: 5, 3: 10, 4: 10, 5: 15, 6: 15, 7: 20, 8: 20, 9: 25, 10: 25,
};

export const QUEST_BASE_XP = 15;

export function habitXp(difficulty: number, streak: number, bonusPct?: number): XpBreakdown {
  const base = HABIT_XP_BY_DIFFICULTY[difficulty] || HABIT_XP_BY_DIFFICULTY[3];
  const streakBonus = streak >= 30 ? Math.floor(base * 0.5)
    : streak >= 14 ? Math.floor(base * 0.3)
    : streak >= 7 ? Math.floor(base * 0.15)
    : 0;
  let total = base + streakBonus;
  const details: string[] = [`Base: ${base} XP`];
  if (streakBonus > 0) details.push(`Streak bonus: +${streakBonus} XP`);

  if (bonusPct && bonusPct > 0) {
    const extra = Math.floor(base * (bonusPct / 100));
    total += extra;
    details.push(`Bonus: +${extra} XP`);
  }

  return {
    total, base, streakBonus, difficultyBonus: 0, integrityBonus: 0,
    category: 'consistency', details,
  };
}

export function questXp(
  rewardXp: number,
  questType: string,
  stepsCompleted: number,
): XpBreakdown {
  let base = rewardXp || QUEST_BASE_XP;
  const details: string[] = [`Reward: ${base} XP`];

  if (questType === 'boss_fight') {
    base = Math.max(100, base * 2);
    details.push(`Boss fight multiplier: x2`);
  }

  if (stepsCompleted > 0) {
    const stepBonus = Math.floor(base * 0.1 * stepsCompleted);
    base += stepBonus;
    details.push(`Step bonus: +${stepBonus} XP`);
  }

  const category: XpCategory = questType === 'exposure' || questType === 'boss_fight'
    ? 'courage'
    : questType === 'reflection' ? 'integrity' : 'general';

  return {
    total: base, base, streakBonus: 0, difficultyBonus: 0, integrityBonus: 0,
    category, details,
  };
}

export function exposureStepXp(difficulty: number, attemptNumber: number): XpBreakdown {
  const base = 20 + difficulty * 5;
  const attemptBonus = attemptNumber > 1 ? Math.floor(base * 0.2) : 0;
  const details: string[] = [`Base: ${base} XP`];
  if (attemptBonus > 0) details.push(`Attempt bonus: +${attemptBonus} XP`);

  return {
    total: base + attemptBonus, base, streakBonus: 0, difficultyBonus: 0,
    integrityBonus: 0, category: 'courage', details,
  };
}

export function resistBadGuyXp(severity: number): XpBreakdown {
  const base = 30 + severity * 5;
  return {
    total: base, base, streakBonus: 0, difficultyBonus: 0, integrityBonus: 0,
    category: 'discipline', details: [`Resisted: ${base} XP`],
  };
}

export function powerUpXp(): XpBreakdown {
  return {
    total: 10, base: 10, streakBonus: 0, difficultyBonus: 0, integrityBonus: 0,
    category: 'recovery', details: ['Power-up: 10 XP'],
  };
}

export function ifThenXp(): XpBreakdown {
  return {
    total: 25, base: 25, streakBonus: 0, difficultyBonus: 0, integrityBonus: 0,
    category: 'discipline', details: ['Rule followed: 25 XP'],
  };
}

export function contractXp(stakeMultiplier?: number): XpBreakdown {
  const base = 100 * (stakeMultiplier ?? 1);
  return {
    total: base, base, streakBonus: 0, difficultyBonus: 0, integrityBonus: 0,
    category: 'integrity', details: [`Contract: ${base} XP`],
  };
}

export function reflectionXp(contentLength: number): XpBreakdown {
  const MIN_CHARS = 30;
  if (contentLength < MIN_CHARS) {
    return { total: 0, base: 0, streakBonus: 0, difficultyBonus: 0, integrityBonus: 0,
      category: 'integrity', details: ['Reflection too short'] };
  }
  const bonus = contentLength > 200 ? 5 : 0;
  return {
    total: 15 + bonus, base: 15, streakBonus: 0, difficultyBonus: 0, integrityBonus: bonus,
    category: 'integrity', details: [`Reflection: ${15 + bonus} XP`],
  };
}

export function recoveryActionXp(): XpBreakdown {
  return {
    total: 8, base: 8, streakBonus: 0, difficultyBonus: 0, integrityBonus: 0,
    category: 'recovery', details: ['Recovery action: 8 XP'],
  };
}

export function integrityBonusXp(): XpBreakdown {
  return {
    total: 10, base: 10, streakBonus: 0, difficultyBonus: 0, integrityBonus: 10,
    category: 'integrity', details: ['Integrity bonus: +10 XP'],
  };
}

export function isContentMeaningful(text: string, minChars = 30): boolean {
  if (!text || text.trim().length < minChars) return false;
  const normalized = text.toLowerCase().trim();
  const fillerPatterns = [/^(a|an|the|it|ok|yes|no|good|bad|fine|idk|nothing|.)$/i];
  for (const pat of fillerPatterns) {
    if (pat.test(normalized)) return false;
  }
  return true;
}
