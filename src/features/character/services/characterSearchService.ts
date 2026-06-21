import type { CharacterTrait, CharacterHabit, CharacterQuest, CharacterBadGuy, CharacterPowerUp, CharacterIfThenRule, CharacterContract, ExposureLadder, CharacterReflection, CharacterSeason } from '../types';

export type CharacterSearchableEntity =
  | { type: 'trait'; id: string; title: string; subtitle: string; tags: string[] }
  | { type: 'habit'; id: string; title: string; subtitle: string; tags: string[] }
  | { type: 'quest'; id: string; title: string; subtitle: string; tags: string[] }
  | { type: 'bad_guy'; id: string; title: string; subtitle: string; tags: string[] }
  | { type: 'power_up'; id: string; title: string; subtitle: string; tags: string[] }
  | { type: 'rule'; id: string; title: string; subtitle: string; tags: string[] }
  | { type: 'contract'; id: string; title: string; subtitle: string; tags: string[] }
  | { type: 'ladder'; id: string; title: string; subtitle: string; tags: string[] }
  | { type: 'reflection'; id: string; title: string; subtitle: string; tags: string[] }
  | { type: 'season'; id: string; title: string; subtitle: string; tags: string[] };

export interface CharacterCommandAction {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon: string;
  action: string;
  entityType?: string;
}

export function buildSearchableEntities(
  traits: CharacterTrait[],
  habits: CharacterHabit[],
  quests: CharacterQuest[],
  badGuys: CharacterBadGuy[],
  powerUps: CharacterPowerUp[],
  ifThenRules: CharacterIfThenRule[],
  contracts: CharacterContract[],
  ladders: ExposureLadder[],
  reflections: CharacterReflection[],
  seasons: CharacterSeason[],
): CharacterSearchableEntity[] {
  const entities: CharacterSearchableEntity[] = [];

  for (const t of traits) {
    entities.push({ type: 'trait', id: t.id, title: t.name, subtitle: `Rank ${t.currentRank} · ${t.lifetimeXp} XP`, tags: ['trait', t.name] });
  }
  for (const h of habits) {
    entities.push({ type: 'habit', id: h.id, title: h.title, subtitle: `${h.currentStreak}-day streak${h.linkedTraitId ? ' · linked to trait' : ''}`, tags: ['habit', h.title] });
  }
  for (const q of quests) {
    entities.push({ type: 'quest', id: q.id, title: q.title, subtitle: `${q.questType} · Diff ${q.difficulty} · ${q.rewardXp} XP`, tags: ['quest', q.questType, ...q.linkedTraitIds] });
  }
  for (const b of badGuys) {
    entities.push({ type: 'bad_guy', id: b.id, title: b.title, subtitle: `Defeated ${b.defeatedCount}/${b.occurrenceCount} times`, tags: ['bad_guy', b.title] });
  }
  for (const p of powerUps) {
    entities.push({ type: 'power_up', id: p.id, title: p.title, subtitle: `${p.category} · used ${p.usageCount}x`, tags: ['power_up', p.title] });
  }
  for (const r of ifThenRules) {
    entities.push({ type: 'rule', id: r.id, title: `If ${r.triggerCondition} → Then ${r.responseAction}`, subtitle: `rule${r.successCount > 0 || r.failureCount > 0 ? ` · triggered ${r.successCount + r.failureCount}x` : ''}`, tags: ['rule', 'if-then', r.triggerCondition] });
  }
  for (const c of contracts) {
    entities.push({ type: 'contract', id: c.id, title: c.title, subtitle: `Stake: ${c.stakeType} · ${c.accountabilityPerson ? `Person: ${c.accountabilityPerson}` : ''}`, tags: ['contract', c.title] });
  }
  for (const l of ladders) {
    entities.push({ type: 'ladder', id: l.id, title: l.title, subtitle: `${l.completionPercentage}% complete · ${l.steps.length} steps`, tags: ['ladder', 'exposure', l.title] });
  }
  for (const r of reflections) {
    entities.push({ type: 'reflection', id: r.id, title: `Reflection ${new Date(r.createdAt).toLocaleDateString()}`, subtitle: r.whatHappened.slice(0, 60), tags: ['reflection', r.privacySetting] });
  }
  for (const s of seasons) {
    entities.push({ type: 'season', id: s.id, title: s.title, subtitle: `${s.status} · ${s.identityFocus}`, tags: ['season', s.title] });
  }

  return entities;
}

export function searchCharacterEntities(query: string, entities: CharacterSearchableEntity[]): CharacterSearchableEntity[] {
  const q = query.toLowerCase();
  return entities.filter(e =>
    e.title.toLowerCase().includes(q) ||
    e.subtitle.toLowerCase().includes(q) ||
    e.tags.some(t => t.toLowerCase().includes(q)),
  );
}

export const CHARACTER_COMMANDS: CharacterCommandAction[] = [
  { id: 'char_create_quest', label: 'Create Quest', description: 'Start a new character quest', keywords: ['quest', 'new', 'boss', 'fight'], icon: 'Sword', action: 'navigate:character?tab=quests' },
  { id: 'char_log_win', label: 'Log Win', description: 'Log a recent character win', keywords: ['win', 'log', 'reflection', 'journal'], icon: 'Sparkles', action: 'navigate:character?tab=reflections' },
  { id: 'char_log_bad_guy', label: 'Log Bad Guy Encounter', description: 'Record a bad guy resistance', keywords: ['bad', 'guy', 'resist', 'encounter'], icon: 'Skull', action: 'navigate:character?tab=bad-guys' },
  { id: 'char_start_power_up', label: 'Start Power-Up', description: 'Activate a character power-up', keywords: ['power', 'up', 'boost', 'activate'], icon: 'Zap', action: 'navigate:character?tab=power-ups' },
  { id: 'char_open_today', label: 'Today View', description: 'See today\'s character overview', keywords: ['today', 'daily', 'overview', 'dashboard'], icon: 'Calendar', action: 'navigate:character?tab=today' },
  { id: 'char_start_reflection', label: 'Start Reflection', description: 'Write a character reflection entry', keywords: ['reflect', 'journal', 'write', 'note'], icon: 'BookOpen', action: 'navigate:character?tab=reflections' },
  { id: 'char_ask_coach', label: 'Ask Coach', description: 'Talk to your character coach', keywords: ['coach', 'advice', 'ai', 'help'], icon: 'MessageSquare', action: 'navigate:character?tab=overview' },
];
