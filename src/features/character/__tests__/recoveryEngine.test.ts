import { describe, it, expect } from 'vitest';
import {
  getRecoveryState, canToggleRecovery, getRecoveryDailyTarget,
  isEligibleForRecoveryXp,
} from '../engine/recoveryEngine';
import type { CharacterHabit, ActivityLogEntry } from '../types';

describe('recoveryEngine', () => {
  describe('getRecoveryState', () => {
    it('suggests 3 minimum actions when not in recovery', () => {
      const state = getRecoveryState(false, [], [], []);
      expect(state.dailyRequirement).toBe(3);
      expect(state.isActive).toBe(false);
    });

    it('reduces daily requirement in recovery mode', () => {
      const state = getRecoveryState(true, [], [], []);
      expect(state.dailyRequirement).toBe(1);
    });

    it('includes reflection action', () => {
      const state = getRecoveryState(false, [], [], []);
      expect(state.suggestedActions.some(a => a.type === 'reflection')).toBe(true);
    });
  });

  describe('canToggleRecovery', () => {
    it('rejects toggle if no recent activity', () => {
      const result = canToggleRecovery(false, []);
      expect(result.allowed).toBe(false);
    });

    it('allows toggle with recent activity', () => {
      const recentLog: ActivityLogEntry = {
        id: 'l1', userId: 'u1', eventType: 'habit_completed',
        entityType: 'habit', entityId: 'h1', xpDelta: 10,
        traitImpact: {}, metadata: {}, note: '',
        createdAt: new Date().toISOString(),
      };
      const result = canToggleRecovery(false, [recentLog]);
      expect(result.allowed).toBe(true);
    });
  });

  describe('getRecoveryDailyTarget', () => {
    it('returns 1 for no habits', () => expect(getRecoveryDailyTarget([])).toBe(1));
    it('returns ceiling of active/3 for multiple habits', () => {
      const habits: CharacterHabit[] = [
        { id: 'h1', userId: 'u1', title: 'H1', isActive: true, linkedTraitId: null,
          description: '', habitType: 'build', cue: '', expectedResponse: '',
          replacementBehavior: '', frequency: 'daily', scheduledDays: null,
          preferredTime: null, targetCount: 1, difficulty: 3, baseXp: 10,
          startDate: '2024-01-01', endDate: null, plannerTaskId: null,
          reminderEnabled: false, reminderTime: null, currentStreak: 0, maxStreak: 0,
          lastCompletedDate: null, createdAt: '2024-01-01', updatedAt: '2024-01-01',
        } as CharacterHabit,
        { id: 'h2', userId: 'u1', title: 'H2', isActive: true, linkedTraitId: null,
          description: '', habitType: 'build', cue: '', expectedResponse: '',
          replacementBehavior: '', frequency: 'daily', scheduledDays: null,
          preferredTime: null, targetCount: 1, difficulty: 3, baseXp: 10,
          startDate: '2024-01-01', endDate: null, plannerTaskId: null,
          reminderEnabled: false, reminderTime: null, currentStreak: 0, maxStreak: 0,
          lastCompletedDate: null, createdAt: '2024-01-01', updatedAt: '2024-01-01',
        } as CharacterHabit,
        { id: 'h3', userId: 'u1', title: 'H3', isActive: true, linkedTraitId: null,
          description: '', habitType: 'build', cue: '', expectedResponse: '',
          replacementBehavior: '', frequency: 'daily', scheduledDays: null,
          preferredTime: null, targetCount: 1, difficulty: 3, baseXp: 10,
          startDate: '2024-01-01', endDate: null, plannerTaskId: null,
          reminderEnabled: false, reminderTime: null, currentStreak: 0, maxStreak: 0,
          lastCompletedDate: null, createdAt: '2024-01-01', updatedAt: '2024-01-01',
        } as CharacterHabit,
      ];
      expect(getRecoveryDailyTarget(habits)).toBe(1);
    });
  });

  describe('isEligibleForRecoveryXp', () => {
    it('returns false for non-recovery event types', () => {
      expect(isEligibleForRecoveryXp('quest_completed', [], 48)).toBe(false);
    });
    it('returns true for valid recovery event', () => {
      expect(isEligibleForRecoveryXp('power_up_used', [], 48)).toBe(true);
    });
    it('returns false too soon after last recovery', () => {
      expect(isEligibleForRecoveryXp('power_up_used', [], 12)).toBe(false);
    });
  });
});
