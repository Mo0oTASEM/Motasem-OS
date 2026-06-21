import { describe, it, expect } from 'vitest';
import {
  requiredXpForLevel,
  levelFromXp,
  currentLevelXp,
  xpToNextLevel,
  levelTitle,
  levelProgressPercent,
} from '../engine/levelEngine';

describe('levelEngine', () => {
  describe('requiredXpForLevel', () => {
    it('returns 100 * 1^1.5 = 100 for level 1', () => {
      expect(requiredXpForLevel(1)).toBe(100);
    });
    it('returns round(100 * 2^1.5) = 283 for level 2', () => {
      expect(requiredXpForLevel(2)).toBe(283);
    });
    it('returns round(100 * 10^1.5) = 3162 for level 10', () => {
      expect(requiredXpForLevel(10)).toBe(3162);
    });
    it('increases monotonically', () => {
      for (let i = 1; i < 10; i++) {
        expect(requiredXpForLevel(i)).toBeLessThan(requiredXpForLevel(i + 1));
      }
    });
  });

  describe('levelFromXp', () => {
    it('returns 1 for 0 XP', () => {
      expect(levelFromXp(0)).toBe(1);
    });
    it('returns 1 for 50 XP', () => {
      expect(levelFromXp(50)).toBe(1);
    });
    it('returns 2 for 283 XP', () => {
      expect(levelFromXp(283)).toBe(2);
    });
    it('returns 3 for 600 XP', () => {
      expect(levelFromXp(600)).toBe(3);
    });
    it('returns 10 for 100000 XP (max level)', () => {
      expect(levelFromXp(100000)).toBe(10);
    });
  });

  describe('currentLevelXp', () => {
    it('returns total XP for level 1', () => {
      expect(currentLevelXp(50, 1)).toBe(50);
    });
    it('returns XP minus level 1 threshold for level 2', () => {
      expect(currentLevelXp(300, 2)).toBe(300 - requiredXpForLevel(1));
    });
    it('returns XP minus previous level threshold', () => {
      expect(currentLevelXp(1000, 4)).toBe(1000 - requiredXpForLevel(3));
    });
  });

  describe('xpToNextLevel', () => {
    it('returns correct XP to next level', () => {
      const xp = 50;
      const lvl = levelFromXp(xp);
      expect(xpToNextLevel(xp, lvl)).toBe(requiredXpForLevel(lvl + 1) - xp);
    });
    it('returns 0 at max level', () => {
      expect(xpToNextLevel(100000, 10)).toBe(0);
    });
  });

  describe('levelTitle', () => {
    it('returns Initiate for level 1', () => expect(levelTitle(1)).toBe('Initiate'));
    it('returns Transcendent for level 10', () => expect(levelTitle(10)).toBe('Transcendent'));
    it('returns generic for unknown level', () => expect(levelTitle(11)).toBe('Level 11'));
  });

  describe('levelProgressPercent', () => {
    it('returns 0 at start of level', () => {
      expect(levelProgressPercent(0, 1)).toBe(0);
    });
    it('returns 100 at end of level', () => {
      const nextLvl = requiredXpForLevel(2);
      expect(levelProgressPercent(nextLvl - 1, 2)).toBeGreaterThanOrEqual(99);
    });
    it('returns 50 halfway through level', () => {
      const mid = Math.round((requiredXpForLevel(1) + requiredXpForLevel(2)) / 2);
      expect(levelProgressPercent(mid, 2)).toBeGreaterThanOrEqual(40);
      expect(levelProgressPercent(mid, 2)).toBeLessThanOrEqual(60);
    });
  });
});
