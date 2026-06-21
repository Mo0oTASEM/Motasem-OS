import type { CharacterProfile, CharacterTrait, CharacterHabit, CharacterQuest, CharacterBadGuy } from '../types';

export interface TitleSuggestion {
  title: string;
  reason: string;
  source: 'level' | 'trait' | 'achievement' | 'custom';
}

const LEVEL_TITLES: Record<number, string> = {
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

export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[level] || `Level ${level}`;
}

export function suggestTitles(
  profile: CharacterProfile | null,
  traits: CharacterTrait[],
  habits: CharacterHabit[],
  quests: CharacterQuest[],
  badGuys: CharacterBadGuy[],
): TitleSuggestion[] {
  const suggestions: TitleSuggestion[] = [];
  const level = profile?.currentLevel ?? 1;

  suggestions.push({
    title: getLevelTitle(level),
    reason: `Level ${level} title`,
    source: 'level',
  });

  const topTrait = [...traits].sort((a, b) => b.lifetimeXp - a.lifetimeXp)[0];
  if (topTrait && topTrait.lifetimeXp >= 100) {
    suggestions.push({
      title: `${topTrait.name} Practitioner`,
      reason: `Highest trait: ${topTrait.name}`,
      source: 'trait',
    });
  }

  const completedQuests = quests.filter(q => q.status === 'completed');
  const exposureQuests = completedQuests.filter(q => q.questType === 'exposure');

  if (exposureQuests.length >= 3) {
    suggestions.push({
      title: 'Exposure Specialist',
      reason: `Completed ${exposureQuests.length} exposure quests`,
      source: 'achievement',
    });
  }

  const resistRate = badGuys.reduce((sum, bg) => sum + bg.defeatedCount, 0);
  if (resistRate >= 10) {
    suggestions.push({
      title: 'Pattern Breaker',
      reason: `Resisted bad guys ${resistRate} times`,
      source: 'achievement',
    });
  }

  const maxStreak = Math.max(...habits.map(h => h.maxStreak), 0);
  if (maxStreak >= 30) {
    suggestions.push({
      title: 'Consistency Master',
      reason: `Best streak of ${maxStreak} days`,
      source: 'achievement',
    });
  } else if (maxStreak >= 14) {
    suggestions.push({
      title: 'Dedicated Builder',
      reason: `Best streak of ${maxStreak} days`,
      source: 'achievement',
    });
  }

  const completedContracts = quests.filter(q => q.status === 'completed').length;
  if (completedContracts >= 5) {
    suggestions.push({
      title: 'Accountability Leader',
      reason: `Completed ${completedContracts} quests`,
      source: 'achievement',
    });
  }

  return suggestions;
}

export function generateCustomTitle(traitName: string, rank: number): string {
  const prefixes = ['Aspiring', 'Committed', 'Advanced', 'Expert', 'Master'];
  const prefixIdx = Math.min(rank - 1, prefixes.length - 1);
  return `${prefixes[prefixIdx]} ${traitName}`;
}
