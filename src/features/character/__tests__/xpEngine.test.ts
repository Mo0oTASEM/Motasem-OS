import { describe, it, expect } from 'vitest';
import {
  habitXp, questXp, exposureStepXp, resistBadGuyXp,
  reflectionXp,
  integrityBonusXp, isContentMeaningful,
} from '../engine/xpEngine';

describe('xpEngine', () => {
  describe('habitXp', () => {
    it('returns base XP for difficulty 1 with no streak', () => {
      const r = habitXp(1, 0);
      expect(r.base).toBe(5);
      expect(r.streakBonus).toBe(0);
      expect(r.category).toBe('consistency');
    });
    it('returns medium XP for difficulty 3-4', () => {
      expect(habitXp(3, 0).base).toBe(10);
      expect(habitXp(4, 0).base).toBe(10);
    });
    it('returns hard XP for difficulty 5+', () => {
      expect(habitXp(5, 0).base).toBe(15);
      expect(habitXp(10, 0).base).toBe(25);
    });
    it('applies streak bonus at 7 days', () => {
      const r = habitXp(3, 7);
      expect(r.streakBonus).toBeGreaterThan(0);
      expect(r.total).toBe(r.base + r.streakBonus);
    });
    it('applies higher bonus at 14 days', () => {
      const r7 = habitXp(3, 7);
      const r14 = habitXp(3, 14);
      expect(r14.streakBonus).toBeGreaterThan(r7.streakBonus);
    });
    it('applies highest bonus at 30 days', () => {
      const r14 = habitXp(3, 14);
      const r30 = habitXp(3, 30);
      expect(r30.streakBonus).toBeGreaterThanOrEqual(r14.streakBonus);
    });
  });

  describe('questXp', () => {
    it('uses reward XP for standard quests', () => {
      const r = questXp(50, 'standard', 0);
      expect(r.total).toBe(50);
      expect(r.category).toBe('general');
    });
    it('applies boss fight multiplier', () => {
      const r = questXp(100, 'boss_fight', 0);
      expect(r.total).toBeGreaterThanOrEqual(200);
      expect(r.category).toBe('courage');
    });
    it('adds step bonus', () => {
      const r = questXp(15, 'standard', 3);
      expect(r.total).toBeGreaterThan(15);
    });
  });

  describe('exposureStepXp', () => {
    it('scales with difficulty', () => {
      const r1 = exposureStepXp(1, 1);
      const r5 = exposureStepXp(5, 1);
      expect(r5.total).toBeGreaterThan(r1.total);
      expect(r1.category).toBe('courage');
    });
    it('adds attempt bonus for re-attempts', () => {
      const r1 = exposureStepXp(3, 1);
      const r2 = exposureStepXp(3, 2);
      expect(r2.total).toBeGreaterThan(r1.total);
    });
  });

  describe('resistBadGuyXp', () => {
    it('scales with severity', () => {
      const r1 = resistBadGuyXp(1);
      const r5 = resistBadGuyXp(5);
      expect(r5.total).toBeGreaterThan(r1.total);
    });
  });

  describe('integrityBonusXp', () => {
    it('returns integrity bonus', () => {
      expect(integrityBonusXp().total).toBe(10);
      expect(integrityBonusXp().category).toBe('integrity');
    });
  });

  describe('reflectionXp', () => {
    it('returns 0 for short content', () => {
      expect(reflectionXp(10).total).toBe(0);
    });
    it('returns 15 for minimum content', () => {
      expect(reflectionXp(30).total).toBe(15);
    });
    it('returns 20 for long content', () => {
      expect(reflectionXp(250).total).toBe(20);
    });
  });

  describe('isContentMeaningful', () => {
    it('rejects empty strings', () => expect(isContentMeaningful('', 1)).toBe(false));
    it('rejects short filler', () => expect(isContentMeaningful('ok', 1)).toBe(false));
    it('accepts meaningful text', () => expect(isContentMeaningful('I felt nervous but I did it anyway because I want to grow.', 5)).toBe(true));
  });
});
