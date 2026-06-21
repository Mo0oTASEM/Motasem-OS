// Character System Domain Types — v2 (relational DB schema)
// Maps 1:1 to PostgreSQL tables. All timestamps are ISO strings.
// ============================================================

// ── Character Profile ──────────────────────────────────────
export interface CharacterProfile {
  id: string;
  userId: string;
  title: string;
  identityStatement: string;
  currentLevel: number;
  totalXp: number;
  currentLevelXp: number;
  selectedArchetype: string | null;
  activeSeasonId: string | null;
  onboardingStatus: OnboardingStatus;
  preferredDifficulty: number;
  recoveryMode: boolean;
  currentStreak: number;
  maxStreak: number;
  currentScore: number;
  selectedFocusAreas: string[];
  activeDevelopmentPhase: string;
  avatarConfig: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed';

// ── Character Traits ───────────────────────────────────────
export interface CharacterTrait {
  id: string;
  userId: string;
  name: string;
  description: string;
  icon: string;
  visualKey: string | null;
  currentScore: number;
  lifetimeXp: number;
  currentRank: number;
  targetScore: number;
  status: TraitStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type TraitStatus = 'active' | 'archived' | 'locked';

// ── Character Habits ───────────────────────────────────────
export interface CharacterHabit {
  id: string;
  userId: string;
  title: string;
  description: string;
  linkedTraitId: string | null;
  habitType: HabitType;
  cue: string;
  expectedResponse: string;
  replacementBehavior: string;
  frequency: string;
  scheduledDays: number[] | null;
  preferredTime: string | null;
  targetCount: number;
  difficulty: number;
  baseXp: number;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  plannerTaskId: string | null;
  reminderEnabled: boolean;
  reminderTime: string | null;
  currentStreak: number;
  maxStreak: number;
  lastCompletedDate: string | null;
  category: string;
  selectedWeekdays: number[] | null;
  targetValue: number;
  unit: string;
  priority: string;
  status: string;
  reminderSettings: Record<string, unknown>;
  notes: string;
  archiveStatus: boolean;
  createdAt: string;
  updatedAt: string;
}

export type HabitType = 'build' | 'break' | 'never_do' | 'reduce' | 'quit';

// ── Character Quests (includes challenges & boss fights) ──
export type QuestType = 'standard' | 'courage' | 'exposure' | 'boss_fight' | 'recovery' | 'reflection' | 'ai_suggested';
export type QuestStatus = 'active' | 'completed' | 'failed' | 'locked';
export type QuestSource = 'user' | 'ai' | 'system';

export interface BonusCondition {
  description: string;
  xpBonus: number;
  isMet: boolean;
}

export interface ChecklistStep {
  order: number;
  description: string;
  isDone: boolean;
}

export interface CharacterQuest {
  id: string;
  userId: string;
  questType: QuestType;
  title: string;
  description: string;
  whyItMatters: string;
  linkedTraitIds: string[];
  difficulty: number;
  estimatedDiscomfort: number;
  targetDate: string | null;
  checklistSteps: ChecklistStep[];
  requiredProof: string;
  proofType: string;
  rewardXp: number;
  bonusConditions: BonusCondition[];
  failureRule: string;
  retryCount: number;
  status: QuestStatus;
  source: QuestSource;
  aiGenerationMetadata: Record<string, unknown>;
  plannerTaskId: string | null;
  goalId: string | null;
  crmContactId: string | null;
  crmOpportunityId: string | null;
  completedAt: string | null;
  createdAt: string;
}

// ── Exposure Ladders ───────────────────────────────────────
export type LadderStatus = 'active' | 'completed' | 'paused';
export type DifficultyPolicy = 'graduated' | 'adaptive' | 'fixed';
export type StepStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface ExposureStep {
  id: string;
  ladderId: string;
  stepOrder: number;
  title: string;
  instructions: string;
  difficulty: number;
  discomfortEstimate: number;
  repetitionTarget: number;
  successfulRepetitions: number;
  reflectionRequired: boolean;
  proofRequired: boolean;
  status: StepStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExposureLadder {
  id: string;
  userId: string;
  title: string;
  description: string;
  linkedTraitId: string | null;
  desiredEndBehavior: string;
  status: LadderStatus;
  currentStep: number;
  completionPercentage: number;
  difficultyPolicy: DifficultyPolicy;
  aiAdaptationEnabled: boolean;
  steps: ExposureStep[];
  createdAt: string;
  updatedAt: string;
}

// ── Bad Guys (self-sabotage patterns) ──────────────────────
export interface CharacterBadGuy {
  id: string;
  userId: string;
  title: string;
  triggerDescription: string;
  warningSigns: string;
  usualBehavior: string;
  costConsequence: string;
  replacementResponse: string;
  linkedRuleId: string | null;
  severity: number;
  occurrenceCount: number;
  defeatedCount: number;
  lastOccurrenceAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Power-Ups ──────────────────────────────────────────────
export interface CharacterPowerUp {
  id: string;
  userId: string;
  title: string;
  description: string;
  durationMinutes: number;
  category: string;
  instructions: string;
  linkedBadGuyIds: string[];
  usageCount: number;
  effectivenessRating: number;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── If-Then Rules ──────────────────────────────────────────
export interface CharacterIfThenRule {
  id: string;
  userId: string;
  triggerCondition: string;
  responseAction: string;
  linkedTraitId: string | null;
  linkedBadGuyId: string | null;
  isActive: boolean;
  successCount: number;
  failureCount: number;
  effectivenessScore: number;
  createdAt: string;
  updatedAt: string;
}

// ── Accountability Contracts ───────────────────────────────
export type ContractCompletionStatus = 'pending' | 'completed' | 'failed';
export type StakeType = 'none' | 'financial' | 'social' | 'personal';

export interface CharacterContract {
  id: string;
  userId: string;
  title: string;
  goalDescription: string;
  measurableCommitment: string;
  reportingFrequency: string;
  startDate: string;
  endDate: string | null;
  proofRequirement: string;
  accountabilityPerson: string;
  crmContactId: string | null;
  stakeType: StakeType;
  stakeDescription: string;
  consequence: string;
  graceRules: string;
  isActive: boolean;
  completionStatus: ContractCompletionStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Activity Log ───────────────────────────────────────────
export interface ActivityLogEntry {
  id: string;
  userId: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  xpDelta: number;
  traitImpact: Record<string, unknown>;
  metadata: Record<string, unknown>;
  note: string | null;
  createdAt: string;
}

// ── Reflections ────────────────────────────────────────────
export type PrivacySetting = 'private' | 'shared' | 'public';
export type AiSummaryStatus = 'pending' | 'completed' | 'failed';

export interface CharacterReflection {
  id: string;
  userId: string;
  preActionFear: string;
  postActionResult: string;
  whatHappened: string;
  whatLearned: string;
  emotionalIntensityBefore: number;
  emotionalIntensityAfter: number;
  nextStep: string;
  privacySetting: PrivacySetting;
  aiSummaryStatus: AiSummaryStatus;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Character Seasons ──────────────────────────────────────
export type SeasonStatus = 'planning' | 'active' | 'completed' | 'cancelled';

export interface CharacterSeason {
  id: string;
  userId: string;
  title: string;
  identityFocus: string;
  targetTraitIds: string[];
  targetHabitIds: string[];
  targetLadderIds: string[];
  startDate: string;
  endDate: string | null;
  status: SeasonStatus;
  openingXp: number;
  earnedXp: number;
  completionScore: number | null;
  finalReflection: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterHabitLog {
  id: string;
  habitId: string;
  userId: string;
  loggedDate: string; // YYYY-MM-DD
  status: 'completed' | 'failed' | 'skipped';
  completedValue: number;
  note: string;
  xpAwarded: number;
  source: string;
  linkedTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  targetOutcome: string;
  measurableSuccessCriteria: string;
  priority: string;
  status: string;
  startDate: string | null;
  targetDate: string | null;
  progressPercentage: number;
  linkedMonthlyGoalId: string | null;
  linkedWeeklyGoalId: string | null;
  parentGoalId: string | null;
  xpReward: number;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterChallenge {
  id: string;
  userId: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  challengeType: string;
  status: string;
  target: number;
  progress: number;
  startDate: string | null;
  deadline: string | null;
  xpReward: number;
  linkedDailyTaskId: string | null;
  linkedWeeklyGoalId: string | null;
  linkedMonthlyGoalId: string | null;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterIdentityRule {
  id: string;
  userId: string;
  title: string;
  description: string;
  ruleStatement: string;
  category: string;
  priority: string;
  activeStatus: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterConnection {
  id: string;
  userId: string;
  sourceEntityType: string;
  sourceEntityId: string;
  targetEntityType: string;
  targetEntityId: string;
  relationshipType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ── Integration types (keep from v1) ───────────────────────
export interface CharacterGoalIntegration {
  characterTraitId: string;
  goalId: string;
  mutuallyReinforcing: boolean;
}

export interface CharacterTaskIntegration {
  characterHabitId: string;
  plannerTaskId: string;
  autoGenerate: boolean;
}

export interface CharacterMemoryIntegration {
  characterEventId: string;
  memoryItemId: string;
  eventType: string;
}

// ── UI State (keep from v1) ────────────────────────────────
export interface CharacterUIState {
  selectedTraitId: string | null;
  selectedHabitId: string | null;
  selectedQuestId: string | null;
  selectedChallengeId: string | null;
  selectedBossFightId: string | null;
  selectedBadGuyId: string | null;
  selectedPowerUpId: string | null;
  selectedRuleId: string | null;
  selectedContractId: string | null;
}

// ── Leveling constants (derived from formula: round(100 × level^1.5)) ──
export const CHARACTER_LEVELS = [
  { level: 1, xp: 0, title: 'Initiate' },
  { level: 2, xp: 283, title: 'Consistent Builder' },
  { level: 3, xp: 520, title: 'Courage Apprentice' },
  { level: 4, xp: 800, title: 'Clear Communicator' },
  { level: 5, xp: 1118, title: 'Resilient Operator' },
  { level: 6, xp: 1470, title: 'Calm Leader' },
  { level: 7, xp: 1852, title: 'Disciplined Creator' },
  { level: 8, xp: 2263, title: 'Trusted Professional' },
  { level: 9, xp: 2700, title: 'Respected Guide' },
  { level: 10, xp: 3162, title: 'Transcendent' },
] as const;

export type CharacterLevel = typeof CHARACTER_LEVELS[number];

// ── Trait display names (from v1 categories, used by UI) ──
export const DEFAULT_TRAIT_NAMES = [
  'Courage', 'Communication', 'Discipline', 'Emotional Control',
  'Social Confidence', 'Sales Confidence', 'Leadership', 'Integrity',
  'Faith & Values', 'Physical Presence', 'Consistency',
  'Rejection Handling', 'Boundary Setting', 'Discomfort Action',
] as const;

export const TRAIT_DESCRIPTIONS: Record<string, string> = {
  Courage: 'Acting despite fear; doing the hard thing',
  Communication: 'Clear, honest, and assertive expression',
  Discipline: 'Consistent action aligned with values',
  'Emotional Control': 'Regulating emotions under pressure',
  'Social Confidence': 'Ease and self-assurance in social settings',
  'Sales Confidence': 'Confidence in selling and negotiation',
  Leadership: 'Inspiring and guiding others by example',
  Integrity: 'Honesty and alignment with moral principles',
  'Faith & Values': 'Living according to deeper beliefs',
  'Physical Presence': 'Strength, posture, and energetic impact',
  Consistency: 'Reliable daily follow-through',
  'Rejection Handling': 'Staying steady when faced with no',
  'Boundary Setting': 'Protecting time, energy, and values',
  'Discomfort Action': 'Moving toward what is uncomfortable',
};

// ── Default power-ups ──────────────────────────────────────
export const DEFAULT_POWER_UPS = [
  { title: 'Two-Minute Reset', description: 'Pause for 2 minutes. Breathe. Recenter.', durationMinutes: 2, category: 'reset', instructions: 'Set a timer. Close your eyes. Take slow breaths.' },
  { title: 'Short Walk', description: 'Step away for a 5-minute walk.', durationMinutes: 5, category: 'movement', instructions: 'Stand up. Walk outside or around the room for 5 minutes.' },
  { title: 'Breathing Exercise', description: 'Box breathing to calm the nervous system.', durationMinutes: 3, category: 'reset', instructions: 'Inhale 4s, hold 4s, exhale 4s, hold 4s. Repeat 4x.' },
  { title: 'Posture Reset', description: 'Fix posture to shift mindset.', durationMinutes: 1, category: 'physical', instructions: 'Roll shoulders back. Lift chest. Align head over spine.' },
  { title: 'Leave the Distracting Room', description: 'Change your environment.', durationMinutes: 5, category: 'environment', instructions: 'Stand up, leave the room, go somewhere else.' },
  { title: 'Open the Smallest Next Action', description: 'Break paralysis by doing the tiniest first step.', durationMinutes: 1, category: 'action', instructions: 'Ask: what is the smallest thing I can do right now? Do it.' },
  { title: 'Message an Accountability Person', description: 'Send a quick message to someone who holds you accountable.', durationMinutes: 2, category: 'social', instructions: 'Send a text: "I am about to do [action]. Holding myself accountable."' },
  { title: 'Five-Minute Focus Timer', description: 'Set a 5-minute timer and commit to focused work.', durationMinutes: 5, category: 'focus', instructions: 'Set a timer for 5 minutes. Work on ONE thing until it rings.' },
] as const;
