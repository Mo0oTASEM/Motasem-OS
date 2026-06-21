import type { CharacterTrait, CharacterSeason, ExposureLadder, CharacterQuest } from '../types';

export type CharacterGoalLinkType = 'season' | 'trait' | 'ladder' | 'boss_fight';

export interface CharacterGoalLink {
  characterEntityType: CharacterGoalLinkType;
  characterEntityId: string;
  characterEntityName: string;
  goalId: string;
  contribution: string;
}

export function buildSeasonGoalContribution(season: CharacterSeason): { contribution: string; title: string } {
  return {
    title: `Season: ${season.title}`,
    contribution: `Character season focusing on: ${season.identityFocus}${season.targetTraitIds.length > 0 ? `. Builds ${season.targetTraitIds.length} traits.` : ''}`,
  };
}

export function buildTraitGoalContribution(trait: CharacterTrait): { contribution: string; title: string } {
  return {
    title: `Trait: ${trait.name}`,
    contribution: `Character trait at Level ${trait.currentRank} with ${trait.lifetimeXp} lifetime XP. ${trait.description ? `— ${trait.description}` : ''}`,
  };
}

export function buildLadderGoalContribution(ladder: ExposureLadder): { contribution: string; title: string } {
  return {
    title: `Exposure Ladder: ${ladder.title}`,
    contribution: `Exposure ladder (${ladder.completionPercentage}% complete) toward: ${ladder.desiredEndBehavior}`,
  };
}

export function buildBossFightGoalContribution(quest: CharacterQuest): { contribution: string; title: string } {
  return {
    title: `Boss Fight: ${quest.title}`,
    contribution: `Completed boss fight: ${quest.title}. Difficulty ${quest.difficulty}/10. +${quest.rewardXp} XP earned.`,
  };
}
