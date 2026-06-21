// ── Request types (mirrors server schemas) ───────────────────

export interface CoachMessageRequest {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  characterContext?: string;
}

export interface QuestGenerationRequest {
  traitId?: string;
  traitName: string;
  availableMinutes: number;
  preferredDifficulty: number;
  currentConfidence: number;
  context?: string;
  locationType?: 'home' | 'work' | 'public' | 'online' | 'phone' | 'other';
  privacyPreference?: 'private' | 'shared' | 'public';
  recentCompletions?: string[];
  plannerWorkload?: number;
}

export interface GeneratedQuest {
  title: string;
  purpose: string;
  steps: string[];
  difficulty: number;
  discomfort: number;
  successDefinition: string;
  safetyOrRespectNotes: string;
  rewardXp: number;
  reflectionQuestion: string;
  easierFallback: string;
  harderNext: string;
  linkedTraitIds: string[];
  whyItMatters: string;
}

export interface LadderGenerationRequest {
  desiredEndBehavior: string;
  linkedTraitId?: string;
  linkedTraitName: string;
  startingDifficulty?: number;
  currentConfidence: number;
  context?: string;
  privacyPreference?: 'private' | 'shared' | 'public';
}

export interface GeneratedLadderStep {
  title: string;
  instructions: string;
  difficulty: number;
  discomfortEstimate: number;
  repetitionTarget: number;
  reflectionRequired: boolean;
}

export interface GeneratedLadder {
  title: string;
  description: string;
  desiredEndBehavior: string;
  steps: GeneratedLadderStep[];
  safetyNotes: string;
}

export interface ReflectionAnalysisRequest {
  reflectionText: {
    preActionFear?: string;
    whatHappened: string;
    whatLearned?: string;
    emotionalIntensityBefore?: number;
    emotionalIntensityAfter?: number;
  };
  consentGiven: true;
  characterContext?: string;
}

export interface ReflectionAnalysisResponse {
  trigger: string;
  prediction: string;
  actualOutcome: string;
  avoidancePattern: string;
  usefulLesson: string;
  cognitiveDistortion: string;
  suggestedNextBehavior: string;
  suggestedIfThenRule?: { trigger: string; action: string };
  suggestedLadderAdjustment: string;
  disclaimer: string;
}

export interface WeeklyReviewRequest {
  characterData: string;
}

export interface WeeklyReviewResponse {
  mainWins: string[];
  avoidedItems: string[];
  mostActiveTraits: string[];
  weakestSystemPoint: string;
  repeatedBadGuy: string;
  bestPerformingPowerUp: string;
  completionByDifficulty: string;
  plannerOverloadNote: string;
  oneRecommendedAdjustment: string;
  nextWeekMission: string;
}

export interface DailyMissionRequest {
  characterContext: string;
  currentSeason?: string;
  focusTrait?: string;
  plannerWorkload?: number;
  recentActivity?: string;
  currentDifficultyPreference?: number;
  recentAvoidance?: string;
  recoveryMode?: boolean;
}

export interface DailyMissionResponse {
  missionTitle: string;
  missionDescription: string;
  estimatedMinutes: number;
  whyThisMatters: string;
  linkedTraitName: string;
  missionType: 'action' | 'reflection' | 'preparation' | 'recovery' | 'connection';
}

export interface AdaptiveSuggestionRequest {
  characterContext: string;
  currentDifficultyPreference?: number;
  recentFailures?: string[];
  recentSuccesses?: string[];
  recoveryMode?: boolean;
  plannerWorkload?: number;
}

export interface AdaptiveSuggestionResponse {
  suggestionType: 'increase_difficulty' | 'repeat_current_step' | 'split_task' | 'change_cue' | 'change_environment' | 'add_proof' | 'add_accountability' | 'pause_temporarily' | 'enter_recovery_mode';
  title: string;
  description: string;
  reason: string;
  estimatedImpact: string;
}
