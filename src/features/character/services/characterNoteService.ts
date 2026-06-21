import type { CharacterTrait, CharacterQuest, ExposureLadder, CharacterReflection } from '../types';

export type NoteLinkType =
  | 'trait_insight'
  | 'reflection_entry'
  | 'book_to_trait'
  | 'technique_to_quest'
  | 'boss_fight_lesson'
  | 'ladder_learning'
  | 'bad_guy_pattern'
  | 'season_review';

export interface NoteLinkRequest {
  type: NoteLinkType;
  characterEntityType: string;
  characterEntityId: string;
  characterEntityName: string;
  title: string;
  content: string;
  tags: string[];
  privacySetting?: 'private' | 'shared' | 'public';
}

export function buildNoteFromTrait(trait: CharacterTrait, insight: string): NoteLinkRequest {
  return {
    type: 'trait_insight',
    characterEntityType: 'trait',
    characterEntityId: trait.id,
    characterEntityName: trait.name,
    title: `Trait Insight: ${trait.name}`,
    content: insight,
    tags: ['character', 'trait', trait.name.toLowerCase().replace(/\s+/g, '_')],
  };
}

export function buildNoteFromReflection(reflection: CharacterReflection): NoteLinkRequest {
  return {
    type: 'reflection_entry',
    characterEntityType: 'reflection',
    characterEntityId: reflection.id,
    characterEntityName: 'Reflection',
    title: `Reflection: ${new Date(reflection.createdAt).toLocaleDateString()}`,
    content: [
      reflection.preActionFear ? `Avoiding: ${reflection.preActionFear}` : '',
      reflection.whatHappened ? `Happened: ${reflection.whatHappened}` : '',
      reflection.whatLearned ? `Learned: ${reflection.whatLearned}` : '',
    ].filter(Boolean).join('\n'),
    tags: ['character', 'reflection'],
    privacySetting: reflection.privacySetting,
  };
}

export function buildNoteFromBossFight(quest: CharacterQuest, lesson: string): NoteLinkRequest {
  return {
    type: 'boss_fight_lesson',
    characterEntityType: 'quest',
    characterEntityId: quest.id,
    characterEntityName: quest.title,
    title: `Boss Fight Lesson: ${quest.title}`,
    content: lesson,
    tags: ['character', 'boss_fight', 'lesson'],
  };
}

export function buildNoteFromLadder(ladder: ExposureLadder, learning: string): NoteLinkRequest {
  return {
    type: 'ladder_learning',
    characterEntityType: 'ladder',
    characterEntityId: ladder.id,
    characterEntityName: ladder.title,
    title: `Exposure Learning: ${ladder.title}`,
    content: learning,
    tags: ['character', 'exposure', 'ladder'],
  };
}
