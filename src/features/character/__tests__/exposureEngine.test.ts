import { describe, it, expect } from 'vitest';
import {
  canAdvanceStep, suggestStepModification, shouldReturnToPreviousStep,
  computeLadderProgress, validateSuccess,
} from '../engine/exposureEngine';
import type { ExposureStep, ExposureLadder } from '../types';

function makeStep(overrides: Partial<ExposureStep> = {}): ExposureStep {
  return {
    id: 's1', ladderId: 'l1', stepOrder: 1, title: 'Step 1', instructions: '',
    difficulty: 3, discomfortEstimate: 5, repetitionTarget: 3,
    successfulRepetitions: 0, reflectionRequired: false, proofRequired: false,
    status: 'available', createdAt: '2024-01-01', updatedAt: '2024-01-01',
    ...overrides,
  };
}

function makeLadder(overrides: Partial<ExposureLadder> = {}): ExposureLadder {
  return {
    id: 'l1', userId: 'u1', title: 'Test Ladder', description: '',
    linkedTraitId: null, desiredEndBehavior: 'Complete the ladder',
    status: 'active', currentStep: 0, completionPercentage: 0,
    difficultyPolicy: 'graduated', aiAdaptationEnabled: false,
    steps: [], createdAt: '2024-01-01', updatedAt: '2024-01-01',
    ...overrides,
  };
}

describe('exposureEngine', () => {
  describe('canAdvanceStep', () => {
    it('returns false when repetitions below target', () => {
      const step = makeStep({ successfulRepetitions: 1, repetitionTarget: 3 });
      const result = canAdvanceStep({
        step, ladder: makeLadder(), recentAttempts: 0,
        reflection: null, hasProof: false,
      });
      expect(result.canAdvance).toBe(false);
      expect(result.reason).toContain('2 more');
    });

    it('returns false when reflection required but missing', () => {
      const step = makeStep({
        successfulRepetitions: 3, repetitionTarget: 3, reflectionRequired: true,
      });
      const result = canAdvanceStep({
        step, ladder: makeLadder(), recentAttempts: 3,
        reflection: null, hasProof: false,
      });
      expect(result.canAdvance).toBe(false);
      expect(result.reason).toContain('Reflection');
    });

    it('returns true when all conditions met', () => {
      const step = makeStep({
        successfulRepetitions: 3, repetitionTarget: 3,
      });
      const result = canAdvanceStep({
        step, ladder: makeLadder(), recentAttempts: 3,
        reflection: { id: 'r1', userId: 'u1', preActionFear: '', postActionResult: '',
          whatHappened: '', whatLearned: 'I learned to speak up',
          emotionalIntensityBefore: 7, emotionalIntensityAfter: 4, nextStep: '',
          privacySetting: 'private', aiSummaryStatus: 'completed',
          linkedEntityType: null, linkedEntityId: null,
          createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        hasProof: true,
      });
      expect(result.canAdvance).toBe(true);
      expect(result.nextStepDifficulty).toBe(4);
    });
  });

  describe('suggestStepModification', () => {
    it('suggests reduce for high discomfort and many failures', () => {
      const suggestion = suggestStepModification(0, 9, 5);
      expect(suggestion?.type).toBe('reduce');
    });
    it('suggests split for many total attempts', () => {
      const suggestion = suggestStepModification(2, 5, 8);
      expect(suggestion?.type).toBe('split');
    });
    it('suggests repeat for moderate failures', () => {
      const suggestion = suggestStepModification(2, 6, 3);
      expect(suggestion?.type).toBe('repeat');
    });
    it('returns null when no modification needed', () => {
      const suggestion = suggestStepModification(3, 5, 1);
      expect(suggestion).toBeNull();
    });
  });

  describe('shouldReturnToPreviousStep', () => {
    it('returns true with many consecutive failures and previous steps exist', () => {
      const ladder = makeLadder({
        steps: [
          makeStep({ id: 'prev', stepOrder: 0, status: 'completed' }),
          makeStep({ id: 'curr', stepOrder: 1, status: 'in_progress' }),
        ],
      });
      expect(shouldReturnToPreviousStep(ladder.steps[1], ladder, 3)).toBe(true);
    });
    it('returns false with few failures', () => {
      const ladder = makeLadder({ steps: [makeStep()] });
      expect(shouldReturnToPreviousStep(ladder.steps[0], ladder, 1)).toBe(false);
    });
  });

  describe('computeLadderProgress', () => {
    it('returns 0% for no completed steps', () => {
      const steps = [
        makeStep({ id: 's1', status: 'available' }),
        makeStep({ id: 's2', status: 'locked' }),
      ];
      const result = computeLadderProgress(steps);
      expect(result.percent).toBe(0);
      expect(result.completed).toBe(0);
    });
    it('returns 50% for half completed', () => {
      const steps = [
        makeStep({ id: 's1', status: 'completed' }),
        makeStep({ id: 's2', status: 'available' }),
      ];
      expect(computeLadderProgress(steps).percent).toBe(50);
    });
  });

  describe('validateSuccess', () => {
    it('rejects outcome-dependent behaviors', () => {
      expect(validateSuccess('Get her phone number')).toBe(false);
      expect(validateSuccess('Close the sale')).toBe(false);
      expect(validateSuccess('Win the argument')).toBe(false);
    });
    it('accepts action-based behaviors', () => {
      expect(validateSuccess('Start a conversation with a stranger')).toBe(true);
      expect(validateSuccess('Give the pitch and handle objections calmly')).toBe(true);
    });
  });
});
