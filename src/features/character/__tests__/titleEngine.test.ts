import { describe, it, expect } from 'vitest';
import { suggestTitles, getLevelTitle, generateCustomTitle } from '../engine/titleEngine';
import type { CharacterProfile, CharacterTrait } from '../types';

describe('titleEngine', () => {
  describe('getLevelTitle', () => {
    it('returns Initiate for level 1', () => expect(getLevelTitle(1)).toBe('Initiate'));
    it('returns Transcendent for level 10', () => expect(getLevelTitle(10)).toBe('Transcendent'));
    it('returns generic for unknown level', () => expect(getLevelTitle(0)).toBe('Level 0'));
  });

  describe('suggestTitles', () => {
    it('returns level title when no traits', () => {
      const titles = suggestTitles({ currentLevel: 1 } as unknown as CharacterProfile, [], [], [], []);
      expect(titles.some(t => t.source === 'level')).toBe(true);
    });

    it('suggests trait-based title for high-XP trait', () => {
      const titles = suggestTitles(
        { currentLevel: 2 } as unknown as CharacterProfile,
        [{ id: 't1', userId: 'u1', name: 'Courage', lifetimeXp: 200,
          description: '', icon: 'star', visualKey: null, currentScore: 10,
          currentRank: 2, targetScore: 10, status: 'active', displayOrder: 1,
          createdAt: '2024-01-01', updatedAt: '2024-01-01',
        } as unknown as CharacterTrait],
        [], [], [],
      );
      expect(titles.some(t => t.title.includes('Courage'))).toBe(true);
    });
  });

  describe('generateCustomTitle', () => {
    it('generates appropriate prefix for rank', () => {
      expect(generateCustomTitle('Courage', 1)).toBe('Aspiring Courage');
      expect(generateCustomTitle('Discipline', 3)).toBe('Advanced Discipline');
      expect(generateCustomTitle('Integrity', 5)).toBe('Master Integrity');
    });
  });
});
