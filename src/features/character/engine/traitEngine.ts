import type { CharacterTrait, ActivityLogEntry } from '../types';

export interface TraitScoreInput {
  trait: CharacterTrait;
  recentActivity: ActivityLogEntry[];
  daysInactive?: number;
}

export interface TraitScoreResult {
  currentScore: number;
  lifetimeXp: number;
  currentRank: number;
  recentSignal: number;
  consistencyFactor: number;
  daysInactive: number;
  isSoftened: boolean;
}

const TRAIT_DECAY_DAYS = 90;
const TRAIT_DECAY_RATE = 5;
const XP_PER_SCORE_POINT = 20;
const XP_PER_RANK = 100;

export function calculateTraitScore(input: TraitScoreInput): TraitScoreResult {
  const { trait, recentActivity, daysInactive } = input;
  const inactive = daysInactive ?? estimateDaysInactive(trait);

  const lifetimeXp = trait.lifetimeXp;
  const currentScore = Math.min(100, Math.floor(lifetimeXp / XP_PER_SCORE_POINT) + 1);
  const currentRank = Math.floor(lifetimeXp / XP_PER_RANK) + 1;

  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const recentLogs = recentActivity.filter(a =>
    a.entityType && a.entityId === trait.id
    && new Date(a.createdAt).getTime() > thirtyDaysAgo
  );

  const recentSignal = Math.min(100, recentLogs.length * 5);
  const activityDays = new Set(
    recentLogs.map(l => new Date(l.createdAt).toISOString().split('T')[0])
  ).size;
  const consistencyFactor = Math.min(100, Math.round((activityDays / 30) * 100));

  let softened = currentScore;
  let isSoftened = false;
  if (inactive > TRAIT_DECAY_DAYS) {
    const monthsInactive = (inactive - TRAIT_DECAY_DAYS) / 30;
    const decay = Math.floor(monthsInactive * TRAIT_DECAY_RATE);
    if (decay > 0) {
      softened = Math.max(1, currentScore - decay);
      isSoftened = true;
    }
  }

  return {
    currentScore: softened,
    lifetimeXp,
    currentRank,
    recentSignal,
    consistencyFactor,
    daysInactive: inactive,
    isSoftened,
  };
}

function estimateDaysInactive(trait: CharacterTrait): number {
  const lastUpdate = new Date(trait.updatedAt).getTime();
  return Math.floor((Date.now() - lastUpdate) / 86400000);
}

export function selectBestTraits(traits: CharacterTrait[], count = 3): CharacterTrait[] {
  return [...traits]
    .sort((a, b) => b.lifetimeXp - a.lifetimeXp)
    .slice(0, count);
}

export function traitXpToNextLevel(lifetimeXp: number): number {
  return XP_PER_RANK - (lifetimeXp % XP_PER_RANK);
}

export function traitGrowthRate(
  trait: CharacterTrait,
  recentActivity: ActivityLogEntry[],
): { xpPerWeek: number; trend: 'rising' | 'stable' | 'declining' } {
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const weekLogs = recentActivity.filter(a =>
    a.entityId === trait.id && new Date(a.createdAt).getTime() > sevenDaysAgo
  );
  const xpPerWeek = weekLogs.reduce((sum, l) => sum + (l.xpDelta ?? 0), 0);

  const prevWeek = recentActivity.filter(a =>
    a.entityId === trait.id
    && new Date(a.createdAt).getTime() <= sevenDaysAgo
    && new Date(a.createdAt).getTime() > sevenDaysAgo - 7 * 86400000
  );
  const prevXp = prevWeek.reduce((sum, l) => sum + (l.xpDelta ?? 0), 0);

  const trend = xpPerWeek > prevXp * 1.1 ? 'rising'
    : xpPerWeek < prevXp * 0.9 ? 'declining'
    : 'stable';

  return { xpPerWeek, trend };
}
