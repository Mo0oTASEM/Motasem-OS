import type { CharacterTrait, CharacterHabit, CharacterQuest, CharacterBadGuy, CharacterPowerUp, CharacterIfThenRule, CharacterContract, ExposureLadder, CharacterReflection, CharacterSeason, CharacterProfile } from '../types';

export interface CharacterBrainContext {
  identityStatement: string;
  level: number;
  levelTitle: string;
  activeTraits: { name: string; rank: number; xp: number }[];
  activeHabits: { title: string; streak: number }[];
  activeQuests: { title: string; type: string; difficulty: number }[];
  activeSeasons: { title: string; identityFocus: string }[];
  activeLadders: { title: string; progress: number }[];
  badGuyPatterns: { title: string; resistRate: number }[];
  recentWins: string[];
  recentStruggles: string[];
  activeContracts: { title: string; stakeType: string }[];
  currentStreak: number;
  totalXp: number;
}

export function buildCharacterBrainContext(
  profile: CharacterProfile | null,
  traits: CharacterTrait[],
  habits: CharacterHabit[],
  quests: CharacterQuest[],
  badGuys: CharacterBadGuy[],
  _powerUps: CharacterPowerUp[],
  _ifThenRules: CharacterIfThenRule[],
  contracts: CharacterContract[],
  ladders: ExposureLadder[],
  reflections: CharacterReflection[],
  seasons: CharacterSeason[],
): CharacterBrainContext {
  const activeTraits = traits
    .filter(t => t.status === 'active')
    .map(t => ({ name: t.name, rank: t.currentRank, xp: t.lifetimeXp }));

  const activeHabits = habits
    .filter(h => h.isActive)
    .map(h => ({ title: h.title, streak: h.currentStreak }));

  const activeQuests = quests
    .filter(q => q.status === 'active')
    .map(q => ({ title: q.title, type: q.questType, difficulty: q.difficulty }));

  const activeSeasons = seasons
    .filter(s => s.status === 'active' || s.status === 'planning')
    .map(s => ({ title: s.title, identityFocus: s.identityFocus }));

  const activeLadders = ladders
    .filter(l => l.status === 'active')
    .map(l => ({ title: l.title, progress: l.completionPercentage }));

  const badGuyPatterns = badGuys
    .filter(b => b.isActive)
    .map(b => ({
      title: b.title,
      resistRate: b.occurrenceCount > 0 ? b.defeatedCount / b.occurrenceCount : 0,
    }));

  const activeContracts = contracts
    .filter(c => c.isActive)
    .map(c => ({ title: c.title, stakeType: c.stakeType }));

  const recentReflections = reflections
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentWins = recentReflections
    .filter(r => r.emotionalIntensityAfter < r.emotionalIntensityBefore)
    .map(r => r.whatLearned || r.whatHappened)
    .filter(Boolean);

  const recentStruggles = recentReflections
    .filter(r => r.emotionalIntensityAfter >= r.emotionalIntensityBefore)
    .map(r => r.preActionFear || r.whatHappened)
    .filter(Boolean);

  return {
    identityStatement: profile?.identityStatement ?? '',
    level: profile?.currentLevel ?? 1,
    levelTitle: '',
    activeTraits,
    activeHabits,
    activeQuests,
    activeSeasons,
    activeLadders,
    badGuyPatterns,
    recentWins: recentWins.slice(0, 3),
    recentStruggles: recentStruggles.slice(0, 3),
    activeContracts,
    currentStreak: profile?.currentStreak ?? 0,
    totalXp: profile?.totalXp ?? 0,
  };
}

export function summarizeCharacterContext(
  profile: CharacterProfile | null,
  traits: CharacterTrait[],
  habits: CharacterHabit[],
  quests: CharacterQuest[],
  badGuys: CharacterBadGuy[],
  _powerUps: CharacterPowerUp[],
  _ifThenRules: CharacterIfThenRule[],
  contracts: CharacterContract[],
  ladders: ExposureLadder[],
  reflections: CharacterReflection[],
  seasons: CharacterSeason[],
): string {
  const ctx = buildCharacterBrainContext(
    profile, traits, habits, quests, badGuys, _powerUps,
    _ifThenRules, contracts, ladders, reflections, seasons,
  );

  const parts: string[] = [];

  if (ctx.identityStatement) {
    parts.push(`Identity: "${ctx.identityStatement}"`);
  }

  parts.push(`Level ${ctx.level} · ${ctx.totalXp} total XP · ${ctx.currentStreak}-day streak`);

  if (ctx.activeTraits.length > 0) {
    const top = ctx.activeTraits.slice(0, 4).map(t => `${t.name} (Lv.${t.rank})`).join(', ');
    parts.push(`Traits: ${top}${ctx.activeTraits.length > 4 ? ` +${ctx.activeTraits.length - 4} more` : ''}`);
  }

  if (ctx.activeHabits.length > 0) {
    const top = ctx.activeHabits.slice(0, 3).map(h => `${h.title} (${h.streak}d)`).join(', ');
    parts.push(`Habits: ${top}${ctx.activeHabits.length > 3 ? ` +${ctx.activeHabits.length - 3} more` : ''}`);
  }

  if (ctx.activeQuests.length > 0) {
    parts.push(`Active quests: ${ctx.activeQuests.length} (${ctx.activeQuests.map(q => q.type).join(', ')})`);
  }

  if (ctx.activeLadders.length > 0) {
    parts.push(`Exposure ladders: ${ctx.activeLadders.map(l => `${l.title} (${l.progress}%)`).join(', ')}`);
  }

  if (ctx.badGuyPatterns.length > 0) {
    const resisted = ctx.badGuyPatterns.filter(b => b.resistRate > 0.5).map(b => b.title);
    const struggling = ctx.badGuyPatterns.filter(b => b.resistRate <= 0.5).map(b => b.title);
    if (resisted.length > 0) parts.push(`Resisting: ${resisted.join(', ')}`);
    if (struggling.length > 0) parts.push(`Struggling with: ${struggling.join(', ')}`);
  }

  if (ctx.recentWins.length > 0) {
    parts.push(`Recent wins: ${ctx.recentWins.join('; ')}`);
  }

  if (ctx.recentStruggles.length > 0) {
    parts.push(`Recent struggles: ${ctx.recentStruggles.join('; ')}`);
  }

  if (ctx.activeContracts.length > 0) {
    parts.push(`Contracts: ${ctx.activeContracts.map(c => c.title).join(', ')}`);
  }

  return parts.join('\n');
}
