import type { CharacterBadGuy, CharacterPowerUp, CharacterIfThenRule, ActivityLogEntry } from '../types';

export interface BadGuyEncounter {
  badGuy: CharacterBadGuy;
  triggerCount: number;
  recentOccurrences: number;
  suggestedPowerUp: CharacterPowerUp | null;
  suggestedRule: CharacterIfThenRule | null;
  patternTrend: 'rising' | 'stable' | 'declining';
  daysSinceLast: number;
}

export interface BadGuyPattern {
  badGuyId: string;
  title: string;
  totalOccurrences: number;
  totalDefeats: number;
  defeatRate: number;
  mostCommonTrigger: string;
  trend: 'improving' | 'worsening' | 'stable';
}

export function buildEncounter(
  badGuy: CharacterBadGuy,
  allPowerUps: CharacterPowerUp[],
  allRules: CharacterIfThenRule[],
  activityLog: ActivityLogEntry[],
): BadGuyEncounter {
  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const recentOccurrences = activityLog.filter(
    l => l.entityId === badGuy.id
      && new Date(l.createdAt).getTime() > thirtyDaysAgo
      && (l.eventType === 'bad_guy_triggered' || l.eventType === 'bad_guy_resisted'),
  ).length;

  const olderOccurrences = activityLog.filter(
    l => l.entityId === badGuy.id
      && new Date(l.createdAt).getTime() <= thirtyDaysAgo
      && new Date(l.createdAt).getTime() > thirtyDaysAgo - 30 * 86400000
      && (l.eventType === 'bad_guy_triggered' || l.eventType === 'bad_guy_resisted'),
  ).length;

  const trend: 'rising' | 'stable' | 'declining' =
    recentOccurrences > olderOccurrences * 1.3 ? 'rising'
    : recentOccurrences < olderOccurrences * 0.7 ? 'declining'
    : 'stable';

  const linkedPowerUp = allPowerUps.find(p =>
    p.linkedBadGuyIds.includes(badGuy.id),
  ) ?? allPowerUps.find(p => p.category === 'reset') ?? null;

  const linkedRule = allRules.find(r => r.linkedBadGuyId === badGuy.id) ?? null;

  const daysSinceLast = badGuy.lastOccurrenceAt
    ? Math.floor((Date.now() - new Date(badGuy.lastOccurrenceAt).getTime()) / 86400000)
    : -1;

  return {
    badGuy,
    triggerCount: badGuy.occurrenceCount,
    recentOccurrences,
    suggestedPowerUp: linkedPowerUp,
    suggestedRule: linkedRule,
    patternTrend: trend,
    daysSinceLast,
  };
}

export function analyzePatterns(
  badGuys: CharacterBadGuy[],
  activityLog: ActivityLogEntry[],
): BadGuyPattern[] {
  return badGuys.map(bg => {
    const triggered = activityLog.filter(
      l => l.entityId === bg.id && l.eventType === 'bad_guy_triggered',
    ).length;
    const resisted = activityLog.filter(
      l => l.entityId === bg.id && l.eventType === 'bad_guy_resisted',
    ).length;
    const total = triggered + resisted;

    const recent = activityLog.filter(
      l => l.entityId === bg.id
        && new Date(l.createdAt).getTime() > Date.now() - 14 * 86400000,
    ).length;

    const beforeRecent = activityLog.filter(
      l => l.entityId === bg.id
        && new Date(l.createdAt).getTime() <= Date.now() - 14 * 86400000
        && new Date(l.createdAt).getTime() > Date.now() - 28 * 86400000,
    ).length;

    return {
      badGuyId: bg.id,
      title: bg.title,
      totalOccurrences: total,
      totalDefeats: bg.defeatedCount,
      defeatRate: total > 0 ? Math.round((bg.defeatedCount / total) * 100) : 0,
      mostCommonTrigger: bg.triggerDescription,
      trend: recent > beforeRecent * 1.3 ? 'worsening'
        : recent < beforeRecent * 0.7 ? 'improving'
        : 'stable',
    };
  });
}

export function getRecoverySuggestion(badGuy: CharacterBadGuy): string {
  if (badGuy.defeatedCount === 0 && badGuy.occurrenceCount > 0) {
    return `You triggered "${badGuy.title}" but have not resisted it yet. Try using a linked if-then rule next time.`;
  }
  if (badGuy.occurrenceCount >= 10 && badGuy.defeatedCount < badGuy.occurrenceCount * 0.3) {
    return `"${badGuy.title}" is showing up often with a low defeat rate. Consider reducing triggers or adding a stronger if-then rule.`;
  }
  if (badGuy.defeatedCount >= badGuy.occurrenceCount * 0.7 && badGuy.occurrenceCount >= 5) {
    return `You are doing well against "${badGuy.title}". Keep using your current strategy.`;
  }
  return `Track "${badGuy.title}" triggers and use a linked power-up when it appears.`;
}
