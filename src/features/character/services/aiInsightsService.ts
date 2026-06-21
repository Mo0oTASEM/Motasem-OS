import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import { env } from '../../../lib/env/validate';
import type { CharacterTrait, CharacterHabit, CharacterQuest, CharacterBadGuy } from '../types';

export interface InsightResult {
  insights: string[];
  adaptiveChallenges: Array<{
    name: string;
    description: string;
    traitId: string;
    difficulty: number;
    xpReward: number;
  }>;
}

function buildCharacterContext(args: {
  traits: CharacterTrait[];
  habits: CharacterHabit[];
  quests: CharacterQuest[];
  badGuys: CharacterBadGuy[];
  level: number;
  totalXp: number;
  currentStreak: number;
}): string {
  const activeExposures = args.quests.filter(q => q.questType === 'exposure' && q.status === 'active');
  const activeBossFights = args.quests.filter(q => q.questType === 'boss_fight' && q.status !== 'completed');
  return [
    `Level ${args.level} character with ${args.totalXp} total XP (streak: ${args.currentStreak})`,
    `Traits (${args.traits.length}): ${args.traits.map(t => `${t.name} (Lv.${t.currentRank})`).join(', ')}`,
    `Active habits (${args.habits.filter(h => h.isActive).length}): ${args.habits.filter(h => h.isActive).map(h => h.title).join(', ')}`,
    `Active exposure quests: ${activeExposures.length}`,
    `Boss fights remaining: ${activeBossFights.length}`,
    `Bad guys: ${args.badGuys.map(b => `${b.title} (${b.defeatedCount}/${b.occurrenceCount} resisted)`).join(', ')}`,
  ].join('\n');
}

export async function generateInsights(args: {
  traits: CharacterTrait[];
  habits: CharacterHabit[];
  quests: CharacterQuest[];
  badGuys: CharacterBadGuy[];
  level: number;
  totalXp: number;
  currentStreak: number;
}): Promise<InsightResult> {
  const apiBase = env.apiBaseUrl;
  const hasBackend = Boolean(apiBase);

  if (!hasBackend) {
    return localFallback(args);
  }

  try {
    const context = buildCharacterContext(args);
    const response = await cloudRunClient.aiCommand({
      message: [
        'You are a character development coach for a personal growth system.',
        'Based on the user\'s current character state, generate:',
        '1. Two actionable insights for growth (each 1-2 sentences).',
        '2. One adaptive challenge that pushes the user slightly out of their comfort zone.',
        '',
        'Current state:',
        context,
        '',
        'Respond in JSON format:',
        '{"insights": ["insight1", "insight2"], "challenge": {"name": "...", "description": "...", "difficulty": 1-5}}',
      ].join('\n'),
      currentView: 'character',
    });

    const parsed = tryParseResponse(response.response);
    if (parsed) return parsed;
    return localFallback(args);
  } catch {
    return localFallback(args);
  }
}

function tryParseResponse(text: string): InsightResult | null {
  try {
    const json = JSON.parse(text);
    const insights: string[] = Array.isArray(json.insights) ? json.insights.slice(0, 3) : [];
    const challenge = json.challenge;
    const adaptiveChallenges = challenge ? [{
      name: challenge.name || 'Adaptive Challenge',
      description: challenge.description || 'Step outside your comfort zone.',
      traitId: '',
      difficulty: Math.min(10, Math.max(1, challenge.difficulty || 3)),
      xpReward: challenge.difficulty ? (challenge.difficulty as number) * 25 : 50,
    }] : [];
    return { insights, adaptiveChallenges };
  } catch {
    return null;
  }
}

function localFallback(args: {
  traits: CharacterTrait[];
  habits: CharacterHabit[];
  level: number;
  totalXp: number;
  currentStreak: number;
}): InsightResult {
  const insights: string[] = [];
  const weakestTrait = [...args.traits].sort((a, b) => a.currentRank - b.currentRank)[0];
  const strongestTrait = [...args.traits].sort((a, b) => b.currentRank - a.currentRank)[0];

  if (weakestTrait) {
    insights.push(`Your lowest trait is "${weakestTrait.name}" at level ${weakestTrait.currentRank}. Focus one habit on this area this week.`);
  }
  if (strongestTrait && strongestTrait.currentRank >= 7) {
    insights.push(`"${strongestTrait.name}" is your peak trait. Leverage it in situations that challenge your weaker areas.`);
  }
  if (args.currentStreak >= 7) {
    insights.push(`You're on a ${args.currentStreak}-day streak. Momentum is building — protect it by keeping your minimum viable habit easy.`);
  } else if (args.currentStreak === 0 && args.habits.length > 0) {
    insights.push('Start small. Pick one habit and commit to doing it for 2 minutes. Consistency builds identity.');
  }
  if (args.level < 3) {
    insights.push('Early levels are about exploration. Experiment with different habits to find what resonates.');
  } else if (args.traits.length < 5) {
    insights.push('Consider adding more traits to round out your character development. Diversity builds resilience.');
  }

  const adaptiveChallenges = [];
  if (weakestTrait && args.habits.length > 0) {
    const difficulty = Math.min(3, Math.floor(weakestTrait.currentRank / 3) + 1);
    adaptiveChallenges.push({
      name: `${weakestTrait.name} Micro-Challenge`,
      description: `Do one small thing today that exercises ${weakestTrait.name.toLowerCase()}. Start with 2 minutes.`,
      traitId: weakestTrait.id,
      difficulty,
      xpReward: difficulty * 25,
    });
  }

  return { insights, adaptiveChallenges };
}
