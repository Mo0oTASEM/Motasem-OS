import type { PlannerRepositories } from './repository.js';
import type * as Types from './types.js';
import { getSupabaseClientOrThrow } from '../supabaseClient.js';

export const createWorkspaceService = (repos: PlannerRepositories) => ({
    async getWorkspace(id: string, userId: string): Promise<Types.Workspace | null> {
        const isMember = await repos.workspaces.checkMembership(id, userId);
        if (!isMember) return null;
        return repos.workspaces.getForUser(id);
    },

    async assertMembership(workspaceId: string, userId: string): Promise<void> {
        const isMember = await repos.workspaces.checkMembership(workspaceId, userId);
        if (!isMember) {
            throw new Error(`Forbidden: User ${userId} is not a member of workspace ${workspaceId}`);
        }
    }
});

export const createValidationService = (repos: PlannerRepositories) => ({
    async validateQuarterBeforeActivation(quarterId: string, workspaceId: string): Promise<Types.QuarterValidation> {
        const errors: string[] = [];
        const warnings: string[] = [];

        const quarter = await repos.quarters.get(quarterId, workspaceId);
        if (!quarter) {
            return {
                valid: false,
                errors: ['Quarter not found'],
                warnings,
                goalCount: { actual: 0, min: 3, max: 5 },
                measurableGoals: false,
                owners: false
            };
        }

        // Check goal count (3-5)
        const goalCount = quarter.goals.length;
        if (goalCount < 3) {
            errors.push(`Quarter needs at least 3 goals. Currently has ${goalCount}. Add ${3 - goalCount} more goals.`);
        }
        if (goalCount > 5) {
            errors.push(`Quarter supports a maximum of 5 goals. Currently has ${goalCount}. Remove or complete an existing goal before adding a new one.`);
        }

        // Check all goals are measurable
        const measurableGoals = quarter.goals.every(goal => {
            return (goal.keyResults?.length ?? 0) > 0 || (goal.successCriteria && goal.successCriteria.trim().length > 0);
        });
        if (!measurableGoals) {
            errors.push('All goals must have measurable outcomes (Key Results or success criteria).');
        }

        // Check goal name conflicts (duplicate titles)
        const titles = quarter.goals.map(g => g.title.trim().toLowerCase());
        const duplicates = titles.filter((title, idx) => titles.indexOf(title) !== idx);
        if (duplicates.length > 0) {
            errors.push('Quarterly goals must have unique titles to avoid conflicts.');
        }

        // Check all goals have owners and deadlines (represented by quarter start/end or custom goal fields)
        const missingOwners = quarter.goals.filter((g: Types.QuarterlyGoal) => !g.ownerId);
        if (missingOwners.length > 0) {
            errors.push(`${missingOwners.length} goal(s) missing owner assignments.`);
        }

        // Check workload fits available quarter hours
        const capacityService = createCapacityService(repos);
        const capacity = await capacityService.getAvailableCapacity(quarter.userId, workspaceId, quarter.startDate, quarter.endDate);
        const maxHours = capacity.totalWorkHours - capacity.meetingHours - capacity.fixedCommitmentHours - capacity.bufferHours;

        // Sum effort from monthly outcomes in this quarter
        let totalOutcomeHours = 0;
        for (const monthPlan of quarter.monthlyPlans) {
            const outcomes = await repos.monthlyOutcomes.list(monthPlan.id, workspaceId);
            totalOutcomeHours += outcomes.reduce((sum, o) => sum + (o.plannedEffortHours ?? 0), 0);
        }

        if (totalOutcomeHours > maxHours) {
            errors.push(`Total planned effort for monthly outcomes (${totalOutcomeHours}h) exceeds the available capacity for the quarter (${maxHours}h).`);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            goalCount: { actual: goalCount, min: 3, max: 5 },
            measurableGoals,
            owners: missingOwners.length === 0
        };
    },

    async validateWeeklyPlanCapacity(weeklyPlanId: string, workspaceId: string): Promise<Types.ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        const plan = await repos.weeklyPlans.get(weeklyPlanId, workspaceId);
        if (!plan) {
            return { valid: false, errors: ['Weekly plan not found'], warnings: [] };
        }

        const capacityService = createCapacityService(repos);
        const cap = await capacityService.calculateWeekCapacity(plan.userId, workspaceId, plan.startDate, plan.endDate);

        // check planned hours does not exceed available hours minus buffer
        const maxAllowed = cap.totalWorkHours - cap.meetingHours - cap.fixedCommitmentHours - cap.bufferHours;
        const planned = plan.plannedTaskHours ?? 0;

        if (planned > maxAllowed) {
            errors.push(`Planned task hours (${planned}h) exceed the weekly available capacity limit (${maxAllowed}h after buffer).`);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    },

    async validateTaskAlignment(taskId: string, workspaceId: string): Promise<Types.ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        const task = await repos.tasks.get(taskId, workspaceId);
        if (!task) {
            return { valid: false, errors: ['Task not found'], warnings: [] };
        }

        if (task.taskType !== 'operational' && !task.weeklyObjectiveId && !task.isBig3) {
            warnings.push(`Task "${task.title}" has no parent weekly objective and is not marked as operational.`);
        }

        return {
            valid: true,
            errors,
            warnings
        };
    },

    validateMonthlyOutcomeDates(startDate?: string, endDate?: string): Types.ValidationResult {
        const errors: string[] = [];
        if (startDate && endDate) {
            if (startDate >= endDate) {
                errors.push('End date must be after start date.');
            }
        }
        return { valid: errors.length === 0, errors, warnings: [] };
    }
});

export const createCapacityService = (repos: PlannerRepositories) => ({
    async getAvailableCapacity(userId: string, workspaceId: string, startDate: string, endDate: string): Promise<Types.CapacityResult> {
        const settings = await repos.userCapacitySettings.get(userId, workspaceId);
        const dailyWorkHours = settings ? settings.dailyWorkHours : 8;
        const bufferPercentage = settings ? settings.bufferPercentage : 20;
        const workDays = settings ? settings.workDays : [1, 2, 3, 4, 5];

        // Calculate work days in range
        let workingDays = 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const current = new Date(start);

        while (current <= end) {
            const day = current.getUTCDay();
            if (workDays.includes(day)) {
                workingDays++;
            }
            current.setUTCDate(current.getUTCDate() + 1);
        }

        const totalWorkHours = workingDays * dailyWorkHours;

        // Query time blocks for meetings and personal blocks
        const blocks = await repos.timeBlocks.listForUser(userId, workspaceId, startDate, endDate);
        let meetingHours = 0;
        let fixedCommitmentHours = 0;

        for (const block of blocks) {
            const blockStart = new Date(block.startTime);
            const blockEnd = new Date(block.endTime);
            const durationHours = (blockEnd.getTime() - blockStart.getTime()) / (1000 * 60 * 60);

            if (block.blockType === 'meeting') {
                meetingHours += durationHours;
            } else if (block.blockType === 'personal') {
                fixedCommitmentHours += durationHours;
            }
        }

        const bufferHours = totalWorkHours * (bufferPercentage / 100);
        const remainingCapacity = Math.max(0, totalWorkHours - meetingHours - fixedCommitmentHours - bufferHours);

        return {
            totalWorkHours: Number(totalWorkHours.toFixed(2)),
            meetingHours: Number(meetingHours.toFixed(2)),
            fixedCommitmentHours: Number(fixedCommitmentHours.toFixed(2)),
            bufferHours: Number(bufferHours.toFixed(2)),
            remainingCapacity: Number(remainingCapacity.toFixed(2))
        };
    },

    async isOverloaded(userId: string, workspaceId: string, date: string): Promise<{ overloaded: boolean; overloadAmount?: number }> {
        const capacity = await this.getAvailableCapacity(userId, workspaceId, date, date);
        const settings = await repos.userCapacitySettings.get(userId, workspaceId);
        const bufferPercentage = settings ? settings.bufferPercentage : 20;

        const tasks = await repos.tasks.listForUserAndDate(userId, workspaceId, date);
        const activeTasks = tasks.filter(t => t.status !== 'cancelled' && t.status !== 'postponed');
        const plannedMinutes = activeTasks.reduce((sum, t) => sum + (t.estimatedDurationMinutes ?? 0), 0);
        const plannedHours = plannedMinutes / 60;

        const availableHours = capacity.totalWorkHours - capacity.meetingHours - capacity.fixedCommitmentHours;
        const maxAllowedHours = availableHours * (1 - bufferPercentage / 100);

        if (plannedHours > maxAllowedHours) {
            return {
                overloaded: true,
                overloadAmount: Number((plannedHours - maxAllowedHours).toFixed(2))
            };
        }

        return { overloaded: false };
    },

    async calculateWeekCapacity(userId: string, workspaceId: string, weekStart: string, weekEnd: string): Promise<Types.WeekCapacityResult> {
        const capacity = await this.getAvailableCapacity(userId, workspaceId, weekStart, weekEnd);
        const settings = await repos.userCapacitySettings.get(userId, workspaceId);
        const workDaysList = settings ? settings.workDays : [1, 2, 3, 4, 5];

        // Sum planned hours on tasks for the week
        const supabase = getSupabaseClientOrThrow();
        const { data: tasks } = await supabase
            .from('tasks')
            .select(`*, daily_plans!inner(*)`)
            .eq('owner_id', userId)
            .eq('workspace_id', workspaceId)
            .gte('daily_plans.plan_date', weekStart)
            .lte('daily_plans.plan_date', weekEnd)
            .is('deleted_at', null);

        const plannedTaskHours = (tasks || []).reduce((sum: number, t: { estimated_duration_minutes?: number }) => sum + (t.estimated_duration_minutes ?? 0), 0) / 60;

        return {
            ...capacity,
            workDays: workDaysList.length,
            personalBlockHours: capacity.fixedCommitmentHours,
            deepWorkHours: 0,
            availableHours: capacity.totalWorkHours,
            plannedTaskHours: Number(plannedTaskHours.toFixed(2)),
            remainingHours: Number((capacity.remainingCapacity - plannedTaskHours).toFixed(2)),
            overloadedDays: [],
            utilizationPercentage: capacity.totalWorkHours > 0 ? Number(((plannedTaskHours / capacity.totalWorkHours) * 100).toFixed(2)) : 0
        };
    }
});

export const createProgressService = (repos: PlannerRepositories) => ({
    async recalculateKeyResult(keyResultId: string, workspaceId: string): Promise<number> {
        const kr = await repos.keyResults.get(keyResultId, workspaceId);
        if (!kr) return 0;

        let percentage = 0;
        if (kr.progressType === 'manual' || kr.progressType === 'percentage') {
            percentage = Math.max(0, Math.min(100, kr.currentValue ?? 0));
        } else if (kr.progressType === 'boolean') {
            percentage = kr.currentValue && kr.currentValue > 0 ? 100 : 0;
        } else if (kr.progressType === 'milestone') {
            const milestones = kr.currentValue ?? 0;
            const total = kr.targetValue ?? 0;
            if (total > 0) {
                percentage = Math.max(0, Math.min(100, (milestones / total) * 100));
            }
        } else if (kr.startValue != null && kr.targetValue != null) {
            const range = kr.targetValue - kr.startValue;
            if (range !== 0) {
                percentage = Math.max(0, Math.min(100, ((kr.currentValue ?? 0) - kr.startValue) / range * 100));
            } else if (range === 0) {
                percentage = kr.currentValue === kr.targetValue ? 100 : 0;
            }
        } else if (kr.targetValue != null) {
            percentage = Math.max(0, Math.min(100, (kr.currentValue ?? 0) / kr.targetValue * 100));
        }

        return percentage;
    },

    async recalculateQuarterlyGoal(goalId: string, workspaceId: string): Promise<number> {
        const goal = await repos.quarterlyGoals.getWithKeyResults(goalId, workspaceId);
        if (!goal) return 0;

        const krs = goal.keyResults || [];
        const validKrs = krs.filter(kr => kr.weight > 0);
        if (validKrs.length === 0) {
            await repos.quarterlyGoals.update(goalId, workspaceId, { progressPercentage: 0 });
            return 0;
        }

        let totalWeight = 0;
        let weightedProgress = 0;
        for (const kr of validKrs) {
            const krProgress = await this.recalculateKeyResult(kr.id, workspaceId);
            weightedProgress += krProgress * kr.weight;
            totalWeight += kr.weight;
        }

        const progress = totalWeight > 0 ? weightedProgress / totalWeight : 0;
        const roundedProgress = Math.round(progress);

        const updates: Partial<Types.QuarterlyGoal> = { progressPercentage: roundedProgress };
        if (roundedProgress === 100) {
            if (goal.status !== 'at_risk' && goal.status !== 'behind') {
                updates.status = 'completed';
            }
        } else if (goal.status === 'completed' && roundedProgress < 100) {
            updates.status = 'active';
        }

        await repos.quarterlyGoals.update(goalId, workspaceId, updates);
        return roundedProgress;
    },

    async recalculateMonthlyOutcome(outcomeId: string, workspaceId: string): Promise<number> {
        const supabase = getSupabaseClientOrThrow();
        const { data: outcome } = await supabase
            .from('monthly_outcomes')
            .select('*')
            .eq('id', outcomeId)
            .eq('workspace_id', workspaceId)
            .maybeSingle();

        if (!outcome) return 0;

        const objectives = await repos.weeklyObjectives.listForOutcome(outcomeId, workspaceId);
        if (objectives.length === 0) {
            return Number(outcome.progress_percentage || 0);
        }

        const totalProgress = objectives.reduce((sum, obj) => sum + obj.progressPercentage, 0);
        const newPercentage = Math.round(totalProgress / objectives.length);

        await repos.monthlyOutcomes.update(outcomeId, workspaceId, { progressPercentage: newPercentage });
        return newPercentage;
    },

    async recalculateWeeklyObjective(objectiveId: string, workspaceId: string): Promise<number> {
        const obj = await repos.weeklyObjectives.get(objectiveId, workspaceId);
        if (!obj) return 0;

        const tasks = await repos.tasks.listForObjective(objectiveId, workspaceId);
        if (tasks.length === 0) {
            return obj.progressPercentage;
        }

        const completed = tasks.filter(t => t.status === 'completed').length;
        const newPercentage = Math.round((completed / tasks.length) * 100);

        await repos.weeklyObjectives.update(objectiveId, workspaceId, { progressPercentage: newPercentage });
        return newPercentage;
    },

    async propagateProgress(entityType: string, entityId: string, workspaceId: string): Promise<void> {
        if (entityType === 'key_result') {
            const kr = await repos.keyResults.get(entityId, workspaceId);
            if (!kr) return;
            await this.recalculateKeyResult(entityId, workspaceId);
            await this.recalculateQuarterlyGoal(kr.quarterlyGoalId, workspaceId);
        } else if (entityType === 'weekly_objective') {
            await this.recalculateWeeklyObjective(entityId, workspaceId);
            const obj = await repos.weeklyObjectives.get(entityId, workspaceId);
            if (obj && obj.monthlyOutcomeId) {
                await this.recalculateMonthlyOutcome(obj.monthlyOutcomeId, workspaceId);
                const supabase = getSupabaseClientOrThrow();
                const { data: row } = await supabase
                    .from('monthly_outcomes')
                    .select('quarterly_goal_id')
                    .eq('id', obj.monthlyOutcomeId)
                    .maybeSingle();
                if (row && row.quarterly_goal_id) {
                    await this.recalculateQuarterlyGoal(row.quarterly_goal_id, workspaceId);
                }
            }
        } else if (entityType === 'task') {
            const task = await repos.tasks.get(entityId, workspaceId);
            if (!task) return;
            if (task.weeklyObjectiveId) {
                await this.propagateProgress('weekly_objective', task.weeklyObjectiveId, workspaceId);
            }
            if (task.monthlyOutcomeId) {
                await this.recalculateMonthlyOutcome(task.monthlyOutcomeId, workspaceId);
            }
            if (task.quarterlyGoalId) {
                await this.recalculateQuarterlyGoal(task.quarterlyGoalId, workspaceId);
            }
        }
    },

    async calculateGoalProgressFromKeyResults(keyResults: Types.KeyResult[]): Promise<number> {
        const validKrs = keyResults.filter((kr: Types.KeyResult) => kr.weight > 0);
        if (validKrs.length === 0) return 0;

        const totalWeight = validKrs.reduce((sum: number, kr: Types.KeyResult) => sum + kr.weight, 0);
        const weightedProgress = validKrs.reduce((sum: number, kr: Types.KeyResult) => {
            const progress = kr.targetValue != null && kr.startValue != null && kr.targetValue - kr.startValue > 0
                ? Math.max(0, Math.min(100, ((kr.currentValue ?? 0) - kr.startValue) / (kr.targetValue - kr.startValue) * 100))
                : (kr.currentValue ?? 0);
            return sum + (progress * kr.weight);
        }, 0);

        return totalWeight > 0 ? weightedProgress / totalWeight : 0;
    },

    async calculateOutcomeProgressFromTasks(tasks: Types.Task[]): Promise<number> {
        if (tasks.length === 0) return 0;
        const completed = tasks.filter((t: Types.Task) => t.status === 'completed').length;
        return Math.round((completed / tasks.length) * 100);
    },

    async calculateObjectiveProgressFromTasks(tasks: Types.Task[]): Promise<number> {
        return this.calculateOutcomeProgressFromTasks(tasks);
    }
});

export type WorkspaceService = ReturnType<typeof createWorkspaceService>;
export type ValidationService = ReturnType<typeof createValidationService>;
export type CapacityService = ReturnType<typeof createCapacityService>;
export type ProgressService = ReturnType<typeof createProgressService>;