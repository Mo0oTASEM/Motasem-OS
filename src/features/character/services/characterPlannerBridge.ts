import type { CharacterHabit, CharacterQuest, ExposureLadder } from '../types';

export type CharacterPlannerLinkType =
  | 'habit_session'
  | 'quest_execution'
  | 'exposure_attempt'
  | 'weekly_review'
  | 'season_review'
  | 'reflection_prompt';

export interface CharacterPlannerLink {
  id: string;
  characterEntityType: string;
  characterEntityId: string;
  plannerTaskId: string;
  linkType: CharacterPlannerLinkType;
  syncCompletion: boolean;
  autoGenerate: boolean;
}

export function buildHabitPlannerTask(habit: CharacterHabit, date: string): {
  title: string; dueDate: string; estimatedMinutes: number; tags: string[];
} {
  return {
    title: `Habit: ${habit.title}`,
    dueDate: date,
    estimatedMinutes: 10,
    tags: ['habit', 'character', `trait:${habit.linkedTraitId ?? ''}`].filter(Boolean),
  };
}

export function buildQuestPlannerTask(quest: CharacterQuest, date: string): {
  title: string; description: string; dueDate: string; estimatedMinutes: number; tags: string[];
} {
  return {
    title: `Quest: ${quest.title}`,
    description: quest.description,
    dueDate: date,
    estimatedMinutes: 30,
    tags: ['quest', 'character', quest.questType],
  };
}

export function buildExposurePlannerTask(ladder: ExposureLadder, stepTitle: string, date: string): {
  title: string; description: string; dueDate: string; estimatedMinutes: number; tags: string[];
} {
  return {
    title: `Exposure: ${ladder.title} — ${stepTitle}`,
    description: ladder.description,
    dueDate: date,
    estimatedMinutes: 20,
    tags: ['exposure', 'character', 'ladder'],
  };
}

export function buildReviewPlannerTask(reviewType: 'weekly' | 'season', focus: string, date: string): {
  title: string; description: string; dueDate: string; estimatedMinutes: number; tags: string[];
} {
  return {
    title: `Character ${reviewType === 'season' ? 'Season' : 'Weekly'} Review`,
    description: `Review ${focus}. Reflect on progress, adjust strategy.`,
    dueDate: date,
    estimatedMinutes: reviewType === 'season' ? 45 : 15,
    tags: ['character', 'review', reviewType],
  };
}

export function LINK_TYPE_PREFIX(linkType: CharacterPlannerLinkType): string {
  return `char_${linkType}`;
}
