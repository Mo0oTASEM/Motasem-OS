// ── Enums ─────────────────────────────────────────────────────────────────

export type PlanningStatus = 'draft' | 'active' | 'completed' | 'archived' | 'cancelled';
export type GoalStatus = 'draft' | 'active' | 'on_track' | 'at_risk' | 'behind' | 'completed' | 'cancelled';
export type ProgressType = 'task_completion' | 'numeric' | 'percentage' | 'currency' | 'milestone' | 'boolean' | 'manual' | 'weighted';
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
export type ReviewType = 'daily' | 'weekly' | 'monthly' | 'quarterly';

// ── Workspace ─────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Quarter ───────────────────────────────────────────────────────────────

export interface Quarter {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  quarterNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  theme?: string;
  strategicVision?: string;
  status: PlanningStatus;
  createdAt: string;
  updatedAt: string;
}

export interface QuarterWithRelations extends Quarter {
  goals: QuarterlyGoalWithKeyResults[];
  monthlyPlans: MonthlyPlan[];
}

// ── Quarterly Goal ────────────────────────────────────────────────────────

export interface QuarterlyGoal {
  id: string;
  workspaceId: string;
  quarterId?: string | null;
  ownerId: string;
  title: string;
  description?: string;
  category?: string;
  priority: PriorityLevel;
  status: GoalStatus;
  confidenceScore?: number;
  expectedImpact?: string;
  progressPercentage: number;
  risks?: string;
  dependencies?: string;
  successCriteria?: string;
  reviewNotes?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuarterlyGoalWithKeyResults extends QuarterlyGoal {
  keyResults: KeyResult[];
}

// ── Key Result ────────────────────────────────────────────────────────────

export interface KeyResult {
  id: string;
  workspaceId: string;
  quarterlyGoalId: string;
  ownerId: string;
  title: string;
  description?: string;
  progressType: ProgressType;
  startValue?: number;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  weight: number;
  status: GoalStatus;
  progressPercentage: number;
  dueDate?: string;
  milestones?: Milestone[];
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  targetValue?: number;
  dueDate?: string;
}

// ── Monthly Plan ──────────────────────────────────────────────────────────

export interface MonthlyPlan {
  id: string;
  workspaceId: string;
  quarterId?: string | null;
  userId: string;
  monthNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  theme?: string;
  notes?: string;
  status: PlanningStatus;
  plannedCapacityHours: number;
  actualCapacityHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyPlanWithOutcomes extends MonthlyPlan {
  outcomes: MonthlyOutcome[];
}

// ── Monthly Outcome ───────────────────────────────────────────────────────

export interface MonthlyOutcome {
  id: string;
  workspaceId: string;
  monthlyPlanId: string;
  quarterlyGoalId?: string | null;
  ownerId: string;
  title: string;
  description?: string;
  desiredOutcome?: string;
  metricOrDeliverable?: string;
  startDate?: string;
  endDate?: string;
  priority: PriorityLevel;
  status: GoalStatus;
  progressPercentage: number;
  risks?: string;
  dependencies?: string;
  plannedEffortHours: number;
  actualEffortHours: number;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// ── Planning Review ───────────────────────────────────────────────────────

export interface PlanningReview {
  id: string;
  workspaceId: string;
  userId: string;
  reviewType: ReviewType;
  referenceId?: string;
  referenceTable?: string;
  periodStart?: string;
  periodEnd?: string;
  wins?: string;
  missedItems?: string;
  lessons?: string;
  bottlenecks?: string;
  metrics: Record<string, unknown>;
  plannedVsActual: Record<string, unknown>;
  aiGeneratedSummary?: string;
  status?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Progress Update ───────────────────────────────────────────────────────

export interface ProgressUpdate {
  id: string;
  workspaceId: string;
  entityType: 'key_result' | 'monthly_outcome' | 'weekly_objective' | 'quarterly_goal';
  entityId: string;
  previousValue?: number;
  newValue?: number;
  note?: string;
  updatedBy?: string;
  createdAt: string;
}

// ── Validation ────────────────────────────────────────────────────────────

export interface QuarterValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ── UI State ──────────────────────────────────────────────────────────────

export type LoadState = 'idle' | 'loading' | 'error' | 'success';

export interface PlannerUIState {
  workspaceId: string | null;
  selectedQuarterId: string | null;
  selectedMonthlyPlanId: string | null;
  viewMode: 'quarter' | 'monthly';
}

// ── Weekly Plan ──────────────────────────────────────────────────────────

export interface WeeklyPlan {
  id: string;
  workspaceId: string;
  monthlyPlanId?: string | null;
  userId: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  status: PlanningStatus;
  totalAvailableHours: number;
  fixedCommitmentHours: number;
  plannedTaskHours: number;
  deepWorkHours: number;
  bufferHours: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeekCapacitySummary {
  totalAvailableHours: number;
  fixedCommitmentHours: number;
  plannedTaskHours: number;
  deepWorkHours: number;
  meetingHours: number;
  personalHours: number;
  bufferHours: number;
  remainingCapacity: number;
  overloadedDays: string[];
  utilizationPercentage: number;
}

export interface WeeklyPlanWithRelations extends WeeklyPlan {
  objectives: WeeklyObjective[];
  tasks: Task[];
  timeBlocks: TimeBlock[];
  calendarEvents: CalendarEvent[];
  capacitySummary: WeekCapacitySummary;
}

// ── Weekly Objective ───────────────────────────────────────────────────────

export interface WeeklyObjective {
  id: string;
  workspaceId: string;
  weeklyPlanId: string;
  monthlyOutcomeId?: string | null;
  ownerId: string;
  title: string;
  description?: string;
  definitionOfDone?: string;
  priority: PriorityLevel;
  estimatedEffortHours?: number;
  dueDate?: string;
  progressPercentage: number;
  riskIndicator: boolean;
  confidenceLevel?: number;
  status: GoalStatus;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// ── Daily Plan ────────────────────────────────────────────────────────────

export interface DailyPlan {
  id: string;
  workspaceId: string;
  weeklyPlanId?: string | null;
  userId: string;
  planDate: string;
  status: PlanningStatus;
  notes?: string;
  shutdownCompletedAt?: string;
  dailyWin?: string;
  blockers?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyPlanWithRelations extends DailyPlan {
  big3Tasks: Task[];
  tasks: Task[];
  timeBlocks: TimeBlock[];
  calendarEvents: CalendarEvent[];
}

// ── Task ──────────────────────────────────────────────────────────────────

export type TaskType = 'goal_aligned' | 'operational' | 'administrative';
export type TaskStatus = 'backlog' | 'scheduled' | 'in_progress' | 'completed' | 'postponed' | 'cancelled';
export type EnergyLevel = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  workspaceId: string;
  dailyPlanId?: string | null;
  weeklyObjectiveId?: string | null;
  monthlyOutcomeId?: string | null;
  quarterlyGoalId?: string | null;
  projectId?: string | null;
  ownerId: string;
  title: string;
  description?: string;
  taskType: TaskType;
  status: TaskStatus;
  priority: PriorityLevel;
  urgencyScore?: number;
  importanceScore?: number;
  energyRequirement?: EnergyLevel;
  estimatedDurationMinutes?: number;
  actualDurationMinutes?: number;
  deadline?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  completedAt?: string;
  completionNotes?: string;
  context?: string;
  isBig3: boolean;
  isLocked: boolean;
  position: number;
  recurrenceRuleId?: string | null;
  parentTaskId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Time Block ────────────────────────────────────────────────────────────

export type BlockType = 'focus' | 'buffer' | 'meeting' | 'personal' | 'routine';

export interface TimeBlock {
  id: string;
  workspaceId: string;
  userId: string;
  dailyPlanId?: string | null;
  taskId?: string | null;
  calendarEventId?: string | null;
  title: string;
  blockType: BlockType;
  startTime: string;
  endTime: string;
  isLocked: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Calendar Event ────────────────────────────────────────────────────────

export type CalendarSource = 'google' | 'local';
export type SyncStatus = 'synced' | 'failed' | 'pending';

export interface CalendarEvent {
  id: string;
  workspaceId: string;
  userId: string;
  externalId?: string;
  source: CalendarSource;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  isAllDay: boolean;
  isRecurring: boolean;
  recurrenceData: Record<string, unknown>;
  isLocked: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Notification ──────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  workspaceId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  readAt?: string | null;
  dismissedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
