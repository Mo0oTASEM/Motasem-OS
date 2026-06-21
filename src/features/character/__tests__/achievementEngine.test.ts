import { describe, it, expect } from 'vitest';
import { ACHIEVEMENT_DEFINITIONS, checkNewAchievements } from '../engine/achievementEngine';
import type { AchievementCheckState } from '../engine/achievementEngine';

describe('achievementEngine', () => {
  describe('ACHIEVEMENT_DEFINITIONS', () => {
    it('has at least 10 achievements', () => {
      expect(ACHIEVEMENT_DEFINITIONS.length).toBeGreaterThanOrEqual(10);
    });
    it('all have unique IDs', () => {
      const ids = ACHIEVEMENT_DEFINITIONS.map(a => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('checkNewAchievements', () => {
    const emptyState: AchievementCheckState = {
      profile: null, traits: [], habits: [], quests: [],
      badGuys: [], ladders: [], seasons: [], contracts: [],
      reflections: [], activityLog: [],
    };

    it('returns empty for a fresh profile', () => {
      expect(checkNewAchievements([], emptyState)).toEqual([]);
    });

    it('detects first_habit from activity log', () => {
      const state: AchievementCheckState = {
        ...emptyState,
        activityLog: [{ id: 'l1', userId: 'u1', eventType: 'habit_completed',
          entityType: 'habit', entityId: 'h1', xpDelta: 10,
          traitImpact: {}, metadata: {}, note: '', createdAt: '2024-01-01' }],
      };
      const newAchievements = checkNewAchievements([], state);
      expect(newAchievements.some(a => a.id === 'first_habit')).toBe(true);
    });

    it('detects streak_7 from habits', () => {
      const state: AchievementCheckState = {
        ...emptyState,
        habits: [{ id: 'h1', userId: 'u1', title: 'Test', currentStreak: 7, maxStreak: 7,
          description: '', linkedTraitId: null, habitType: 'build', cue: '',
          expectedResponse: '', replacementBehavior: '', frequency: 'daily',
          scheduledDays: null, preferredTime: null, targetCount: 1, difficulty: 3,
          baseXp: 10, isActive: true, startDate: '2024-01-01', endDate: null,
          plannerTaskId: null, reminderEnabled: false, reminderTime: null,
          lastCompletedDate: null,
          category: '', selectedWeekdays: null, targetValue: 1, unit: 'times',
          priority: 'medium', status: 'active', reminderSettings: {}, notes: '', archiveStatus: false,
          createdAt: '2024-01-01', updatedAt: '2024-01-01',
        }],
      };
      expect(checkNewAchievements([], state).some(a => a.id === 'streak_7')).toBe(true);
    });

    it('does not re-emit existing achievements', () => {
      const state: AchievementCheckState = {
        ...emptyState,
        activityLog: [{ id: 'l1', userId: 'u1', eventType: 'habit_completed',
          entityType: 'habit', entityId: 'h1', xpDelta: 10,
          traitImpact: {}, metadata: {}, note: '', createdAt: '2024-01-01' }],
      };
      expect(checkNewAchievements(['first_habit'], state)).toEqual([]);
    });

    it('detects first_courage_quest from completed quests', () => {
      const state: AchievementCheckState = {
        ...emptyState,
        quests: [{ id: 'q1', userId: 'u1', questType: 'exposure', title: 'Exposure Quest',
          description: '', whyItMatters: '', linkedTraitIds: [], difficulty: 3,
          estimatedDiscomfort: 5, targetDate: null, checklistSteps: [],
          requiredProof: '', proofType: 'text', rewardXp: 50, bonusConditions: [],
          failureRule: 'retry', retryCount: 0, status: 'completed', source: 'user',
          aiGenerationMetadata: {}, plannerTaskId: null, goalId: null,
          crmContactId: null, crmOpportunityId: null, completedAt: '2024-01-01',
          createdAt: '2024-01-01',
        }],
      };
      expect(checkNewAchievements([], state).some(a => a.id === 'first_courage_quest')).toBe(true);
    });
  });
});
