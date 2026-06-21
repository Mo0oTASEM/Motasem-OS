// Enums from database
export type PlanningStatus = 'draft' | 'active' | 'completed' | 'archived' | 'cancelled';
export type GoalStatus = 'draft' | 'active' | 'on_track' | 'at_risk' | 'behind' | 'completed' | 'cancelled';
export type ProgressType = 'task_completion' | 'numeric' | 'percentage' | 'currency' | 'milestone' | 'boolean' | 'manual' | 'weighted';
export type TaskType = 'goal_aligned' | 'operational' | 'meeting' | 'deep_work' | 'administrative' | 'personal' | 'recurring' | 'waiting' | 'delegated';
export type TaskStatus = 'inbox' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
export type EnergyLevel = 'high' | 'medium' | 'low';
export type ReviewType = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type AiSuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'modified' | 'expired';
export type BlockType = 'deep_work' | 'meeting' | 'admin' | 'break' | 'buffer' | 'personal';
export type CalendarSource = 'internal' | 'google' | 'other';
export type SyncStatus = 'local_only' | 'synced' | 'pending' | 'conflict' | 'error';
export type WorkspaceRole = 'owner' | 'admin' | 'member';
export type DependencyType = 'finish_to_start' | 'start_to_start';

// Base entity with common fields
export interface BaseEntity {
    id: string;
    workspaceId: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}

// Workspace
export interface Workspace extends BaseEntity {
    name: string;
    ownerId: string;
    settings: Record<string, unknown>;
}

export interface WorkspaceMember {
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
    joinedAt: string;
}

// Capacity Settings
export interface UserCapacitySettings {
    userId: string;
    workspaceId: string;
    workStartTime: string;
    workEndTime: string;
    workDays: number[];
    dailyWorkHours: number;
    bufferPercentage: number;
    deepWorkPreferredStart?: string;
    deepWorkPreferredEnd?: string;
    timezone: string;
    updatedAt: string;
}

// Planning Preferences
export interface PlanningPreferences {
    userId: string;
    workspaceId: string;
    dailyBig3ReminderTime?: string;
    weeklyPlanningDay?: number;
    weeklyPlanningTime?: string;
    monthlyPlanningDay?: number;
    aiSuggestionsEnabled: boolean;
    notificationSettings: Record<string, unknown>;
    updatedAt: string;
}

// Annual Direction
export interface AnnualDirection extends BaseEntity {
    workspaceId: string;
    userId: string;
    title: string;
    year: number;
    visionStatement?: string;
    theme?: string;
    status: PlanningStatus;
    notes?: string;
}

// Quarter
export interface Quarter extends BaseEntity {
    workspaceId: string;
    annualDirectionId?: string | null;
    userId: string;
    title: string;
    quarterNumber: number;
    year: number;
    startDate: string;
    endDate: string;
    theme?: string;
    strategicVision?: string;
    status: PlanningStatus;
}

export interface QuarterWithRelations extends Quarter {
    goals: QuarterlyGoalWithKeyResults[];
    monthlyPlans: MonthlyPlan[];
}

// Quarterly Goal
export interface QuarterlyGoal extends BaseEntity {
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
}

export interface QuarterlyGoalWithKeyResults extends QuarterlyGoal {
    keyResults: KeyResult[];
}

// Key Result
export interface KeyResult extends BaseEntity {
    workspaceId: string;
    quarterlyGoalId: string;
    title: string;
    description?: string;
    progressType: ProgressType;
    startValue?: number;
    targetValue?: number;
    currentValue: number;
    unit?: string;
    weight: number;
    status: GoalStatus;
    dueDate?: string;
    ownerId: string;
}

// Monthly Plan
export interface MonthlyPlan extends BaseEntity {
    workspaceId: string;
    quarterId?: string | null;
    userId: string;
    monthNumber: number;
    year: number;
    startDate: string;
    endDate: string;
    status: PlanningStatus;
    theme?: string;
    notes?: string;
    plannedCapacityHours: number;
    actualCapacityHours: number;
}

export interface MonthlyPlanWithRelations extends MonthlyPlan {
    outcomes: MonthlyOutcome[];
}

// Monthly Outcome
export interface MonthlyOutcome extends BaseEntity {
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
}

// Weekly Plan
export interface WeeklyPlan extends BaseEntity {
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
}

export interface WeeklyPlanWithRelations extends WeeklyPlan {
    objectives: WeeklyObjective[];
    tasks: Task[];
    timeBlocks: TimeBlock[];
    calendarEvents: CalendarEvent[];
    capacitySummary: WeekCapacitySummary;
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

// Weekly Objective
export interface WeeklyObjective extends BaseEntity {
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
}

// Daily Plan
export interface DailyPlan extends BaseEntity {
    workspaceId: string;
    weeklyPlanId?: string | null;
    userId: string;
    planDate: string;
    status: PlanningStatus;
    notes?: string;
    shutdownCompletedAt?: string;
    dailyWin?: string;
    blockers?: string;
}

export interface DailyPlanWithRelations extends DailyPlan {
    big3Tasks: Task[];
    tasks: Task[];
    timeBlocks: TimeBlock[];
    calendarEvents: CalendarEvent[];
}

// Task
export interface Task extends BaseEntity {
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
}

// Task Dependency
export interface TaskDependency {
    id: string;
    taskId: string;
    dependsOnTaskId: string;
    dependencyType: DependencyType;
    createdAt: string;
}

// Task Recurrence Rule
export interface TaskRecurrenceRule extends BaseEntity {
    workspaceId: string;
    frequency: string;
    intervalValue?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: string;
    maxOccurrences?: number;
}

// Time Block
export interface TimeBlock extends BaseEntity {
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
}

// Calendar Event
export interface CalendarEvent extends BaseEntity {
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
}

// Planning Review
export interface PlanningReview extends BaseEntity {
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
}

// Progress Update
export interface ProgressUpdate {
    id: string;
    workspaceId: string;
    entityType: 'key_result' | 'monthly_outcome' | 'weekly_objective' | 'quarterly_goal';
    entityId: string;
    previousValue?: number;
    newValue?: number;
    progressType?: ProgressType;
    note?: string;
    updatedBy?: string;
    createdAt: string;
}

// AI Suggestion
export interface AiSuggestion extends BaseEntity {
    workspaceId: string;
    userId: string;
    suggestionType: string;
    contextEntityType?: string;
    contextEntityId?: string;
    title: string;
    summary?: string;
    payload: Record<string, unknown>;
    status: AiSuggestionStatus;
    expiresAt?: string;
}

// AI Action Preview
export type AiActionPreviewStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface AiActionPreview extends BaseEntity {
    workspaceId: string;
    userId: string;
    actionType: string;
    description: string;
    proposedChanges: Record<string, unknown>;
    explanation?: string;
    status: AiActionPreviewStatus;
    reviewedAt?: string;
    reviewedBy?: string;
}

// AI Action Log
export interface AiActionLog extends BaseEntity {
    workspaceId: string;
    userId: string;
    previewId?: string;
    actionType: string;
    appliedChanges: Record<string, unknown>;
    success: boolean;
    errorMessage?: string;
}

// Notification
export interface Notification extends BaseEntity {
    workspaceId: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    entityType?: string;
    entityId?: string;
    readAt?: string;
    dismissedAt?: string;
}

// Activity Log
export interface ActivityLog extends BaseEntity {
    workspaceId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    ipAddress?: string;
}

// Validation result types
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface QuarterValidation extends ValidationResult {
    goalCount?: {
        actual: number;
        min: number;
        max: number;
    };
    measurableGoals?: boolean;
    workload?: boolean;
    owners?: boolean;
}

export interface CapacityResult {
    totalWorkHours: number;
    meetingHours: number;
    fixedCommitmentHours: number;
    bufferHours: number;
    remainingCapacity: number;
}

export interface WeekCapacityResult extends CapacityResult {
    workDays: number;
    totalWorkHours: number;
    meetingHours: number;
    fixedCommitmentHours: number;
    personalBlockHours: number;
    deepWorkHours: number;
    bufferHours: number;
    availableHours: number;
    plannedTaskHours: number;
    remainingHours: number;
    overloadedDays: string[];
    utilizationPercentage: number;
}