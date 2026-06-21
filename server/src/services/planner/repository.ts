import type { SupabaseClient } from '@supabase/supabase-js';
import type * as Types from './types.js';

type PlanningStatus = Types.PlanningStatus;
type GoalStatus = Types.GoalStatus;
type ProgressType = Types.ProgressType;
type PriorityLevel = Types.PriorityLevel;
type ReviewType = Types.ReviewType;

const tableName = (name: string) => name;
const nowIso = () => new Date().toISOString();

const camelToSnake = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const keysToSnake = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === undefined) continue;
        result[camelToSnake(key)] = value;
    }
    return result;
};

export const createPlannerRepositories = (supabase: SupabaseClient) => {
    const repos = {
        workspaces: {
            async create(input: Omit<Types.Workspace, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Types.Workspace> {
                const now = nowIso();
                const payload = {
                    name: input.name,
                    owner_id: input.ownerId,
                    settings: input.settings,
                    id: crypto.randomUUID(),
                    created_at: now,
                    updated_at: now
                };
                const { error } = await supabase.from(tableName('workspaces')).insert(payload);
                if (error) throw error;
                return this.toDomain(payload);
            },

            async getForUser(workspaceId: string): Promise<Types.Workspace | null> {
                const { data, error } = await supabase
                    .from(tableName('workspaces'))
                    .select('*')
                    .eq('id', workspaceId)
                    .is('deleted_at', null)
                    .maybeSingle();
                if (error) throw error;
                return data ? this.toDomain(data) : null;
            },

            async listForUser(userId: string): Promise<Types.Workspace[]> {
                const { data, error } = await supabase
                    .from(tableName('workspace_members'))
                    .select(`workspace:workspaces!inner(*)`)
                    .eq('user_id', userId);
                if (error) throw error;
                return (data || [])
                    .filter((row: { workspace: unknown }) => Array.isArray(row.workspace) && row.workspace.length > 0)
                    .map((row: { workspace: unknown[] }) => this.toDomain(row.workspace[0] as Record<string, unknown>));
            },

            async checkMembership(workspaceId: string, userId: string): Promise<boolean> {
                const { data: workspace, error: wsError } = await supabase
                    .from(tableName('workspaces'))
                    .select('owner_id')
                    .eq('id', workspaceId)
                    .maybeSingle();
                if (wsError) throw wsError;
                if (workspace && workspace.owner_id === userId) {
                    return true;
                }

                const { data: member, error: memError } = await supabase
                    .from(tableName('workspace_members'))
                    .select('role')
                    .eq('workspace_id', workspaceId)
                    .eq('user_id', userId)
                    .maybeSingle();
                if (memError) throw memError;
                return !!member;
            },

            toDomain(row: Record<string, unknown>): Types.Workspace {
                return {
                    id: row.id as string,
                    workspaceId: row.id as string,
                    userId: row.owner_id as string,
                    name: row.name as string,
                    ownerId: row.owner_id as string,
                    settings: row.settings as Record<string, unknown>,
                    createdAt: row.created_at as string,
                    updatedAt: row.updated_at as string,
                    deletedAt: row.deleted_at as string | null | undefined
                };
            }
        },

        quarters: {
            async create(input: Omit<Types.Quarter, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Types.Quarter> {
                const now = nowIso();
                const payload = {
                    workspace_id: input.workspaceId,
                    annual_direction_id: input.annualDirectionId,
                    user_id: input.userId,
                    title: input.title,
                    quarter_number: input.quarterNumber,
                    year: input.year,
                    start_date: input.startDate,
                    end_date: input.endDate,
                    theme: input.theme,
                    strategic_vision: input.strategicVision,
                    status: input.status,
                    id: crypto.randomUUID(),
                    created_at: now,
                    updated_at: now
                };
                const { error } = await supabase.from(tableName('quarters')).insert(payload);
                if (error) throw error;
                return this.toDomain(payload);
            },

            async get(id: string, workspaceId: string): Promise<Types.QuarterWithRelations | null> {
                const { data, error } = await supabase
                    .from(tableName('quarters'))
                    .select('*')
                    .eq('id', id)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .maybeSingle();
                if (error) throw error;
                if (!data) return null;

                const goalsRaw = await supabase
                    .from(tableName('quarterly_goals'))
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .eq('quarter_id', id)
                    .is('deleted_at', null)
                    .order('position', { ascending: true });

                if (goalsRaw.error) throw goalsRaw.error;
                
                const goals = await Promise.all(
                    (goalsRaw.data || []).map(async (g: Record<string, unknown>) => {
                        const keyResults = await repos.keyResults.list(g.id as string, workspaceId);
                        return { ...repos.quarterlyGoals.toDomain(g), keyResults } as Types.QuarterlyGoalWithKeyResults;
                    })
                );
                
                const monthlyPlans = await repos.monthlyPlans.list(workspaceId, id);

                return {
                    ...this.toDomain(data),
                    goals,
                    monthlyPlans
                };
            },

            async list(workspaceId: string): Promise<Types.Quarter[]> {
                const { data, error } = await supabase
                    .from(tableName('quarters'))
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .order('year', { ascending: false })
                    .order('quarter_number', { ascending: true });
                if (error) throw error;
                return (data || []).map(row => this.toDomain(row));
            },

            async update(id: string, workspaceId: string, updates: Partial<Types.Quarter>): Promise<Types.Quarter> {
                const payload = keysToSnake({
                    ...updates,
                    updatedAt: nowIso()
                });
                const { error } = await supabase
                    .from(tableName('quarters'))
                    .update(payload)
                    .eq('id', id)
                    .eq('workspace_id', workspaceId);
                if (error) throw error;
                const { data } = await supabase.from(tableName('quarters')).select('*').eq('id', id).maybeSingle();
                return this.toDomain(data!);
            },

            async duplicateQuarter(quarterId: string, workspaceId: string, userId: string, year: number, quarterNumber: number): Promise<Types.QuarterWithRelations | null> {
            const original = await this.get(quarterId, workspaceId);
            if (!original) return null;

            const now = nowIso();
            const originalStart = new Date(original.startDate);
            const originalEnd = new Date(original.endDate);
            const newStart = new Date(year, (quarterNumber - 1) * 3, originalStart.getDate());
            const newEnd = new Date(year, quarterNumber * 3 - 1, originalEnd.getDate());

            const newQuarter = await supabase.from(tableName('quarters')).insert({
                workspace_id: workspaceId,
                user_id: userId,
                title: original.title,
                quarter_number: quarterNumber,
                year,
                start_date: newStart.toISOString().split('T')[0],
                end_date: newEnd.toISOString().split('T')[0],
                theme: original.theme,
                strategic_vision: original.strategicVision,
                status: 'draft',
                id: crypto.randomUUID(),
                created_at: now,
                updated_at: now
            }).select().single();

            if (newQuarter.error) throw newQuarter.error;
            const newQuarterId = newQuarter.data.id;

            for (const goal of original.goals) {
                const newGoal = await supabase.from(tableName('quarterly_goals')).insert({
                    workspace_id: workspaceId,
                    quarter_id: newQuarterId,
                    owner_id: goal.ownerId,
                    title: goal.title,
                    description: goal.description,
                    category: goal.category,
                    priority: goal.priority,
                    status: 'draft',
                    confidence_score: goal.confidenceScore,
                    expected_impact: goal.expectedImpact,
                    progress_percentage: 0,
                    risks: goal.risks,
                    dependencies: goal.dependencies,
                    success_criteria: goal.successCriteria,
                    review_notes: goal.reviewNotes,
                    position: goal.position,
                    id: crypto.randomUUID(),
                    created_at: now,
                    updated_at: now
                }).select().single();

                if (newGoal.error) continue;
                const newGoalId = newGoal.data.id;

                for (const kr of goal.keyResults) {
                    await supabase.from(tableName('key_results')).insert({
                        workspace_id: workspaceId,
                        quarterly_goal_id: newGoalId,
                        title: kr.title,
                        description: kr.description,
                        progress_type: kr.progressType,
                        start_value: kr.startValue,
                        target_value: kr.targetValue,
                        current_value: kr.startValue ?? 0,
                        unit: kr.unit,
                        weight: kr.weight,
                        status: 'draft',
                        due_date: kr.dueDate,
                        owner_id: kr.ownerId,
                        id: crypto.randomUUID(),
                        created_at: now,
                        updated_at: now
                    });
                }
            }

            return this.get(newQuarterId, workspaceId);
        },

        async archive(id: string, workspaceId: string): Promise<Types.Quarter> {
            const { error } = await supabase
                .from(tableName('quarters'))
                .update({ status: 'archived' as const, deleted_at: nowIso() })
                .eq('id', id)
                .eq('workspace_id', workspaceId);
            if (error) throw error;
            const { data } = await supabase.from(tableName('quarters')).select('*').eq('id', id).maybeSingle();
            return this.toDomain(data!);
        },

        toDomain(row: Record<string, unknown>): Types.Quarter {
            return {
                id: row.id as string,
                workspaceId: row.workspace_id as string,
                userId: row.user_id as string,
                title: row.title as string,
                quarterNumber: row.quarter_number as number,
                year: row.year as number,
                startDate: row.start_date as string,
                endDate: row.end_date as string,
                theme: row.theme as string | undefined,
                strategicVision: row.strategic_vision as string | undefined,
                status: row.status as PlanningStatus,
                annualDirectionId: row.annual_direction_id as string | null | undefined,
                createdAt: row.created_at as string,
                updatedAt: row.updated_at as string,
                deletedAt: row.deleted_at as string | null | undefined
            };
        }
    },

    quarterlyGoals: {
        async create(input: Omit<Types.QuarterlyGoal, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'progressPercentage'>): Promise<Types.QuarterlyGoal> {
                const now = nowIso();
                const payload = {
                    workspace_id: input.workspaceId,
                    quarter_id: input.quarterId,
                    owner_id: input.ownerId,
                    title: input.title,
                    description: input.description,
                    category: input.category,
                    priority: input.priority,
                    status: input.status,
                    confidence_score: input.confidenceScore,
                    expected_impact: input.expectedImpact,
                    progress_percentage: 0,
                    risks: input.risks,
                    dependencies: input.dependencies,
                    success_criteria: input.successCriteria,
                    review_notes: input.reviewNotes,
                    position: input.position ?? 0,
                    id: crypto.randomUUID(),
                    created_at: now,
                    updated_at: now
                };
                const { error } = await supabase.from(tableName('quarterly_goals')).insert(payload);
                if (error) throw error;
                return this.toDomain(payload);
            },

            async list(workspaceId: string, quarterId?: string): Promise<Types.QuarterlyGoal[]> {
                let query = supabase
                    .from(tableName('quarterly_goals'))
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .order('position', { ascending: true });

                if (quarterId) {
                    query = query.eq('quarter_id', quarterId);
                }

                const { data, error } = await query;
                if (error) throw error;
                return (data || []).map(row => this.toDomain(row));
            },

            async getWithKeyResults(id: string, workspaceId: string): Promise<Types.QuarterlyGoalWithKeyResults | null> {
                const { data, error } = await supabase
                    .from(tableName('quarterly_goals'))
                    .select('*')
                    .eq('id', id)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .maybeSingle();
                if (error) throw error;
                if (!data) return null;

                const goal = this.toDomain(data);
                const keyResults = await repos.keyResults.list(id, workspaceId);

                return {
                    ...goal,
                    keyResults
                };
            },

            async update(id: string, workspaceId: string, updates: Partial<Types.QuarterlyGoal>): Promise<Types.QuarterlyGoal> {
                const payload = keysToSnake({
                    ...updates,
                    updatedAt: nowIso()
                });
                const { error } = await supabase
                    .from(tableName('quarterly_goals'))
                    .update(payload)
                    .eq('id', id)
                    .eq('workspace_id', workspaceId);
                if (error) throw error;
                const { data } = await supabase.from(tableName('quarterly_goals')).select('*').eq('id', id).maybeSingle();
                return this.toDomain(data!);
            },

            async softDelete(id: string, workspaceId: string): Promise<void> {
                const { error } = await supabase
                    .from(tableName('quarterly_goals'))
                    .update({ deleted_at: nowIso() })
                    .eq('id', id)
                    .eq('workspace_id', workspaceId);
                if (error) throw error;
            },

            async reorder(quarterId: string, workspaceId: string, orderedIds: string[]): Promise<void> {
                const updates = orderedIds.map((id, idx) => 
                    supabase.from(tableName('quarterly_goals'))
                        .update({ position: idx })
                        .eq('id', id)
                        .eq('workspace_id', workspaceId)
                );
                await Promise.all(updates.map(u => u.then(({ error }) => { if (error) throw error; })));
            },

            async carryToNextQuarter(goalId: string, workspaceId: string, targetQuarterId: string): Promise<Types.QuarterlyGoalWithKeyResults | null> {
                const { data: goal, error: goalError } = await supabase
                    .from(tableName('quarterly_goals'))
                    .select('*')
                    .eq('id', goalId)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .maybeSingle();
                if (goalError) throw goalError;
                if (!goal) return null;

                const now = nowIso();
                const newGoal = await supabase.from(tableName('quarterly_goals')).insert({
                    workspace_id: workspaceId,
                    quarter_id: targetQuarterId,
                    owner_id: goal.owner_id,
                    title: goal.title,
                    description: goal.description,
                    category: goal.category,
                    priority: goal.priority,
                    status: 'draft',
                    confidence_score: goal.confidence_score,
                    expected_impact: goal.expected_impact,
                    progress_percentage: 0,
                    risks: goal.risks,
                    dependencies: goal.dependencies,
                    success_criteria: goal.success_criteria,
                    review_notes: goal.review_notes,
                    position: 0,
                    id: crypto.randomUUID(),
                    created_at: now,
                    updated_at: now
                }).select().single();

                if (newGoal.error) throw newGoal.error;

                const keyResults = await supabase
                    .from(tableName('key_results'))
                    .select('*')
                    .eq('quarterly_goal_id', goalId)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null);

                if (keyResults.error) throw keyResults.error;

                for (const kr of (keyResults.data || [])) {
                    await supabase.from(tableName('key_results')).insert({
                        ...kr,
                        quarterly_goal_id: newGoal.data.id,
                        current_value: kr.start_value ?? 0,
                        status: 'draft',
                        id: crypto.randomUUID(),
                        created_at: now,
                        updated_at: now
                    });
                }

                await supabase
                    .from(tableName('quarterly_goals'))
                    .update({ 
                        status: 'completed' as const,
                        review_notes: `Carried over to quarter on ${new Date().toISOString().split('T')[0]}`
                    })
                    .eq('id', goalId)
                    .eq('workspace_id', workspaceId);

                const createdGoal = await this.getWithKeyResults(newGoal.data.id, workspaceId);
                return createdGoal;
            },

            toDomain(row: Record<string, unknown>): Types.QuarterlyGoal {
                return {
                    id: row.id as string,
                    workspaceId: row.workspace_id as string,
                    userId: row.user_id as string,
                    quarterId: row.quarter_id as string | null | undefined,
                    ownerId: row.owner_id as string,
                    title: row.title as string,
                    description: row.description as string | undefined,
                    category: row.category as string | undefined,
                    priority: row.priority as PriorityLevel,
                    status: row.status as GoalStatus,
                    confidenceScore: row.confidence_score as number | undefined,
                    expectedImpact: row.expected_impact as string | undefined,
                    progressPercentage: row.progress_percentage as number,
                    risks: row.risks as string | undefined,
                    dependencies: row.dependencies as string | undefined,
                    successCriteria: row.success_criteria as string | undefined,
                    reviewNotes: row.review_notes as string | undefined,
                    position: row.position as number,
                    createdAt: row.created_at as string,
                    updatedAt: row.updated_at as string,
                    deletedAt: row.deleted_at as string | null | undefined
                };
            }
        },

        keyResults: {
            async create(input: Omit<Types.KeyResult, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Types.KeyResult> {
                const now = nowIso();
                const payload = {
                    workspace_id: input.workspaceId,
                    quarterly_goal_id: input.quarterlyGoalId,
                    title: input.title,
                    description: input.description,
                    progress_type: input.progressType,
                    start_value: input.startValue,
                    target_value: input.targetValue,
                    current_value: input.currentValue ?? 0,
                    unit: input.unit,
                    weight: input.weight ?? 1.0,
                    status: input.status,
                    due_date: input.dueDate,
                    owner_id: input.ownerId,
                    id: crypto.randomUUID(),
                    created_at: now,
                    updated_at: now
                };
                const { error } = await supabase.from(tableName('key_results')).insert(payload);
                if (error) throw error;
                return this.toDomain(payload);
            },

            async list(goalId: string, workspaceId: string): Promise<Types.KeyResult[]> {
                const { data, error } = await supabase
                    .from(tableName('key_results'))
                    .select('*')
                    .eq('quarterly_goal_id', goalId)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: true });
                if (error) throw error;
                return (data || []).map(row => this.toDomain(row));
            },

            async get(id: string, workspaceId: string): Promise<Types.KeyResult | null> {
                const { data, error } = await supabase
                    .from(tableName('key_results'))
                    .select('*')
                    .eq('id', id)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .maybeSingle();
                if (error) throw error;
                return data ? this.toDomain(data) : null;
            },

            async update(id: string, workspaceId: string, updates: Partial<Types.KeyResult>): Promise<Types.KeyResult> {
                const payload = keysToSnake({
                    ...updates,
                    updatedAt: nowIso()
                });
                const { error } = await supabase
                    .from(tableName('key_results'))
                    .update(payload)
                    .eq('id', id)
                    .eq('workspace_id', workspaceId);
                if (error) throw error;
                const { data } = await supabase.from(tableName('key_results')).select('*').eq('id', id).maybeSingle();
                return this.toDomain(data!);
            },

            async softDelete(id: string, workspaceId: string): Promise<void> {
                const { error } = await supabase
                    .from(tableName('key_results'))
                    .update({ deleted_at: nowIso() })
                    .eq('id', id)
                    .eq('workspace_id', workspaceId);
                if (error) throw error;
            },

            async updateProgress(id: string, workspaceId: string, currentValue: number): Promise<number> {
                const { data: kr, error: fetchError } = await supabase
                    .from(tableName('key_results'))
                    .select('*')
                    .eq('id', id)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .maybeSingle();
                if (fetchError) throw fetchError;
                if (!kr) throw new Error('Key result not found');

                const progressPercentage = (() => {
                    if (kr.progress_type === 'manual' || kr.progress_type === 'percentage') {
                        return Math.max(0, Math.min(100, currentValue));
                    }
                    if (kr.progress_type === 'boolean') {
                        return currentValue > 0 ? 100 : 0;
                    }
                    if (kr.progress_type === 'milestone') {
                        const total = kr.target_value ?? 0;
                        return total > 0 ? Math.max(0, Math.min(100, (currentValue / total) * 100)) : 0;
                    }
                    if (kr.start_value != null && kr.target_value != null) {
                        const range = kr.target_value - kr.start_value;
                        if (range !== 0) {
                            return Math.max(0, Math.min(100, ((currentValue) - kr.start_value) / range * 100));
                        }
                    }
                    if (kr.target_value != null) {
                        return Math.max(0, Math.min(100, currentValue / kr.target_value * 100));
                    }
                    return 0;
                })();

                const { error } = await supabase
                    .from(tableName('key_results'))
                    .update({ 
                        current_value: currentValue, 
                        updated_at: nowIso() 
                    })
                    .eq('id', id)
                    .eq('workspace_id', workspaceId);
                if (error) throw error;
                return progressPercentage;
            },

            async reorder(): Promise<void> {
                // key_results do not have a position column, so reordering is a no-op
            },

            toDomain(row: Record<string, unknown>): Types.KeyResult {
                return {
                    id: row.id as string,
                    workspaceId: row.workspace_id as string,
                    userId: row.user_id as string,
                    quarterlyGoalId: row.quarterly_goal_id as string,
                    title: row.title as string,
                    description: row.description as string | undefined,
                    progressType: row.progress_type as ProgressType,
                    startValue: row.start_value as number | undefined,
                    targetValue: row.target_value as number | undefined,
                    currentValue: row.current_value as number,
                    unit: row.unit as string | undefined,
                    weight: row.weight as number,
                    status: row.status as GoalStatus,
                    dueDate: row.due_date as string | undefined,
                    ownerId: row.owner_id as string,
                    createdAt: row.created_at as string,
                    updatedAt: row.updated_at as string,
                    deletedAt: row.deleted_at as string | null | undefined
                };
            }
        },

        monthlyPlans: {
            async create(input: Omit<Types.MonthlyPlan, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Types.MonthlyPlan> {
                const now = nowIso();
                const payload = {
                    workspace_id: input.workspaceId,
                    quarter_id: input.quarterId,
                    user_id: input.userId,
                    month_number: input.monthNumber,
                    year: input.year,
                    start_date: input.startDate,
                    end_date: input.endDate,
                    status: input.status,
                    theme: input.theme,
                    notes: input.notes,
                    planned_capacity_hours: input.plannedCapacityHours,
                    actual_capacity_hours: input.actualCapacityHours,
                    id: crypto.randomUUID(),
                    created_at: now,
                    updated_at: now
                };
                const { error } = await supabase.from(tableName('monthly_plans')).insert(payload);
                if (error) throw error;
                return this.toDomain(payload);
            },

            async list(workspaceId: string, quarterId?: string): Promise<Types.MonthlyPlan[]> {
                let query = supabase
                    .from(tableName('monthly_plans'))
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .order('year', { ascending: false })
                    .order('month_number', { ascending: true });

                if (quarterId) {
                    query = query.eq('quarter_id', quarterId);
                }

                const { data, error } = await query;
                if (error) throw error;
                return (data || []).map(row => this.toDomain(row));
            },

            toDomain(row: Record<string, unknown>): Types.MonthlyPlan {
                return {
                    id: row.id as string,
                    workspaceId: row.workspace_id as string,
                    userId: row.user_id as string,
                    quarterId: row.quarter_id as string | null | undefined,
                    monthNumber: row.month_number as number,
                    year: row.year as number,
                    startDate: row.start_date as string,
                    endDate: row.end_date as string,
                    status: row.status as PlanningStatus,
                    theme: row.theme as string | undefined,
                    notes: row.notes as string | undefined,
                    plannedCapacityHours: row.planned_capacity_hours as number,
                    actualCapacityHours: row.actual_capacity_hours as number,
                    createdAt: row.created_at as string,
                    updatedAt: row.updated_at as string,
                    deletedAt: row.deleted_at as string | null | undefined
                };
            }
        },

        monthlyOutcomes: {
            async create(input: Omit<Types.MonthlyOutcome, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'progressPercentage'>): Promise<Types.MonthlyOutcome> {
                const now = nowIso();
                const payload = {
                    workspace_id: input.workspaceId,
                    monthly_plan_id: input.monthlyPlanId,
                    quarterly_goal_id: input.quarterlyGoalId,
                    owner_id: input.ownerId,
                    title: input.title,
                    description: input.description,
                    desired_outcome: input.desiredOutcome,
                    metric_or_deliverable: input.metricOrDeliverable,
                    start_date: input.startDate,
                    end_date: input.endDate,
                    priority: input.priority,
                    status: input.status ?? 'draft',
                    progress_percentage: 0,
                    risks: input.risks,
                    dependencies: input.dependencies,
                    planned_effort_hours: input.plannedEffortHours ?? 0,
                    actual_effort_hours: input.actualEffortHours ?? 0,
                    position: input.position ?? 0,
                    id: crypto.randomUUID(),
                    created_at: now,
                    updated_at: now
                };
                const { error } = await supabase.from(tableName('monthly_outcomes')).insert(payload);
                if (error) throw error;
                return this.toDomain(payload);
            },

            async update(id: string, workspaceId: string, updates: Partial<Types.MonthlyOutcome>): Promise<Types.MonthlyOutcome> {
                const payload = keysToSnake({
                    ...updates,
                    updatedAt: nowIso()
                });
                const { error } = await supabase
                    .from(tableName('monthly_outcomes'))
                    .update(payload)
                    .eq('id', id)
                    .eq('workspace_id', workspaceId);
                if (error) throw error;
                const { data } = await supabase.from(tableName('monthly_outcomes')).select('*').eq('id', id).maybeSingle();
                return this.toDomain(data!);
            },

            async softDelete(id: string, workspaceId: string): Promise<void> {
                const { error } = await supabase
                    .from(tableName('monthly_outcomes'))
                    .update({ deleted_at: nowIso() })
                    .eq('id', id)
                    .eq('workspace_id', workspaceId);
                if (error) throw error;
            },

            async list(monthlyPlanId: string, workspaceId: string): Promise<Types.MonthlyOutcome[]> {
                const { data, error } = await supabase
                    .from(tableName('monthly_outcomes'))
                    .select('*')
                    .eq('monthly_plan_id', monthlyPlanId)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .order('position', { ascending: true });
                if (error) throw error;
                return (data || []).map(row => this.toDomain(row));
            },

            toDomain(row: Record<string, unknown>): Types.MonthlyOutcome {
                return {
                    id: row.id as string,
                    workspaceId: row.workspace_id as string,
                    userId: row.user_id as string,
                    monthlyPlanId: row.monthly_plan_id as string,
                    quarterlyGoalId: row.quarterly_goal_id as string | null | undefined,
                    ownerId: row.owner_id as string,
                    title: row.title as string,
                    description: row.description as string | undefined,
                    desiredOutcome: row.desired_outcome as string | undefined,
                    metricOrDeliverable: row.metric_or_deliverable as string | undefined,
                    startDate: row.start_date as string | undefined,
                    endDate: row.end_date as string | undefined,
                    priority: row.priority as PriorityLevel,
                    status: row.status as GoalStatus,
                    progressPercentage: row.progress_percentage as number,
                    risks: row.risks as string | undefined,
                    dependencies: row.dependencies as string | undefined,
                    plannedEffortHours: row.planned_effort_hours as number,
                    actualEffortHours: row.actual_effort_hours as number,
                    position: row.position as number,
                    createdAt: row.created_at as string,
                    updatedAt: row.updated_at as string,
                    deletedAt: row.deleted_at as string | null | undefined
                };
            }
        },

        progressUpdates: {
            async create(input: Omit<Types.ProgressUpdate, 'id' | 'createdAt'>): Promise<Types.ProgressUpdate> {
                const { data, error } = await supabase
                    .from(tableName('progress_updates'))
                    .insert({
                        id: crypto.randomUUID(),
                        ...input,
                        created_at: nowIso()
                    })
                    .select()
                    .single();
                if (error) throw error;
                return this.toDomain(data);
            },

            toDomain(row: Record<string, unknown>): Types.ProgressUpdate {
                return {
                    id: row.id as string,
                    workspaceId: row.workspace_id as string,
                    entityType: row.entity_type as 'key_result' | 'monthly_outcome' | 'weekly_objective' | 'quarterly_goal',
                    entityId: row.entity_id as string,
                    previousValue: row.previous_value as number | undefined,
                    newValue: row.new_value as number | undefined,
                    progressType: row.progress_type as ProgressType | undefined,
                    note: row.note as string | undefined,
                    updatedBy: row.updated_by as string | undefined,
                    createdAt: row.created_at as string
                };
            }
        },

        planningReviews: {
            async create(input: Omit<Types.PlanningReview, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Types.PlanningReview> {
                const now = nowIso();
                const { data, error } = await supabase
                    .from(tableName('planning_reviews'))
                    .insert({
                        ...input,
                        id: crypto.randomUUID(),
                        created_at: now,
                        updated_at: now
                    })
                    .select()
                    .single();
                if (error) throw error;
                return this.toDomain(data);
            },

            async list(workspaceId: string, userId: string, reviewType?: ReviewType): Promise<Types.PlanningReview[]> {
                let query = supabase
                    .from(tableName('planning_reviews'))
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });

                if (reviewType) {
                    query = query.eq('review_type', reviewType);
                }

                const { data, error } = await query;
                if (error) throw error;
                return (data || []).map(row => this.toDomain(row));
            },

            toDomain(row: Record<string, unknown>): Types.PlanningReview {
                return {
                    id: row.id as string,
                    workspaceId: row.workspace_id as string,
                    userId: row.user_id as string,
                    reviewType: row.review_type as ReviewType,
                    referenceId: row.reference_id as string | undefined,
                    referenceTable: row.reference_table as string | undefined,
                    periodStart: row.period_start as string | undefined,
                    periodEnd: row.period_end as string | undefined,
                    wins: row.wins as string | undefined,
                    missedItems: row.missed_items as string | undefined,
                    lessons: row.lessons as string | undefined,
                    bottlenecks: row.bottlenecks as string | undefined,
                    metrics: row.metrics as Record<string, unknown>,
                    plannedVsActual: row.planned_vs_actual as Record<string, unknown>,
                    aiGeneratedSummary: row.ai_generated_summary as string | undefined,
                    status: row.status as string | undefined,
                    completedAt: row.completed_at as string | undefined,
                    createdAt: row.created_at as string,
                    updatedAt: row.updated_at as string,
                    deletedAt: row.deleted_at as string | null | undefined
                };
            }
        },

        userCapacitySettings: {
            async get(userId: string, workspaceId: string): Promise<Types.UserCapacitySettings | null> {
                const { data, error } = await supabase
                    .from(tableName('user_capacity_settings'))
                    .select('*')
                    .eq('user_id', userId)
                    .eq('workspace_id', workspaceId)
                    .maybeSingle();
                if (error) throw error;
                return data ? this.toDomain(data) : null;
            },

            async upsert(input: Omit<Types.UserCapacitySettings, 'updatedAt'>): Promise<Types.UserCapacitySettings> {
                const now = nowIso();
                const payload = {
                    user_id: input.userId,
                    workspace_id: input.workspaceId,
                    work_start_time: input.workStartTime,
                    work_end_time: input.workEndTime,
                    work_days: input.workDays,
                    daily_work_hours: input.dailyWorkHours,
                    buffer_percentage: input.bufferPercentage,
                    deep_work_preferred_start: input.deepWorkPreferredStart,
                    deep_work_preferred_end: input.deepWorkPreferredEnd,
                    timezone: input.timezone,
                    updated_at: now
                };
                const { error } = await supabase
                    .from(tableName('user_capacity_settings'))
                    .upsert(payload, { onConflict: 'user_id,workspace_id' });
                if (error) throw error;
                return this.toDomain(payload);
            },

            toDomain(row: Record<string, unknown>): Types.UserCapacitySettings {
                return {
                    userId: row.user_id as string,
                    workspaceId: row.workspace_id as string,
                    workStartTime: row.work_start_time as string,
                    workEndTime: row.work_end_time as string,
                    workDays: row.work_days as number[],
                    dailyWorkHours: Number(row.daily_work_hours),
                    bufferPercentage: Number(row.buffer_percentage),
                    deepWorkPreferredStart: row.deep_work_preferred_start as string | undefined,
                    deepWorkPreferredEnd: row.deep_work_preferred_end as string | undefined,
                    timezone: row.timezone as string,
                    updatedAt: row.updated_at as string
                };
            }
        },

        weeklyPlans: {
            async create(input: Omit<Types.WeeklyPlan, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Types.WeeklyPlan> {
                const now = nowIso();
                const payload = {
                    workspace_id: input.workspaceId,
                    monthly_plan_id: input.monthlyPlanId,
                    user_id: input.userId,
                    week_number: input.weekNumber,
                    year: input.year,
                    start_date: input.startDate,
                    end_date: input.endDate,
                    status: input.status,
                    total_available_hours: input.totalAvailableHours ?? 0,
                    fixed_commitment_hours: input.fixedCommitmentHours ?? 0,
                    planned_task_hours: input.plannedTaskHours ?? 0,
                    deep_work_hours: input.deepWorkHours ?? 0,
                    buffer_hours: input.bufferHours ?? 0,
                    notes: input.notes,
                    id: crypto.randomUUID(),
                    created_at: now,
                    updated_at: now
                };
                const { error } = await supabase.from(tableName('weekly_plans')).insert(payload);
                if (error) throw error;
                return this.toDomain(payload);
            },

            async get(id: string, workspaceId: string): Promise<Types.WeeklyPlan | null> {
                const { data, error } = await supabase
                    .from(tableName('weekly_plans'))
                    .select('*')
                    .eq('id', id)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .maybeSingle();
                if (error) throw error;
                return data ? this.toDomain(data) : null;
            },

            async update(id: string, workspaceId: string, updates: Partial<Types.WeeklyPlan>): Promise<Types.WeeklyPlan> {
                const payload = keysToSnake({
                    ...updates,
                    updatedAt: nowIso()
                });
                const { error } = await supabase
                    .from(tableName('weekly_plans'))
                    .update(payload)
                    .eq('id', id)
                    .eq('workspace_id', workspaceId);
                if (error) throw error;
                const { data } = await supabase.from(tableName('weekly_plans')).select('*').eq('id', id).maybeSingle();
                return this.toDomain(data!);
            },

            toDomain(row: Record<string, unknown>): Types.WeeklyPlan {
                return {
                    id: row.id as string,
                    workspaceId: row.workspace_id as string,
                    userId: row.user_id as string,
                    monthlyPlanId: row.monthly_plan_id as string | null | undefined,
                    weekNumber: row.week_number as number,
                    year: row.year as number,
                    startDate: row.start_date as string,
                    endDate: row.end_date as string,
                    status: row.status as Types.PlanningStatus,
                    totalAvailableHours: Number(row.total_available_hours),
                    fixedCommitmentHours: Number(row.fixed_commitment_hours),
                    plannedTaskHours: Number(row.planned_task_hours),
                    deepWorkHours: Number(row.deep_work_hours),
                    bufferHours: Number(row.buffer_hours),
                    notes: row.notes as string | undefined,
                    createdAt: row.created_at as string,
                    updatedAt: row.updated_at as string,
                    deletedAt: row.deleted_at as string | null | undefined
                };
            }
        },

        weeklyObjectives: {
            async get(id: string, workspaceId: string): Promise<Types.WeeklyObjective | null> {
                const { data, error } = await supabase
                    .from(tableName('weekly_objectives'))
                    .select('*')
                    .eq('id', id)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .maybeSingle();
                if (error) throw error;
                return data ? this.toDomain(data) : null;
            },

            async listForOutcome(outcomeId: string, workspaceId: string): Promise<Types.WeeklyObjective[]> {
                const { data, error } = await supabase
                    .from(tableName('weekly_objectives'))
                    .select('*')
                    .eq('monthly_outcome_id', outcomeId)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .order('position', { ascending: true });
                if (error) throw error;
                return (data || []).map(row => this.toDomain(row));
            },

            async list(weeklyPlanId: string, workspaceId: string): Promise<Types.WeeklyObjective[]> {
                const { data, error } = await supabase
                    .from(tableName('weekly_objectives'))
                    .select('*')
                    .eq('weekly_plan_id', weeklyPlanId)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .order('position', { ascending: true });
                if (error) throw error;
                return (data || []).map(row => this.toDomain(row));
            },

            async create(input: Omit<Types.WeeklyObjective, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Types.WeeklyObjective> {
                const now = nowIso();
                const payload = {
                    workspace_id: input.workspaceId,
                    weekly_plan_id: input.weeklyPlanId,
                    monthly_outcome_id: input.monthlyOutcomeId,
                    owner_id: input.ownerId,
                    title: input.title,
                    description: input.description,
                    definition_of_done: input.definitionOfDone,
                    priority: input.priority,
                    estimated_effort_hours: input.estimatedEffortHours,
                    due_date: input.dueDate,
                    progress_percentage: input.progressPercentage ?? 0,
                    risk_indicator: input.riskIndicator ?? false,
                    confidence_level: input.confidenceLevel,
                    status: input.status,
                    position: input.position ?? 0,
                    id: crypto.randomUUID(),
                    created_at: now,
                    updated_at: now
                };
                const { error } = await supabase.from(tableName('weekly_objectives')).insert(payload);
                if (error) throw error;
                return this.toDomain(payload);
            },

            async update(id: string, workspaceId: string, updates: Partial<Types.WeeklyObjective>): Promise<Types.WeeklyObjective> {
                const payload = keysToSnake({
                    ...updates,
                    updatedAt: nowIso()
                });
                const { error } = await supabase
                    .from(tableName('weekly_objectives'))
                    .update(payload)
                    .eq('id', id)
                    .eq('workspace_id', workspaceId);
                if (error) throw error;
                const { data } = await supabase.from(tableName('weekly_objectives')).select('*').eq('id', id).maybeSingle();
                return this.toDomain(data!);
            },

            toDomain(row: Record<string, unknown>): Types.WeeklyObjective {
                return {
                    id: row.id as string,
                    workspaceId: row.workspace_id as string,
                    userId: row.owner_id as string,
                    weeklyPlanId: row.weekly_plan_id as string,
                    monthlyOutcomeId: row.monthly_outcome_id as string | null | undefined,
                    ownerId: row.owner_id as string,
                    title: row.title as string,
                    description: row.description as string | undefined,
                    definitionOfDone: row.definition_of_done as string | undefined,
                    priority: row.priority as Types.PriorityLevel,
                    estimatedEffortHours: row.estimated_effort_hours != null ? Number(row.estimated_effort_hours) : undefined,
                    dueDate: row.due_date as string | undefined,
                    progressPercentage: Number(row.progress_percentage),
                    riskIndicator: Boolean(row.risk_indicator),
                    confidenceLevel: row.confidence_level != null ? Number(row.confidence_level) : undefined,
                    status: row.status as Types.GoalStatus,
                    position: Number(row.position),
                    createdAt: row.created_at as string,
                    updatedAt: row.updated_at as string,
                    deletedAt: row.deleted_at as string | null | undefined
                };
            }
        },

        dailyPlans: {
            async get(id: string, workspaceId: string): Promise<Types.DailyPlan | null> {
                const { data, error } = await supabase
                    .from(tableName('daily_plans'))
                    .select('*')
                    .eq('id', id)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .maybeSingle();
                if (error) throw error;
                return data ? this.toDomain(data) : null;
            },

            async getByDate(userId: string, workspaceId: string, date: string): Promise<Types.DailyPlan | null> {
                const { data, error } = await supabase
                    .from(tableName('daily_plans'))
                    .select('*')
                    .eq('user_id', userId)
                    .eq('workspace_id', workspaceId)
                    .eq('plan_date', date)
                    .is('deleted_at', null)
                    .maybeSingle();
                if (error) throw error;
                return data ? this.toDomain(data) : null;
            },

            async create(input: Omit<Types.DailyPlan, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Types.DailyPlan> {
                const now = nowIso();
                const payload = {
                    workspace_id: input.workspaceId,
                    weekly_plan_id: input.weeklyPlanId,
                    user_id: input.userId,
                    plan_date: input.planDate,
                    status: input.status,
                    notes: input.notes,
                    shutdown_completed_at: input.shutdownCompletedAt,
                    daily_win: input.dailyWin,
                    blockers: input.blockers,
                    id: crypto.randomUUID(),
                    created_at: now,
                    updated_at: now
                };
                const { error } = await supabase.from(tableName('daily_plans')).insert(payload);
                if (error) throw error;
                return this.toDomain(payload);
            },

            toDomain(row: Record<string, unknown>): Types.DailyPlan {
                return {
                    id: row.id as string,
                    workspaceId: row.workspace_id as string,
                    userId: row.user_id as string,
                    weeklyPlanId: row.weekly_plan_id as string | null | undefined,
                    planDate: row.plan_date as string,
                    status: row.status as Types.PlanningStatus,
                    notes: row.notes as string | undefined,
                    shutdownCompletedAt: row.shutdown_completed_at as string | undefined,
                    dailyWin: row.daily_win as string | undefined,
                    blockers: row.blockers as string | undefined,
                    createdAt: row.created_at as string,
                    updatedAt: row.updated_at as string,
                    deletedAt: row.deleted_at as string | null | undefined
                };
            }
        },

        tasks: {
            async get(id: string, workspaceId: string): Promise<Types.Task | null> {
                const { data, error } = await supabase
                    .from(tableName('tasks'))
                    .select('*')
                    .eq('id', id)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null)
                    .maybeSingle();
                if (error) throw error;
                return data ? this.toDomain(data) : null;
            },

            async listForUserAndDate(userId: string, workspaceId: string, date: string): Promise<Types.Task[]> {
                const { data, error } = await supabase
                    .from(tableName('tasks'))
                    .select(`*, daily_plans!inner(*)`)
                    .eq('owner_id', userId)
                    .eq('workspace_id', workspaceId)
                    .eq('daily_plans.plan_date', date)
                    .is('deleted_at', null);
                if (error) throw error;
                return (data || []).map(row => this.toDomain(row));
            },

            async listForObjective(objectiveId: string, workspaceId: string): Promise<Types.Task[]> {
                const { data, error } = await supabase
                    .from(tableName('tasks'))
                    .select('*')
                    .eq('weekly_objective_id', objectiveId)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null);
                if (error) throw error;
                return (data || []).map(row => this.toDomain(row));
            },

            async listForOutcome(outcomeId: string, workspaceId: string): Promise<Types.Task[]> {
                const { data, error } = await supabase
                    .from(tableName('tasks'))
                    .select('*')
                    .eq('monthly_outcome_id', outcomeId)
                    .eq('workspace_id', workspaceId)
                    .is('deleted_at', null);
                if (error) throw error;
                return (data || []).map(row => this.toDomain(row));
            },

            async create(input: Omit<Types.Task, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Types.Task> {
                const now = nowIso();
                const payload = {
                    workspace_id: input.workspaceId,
                    daily_plan_id: input.dailyPlanId,
                    weekly_objective_id: input.weeklyObjectiveId,
                    monthly_outcome_id: input.monthlyOutcomeId,
                    quarterly_goal_id: input.quarterlyGoalId,
                    project_id: input.projectId,
                    owner_id: input.ownerId,
                    title: input.title,
                    description: input.description,
                    task_type: input.taskType,
                    status: input.status,
                    priority: input.priority,
                    urgency_score: input.urgencyScore,
                    importance_score: input.importanceScore,
                    energy_requirement: input.energyRequirement,
                    estimated_duration_minutes: input.estimatedDurationMinutes,
                    actual_duration_minutes: input.actualDurationMinutes,
                    deadline: input.deadline,
                    scheduled_start: input.scheduledStart,
                    scheduled_end: input.scheduledEnd,
                    completed_at: input.completedAt,
                    completion_notes: input.completionNotes,
                    context: input.context,
                    is_big3: input.isBig3 ?? false,
                    is_locked: input.isLocked ?? false,
                    position: input.position ?? 0,
                    recurrence_rule_id: input.recurrenceRuleId,
                    parent_task_id: input.parentTaskId,
                    id: crypto.randomUUID(),
                    created_at: now,
                    updated_at: now
                };
                const { error } = await supabase.from(tableName('tasks')).insert(payload);
                if (error) throw error;
                return this.toDomain(payload);
            },

            async update(id: string, workspaceId: string, updates: Partial<Types.Task>): Promise<Types.Task> {
                const payload = keysToSnake({
                    ...updates,
                    updatedAt: nowIso()
                });
                const { error } = await supabase
                    .from(tableName('tasks'))
                    .update(payload)
                    .eq('id', id)
                    .eq('workspace_id', workspaceId);
                if (error) throw error;
                const { data } = await supabase.from(tableName('tasks')).select('*').eq('id', id).maybeSingle();
                return this.toDomain(data!);
            },

            async softDelete(id: string, workspaceId: string): Promise<void> {
                const { error } = await supabase
                    .from(tableName('tasks'))
                    .update({ deleted_at: nowIso() })
                    .eq('id', id)
                    .eq('workspace_id', workspaceId);
                if (error) throw error;
            },

            toDomain(row: Record<string, unknown>): Types.Task {
                return {
                    id: row.id as string,
                    workspaceId: row.workspace_id as string,
                    userId: row.owner_id as string,
                    dailyPlanId: row.daily_plan_id as string | null | undefined,
                    weeklyObjectiveId: row.weekly_objective_id as string | null | undefined,
                    monthlyOutcomeId: row.monthly_outcome_id as string | null | undefined,
                    quarterlyGoalId: row.quarterly_goal_id as string | null | undefined,
                    projectId: row.project_id as string | null | undefined,
                    ownerId: row.owner_id as string,
                    title: row.title as string,
                    description: row.description as string | undefined,
                    taskType: row.task_type as Types.TaskType,
                    status: row.status as Types.TaskStatus,
                    priority: row.priority as Types.PriorityLevel,
                    urgencyScore: row.urgency_score != null ? Number(row.urgency_score) : undefined,
                    importanceScore: row.importance_score != null ? Number(row.importance_score) : undefined,
                    energyRequirement: row.energy_requirement as Types.EnergyLevel | undefined,
                    estimatedDurationMinutes: row.estimated_duration_minutes != null ? Number(row.estimated_duration_minutes) : undefined,
                    actualDurationMinutes: row.actual_duration_minutes != null ? Number(row.actual_duration_minutes) : undefined,
                    deadline: row.deadline as string | undefined,
                    scheduledStart: row.scheduled_start as string | undefined,
                    scheduledEnd: row.scheduled_end as string | undefined,
                    completedAt: row.completed_at as string | undefined,
                    completionNotes: row.completion_notes as string | undefined,
                    context: row.context as string | undefined,
                    isBig3: Boolean(row.is_big3),
                    isLocked: Boolean(row.is_locked),
                    position: Number(row.position),
                    recurrenceRuleId: row.recurrence_rule_id as string | null | undefined,
                    parentTaskId: row.parent_task_id as string | null | undefined,
                    createdAt: row.created_at as string,
                    updatedAt: row.updated_at as string,
                    deletedAt: row.deleted_at as string | null | undefined
                };
            }
        },

        timeBlocks: {
            async listForUser(userId: string, workspaceId: string, startDate: string, endDate: string): Promise<Types.TimeBlock[]> {
                const adjustedEndDate = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`;
                const { data, error } = await supabase
                    .from(tableName('time_blocks'))
                    .select('*')
                    .eq('user_id', userId)
                    .eq('workspace_id', workspaceId)
                    .gte('start_time', startDate)
                    .lte('end_time', adjustedEndDate)
                    .order('start_time', { ascending: true });
                if (error) throw error;
                return (data || []).map(row => this.toDomain(row));
            },

            async create(input: Omit<Types.TimeBlock, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Types.TimeBlock> {
                const now = nowIso();
                const payload = {
                    workspace_id: input.workspaceId,
                    user_id: input.userId,
                    daily_plan_id: input.dailyPlanId,
                    task_id: input.taskId,
                    calendar_event_id: input.calendarEventId,
                    title: input.title,
                    block_type: input.blockType,
                    start_time: input.startTime,
                    end_time: input.endTime,
                    is_locked: input.isLocked ?? false,
                    notes: input.notes,
                    id: crypto.randomUUID(),
                    created_at: now,
                    updated_at: now
                };
                const { error } = await supabase.from(tableName('time_blocks')).insert(payload);
                if (error) throw error;
                return this.toDomain(payload);
            },

            toDomain(row: Record<string, unknown>): Types.TimeBlock {
                return {
                    id: row.id as string,
                    workspaceId: row.workspace_id as string,
                    userId: row.user_id as string,
                    dailyPlanId: row.daily_plan_id as string | null | undefined,
                    taskId: row.task_id as string | null | undefined,
                    calendarEventId: row.calendar_event_id as string | null | undefined,
                    title: row.title as string,
                    blockType: row.block_type as Types.BlockType,
                    startTime: row.start_time as string,
                    endTime: row.end_time as string,
                    isLocked: Boolean(row.is_locked),
                    notes: row.notes as string | undefined,
                    createdAt: row.created_at as string,
                    updatedAt: row.updated_at as string,
                    deletedAt: row.deleted_at as string | null | undefined
                };
            }
        },

        calendarEvents: {
            async listForUser(userId: string, workspaceId: string, startDate: string, endDate: string): Promise<Types.CalendarEvent[]> {
                const adjustedEndDate = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`;
                const { data, error } = await supabase
                    .from(tableName('calendar_events'))
                    .select('*')
                    .eq('user_id', userId)
                    .eq('workspace_id', workspaceId)
                    .gte('start_time', startDate)
                    .lte('end_time', adjustedEndDate)
                    .order('start_time', { ascending: true });
                if (error) throw error;
                return (data || []).map(row => this.toDomain(row));
            },

            async create(input: Omit<Types.CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Types.CalendarEvent> {
                const now = nowIso();
                const payload = {
                    workspace_id: input.workspaceId,
                    user_id: input.userId,
                    external_id: input.externalId,
                    source: input.source,
                    title: input.title,
                    description: input.description,
                    start_time: input.startTime,
                    end_time: input.endTime,
                    timezone: input.timezone,
                    is_all_day: input.isAllDay,
                    is_recurring: input.isRecurring,
                    recurrence_data: input.recurrenceData,
                    is_locked: input.isLocked,
                    sync_status: input.syncStatus,
                    last_synced_at: input.lastSyncedAt,
                    id: crypto.randomUUID(),
                    created_at: now,
                    updated_at: now
                };
                const { error } = await supabase.from(tableName('calendar_events')).insert(payload);
                if (error) throw error;
                return this.toDomain(payload);
            },

            toDomain(row: Record<string, unknown>): Types.CalendarEvent {
                return {
                    id: row.id as string,
                    workspaceId: row.workspace_id as string,
                    userId: row.user_id as string,
                    externalId: row.external_id as string | undefined,
                    source: row.source as Types.CalendarSource,
                    title: row.title as string,
                    description: row.description as string | undefined,
                    startTime: row.start_time as string,
                    endTime: row.end_time as string,
                    timezone: row.timezone as string | undefined,
                    isAllDay: Boolean(row.is_all_day),
                    isRecurring: Boolean(row.is_recurring),
                    recurrenceData: row.recurrence_data as Record<string, unknown>,
                    isLocked: Boolean(row.is_locked),
                    syncStatus: row.sync_status as Types.SyncStatus,
                    lastSyncedAt: row.last_synced_at as string | undefined,
                    createdAt: row.created_at as string,
                    updatedAt: row.updated_at as string,
                    deletedAt: row.deleted_at as string | null | undefined
                };
            }
        }
    };

    return repos;
};

export type PlannerRepositories = ReturnType<typeof createPlannerRepositories>;

let plannerRepos: PlannerRepositories | null = null;

export const getPlannerRepositories = (supabase: SupabaseClient): PlannerRepositories => {
    if (!plannerRepos) {
        plannerRepos = createPlannerRepositories(supabase);
    }
    return plannerRepos;
};