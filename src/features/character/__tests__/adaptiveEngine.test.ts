import { describe, it, expect } from 'vitest';
import { getAdaptiveSuggestions, filterForRecoveryMode } from '../engine/adaptiveEngine';
import type { AdaptiveInput, AdaptiveSuggestion } from '../engine/adaptiveEngine';

describe('adaptiveEngine', () => {
  const baseInput: AdaptiveInput = {
    habits: [],
    quests: [],
    traits: [],
    activityLog: [],
    reflections: [],
    profile: null,
    plannerWorkload: 3,
  };

  it('suggests restart when no habits or quests exist', () => {
    const suggestions = getAdaptiveSuggestions(baseInput);
    expect(suggestions.some(s => s.type === 'restart')).toBe(true);
  });

  it('suggests difficulty increase for high completion rate', () => {
    const logs = [];
    for (let i = 0; i < 10; i++) {
      const d = new Date(Date.now() - i * 86400000);
      logs.push({
        id: `l${i}`, userId: 'u1', eventType: 'habit_completed',
        entityType: 'habit', entityId: 'h1', xpDelta: 10,
        traitImpact: {}, metadata: {}, note: '',
        createdAt: d.toISOString(),
      });
    }
    const suggestions = getAdaptiveSuggestions({
      ...baseInput,
      habits: [{ id: 'h1', userId: 'u1', title: 'Test', difficulty: 3, isActive: true,
        linkedTraitId: null, description: '', habitType: 'build', cue: '',
        expectedResponse: '', replacementBehavior: '', frequency: 'daily',
        scheduledDays: null, preferredTime: null, targetCount: 1, baseXp: 10,
        startDate: '2024-01-01', endDate: null, plannerTaskId: null,
        reminderEnabled: false, reminderTime: null, currentStreak: 0, maxStreak: 0,
        lastCompletedDate: null,
        category: '', selectedWeekdays: null, targetValue: 1, unit: 'times',
        priority: 'medium', status: 'active', reminderSettings: {}, notes: '', archiveStatus: false,
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      }],
      activityLog: logs,
    });
    expect(suggestions.some(s => s.type === 'difficulty_increase')).toBe(true);
  });

  it('suggests recovery mode when no recent activity', () => {
    const suggestions = getAdaptiveSuggestions({
      ...baseInput,
      profile: { preferredDifficulty: 3, recoveryMode: false, currentLevel: 1 },
    });
    expect(suggestions.some(s => s.type === 'recovery_suggest')).toBe(true);
  });

  it('suggests difficulty decrease for low completion rate', () => {
    const logs = [];
    for (let i = 0; i < 5; i++) {
      logs.push({
        id: `l${i}`, userId: 'u1',
        eventType: i < 2 ? 'habit_completed' : 'bad_guy_triggered',
        entityType: 'habit', entityId: 'h1', xpDelta: 10,
        traitImpact: {}, metadata: {}, note: '',
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      });
    }
    const suggestions = getAdaptiveSuggestions({
      ...baseInput,
      habits: [{ id: 'h1', userId: 'u1', title: 'Test', difficulty: 5, isActive: true,
        linkedTraitId: null, description: '', habitType: 'build', cue: '',
        expectedResponse: '', replacementBehavior: '', frequency: 'daily',
        scheduledDays: null, preferredTime: null, targetCount: 1, baseXp: 10,
        startDate: '2024-01-01', endDate: null, plannerTaskId: null,
        reminderEnabled: false, reminderTime: null, currentStreak: 0, maxStreak: 0,
        lastCompletedDate: null,
        category: '', selectedWeekdays: null, targetValue: 1, unit: 'times',
        priority: 'medium', status: 'active', reminderSettings: {}, notes: '', archiveStatus: false,
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      }],
      activityLog: logs,
    });
    expect(suggestions.some(s => s.type === 'difficulty_decrease')).toBe(true);
  });

  describe('filterForRecoveryMode', () => {
    it('only returns recovery-appropriate suggestions', () => {
      const suggestions: AdaptiveSuggestion[] = [
        { type: 'restart', priority: 'high', title: 'Restart', description: '', action: '', reason: '' },
        { type: 'difficulty_increase', priority: 'low', title: 'Increase', description: '', action: '', reason: '' },
        { type: 'recovery_suggest', priority: 'high', title: 'Recovery', description: '', action: '', reason: '' },
      ];
      const filtered = filterForRecoveryMode(suggestions);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(s => s.type === 'restart' || s.type === 'recovery_suggest')).toBe(true);
    });
  });
});
