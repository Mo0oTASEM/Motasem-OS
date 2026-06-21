import type { ExposureStep, ExposureLadder, CharacterReflection } from '../types';

export interface StepAdvancementInput {
  step: ExposureStep;
  ladder: ExposureLadder;
  recentAttempts: number;
  reflection: CharacterReflection | null;
  hasProof: boolean;
}

export interface StepAdvancementResult {
  canAdvance: boolean;
  reason: string;
  requiredReps: number;
  currentReps: number;
  needsReflection: boolean;
  needsProof: boolean;
  confidenceTrend: 'rising' | 'stable' | 'insufficient';
  nextStepDifficulty?: number;
}

export interface StepSuggestion {
  type: 'repeat' | 'reduce' | 'split' | 'skip' | 'redesign' | 'return';
  reason: string;
  newDifficulty?: number;
}

const MIN_DISCOMFORT_ADVANCE = 3;

export function canAdvanceStep(input: StepAdvancementInput): StepAdvancementResult {
  const { step, recentAttempts, reflection, hasProof } = input;

  const currentReps = step.successfulRepetitions;
  const requiredReps = step.repetitionTarget;
  const needsReflection = step.reflectionRequired && !reflection;
  const needsProof = step.proofRequired && !hasProof;

  if (currentReps < requiredReps) {
    return {
      canAdvance: false,
      reason: `Need ${requiredReps - currentReps} more successful attempt(s)`,
      requiredReps,
      currentReps,
      needsReflection,
      needsProof,
      confidenceTrend: 'insufficient',
    };
  }

  if (needsReflection) {
    return {
      canAdvance: false,
      reason: 'Reflection required before advancing',
      requiredReps,
      currentReps,
      needsReflection,
      needsProof,
      confidenceTrend: 'stable',
    };
  }

  const trend: 'rising' | 'stable' | 'insufficient' =
    recentAttempts >= 3 ? 'rising'
    : recentAttempts >= 1 ? 'stable'
    : 'insufficient';

  const nextDifficulty = Math.min(10, step.difficulty + 1);

  return {
    canAdvance: true,
    reason: 'Ready to advance',
    requiredReps,
    currentReps,
    needsReflection: false,
    needsProof,
    confidenceTrend: trend,
    nextStepDifficulty: nextDifficulty,
  };
}

export function suggestStepModification(
  attemptsBeforeCompletion: number,
  selfRatedDiscomfort: number,
  failures: number,
): StepSuggestion | null {
  const totalAttempts = attemptsBeforeCompletion + failures;

  if (failures >= 5 && selfRatedDiscomfort >= 8) {
    return {
      type: 'reduce',
      reason: 'This step feels very hard. Consider reducing difficulty or splitting into smaller steps.',
      newDifficulty: Math.max(1, Math.floor(selfRatedDiscomfort / 2)),
    };
  }

  if (totalAttempts >= 10 && attemptsBeforeCompletion <= 2) {
    return {
      type: 'split',
      reason: 'This step is being completed too quickly. Split it into smaller gradations.',
    };
  }

  if (failures >= 3 && selfRatedDiscomfort >= 6) {
    return {
      type: 'repeat',
      reason: 'Repeating this step builds confidence before moving forward.',
    };
  }

  if (selfRatedDiscomfort < MIN_DISCOMFORT_ADVANCE) {
    return {
      type: 'skip',
      reason: 'This step feels too easy. Consider skipping ahead.',
    };
  }

  return null;
}

export function shouldReturnToPreviousStep(
  currentStep: ExposureStep,
  ladder: ExposureLadder,
  consecutiveFailures: number,
): boolean {
  if (consecutiveFailures < 3) return false;
  const previousSteps = ladder.steps.filter(s => s.stepOrder < currentStep.stepOrder);
  return previousSteps.length > 0;
}

export function computeLadderProgress(steps: ExposureStep[]): {
  completed: number;
  total: number;
  percent: number;
  currentStepIndex: number;
} {
  const completed = steps.filter(s => s.status === 'completed').length;
  const total = steps.length;
  const activeStep = steps.find(s => s.status === 'in_progress' || s.status === 'available');
  const currentStepIndex = activeStep ? steps.indexOf(activeStep) : Math.min(completed, total - 1);

  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    currentStepIndex: Math.max(0, currentStepIndex),
  };
}

export function validateSuccess(behavior: string): boolean {
  const outcomeDependentPatterns = [
    /phone\s*numb(er|ber)/i,
    /close\s*(the\s*)?sale/i,
    /approval/i,
    /win.*argument/i,
    /accept.*everyone/i,
    /get.*number/i,
    /make.*sale/i,
    /convince/i,
  ];
  return !outcomeDependentPatterns.some(p => p.test(behavior));
}
