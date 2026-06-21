import type {
  CharacterProfile, CharacterTrait, CharacterHabit, CharacterQuest,
  CharacterBadGuy, ExposureLadder, CharacterSeason, CharacterContract,
  CharacterReflection, ActivityLogEntry,
} from '../types';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  check: (
    state: AchievementCheckState,
  ) => boolean;
}

export interface AchievementCheckState {
  profile: CharacterProfile | null;
  traits: CharacterTrait[];
  habits: CharacterHabit[];
  quests: CharacterQuest[];
  badGuys: CharacterBadGuy[];
  ladders: ExposureLadder[];
  seasons: CharacterSeason[];
  contracts: CharacterContract[];
  reflections: CharacterReflection[];
  activityLog: ActivityLogEntry[];
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_habit',
    title: 'First Habit Completed',
    description: 'Completed your first habit',
    icon: 'check-circle',
    check: (s) => s.activityLog.some(l => l.eventType === 'habit_completed'),
  },
  {
    id: 'streak_7',
    title: 'Seven Days of Consistency',
    description: 'Maintained a 7-day streak on any habit',
    icon: 'flame',
    check: (s) => s.habits.some(h => h.currentStreak >= 7),
  },
  {
    id: 'streak_30',
    title: 'One Month of Dedication',
    description: 'Reached a 30-day streak on any habit',
    icon: 'award',
    check: (s) => s.habits.some(h => h.currentStreak >= 30),
  },
  {
    id: 'first_courage_quest',
    title: 'First Courage Quest',
    description: 'Completed your first exposure or courage quest',
    icon: 'target',
    check: (s) => s.quests.some(q =>
      (q.questType === 'exposure' || q.questType === 'courage') && q.status === 'completed'),
  },
  {
    id: 'first_exposure_quest',
    title: 'First Exposure Quest',
    description: 'Started the exposure journey',
    icon: 'eye',
    check: (s) => s.quests.some(q => q.questType === 'exposure' && q.status === 'completed'),
  },
  {
    id: 'five_resists',
    title: 'Five Bad Guys Resisted',
    description: 'Resisted bad guy patterns 5 times',
    icon: 'shield',
    check: (s) => s.badGuys.reduce((sum, bg) => sum + bg.defeatedCount, 0) >= 5,
  },
  {
    id: 'returned_from_lapse',
    title: 'Returned After a Bad Week',
    description: 'Used recovery mode or returned after 7+ days of inactivity',
    icon: 'rotate-ccw',
    check: (s) => s.activityLog.some(l =>
      l.eventType === 'recovery_mode_toggled' && l.note === 'enabled'),
  },
  {
    id: 'completed_ladder',
    title: 'Exposure Ladder Master',
    description: 'Completed an entire exposure ladder',
    icon: 'stairs',
    check: (s) => s.ladders.some(l => l.status === 'completed'),
  },
  {
    id: 'completed_season',
    title: 'Character Season Completed',
    description: 'Finished a full character season',
    icon: 'calendar',
    check: (s) => s.seasons.some(se => se.status === 'completed'),
  },
  {
    id: 'first_contract',
    title: 'First Accountability Contract',
    description: 'Fulfilled your first contract',
    icon: 'file-check',
    check: (s) => s.contracts.some(c => c.completionStatus === 'completed'),
  },
  {
    id: 'five_reflections',
    title: 'Reflective Practitioner',
    description: 'Submitted 5 meaningful reflections',
    icon: 'book-open',
    check: (s) => s.reflections.length >= 5,
  },
  {
    id: 'first_sales_attempt',
    title: 'First Sales Attempt',
    description: 'Completed a sales-related quest or habit',
    icon: 'trending-up',
    check: (s) => s.activityLog.some(l =>
      l.eventType === 'quest_completed' && l.note?.toLowerCase().includes('sales')),
  },
  {
    id: 'calm_boundary',
    title: 'First Calm Boundary',
    description: 'Set a boundary or completed a boundary-setting step',
    icon: 'shield',
    check: (s) => {
      const boundaryTrait = s.traits.find(t => t.name === 'Boundary Setting');
      return boundaryTrait ? boundaryTrait.lifetimeXp > 0 : false;
    },
  },
  {
    id: 'published_despite_fear',
    title: 'Published Despite Fear',
    description: 'Created and shared content publicly',
    icon: 'globe',
    check: (s) => s.traits.some(t => t.name === 'Courage' && t.lifetimeXp >= 100),
  },
  {
    id: 'asked_for_help',
    title: 'Asked for Help',
    description: 'Logged a contract or quest involving requesting help',
    icon: 'heart',
    check: (s) => s.quests.some(q =>
      q.status === 'completed' && q.title.toLowerCase().includes('help')),
  },
  {
    id: 'level_5',
    title: 'Resilient Operator',
    description: 'Reached Level 5 in character progression',
    icon: 'zap',
    check: (s) => (s.profile?.currentLevel ?? 0) >= 5,
  },
  {
    id: 'all_traits',
    title: 'Full Trait Spectrum',
    description: 'Unlocked all 14 character traits',
    icon: 'layers',
    check: (s) => s.traits.length >= 14,
  },
];

export function checkNewAchievements(
  existingIds: string[],
  state: AchievementCheckState,
): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS.filter(
    a => !existingIds.includes(a.id) && a.check(state),
  );
}
