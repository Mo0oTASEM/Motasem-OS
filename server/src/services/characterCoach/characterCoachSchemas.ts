import { z } from 'zod';

// ── Coach Chat ──────────────────────────────────────────────
export const coachMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).default([]),
  characterContext: z.string().max(8000).default(''),
});

export type CoachMessageRequest = z.output<typeof coachMessageSchema>;

// ── Quest Generation ────────────────────────────────────────
export const questGenerationSchema = z.object({
  traitId: z.string().optional(),
  traitName: z.string().min(1),
  availableMinutes: z.number().min(1).max(480),
  preferredDifficulty: z.number().min(1).max(10),
  currentConfidence: z.number().min(1).max(10),
  context: z.string().max(2000).default(''),
  locationType: z.enum(['home', 'work', 'public', 'online', 'phone', 'other']).default('other'),
  privacyPreference: z.enum(['private', 'shared', 'public']).default('private'),
  recentCompletions: z.array(z.string()).default([]),
  plannerWorkload: z.number().min(0).max(20).default(0),
});

export type QuestGenerationRequest = z.output<typeof questGenerationSchema>;

export const generatedQuestSchema = z.object({
  title: z.string().min(1).max(200),
  purpose: z.string().min(1).max(500),
  steps: z.array(z.string()).min(1).max(10),
  difficulty: z.number().min(1).max(10),
  discomfort: z.number().min(1).max(10),
  successDefinition: z.string().min(1).max(500),
  safetyOrRespectNotes: z.string().max(1000).default(''),
  rewardXp: z.number().min(5).max(500),
  reflectionQuestion: z.string().min(1).max(500),
  easierFallback: z.string().min(1).max(500),
  harderNext: z.string().min(1).max(500),
  linkedTraitIds: z.array(z.string()).default([]),
  whyItMatters: z.string().min(1).max(500),
});

export type GeneratedQuest = z.output<typeof generatedQuestSchema>;

export const questGenerationResponseSchema = z.object({
  quest: generatedQuestSchema,
  disclaimer: z.string().default(''),
});

// ── Exposure Ladder Generation ──────────────────────────────
export const ladderGenerationSchema = z.object({
  desiredEndBehavior: z.string().min(1).max(500),
  linkedTraitId: z.string().optional(),
  linkedTraitName: z.string().min(1).max(100),
  startingDifficulty: z.number().min(1).max(10).default(2),
  currentConfidence: z.number().min(1).max(10),
  context: z.string().max(2000).default(''),
  privacyPreference: z.enum(['private', 'shared', 'public']).default('private'),
});

export type LadderGenerationRequest = z.output<typeof ladderGenerationSchema>;

const generatedStepSchema = z.object({
  title: z.string().min(1).max(200),
  instructions: z.string().min(1).max(500),
  difficulty: z.number().min(1).max(10),
  discomfortEstimate: z.number().min(1).max(10),
  repetitionTarget: z.number().min(1).max(50),
  reflectionRequired: z.boolean().default(false),
});

export const generatedLadderSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  desiredEndBehavior: z.string().min(1).max(500),
  steps: z.array(generatedStepSchema).min(3).max(15),
  safetyNotes: z.string().max(1000).default(''),
});

export type GeneratedLadder = z.output<typeof generatedLadderSchema>;

export const ladderGenerationResponseSchema = z.object({
  ladder: generatedLadderSchema,
  disclaimer: z.string().default(''),
});

// ── Reflection Analysis ─────────────────────────────────────
export const reflectionAnalysisSchema = z.object({
  reflectionText: z.object({
    preActionFear: z.string().max(2000).default(''),
    whatHappened: z.string().max(4000),
    whatLearned: z.string().max(2000).default(''),
    emotionalIntensityBefore: z.number().min(0).max(10).optional(),
    emotionalIntensityAfter: z.number().min(0).max(10).optional(),
  }),
  consentGiven: z.literal(true, { errorMap: () => ({ message: 'You must opt in to AI analysis for this reflection.' }) }),
  characterContext: z.string().max(4000).default(''),
});

export type ReflectionAnalysisRequest = z.output<typeof reflectionAnalysisSchema>;

export const reflectionAnalysisResponseSchema = z.object({
  trigger: z.string().max(500),
  prediction: z.string().max(500),
  actualOutcome: z.string().max(500),
  avoidancePattern: z.string().max(500).default(''),
  usefulLesson: z.string().max(500),
  cognitiveDistortion: z.string().max(500).default(''),
  suggestedNextBehavior: z.string().max(500),
  suggestedIfThenRule: z.object({
    trigger: z.string().max(200),
    action: z.string().max(200),
  }).optional(),
  suggestedLadderAdjustment: z.string().max(500).default(''),
  disclaimer: z.string().default('This is an AI interpretation of your reflection, not a clinical diagnosis.'),
});

export type ReflectionAnalysisResponse = z.output<typeof reflectionAnalysisResponseSchema>;

// ── Weekly Review ────────────────────────────────────────────
export const weeklyReviewSchema = z.object({
  characterData: z.string().max(10000),
});

export type WeeklyReviewRequest = z.output<typeof weeklyReviewSchema>;

export const weeklyReviewResponseSchema = z.object({
  mainWins: z.array(z.string()).max(10),
  avoidedItems: z.array(z.string()).max(10),
  mostActiveTraits: z.array(z.string()).max(5),
  weakestSystemPoint: z.string().max(500),
  repeatedBadGuy: z.string().max(500).default(''),
  bestPerformingPowerUp: z.string().max(500).default(''),
  completionByDifficulty: z.string().max(500).default(''),
  plannerOverloadNote: z.string().max(500).default(''),
  oneRecommendedAdjustment: z.string().max(500),
  nextWeekMission: z.string().max(500),
});

export type WeeklyReviewResponse = z.output<typeof weeklyReviewResponseSchema>;

// ── Daily Mission ────────────────────────────────────────────
export const dailyMissionSchema = z.object({
  characterContext: z.string().max(5000),
  currentSeason: z.string().max(200).default(''),
  focusTrait: z.string().max(100).default(''),
  plannerWorkload: z.number().min(0).max(20).default(0),
  recentActivity: z.string().max(1000).default(''),
  currentDifficultyPreference: z.number().min(1).max(10).default(5),
  recentAvoidance: z.string().max(500).default(''),
  recoveryMode: z.boolean().default(false),
});

export type DailyMissionRequest = z.output<typeof dailyMissionSchema>;

export const dailyMissionResponseSchema = z.object({
  missionTitle: z.string().min(1).max(200),
  missionDescription: z.string().min(1).max(500),
  estimatedMinutes: z.number().min(2).max(30),
  whyThisMatters: z.string().min(1).max(500),
  linkedTraitName: z.string().max(100).default(''),
  missionType: z.enum(['action', 'reflection', 'preparation', 'recovery', 'connection']),
});

export type DailyMissionResponse = z.output<typeof dailyMissionResponseSchema>;

// ── Adaptive Suggestion ─────────────────────────────────────
export const adaptiveSuggestionSchema = z.object({
  characterContext: z.string().max(5000),
  currentDifficultyPreference: z.number().min(1).max(10).default(5),
  recentFailures: z.array(z.string()).default([]),
  recentSuccesses: z.array(z.string()).default([]),
  recoveryMode: z.boolean().default(false),
  plannerWorkload: z.number().min(0).max(20).default(0),
});

export type AdaptiveSuggestionRequest = z.output<typeof adaptiveSuggestionSchema>;

export const adaptiveSuggestionTypeEnum = z.enum([
  'increase_difficulty', 'repeat_current_step', 'split_task',
  'change_cue', 'change_environment', 'add_proof',
  'add_accountability', 'pause_temporarily', 'enter_recovery_mode',
]);

export const adaptiveSuggestionResponseSchema = z.object({
  suggestionType: adaptiveSuggestionTypeEnum,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  reason: z.string().min(1).max(500),
  estimatedImpact: z.string().max(500).default(''),
});

export type AdaptiveSuggestionResponse = z.output<typeof adaptiveSuggestionResponseSchema>;

// ── Generic coach response ──────────────────────────────────
export const coachResponseSchema = z.object({
  reply: z.string(),
  suggestedActions: z.array(z.object({
    type: z.string(),
    label: z.string(),
    payload: z.record(z.unknown()).default({}),
  })).default([]),
  disclaimer: z.string().default(''),
});
