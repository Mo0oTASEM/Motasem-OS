import { describe, it, expect } from 'vitest';
import {
  calculateStreak, isOnStreak,
  missedDayNote, GRACE_TOKENS_PER_WEEK,
} from '../engine/streakEngine';
import type { CharacterHabit } from '../types';

function makeHabit(overrides: Partial<CharacterHabit> = {}): CharacterHabit {
  return {
    id: 'h1', userId: 'u1', title: 'Test Habit', description: '', linkedTraitId: null,
    habitType: 'build', cue: '', expectedResponse: '', replacementBehavior: '',
    frequency: 'daily', scheduledDays: null, preferredTime: null, targetCount: 1,
    difficulty: 3, baseXp: 10, isActive: true, startDate: '2024-01-01', endDate: null,
    plannerTaskId: null, reminderEnabled: false, reminderTime: null,
    currentStreak: 0, maxStreak: 0, lastCompletedDate: null,
    category: '', selectedWeekdays: null, targetValue: 1, unit: 'times',
    priority: 'medium', status: 'active', reminderSettings: {}, notes: '', archiveStatus: false,
    createdAt: '2024-01-01', updatedAt: '2024-01-01',
    ...overrides,
  } as CharacterHabit;
}

describe('streakEngine', () => {
  describe('calculateStreak', () => {
    it('starts at 1 for first completion', () => {
      const habit = makeHabit({ lastCompletedDate: null });
      const result = calculateStreak(habit, 0);
      expect(result.currentStreak).toBe(1);
      expect(result.isNewStreak).toBe(true);
    });

    it('continues streak for consecutive days', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const habit = makeHabit({ currentStreak: 5, lastCompletedDate: yesterday });
      const result = calculateStreak(habit, 0);
      expect(result.currentStreak).toBe(6);
      expect(result.isNewStreak).toBe(true);
    });

    it('resets streak if gap is 2+ days and no grace token', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
      const habit = makeHabit({ currentStreak: 10, lastCompletedDate: twoDaysAgo });
      const result = calculateStreak(habit, 0);
      expect(result.currentStreak).toBe(1);
      expect(result.graceTokenUsed).toBe(false);
    });

    it('uses grace token if available for 1-day gap', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
      const habit = makeHabit({ currentStreak: 10, lastCompletedDate: twoDaysAgo, maxStreak: 10 });
      const result = calculateStreak(habit, GRACE_TOKENS_PER_WEEK);
      expect(result.currentStreak).toBe(11);
      expect(result.graceTokenUsed).toBe(true);
      expect(result.graceTokensRemaining).toBe(GRACE_TOKENS_PER_WEEK - 1);
    });

    it('returns no new streak if already completed today', () => {
      const today = new Date().toISOString().split('T')[0];
      const habit = makeHabit({ currentStreak: 5, lastCompletedDate: today });
      const result = calculateStreak(habit, 0);
      expect(result.isNewStreak).toBe(false);
      expect(result.currentStreak).toBe(5);
    });
  });

  describe('isOnStreak', () => {
    it('returns false without completion date', () => {
      expect(isOnStreak(makeHabit({ lastCompletedDate: null }))).toBe(false);
    });
    it('returns true if completed yesterday', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      expect(isOnStreak(makeHabit({ lastCompletedDate: yesterday }))).toBe(true);
    });
    it('returns true if completed today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isOnStreak(makeHabit({ lastCompletedDate: today }))).toBe(true);
    });
  });

  describe('missedDayNote', () => {
    it('returns gentle message for 1 day', () => {
      const msg = missedDayNote(1, 'Morning Run');
      expect(msg).toContain('okay');
      expect(msg).toContain('Morning Run');
    });
    it('mentions recovery for longer gaps', () => {
      const msg = missedDayNote(5, 'Reading');
      expect(msg).toContain('Recovery');
    });
  });
});
