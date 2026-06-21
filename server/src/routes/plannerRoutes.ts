import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { getSupabaseClientOrThrow } from '../services/supabaseClient.js';
import { getPlannerRepositories, createWorkspaceService, createCapacityService } from '../services/planner/index.js';
import { createValidationService, createProgressService } from '../services/planner/services.js';
import { requireSupabaseUser, assertOwner, type AuthedRequest } from '../security/securityService.js';
import type { NextFunction } from 'express';
import {
    generateSchedulingSuggestions,
    generatePrioritizationSuggestions,
    detectPlannerRisks,
    analyzeCapacity,
    generateGoalInsights,
    type MonthlyPlanWithOutcomes
} from '../services/planner/aiPlannerService.js';
import { callGemini } from '../services/aiBrain/providers/geminiProvider.js';
import {
    createGoogleCalendarConnectUrl,
    createPlannerGoogleEvent,
    deletePlannerGoogleEvent,
    disconnectGoogleCalendar,
    getGoogleCalendarStatus,
    plannerCalendarEventInputSchema,
    refreshGoogleCalendarList,
    syncGoogleCalendar,
    updatePlannerGoogleEvent,
    updateSelectedGoogleCalendars
} from '../services/planner/googleCalendarService.js';

const camelToSnake = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const keysToSnake = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === undefined) continue;
        result[camelToSnake(key)] = value;
    }
    return result;
};

const router = Router();

router.use(requireSupabaseUser);

// Workspace membership verification middleware
router.use(async (req: Request, res: Response, next: NextFunction) => {
    const workspaceId = req.body?.workspaceId || req.query.workspaceId;
    if (!workspaceId) {
        next();
        return;
    }
    try {
        const userId = getUserId(req);
        const repos = getRepos();
        const workspaceService = createWorkspaceService(repos);
        await workspaceService.assertMembership(String(workspaceId), userId);
        next();
    } catch (error) {
        res.status(403).json({ error: (error as Error).message });
    }
});

const getWorkspaceRole = async (workspaceId: string, userId: string): Promise<string> => {
    const supabase = getSupabaseClientOrThrow();
    const { data: ws } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .maybeSingle();
    if (ws && ws.owner_id === userId) return 'owner';
    const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle();
    return member?.role ?? 'member';
};

const checkPermission = async (req: Request, action: 'create' | 'edit' | 'delete', ownerIdOfObject?: string) => {
    const workspaceId = req.body.workspaceId || req.query.workspaceId;
    if (!workspaceId) return;
    const userId = getUserId(req);
    const role = await getWorkspaceRole(String(workspaceId), userId);
    if (role === 'owner' || role === 'admin') return;
    if (role === 'member') {
        if (action === 'delete') throw new Error('Forbidden: Members cannot delete planning objects');
        if ((action === 'create' || action === 'edit') && ownerIdOfObject && ownerIdOfObject !== userId) {
            throw new Error('Forbidden: Members can only create or edit their own planning objects');
        }
        return;
    }
    throw new Error('Forbidden: Unauthorized workspace access');
};

const nowIso = () => new Date().toISOString();
const tableName = (name: string) => name;

const quarterSchema = z.object({
    workspaceId: z.string().uuid(),
    userId: z.string().uuid(),
    title: z.string().min(1).max(200),
    quarterNumber: z.number().int().min(1).max(4),
    year: z.number().int().min(2020).max(2030),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    theme: z.string().optional(),
    strategicVision: z.string().optional(),
    annualDirectionId: z.string().uuid().optional()
});

const quarterlyGoalSchema = z.object({
    workspaceId: z.string().uuid(),
    quarterId: z.string().uuid().optional(),
    ownerId: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    category: z.string().optional(),
    priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
    confidenceScore: z.number().int().min(0).max(100).optional(),
    expectedImpact: z.string().optional(),
    risks: z.string().optional(),
    dependencies: z.string().optional(),
    successCriteria: z.string().optional()
});

const keyResultSchema = z.object({
    workspaceId: z.string().uuid(),
    quarterlyGoalId: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    progressType: z.enum(['task_completion', 'numeric', 'percentage', 'currency', 'milestone', 'boolean', 'manual', 'weighted']).default('numeric'),
    startValue: z.number().optional(),
    targetValue: z.number().optional(),
    currentValue: z.number().optional(),
    unit: z.string().optional(),
    weight: z.number().min(0).optional(),
    dueDate: z.string().optional(),
    ownerId: z.string().uuid().optional()
});

const keyValueSchema = z.object({
    workspaceId: z.string().uuid(),
    currentValue: z.number(),
    note: z.string().optional()
});

const monthlyPlanSchema = z.object({
    workspaceId: z.string().uuid(),
    quarterId: z.string().uuid().optional(),
    userId: z.string().uuid(),
    monthNumber: z.number().int().min(1).max(12),
    year: z.number().int().min(2020).max(2030),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    theme: z.string().optional(),
    notes: z.string().optional()
});

const monthlyOutcomeSchema = z.object({
    workspaceId: z.string().uuid(),
    monthlyPlanId: z.string().uuid(),
    quarterlyGoalId: z.string().uuid().optional(),
    ownerId: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    desiredOutcome: z.string().max(500).optional(),
    metricOrDeliverable: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
    risks: z.string().optional(),
    dependencies: z.string().optional(),
    plannedEffortHours: z.number().min(0).optional()
});

const getRepos = () => {
    const supabase = getSupabaseClientOrThrow();
    return getPlannerRepositories(supabase);
};

const getUserId = (req: Request): string => {
    return (req as AuthedRequest).userId ?? assertOwner(req as AuthedRequest);
};

// ── Workspace ─────────────────────────────────────────────────────────────

router.get('/google-calendar/status', async (req: Request, res: Response) => {
    try {
        res.json(await getGoogleCalendarStatus(getUserId(req)));
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/google-calendar/connect', async (req: Request, res: Response) => {
    try {
        res.json({ url: await createGoogleCalendarConnectUrl(getUserId(req)) });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/google-calendar/refresh-calendars', async (req: Request, res: Response) => {
    try {
        const connection = await refreshGoogleCalendarList(getUserId(req));
        res.json({ calendars: connection.calendars, selectedCalendarIds: connection.selectedCalendarIds });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/google-calendar/calendars', async (req: Request, res: Response) => {
    try {
        const body = z.object({ selectedCalendarIds: z.array(z.string()) }).parse(req.body);
        const connection = await updateSelectedGoogleCalendars(getUserId(req), body.selectedCalendarIds);
        res.json({ calendars: connection.calendars, selectedCalendarIds: connection.selectedCalendarIds });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/google-calendar/sync', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const body = z.object({
            workspaceId: z.string().uuid(),
            forceFullSync: z.boolean().optional()
        }).parse(req.body);
        await checkPermission(req, 'edit', userId);
        res.json(await syncGoogleCalendar(userId, body.workspaceId, Boolean(body.forceFullSync)));
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/google-calendar/disconnect', async (req: Request, res: Response) => {
    try {
        res.json(await disconnectGoogleCalendar(getUserId(req)));
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/google-calendar/events', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const body = plannerCalendarEventInputSchema.parse(req.body);
        await checkPermission(req, 'create', userId);
        res.status(201).json(await createPlannerGoogleEvent(userId, body));
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/google-calendar/events/:id', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const id = req.params.id as string;
        const body = plannerCalendarEventInputSchema.parse(req.body);
        await checkPermission(req, 'edit', userId);
        res.json(await updatePlannerGoogleEvent(userId, id, body));
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.delete('/google-calendar/events/:id', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        await checkPermission(req, 'delete', userId);
        res.json(await deletePlannerGoogleEvent(userId, workspaceId, id));
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.get('/workspace', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const supabase = getSupabaseClientOrThrow();

        const { data: ownedWs } = await supabase
            .from('workspaces')
            .select('*')
            .eq('owner_id', userId)
            .is('deleted_at', null)
            .limit(1)
            .maybeSingle();

        if (ownedWs) return res.json({ workspace: ownedWs });

        const { data: memberWs } = await supabase
            .from('workspace_members')
            .select('workspace:workspaces!inner(*)')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle();

        if (memberWs && memberWs.workspace) {
            const ws = Array.isArray(memberWs.workspace) ? memberWs.workspace[0] : memberWs.workspace;
            return res.json({ workspace: ws });
        }

        // Auto-provision workspace
        const newWs = {
            id: crypto.randomUUID(),
            owner_id: userId,
            name: 'My Workspace',
            settings: {},
            created_at: nowIso(),
            updated_at: nowIso()
        };
        const { error: createError } = await supabase.from('workspaces').insert(newWs);
        if (createError) throw createError;
        res.json({ workspace: newWs });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// ── Quarters ──────────────────────────────────────────────────────────────

router.post('/quarters', async (req: Request, res: Response) => {
    try {
        const body = quarterSchema.parse(req.body);
        const userId = getUserId(req);
        await checkPermission(req, 'create', userId);
        const repos = getRepos();
        const quarter = await repos.quarters.create({ ...body, userId, status: 'draft' });
        res.status(201).json({ quarter });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.get('/quarters', async (req: Request, res: Response) => {
    try {
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const repos = getRepos();
        const quarters = await repos.quarters.list(workspaceId);
        res.json({ quarters });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.get('/quarters/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const repos = getRepos();
        const quarter = await repos.quarters.get(id, workspaceId);
        if (!quarter) return res.status(404).json({ error: 'Quarter not found' });
        res.json({ quarter });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/quarters/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const body = z.object({
            workspaceId: z.string().uuid(),
            title: z.string().min(1).max(200).optional(),
            theme: z.string().optional(),
            strategicVision: z.string().optional(),
            startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
            endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
            quarterNumber: z.number().int().min(1).max(4).optional(),
            year: z.number().int().min(2020).max(2030).optional()
        }).parse(req.body);
        const repos = getRepos();
        const quarter = await repos.quarters.get(id, body.workspaceId);
        if (!quarter) return res.status(404).json({ error: 'Quarter not found' });
        await checkPermission(req, 'edit', quarter.userId);
        const { workspaceId, ...updates } = body;
        const updated = await repos.quarters.update(id, workspaceId, updates);
        res.json({ quarter: updated });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.delete('/quarters/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        
        const supabase = getSupabaseClientOrThrow();
        const { data: quarter } = await supabase
            .from('quarters')
            .select('user_id')
            .eq('id', id)
            .eq('workspace_id', workspaceId)
            .maybeSingle();
        if (!quarter) return res.status(404).json({ error: 'Quarter not found' });
        await checkPermission(req, 'delete', quarter.user_id);
        
        const { error } = await supabase
            .from('quarters')
            .update({ deleted_at: nowIso(), status: 'archived' })
            .eq('id', id)
            .eq('workspace_id', workspaceId);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});


router.patch('/quarters/:id/activate', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.body.workspaceId as string);
        const repos = getRepos();
        const quarter = await repos.quarters.get(id, workspaceId);
        if (!quarter) return res.status(404).json({ error: 'Quarter not found' });
        await checkPermission(req, 'edit', quarter.userId);

        const validationService = createValidationService(repos);
        const validation = await validationService.validateQuarterBeforeActivation(id, workspaceId);
        if (!validation.valid) {
            return res.status(400).json({ error: 'Validation failed', validation, details: validation.errors });
        }

        const updated = await repos.quarters.update(id, workspaceId, { status: 'active' });
        res.json({ quarter: updated });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/quarters/:id/complete', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.body.workspaceId as string);
        const repos = getRepos();
        const quarter = await repos.quarters.get(id, workspaceId);
        if (!quarter) return res.status(404).json({ error: 'Quarter not found' });
        await checkPermission(req, 'edit', quarter.userId);

        const completedGoals = quarter.goals.filter((g: { status: string }) => g.status === 'completed');
        const incompleteGoals = quarter.goals.filter((g: { status: string; progressPercentage: number }) => g.status !== 'completed');
        const wins = completedGoals.map((g: { title: string }) => `Completed: ${g.title}`).join('\n');
        const missedItems = incompleteGoals.map((g: { title: string; progressPercentage: number }) => `Incomplete: ${g.title} - ${g.progressPercentage}%`).join('\n');

        await repos.planningReviews.create({
            workspaceId,
            userId: quarter.userId,
            reviewType: 'quarterly',
            referenceId: id,
            referenceTable: 'quarters',
            periodStart: quarter.startDate,
            periodEnd: quarter.endDate,
            wins,
            missedItems,
            status: 'completed',
            completedAt: new Date().toISOString(),
            metrics: {},
            plannedVsActual: {}
        });

        const updated = await repos.quarters.update(id, workspaceId, { status: 'completed' });
        res.json({ quarter: updated });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/quarters/:id/archive', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.body.workspaceId as string);
        const repos = getRepos();
        const quarter = await repos.quarters.get(id, workspaceId);
        if (!quarter) return res.status(404).json({ error: 'Quarter not found' });
        await checkPermission(req, 'edit', quarter.userId);
        const updated = await repos.quarters.archive(id, workspaceId);
        res.json({ quarter: updated });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/quarters/:id/duplicate', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const body = z.object({
            workspaceId: z.string().uuid(),
            year: z.number().int().min(2020).max(2030),
            quarterNumber: z.number().int().min(1).max(4)
        }).parse(req.body);
        const repos = getRepos();
        const original = await repos.quarters.get(id, body.workspaceId);
        if (!original) return res.status(404).json({ error: 'Quarter not found' });
        await checkPermission(req, 'create', original.userId);
        const user_id = (req as AuthedRequest).userId ?? '';
        const duplicated = await repos.quarters.duplicateQuarter(id, body.workspaceId, user_id, body.year, body.quarterNumber);
        res.status(201).json({ quarter: duplicated });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.get('/quarters/:id1/compare/:id2', async (req: Request, res: Response) => {
    try {
        const id1 = req.params.id1 as string;
        const id2 = req.params.id2 as string;
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const repos = getRepos();
        const [q1, q2] = await Promise.all([
            repos.quarters.get(id1, workspaceId),
            repos.quarters.get(id2, workspaceId)
        ]);
        if (!q1 || !q2) return res.status(404).json({ error: 'One or both quarters not found' });

        const summarize = (q: typeof q1) => ({
            id: q!.id,
            title: q!.title,
            year: q!.year,
            quarterNumber: q!.quarterNumber,
            status: q!.status,
            goalCount: q!.goals.length,
            completedGoals: q!.goals.filter((g: { status: string }) => g.status === 'completed').length,
            avgProgress: q!.goals.length
                ? Math.round(q!.goals.reduce((sum: number, g: { progressPercentage: number }) => sum + g.progressPercentage, 0) / q!.goals.length)
                : 0,
            goals: q!.goals.map((g: { id: string; title: string; status: string; progressPercentage: number; confidenceScore?: number }) => ({
                id: g.id, title: g.title, status: g.status, progress: g.progressPercentage, confidence: g.confidenceScore
            }))
        });

        res.json({ comparison: { quarter1: summarize(q1), quarter2: summarize(q2) } });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/quarters/:id/retrospective', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.body.workspaceId as string);
        const repos = getRepos();
        const quarter = await repos.quarters.get(id, workspaceId);
        if (!quarter) return res.status(404).json({ error: 'Quarter not found' });
        await checkPermission(req, 'create', quarter.userId);

        const completedGoals = quarter.goals.filter((g: { status: string }) => g.status === 'completed');
        const incompleteGoals = quarter.goals.filter((g: { status: string }) => g.status !== 'completed');
        const atRiskGoals = quarter.goals.filter((g: { status: string }) => g.status === 'at_risk');

        const wins = completedGoals.map((g: { title: string; progressPercentage: number }) => `✓ ${g.title} (${g.progressPercentage}%)`).join('\n') || 'No completed goals.';
        const missedItems = incompleteGoals.map((g: { title: string; progressPercentage: number }) => `✗ ${g.title} (${g.progressPercentage}%)`).join('\n') || 'All goals completed!';
        const lessons = atRiskGoals.length > 0
            ? `${atRiskGoals.length} goal(s) were marked at risk. Review their key results for bottlenecks.`
            : 'Quarter executed without at-risk goals.';

        const review = await repos.planningReviews.create({
            workspaceId,
            userId: quarter.userId,
            reviewType: 'quarterly',
            referenceId: id,
            referenceTable: 'quarters',
            periodStart: quarter.startDate,
            periodEnd: quarter.endDate,
            wins, missedItems, lessons,
            status: 'draft',
            metrics: {
                totalGoals: quarter.goals.length,
                completedGoals: completedGoals.length,
                averageProgress: quarter.goals.length
                    ? Math.round(quarter.goals.reduce((sum: number, g: { progressPercentage: number }) => sum + g.progressPercentage, 0) / quarter.goals.length)
                    : 0
            },
            plannedVsActual: {}
        });
        res.status(201).json({ review });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// ── Quarterly Goals ───────────────────────────────────────────────────────

router.post('/goals', async (req: Request, res: Response) => {
    try {
        const body = quarterlyGoalSchema.parse(req.body);
        const userId = getUserId(req);
        await checkPermission(req, 'create', userId);
        const repos = getRepos();

        if (body.quarterId) {
            const goals = await repos.quarterlyGoals.list(body.workspaceId, body.quarterId);
            if (goals.length >= 5) {
                return res.status(400).json({ error: 'A quarter supports a maximum of 5 goals. Remove or complete an existing goal before adding a new one.' });
            }
        }

        const goal = await repos.quarterlyGoals.create({
            workspaceId: body.workspaceId,
            quarterId: body.quarterId,
            ownerId: userId,
            title: body.title,
            description: body.description,
            category: body.category,
            priority: body.priority,
            status: 'draft',
            confidenceScore: body.confidenceScore,
            expectedImpact: body.expectedImpact,
            risks: body.risks,
            dependencies: body.dependencies,
            successCriteria: body.successCriteria,
            position: 0,
            userId
        });
        res.status(201).json({ goal });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.get('/goals', async (req: Request, res: Response) => {
    try {
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const quarterId = req.query.quarterId as string | undefined;
        const repos = getRepos();
        const goals = await repos.quarterlyGoals.list(workspaceId, quarterId);
        res.json({ goals });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/key-results', async (req: Request, res: Response) => {
    try {
        const body = keyResultSchema.parse(req.body);
        const userId = getUserId(req);
        await checkPermission(req, 'create', userId);
        const repos = getRepos();
        const kr = await repos.keyResults.create({
            workspaceId: body.workspaceId,
            quarterlyGoalId: body.quarterlyGoalId,
            title: body.title,
            description: body.description,
            progressType: body.progressType,
            startValue: body.startValue,
            targetValue: body.targetValue,
            currentValue: body.currentValue ?? body.startValue ?? 0,
            unit: body.unit,
            weight: body.weight ?? 1.0,
            status: 'draft',
            dueDate: body.dueDate,
            ownerId: userId,
            userId
        });
        res.status(201).json({ keyResult: kr });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.get('/key-results', async (req: Request, res: Response) => {
    try {
        const goalId = z.string().uuid().parse(req.query.goalId as string);
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const repos = getRepos();
        const krs = await repos.keyResults.list(goalId, workspaceId);
        res.json({ keyResults: krs });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/key-results/:id/progress', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const body = keyValueSchema.parse(req.body);
        const workspaceId = body.workspaceId;
        const repos = getRepos();
        const progressService = createProgressService(repos);
        const supabase = getSupabaseClientOrThrow();

        const { data: krRaw } = await supabase
            .from('key_results')
            .select('*')
            .eq('id', id)
            .eq('workspace_id', workspaceId)
            .maybeSingle();

        if (!krRaw) return res.status(404).json({ error: 'Key result not found' });
        await checkPermission(req, 'edit', krRaw.owner_id);

        await repos.keyResults.updateProgress(id, workspaceId, body.currentValue ?? 0);

        await progressService.propagateProgress('key_result', id, workspaceId);

        await repos.progressUpdates.create({
            workspaceId,
            entityType: 'key_result',
            entityId: id,
            previousValue: krRaw.current_value as number,
            newValue: body.currentValue ?? 0,
            note: body.note,
            updatedBy: getUserId(req)
        });

        res.json({ success: true, progress: body.currentValue ?? 0 });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/goals/:id/carry', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const body = z.object({
            workspaceId: z.string().uuid(),
            targetQuarterId: z.string().uuid()
        }).parse(req.body);
        const repos = getRepos();
        const goal = await repos.quarterlyGoals.getWithKeyResults(id, body.workspaceId);
        if (!goal) return res.status(404).json({ error: 'Goal not found' });
        await checkPermission(req, 'create', goal.ownerId);
        const carried = await repos.quarterlyGoals.carryToNextQuarter(id, body.workspaceId, body.targetQuarterId);
        res.json({ goal: carried });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/goals/reorder', async (req: Request, res: Response) => {
    try {
        const body = z.object({
            workspaceId: z.string().uuid(),
            quarterId: z.string().uuid(),
            orderedIds: z.array(z.string().uuid())
        }).parse(req.body);
        await checkPermission(req, 'edit');
        const repos = getRepos();
        await repos.quarterlyGoals.reorder(body.quarterId, body.workspaceId, body.orderedIds);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/key-results/reorder', async (req: Request, res: Response) => {
    try {
        z.object({
            workspaceId: z.string().uuid(),
            goalId: z.string().uuid(),
            orderedIds: z.array(z.string().uuid())
        }).parse(req.body);
        await checkPermission(req, 'edit');
        const repos = getRepos();
        await repos.keyResults.reorder();
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/months/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const body = z.object({
            workspaceId: z.string().uuid(),
            theme: z.string().optional(),
            notes: z.string().optional(),
            plannedCapacityHours: z.number().min(0).optional(),
            actualCapacityHours: z.number().min(0).optional(),
            monthNumber: z.number().int().min(1).max(12).optional(),
            year: z.number().int().min(2020).max(2030).optional(),
            startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
            endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
            status: z.enum(['draft', 'active', 'completed', 'archived', 'cancelled']).optional()
        }).parse(req.body);
        
        const supabase = getSupabaseClientOrThrow();
        const { data: plan } = await supabase.from('monthly_plans').select('user_id').eq('id', id).maybeSingle();
        if (plan) {
            await checkPermission(req, 'edit', plan.user_id);
        }
        
        const dbUpdates: Record<string, unknown> = {
            updated_at: nowIso()
        };
        if (body.theme !== undefined) dbUpdates.theme = body.theme;
        if (body.notes !== undefined) dbUpdates.notes = body.notes;
        if (body.plannedCapacityHours !== undefined) dbUpdates.planned_capacity_hours = body.plannedCapacityHours;
        if (body.actualCapacityHours !== undefined) dbUpdates.actual_capacity_hours = body.actualCapacityHours;
        if (body.monthNumber !== undefined) dbUpdates.month_number = body.monthNumber;
        if (body.year !== undefined) dbUpdates.year = body.year;
        if (body.startDate !== undefined) dbUpdates.start_date = body.startDate;
        if (body.endDate !== undefined) dbUpdates.end_date = body.endDate;
        if (body.status !== undefined) dbUpdates.status = body.status;

        const repos = getRepos();
        const { error } = await supabase
            .from(tableName('monthly_plans'))
            .update(dbUpdates)
            .eq('id', id)
            .eq('workspace_id', body.workspaceId);
        if (error) throw error;
        const { data } = await supabase.from(tableName('monthly_plans')).select('*').eq('id', id).maybeSingle();
        res.json({ monthlyPlan: repos.monthlyPlans.toDomain(data!) });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.delete('/months/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        
        const supabase = getSupabaseClientOrThrow();
        const { data: plan } = await supabase
            .from('monthly_plans')
            .select('user_id')
            .eq('id', id)
            .eq('workspace_id', workspaceId)
            .maybeSingle();
        if (!plan) return res.status(404).json({ error: 'Monthly plan not found' });
        await checkPermission(req, 'delete', plan.user_id);
        
        const { error } = await supabase
            .from('monthly_plans')
            .update({ deleted_at: nowIso(), status: 'archived' })
            .eq('id', id)
            .eq('workspace_id', workspaceId);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});


router.patch('/months/:id/activate', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.body.workspaceId as string);
        const supabase = getSupabaseClientOrThrow();
        const { data: plan, error: planError } = await supabase
            .from(tableName('monthly_plans'))
            .select('*')
            .eq('id', id)
            .eq('workspace_id', workspaceId)
            .maybeSingle();
        if (planError) throw planError;
        if (!plan) return res.status(404).json({ error: 'Monthly plan not found' });
        await checkPermission(req, 'edit', plan.user_id);
        const { error } = await supabase
            .from(tableName('monthly_plans'))
            .update({ status: 'active' })
            .eq('id', id)
            .eq('workspace_id', workspaceId);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/reviews', async (req: Request, res: Response) => {
    try {
        const body = z.object({
            workspaceId: z.string().uuid(),
            userId: z.string().uuid(),
            reviewType: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
            referenceId: z.string().uuid().optional(),
            wins: z.string().optional(),
            missedItems: z.string().optional(),
            lessons: z.string().optional(),
            bottlenecks: z.string().optional()
        }).parse(req.body);
        const userId = getUserId(req);
        await checkPermission(req, 'create', userId);
        const repos = getRepos();
        const review = await repos.planningReviews.create({
            workspaceId: body.workspaceId,
            userId,
            reviewType: body.reviewType,
            referenceId: body.referenceId,
            wins: body.wins,
            missedItems: body.missedItems,
            lessons: body.lessons,
            bottlenecks: body.bottlenecks,
            metrics: {},
            plannedVsActual: {}
        });
        res.status(201).json({ review });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/months', async (req: Request, res: Response) => {
    try {
        const body = monthlyPlanSchema.parse(req.body);
        const userId = getUserId(req);
        await checkPermission(req, 'create', userId);
        const repos = getRepos();

        const existing = await repos.monthlyPlans.list(body.workspaceId, body.quarterId);
        const duplicate = existing.find((p: { monthNumber: number; year: number }) => 
            p.monthNumber === body.monthNumber && p.year === body.year);
        if (duplicate) {
            return res.status(400).json({ error: 'A monthly plan already exists for this period' });
        }

        const plan = await repos.monthlyPlans.create({
            workspaceId: body.workspaceId,
            quarterId: body.quarterId,
            userId,
            monthNumber: body.monthNumber,
            year: body.year,
            startDate: body.startDate,
            endDate: body.endDate,
            status: 'draft',
            theme: body.theme,
            notes: body.notes,
            plannedCapacityHours: 0,
            actualCapacityHours: 0
        });
        res.status(201).json({ monthlyPlan: plan });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.get('/months', async (req: Request, res: Response) => {
    try {
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const quarterId = req.query.quarterId as string | undefined;
        const repos = getRepos();
        const plans = await repos.monthlyPlans.list(workspaceId, quarterId);
        res.json({ monthlyPlans: plans });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/outcomes', async (req: Request, res: Response) => {
    try {
        const body = monthlyOutcomeSchema.parse(req.body);
        const userId = getUserId(req);
        await checkPermission(req, 'create', userId);
        const repos = getRepos();
        const outcome = await repos.monthlyOutcomes.create({
            workspaceId: body.workspaceId,
            monthlyPlanId: body.monthlyPlanId,
            quarterlyGoalId: body.quarterlyGoalId,
            ownerId: userId,
            title: body.title,
            description: body.description,
            desiredOutcome: body.desiredOutcome,
            metricOrDeliverable: body.metricOrDeliverable,
            startDate: body.startDate,
            endDate: body.endDate,
            priority: body.priority,
            status: 'draft',
            risks: body.risks,
            dependencies: body.dependencies,
            plannedEffortHours: body.plannedEffortHours ?? 0,
            actualEffortHours: 0,
            position: 0,
            userId
        });
        res.status(201).json({ monthlyOutcome: outcome });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.get('/reviews', async (req: Request, res: Response) => {
    try {
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const reviewType = req.query.reviewType as string | undefined;
        const repos = getRepos();
        const reviews = await repos.planningReviews.list(workspaceId, getUserId(req), 
            reviewType as 'quarterly' | 'monthly' | 'weekly' | 'daily' | undefined);
        res.json({ reviews });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// ── Monthly Outcomes CRUD & Reorder & Progress ────────────────────────────────

router.get('/outcomes', async (req: Request, res: Response) => {
    try {
        const monthlyPlanId = z.string().uuid().parse(req.query.monthlyPlanId as string);
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const repos = getRepos();
        const outcomes = await repos.monthlyOutcomes.list(monthlyPlanId, workspaceId);
        res.json({ monthlyOutcomes: outcomes });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/outcomes/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const body = z.object({
            workspaceId: z.string().uuid(),
            title: z.string().min(1).max(200).optional(),
            description: z.string().optional(),
            desiredOutcome: z.string().max(500).optional(),
            metricOrDeliverable: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
            status: z.enum(['draft', 'active', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled']).optional(),
            plannedEffortHours: z.number().min(0).optional(),
            actualEffortHours: z.number().min(0).optional(),
            quarterlyGoalId: z.string().uuid().nullable().optional()
        }).parse(req.body);

        const supabase = getSupabaseClientOrThrow();
        const { data: outcome } = await supabase
            .from('monthly_outcomes')
            .select('owner_id')
            .eq('id', id)
            .eq('workspace_id', body.workspaceId)
            .maybeSingle();
        if (!outcome) return res.status(404).json({ error: 'Outcome not found' });
        await checkPermission(req, 'edit', outcome.owner_id);

        const { workspaceId, ...updates } = body;
        const repos = getRepos();
        const updated = await repos.monthlyOutcomes.update(id, workspaceId, updates);
        res.json({ monthlyOutcome: updated });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.delete('/outcomes/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);

        const supabase = getSupabaseClientOrThrow();
        const { data: outcome } = await supabase
            .from('monthly_outcomes')
            .select('owner_id')
            .eq('id', id)
            .eq('workspace_id', workspaceId)
            .maybeSingle();
        if (!outcome) return res.status(404).json({ error: 'Outcome not found' });
        await checkPermission(req, 'delete', outcome.owner_id);

        const repos = getRepos();
        await repos.monthlyOutcomes.softDelete(id, workspaceId);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/outcomes/:id/progress', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const body = z.object({
            workspaceId: z.string().uuid(),
            progressPercentage: z.number().min(0).max(100),
            note: z.string().optional()
        }).parse(req.body);

        const supabase = getSupabaseClientOrThrow();
        const { data: outcome } = await supabase
            .from('monthly_outcomes')
            .select('*')
            .eq('id', id)
            .eq('workspace_id', body.workspaceId)
            .maybeSingle();
        if (!outcome) return res.status(404).json({ error: 'Outcome not found' });
        await checkPermission(req, 'edit', outcome.owner_id);

        const repos = getRepos();
        const updated = await repos.monthlyOutcomes.update(id, body.workspaceId, {
            progressPercentage: body.progressPercentage
        });

        await repos.progressUpdates.create({
            workspaceId: body.workspaceId,
            entityType: 'monthly_outcome',
            entityId: id,
            previousValue: Number(outcome.progress_percentage || 0),
            newValue: body.progressPercentage,
            note: body.note,
            updatedBy: getUserId(req)
        });

        res.json({ success: true, monthlyOutcome: updated });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/outcomes/reorder', async (req: Request, res: Response) => {
    try {
        const body = z.object({
            workspaceId: z.string().uuid(),
            monthlyPlanId: z.string().uuid(),
            orderedIds: z.array(z.string().uuid())
        }).parse(req.body);
        await checkPermission(req, 'edit');
        const supabase = getSupabaseClientOrThrow();
        const updates = body.orderedIds.map((id, idx) =>
            supabase.from('monthly_outcomes')
                .update({ position: idx, updated_at: nowIso() })
                .eq('id', id)
                .eq('workspace_id', body.workspaceId)
        );
        await Promise.all(updates.map(u => u.then(({ error }) => { if (error) throw error; })));
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// ── Quarterly Goals Update & Delete ──────────────────────────────────────────

router.patch('/goals/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const body = quarterlyGoalSchema.partial().extend({
            workspaceId: z.string().uuid(),
            status: z.enum(['draft', 'active', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled']).optional()
        }).parse(req.body);

        const supabase = getSupabaseClientOrThrow();
        const { data: goal } = await supabase
            .from('quarterly_goals')
            .select('owner_id')
            .eq('id', id)
            .eq('workspace_id', body.workspaceId)
            .maybeSingle();
        if (!goal) return res.status(404).json({ error: 'Goal not found' });
        await checkPermission(req, 'edit', goal.owner_id);

        const { workspaceId, ...updates } = body;
        const repos = getRepos();
        const updated = await repos.quarterlyGoals.update(id, workspaceId, updates);
        res.json({ goal: updated });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.delete('/goals/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);

        const supabase = getSupabaseClientOrThrow();
        const { data: goal } = await supabase
            .from('quarterly_goals')
            .select('owner_id')
            .eq('id', id)
            .eq('workspace_id', workspaceId)
            .maybeSingle();
        if (!goal) return res.status(404).json({ error: 'Goal not found' });
        await checkPermission(req, 'delete', goal.owner_id);

        const repos = getRepos();
        await repos.quarterlyGoals.softDelete(id, workspaceId);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// ── Key Results Update & Delete ──────────────────────────────────────────────

router.patch('/key-results/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const body = keyResultSchema.partial().extend({
            workspaceId: z.string().uuid(),
            status: z.enum(['draft', 'active', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled']).optional()
        }).parse(req.body);

        const supabase = getSupabaseClientOrThrow();
        const { data: kr } = await supabase
            .from('key_results')
            .select('owner_id, quarterly_goal_id')
            .eq('id', id)
            .eq('workspace_id', body.workspaceId)
            .maybeSingle();
        if (!kr) return res.status(404).json({ error: 'Key result not found' });
        await checkPermission(req, 'edit', kr.owner_id);

        const { workspaceId, ...updates } = body;
        const repos = getRepos();
        const updated = await repos.keyResults.update(id, workspaceId, updates);

        const progressService = createProgressService(repos);
        await progressService.propagateProgress('key_result', id, workspaceId);

        res.json({ keyResult: updated });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.delete('/key-results/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);

        const supabase = getSupabaseClientOrThrow();
        const { data: kr } = await supabase
            .from('key_results')
            .select('owner_id, quarterly_goal_id')
            .eq('id', id)
            .eq('workspace_id', workspaceId)
            .maybeSingle();
        if (!kr) return res.status(404).json({ error: 'Key result not found' });
        await checkPermission(req, 'delete', kr.owner_id);

        const repos = getRepos();
        await repos.keyResults.softDelete(id, workspaceId);

        const progressService = createProgressService(repos);
        await progressService.recalculateQuarterlyGoal(kr.quarterly_goal_id, workspaceId);

        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// ── Monthly Plans Details & Review ───────────────────────────────────────────

router.get('/months/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const repos = getRepos();
        const supabase = getSupabaseClientOrThrow();

        const { data: plan } = await supabase
            .from('monthly_plans')
            .select('*')
            .eq('id', id)
            .eq('workspace_id', workspaceId)
            .is('deleted_at', null)
            .maybeSingle();
        if (!plan) return res.status(404).json({ error: 'Monthly plan not found' });

        const outcomes = await repos.monthlyOutcomes.list(id, workspaceId);
        const domainPlan = repos.monthlyPlans.toDomain(plan);

        res.json({ 
            monthlyPlan: {
                ...domainPlan,
                outcomes
            } 
        });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/months/:id/review', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.body.workspaceId as string);
        const repos = getRepos();
        const supabase = getSupabaseClientOrThrow();

        const { data: plan } = await supabase
            .from('monthly_plans')
            .select('*')
            .eq('id', id)
            .eq('workspace_id', workspaceId)
            .maybeSingle();
        if (!plan) return res.status(404).json({ error: 'Monthly plan not found' });
        await checkPermission(req, 'create', plan.user_id);

        const outcomes = await repos.monthlyOutcomes.list(id, workspaceId);
        const completed = outcomes.filter(o => o.status === 'completed' || o.progressPercentage === 100);
        const incomplete = outcomes.filter(o => o.status !== 'completed' && o.progressPercentage < 100);

        const wins = completed.map(o => `✓ ${o.title}`).join('\n') || 'No completed outcomes.';
        const missedItems = incomplete.map(o => `✗ ${o.title} (${o.progressPercentage}%)`).join('\n') || 'All outcomes completed!';
        const lessons = 'Review completed outcomes and adjust plan for next month.';

        // Check if there is already a monthly review for this plan
        const { data: existingReview } = await supabase
            .from('planning_reviews')
            .select('*')
            .eq('reference_id', id)
            .eq('review_type', 'monthly')
            .maybeSingle();

        if (existingReview) {
            return res.json({ review: existingReview });
        }

        const review = await repos.planningReviews.create({
            workspaceId,
            userId: plan.user_id,
            reviewType: 'monthly',
            referenceId: id,
            referenceTable: 'monthly_plans',
            periodStart: plan.start_date,
            periodEnd: plan.end_date,
            wins,
            missedItems,
            lessons,
            status: 'draft',
            metrics: {
                totalOutcomes: outcomes.length,
                completedOutcomes: completed.length,
                averageProgress: outcomes.length
                    ? Math.round(outcomes.reduce((sum, o) => sum + o.progressPercentage, 0) / outcomes.length)
                    : 0
            },
            plannedVsActual: {
                plannedCapacityHours: plan.planned_capacity_hours,
                actualCapacityHours: plan.actual_capacity_hours
            }
        });

        res.status(201).json({ review });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// ── Save/Update Review ───────────────────────────────────────────────────────

router.patch('/reviews/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const body = z.object({
            workspaceId: z.string().uuid(),
            wins: z.string().optional(),
            missedItems: z.string().optional(),
            lessons: z.string().optional(),
            bottlenecks: z.string().optional(),
            status: z.string().optional(),
            completedAt: z.string().optional(),
            metrics: z.record(z.any()).optional(),
            plannedVsActual: z.record(z.any()).optional(),
            aiGeneratedSummary: z.string().optional()
        }).parse(req.body);

        const supabase = getSupabaseClientOrThrow();
        const { data: review } = await supabase
            .from('planning_reviews')
            .select('user_id')
            .eq('id', id)
            .eq('workspace_id', body.workspaceId)
            .maybeSingle();
        if (!review) return res.status(404).json({ error: 'Review not found' });
        await checkPermission(req, 'edit', review.user_id);

        const { workspaceId, ...updates } = body;
        const { error } = await supabase
            .from('planning_reviews')
            .update({
                ...updates,
                updated_at: nowIso()
            })
            .eq('id', id)
            .eq('workspace_id', workspaceId);
        if (error) throw error;

        const { data: updatedReview } = await supabase.from('planning_reviews').select('*').eq('id', id).maybeSingle();
        res.json({ review: updatedReview });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// ── AI Planning Assistant Routes ─────────────────────────────────────────────

const aiPlannerRequestSchema = z.object({
    workspaceId: z.string().uuid(),
    quarterId: z.string().uuid().optional(),
    monthlyPlanId: z.string().uuid().optional(),
    goalId: z.string().uuid().optional()
});

// POST /planner/ai/suggest-schedule
router.post('/ai/suggest-schedule', async (req: AuthedRequest, res: Response) => {
    try {
        const userId = getUserId(req);
        const body = aiPlannerRequestSchema.parse(req.body);
        const repos = getRepos();
        const workspaceService = createWorkspaceService(repos);
        await workspaceService.assertMembership(body.workspaceId, userId);

        // Require a quarterId
        if (!body.quarterId) return res.status(400).json({ error: 'quarterId is required for schedule suggestions.' });

        const quarter = await repos.quarters.get(body.quarterId, body.workspaceId);
        if (!quarter) return res.status(404).json({ error: 'Quarter not found' });

        // Optionally load linked monthly plan with outcomes
        let monthlyPlan: MonthlyPlanWithOutcomes | null = null;
        if (body.monthlyPlanId) {
            const plan = await repos.monthlyPlans.list(body.workspaceId, undefined);
            const foundPlan = plan.find(p => p.id === body.monthlyPlanId) ?? null;
            if (foundPlan) {
                const outcomes = await repos.monthlyOutcomes.list(foundPlan.id, body.workspaceId);
                monthlyPlan = { ...foundPlan, outcomes };
            }
        }

        const suggestions = await generateSchedulingSuggestions(quarter, monthlyPlan, userId);
        res.json({ suggestions });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// POST /planner/ai/prioritize
router.post('/ai/prioritize', async (req: AuthedRequest, res: Response) => {
    try {
        const userId = getUserId(req);
        const body = aiPlannerRequestSchema.parse(req.body);
        const repos = getRepos();
        const workspaceService = createWorkspaceService(repos);
        await workspaceService.assertMembership(body.workspaceId, userId);

        if (!body.quarterId) return res.status(400).json({ error: 'quarterId is required.' });

        const quarter = await repos.quarters.get(body.quarterId, body.workspaceId);
        if (!quarter) return res.status(404).json({ error: 'Quarter not found' });

        const suggestions = await generatePrioritizationSuggestions(quarter, userId);
        res.json({ suggestions });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// POST /planner/ai/detect-risks
router.post('/ai/detect-risks', async (req: AuthedRequest, res: Response) => {
    try {
        const userId = getUserId(req);
        const body = aiPlannerRequestSchema.parse(req.body);
        const repos = getRepos();
        const workspaceService = createWorkspaceService(repos);
        await workspaceService.assertMembership(body.workspaceId, userId);

        if (!body.quarterId) return res.status(400).json({ error: 'quarterId is required.' });

        const quarter = await repos.quarters.get(body.quarterId, body.workspaceId);
        if (!quarter) return res.status(404).json({ error: 'Quarter not found' });

        const suggestions = await detectPlannerRisks(quarter, userId);
        res.json({ suggestions });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// POST /planner/ai/analyze-capacity
router.post('/ai/analyze-capacity', async (req: AuthedRequest, res: Response) => {
    try {
        const userId = getUserId(req);
        const body = aiPlannerRequestSchema.parse(req.body);
        const repos = getRepos();
        const workspaceService = createWorkspaceService(repos);
        await workspaceService.assertMembership(body.workspaceId, userId);

        // Use quarter dates or default to current month
        let startDate: string;
        let endDate: string;
        if (body.quarterId) {
            const quarter = await repos.quarters.get(body.quarterId, body.workspaceId);
            if (!quarter) return res.status(404).json({ error: 'Quarter not found' });
            startDate = quarter.startDate;
            endDate = quarter.endDate;
        } else {
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        }

        const suggestions = await analyzeCapacity(repos, body.workspaceId, userId, startDate, endDate);
        res.json({ suggestions });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// POST /planner/ai/goal-insights
router.post('/ai/goal-insights', async (req: AuthedRequest, res: Response) => {
    try {
        const userId = getUserId(req);
        const body = aiPlannerRequestSchema.parse(req.body);
        const repos = getRepos();
        const workspaceService = createWorkspaceService(repos);
        await workspaceService.assertMembership(body.workspaceId, userId);

        if (!body.goalId) return res.status(400).json({ error: 'goalId is required.' });

        const goal = await repos.quarterlyGoals.getWithKeyResults(body.goalId, body.workspaceId);
        if (!goal) return res.status(404).json({ error: 'Goal not found' });

        const suggestions = await generateGoalInsights(goal, userId);
        res.json({ suggestions });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// POST /planner/ai/log-action
router.post('/ai/log-action', async (req: AuthedRequest, res: Response) => {
    try {
        const userId = getUserId(req);
        const body = z.object({
            workspaceId: z.string().uuid(),
            actionType: z.string(),
            appliedChanges: z.record(z.any()),
            success: z.boolean(),
            errorMessage: z.string().optional()
        }).parse(req.body);

        const repos = getRepos();
        const workspaceService = createWorkspaceService(repos);
        await workspaceService.assertMembership(body.workspaceId, userId);

        const supabase = getSupabaseClientOrThrow();
        const { data, error } = await supabase.from('ai_action_logs').insert({
            workspace_id: body.workspaceId,
            user_id: userId,
            action_type: body.actionType,
            applied_changes: body.appliedChanges,
            success: body.success,
            error_message: body.errorMessage || null
        }).select().single();

        if (error) throw error;
        res.status(201).json({ log: data });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});


// ── Weekly Plans ───────────────────────────────────────────────────────────
const weeklyPlanSchema = z.object({
    workspaceId: z.string().uuid(),
    monthlyPlanId: z.string().uuid().optional().nullable(),
    userId: z.string().uuid(),
    weekNumber: z.number().int().min(1).max(53),
    year: z.number().int().min(2020).max(2030),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['draft', 'active', 'completed', 'archived', 'cancelled']).default('draft'),
    totalAvailableHours: z.number().optional(),
    fixedCommitmentHours: z.number().optional(),
    plannedTaskHours: z.number().optional(),
    deepWorkHours: z.number().optional(),
    bufferHours: z.number().optional(),
    notes: z.string().optional()
});

router.post('/weekly-plans', async (req: Request, res: Response) => {
    try {
        const body = weeklyPlanSchema.parse(req.body);
        const userId = getUserId(req);
        await checkPermission(req, 'create', userId);
        const repos = getRepos();
        const weeklyPlan = await repos.weeklyPlans.create({
            ...body,
            userId,
            totalAvailableHours: body.totalAvailableHours ?? 0,
            fixedCommitmentHours: body.fixedCommitmentHours ?? 0,
            plannedTaskHours: body.plannedTaskHours ?? 0,
            deepWorkHours: body.deepWorkHours ?? 0,
            bufferHours: body.bufferHours ?? 0
        });
        res.status(201).json({ weeklyPlan });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.get('/weekly-plans', async (req: Request, res: Response) => {
    try {
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const monthlyPlanId = req.query.monthlyPlanId ? z.string().uuid().parse(req.query.monthlyPlanId as string) : undefined;
        const supabase = getSupabaseClientOrThrow();
        let query = supabase
            .from('weekly_plans')
            .select('*')
            .eq('workspace_id', workspaceId)
            .is('deleted_at', null);
        if (monthlyPlanId) {
            query = query.eq('monthly_plan_id', monthlyPlanId);
        }
        const { data, error } = await query.order('year', { ascending: false }).order('week_number', { ascending: false });
        if (error) throw error;
        const repos = getRepos();
        res.json({ weeklyPlans: (data || []).map(row => repos.weeklyPlans.toDomain(row)) });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.get('/weekly-plans/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const repos = getRepos();
        const plan = await repos.weeklyPlans.get(id, workspaceId);
        if (!plan) return res.status(404).json({ error: 'Weekly plan not found' });
        const objectives = await repos.weeklyObjectives.list(id, workspaceId);
        res.json({ weeklyPlan: { ...plan, objectives } });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/weekly-plans/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const body = z.object({
            workspaceId: z.string().uuid(),
            totalAvailableHours: z.number().optional(),
            fixedCommitmentHours: z.number().optional(),
            plannedTaskHours: z.number().optional(),
            deepWorkHours: z.number().optional(),
            bufferHours: z.number().optional(),
            notes: z.string().optional(),
            status: z.enum(['draft', 'active', 'completed', 'archived', 'cancelled']).optional()
        }).parse(req.body);
        const repos = getRepos();
        const plan = await repos.weeklyPlans.get(id, body.workspaceId);
        if (!plan) return res.status(404).json({ error: 'Weekly plan not found' });
        await checkPermission(req, 'edit', plan.userId);
        const { workspaceId, ...updates } = body;
        const updated = await repos.weeklyPlans.update(id, workspaceId, updates);
        res.json({ weeklyPlan: updated });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.delete('/weekly-plans/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const repos = getRepos();
        const plan = await repos.weeklyPlans.get(id, workspaceId);
        if (!plan) return res.status(404).json({ error: 'Weekly plan not found' });
        await checkPermission(req, 'delete', plan.userId);
        await repos.weeklyPlans.update(id, workspaceId, { deletedAt: nowIso() });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/weekly-plans/:id/activate', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.body.workspaceId as string);
        const repos = getRepos();
        const plan = await repos.weeklyPlans.get(id, workspaceId);
        if (!plan) return res.status(404).json({ error: 'Weekly plan not found' });
        await checkPermission(req, 'edit', plan.userId);

        const validationService = createValidationService(repos);
        const validation = await validationService.validateWeeklyPlanCapacity(id, workspaceId);
        if (!validation.valid) {
            return res.status(400).json({ error: 'Validation failed', validation, details: validation.errors });
        }

        const updated = await repos.weeklyPlans.update(id, workspaceId, { status: 'active' });
        res.json({ weeklyPlan: updated });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// ── Weekly Objectives ──────────────────────────────────────────────────────
const weeklyObjectiveSchema = z.object({
    workspaceId: z.string().uuid(),
    weeklyPlanId: z.string().uuid(),
    monthlyOutcomeId: z.string().uuid().optional().nullable(),
    ownerId: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    definitionOfDone: z.string().optional(),
    priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
    estimatedEffortHours: z.number().optional(),
    dueDate: z.string().optional(),
    progressPercentage: z.number().min(0).max(100).optional(),
    riskIndicator: z.boolean().optional(),
    confidenceLevel: z.number().min(1).max(5).optional(),
    status: z.enum(['draft', 'active', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled']).default('draft'),
    position: z.number().optional()
});

router.post('/weekly-objectives', async (req: Request, res: Response) => {
    try {
        const body = weeklyObjectiveSchema.parse(req.body);
        const userId = getUserId(req);
        await checkPermission(req, 'create', userId);
        const repos = getRepos();
        const weeklyObjective = await repos.weeklyObjectives.create({
            ...body,
            ownerId: userId,
            userId,
            progressPercentage: body.progressPercentage ?? 0,
            riskIndicator: body.riskIndicator ?? false,
            position: body.position ?? 0
        });
        res.status(201).json({ weeklyObjective });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.get('/weekly-objectives', async (req: Request, res: Response) => {
    try {
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const weeklyPlanId = z.string().uuid().parse(req.query.weeklyPlanId as string);
        const repos = getRepos();
        const objectives = await repos.weeklyObjectives.list(weeklyPlanId, workspaceId);
        res.json({ objectives });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/weekly-objectives/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const body = z.object({
            workspaceId: z.string().uuid(),
            title: z.string().min(1).max(200).optional(),
            description: z.string().optional(),
            definitionOfDone: z.string().optional(),
            priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
            estimatedEffortHours: z.number().optional(),
            dueDate: z.string().optional(),
            progressPercentage: z.number().min(0).max(100).optional(),
            riskIndicator: z.boolean().optional(),
            confidenceLevel: z.number().min(1).max(5).optional(),
            status: z.enum(['draft', 'active', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled']).optional()
        }).parse(req.body);
        const repos = getRepos();
        const obj = await repos.weeklyObjectives.get(id, body.workspaceId);
        if (!obj) return res.status(404).json({ error: 'Weekly objective not found' });
        await checkPermission(req, 'edit', obj.ownerId);
        const { workspaceId, ...updates } = body;
        const updated = await repos.weeklyObjectives.update(id, workspaceId, updates);

        const progressService = createProgressService(repos);
        await progressService.propagateProgress('weekly_objective', id, workspaceId);

        res.json({ weeklyObjective: updated });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.delete('/weekly-objectives/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const repos = getRepos();
        const obj = await repos.weeklyObjectives.get(id, workspaceId);
        if (!obj) return res.status(404).json({ error: 'Weekly objective not found' });
        await checkPermission(req, 'delete', obj.ownerId);
        await repos.weeklyObjectives.update(id, workspaceId, { deletedAt: nowIso() });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// ── Daily Plans ────────────────────────────────────────────────────────────
const dailyPlanSchema = z.object({
    workspaceId: z.string().uuid(),
    weeklyPlanId: z.string().uuid().optional().nullable(),
    userId: z.string().uuid(),
    planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['draft', 'active', 'completed', 'archived', 'cancelled']).default('draft'),
    notes: z.string().optional(),
    shutdownCompletedAt: z.string().optional(),
    dailyWin: z.string().optional(),
    blockers: z.string().optional()
});

router.post('/daily-plans', async (req: Request, res: Response) => {
    try {
        const body = dailyPlanSchema.parse(req.body);
        const userId = getUserId(req);
        await checkPermission(req, 'create', userId);
        const repos = getRepos();
        const dailyPlan = await repos.dailyPlans.create({ ...body, userId });
        res.status(201).json({ dailyPlan });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.get('/daily-plans', async (req: Request, res: Response) => {
    try {
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const userId = getUserId(req);
        const supabase = getSupabaseClientOrThrow();
        const { data, error } = await supabase
            .from('daily_plans')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('plan_date', { ascending: false });
        if (error) throw error;
        const repos = getRepos();
        res.json({ dailyPlans: (data || []).map(row => repos.dailyPlans.toDomain(row)) });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.get('/daily-plans/by-date', async (req: Request, res: Response) => {
    try {
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.date as string);
        const userId = getUserId(req);
        const repos = getRepos();
        const dailyPlan = await repos.dailyPlans.getByDate(userId, workspaceId, date);
        res.json({ dailyPlan });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/daily-plans/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const body = z.object({
            workspaceId: z.string().uuid(),
            notes: z.string().optional(),
            dailyWin: z.string().optional(),
            blockers: z.string().optional(),
            status: z.enum(['draft', 'active', 'completed', 'archived', 'cancelled']).optional()
        }).parse(req.body);
        const repos = getRepos();
        const plan = await repos.dailyPlans.get(id, body.workspaceId);
        if (!plan) return res.status(404).json({ error: 'Daily plan not found' });
        await checkPermission(req, 'edit', plan.userId);
        const { workspaceId, ...updates } = body;
        const supabase = getSupabaseClientOrThrow();
        const { error } = await supabase
            .from('daily_plans')
            .update(keysToSnake({ ...updates, updatedAt: nowIso() }))
            .eq('id', id)
            .eq('workspace_id', workspaceId);
        if (error) throw error;
        const updated = await repos.dailyPlans.get(id, workspaceId);
        res.json({ dailyPlan: updated });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/daily-plans/:id/shutdown', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const body = z.object({
            workspaceId: z.string().uuid(),
            dailyWin: z.string().min(1),
            blockers: z.string().optional(),
            notes: z.string().optional()
        }).parse(req.body);
        const repos = getRepos();
        const plan = await repos.dailyPlans.get(id, body.workspaceId);
        if (!plan) return res.status(404).json({ error: 'Daily plan not found' });
        await checkPermission(req, 'edit', plan.userId);

        const supabase = getSupabaseClientOrThrow();
        const { error } = await supabase
            .from('daily_plans')
            .update({
                daily_win: body.dailyWin,
                blockers: body.blockers || null,
                notes: body.notes || null,
                status: 'completed',
                shutdown_completed_at: nowIso(),
                updated_at: nowIso()
            })
            .eq('id', id)
            .eq('workspace_id', body.workspaceId);
        if (error) throw error;

        const updated = await repos.dailyPlans.get(id, body.workspaceId);
        res.json({ dailyPlan: updated });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// ── Tasks ──────────────────────────────────────────────────────────────────
const taskSchema = z.object({
    workspaceId: z.string().uuid(),
    dailyPlanId: z.string().uuid().optional().nullable(),
    weeklyObjectiveId: z.string().uuid().optional().nullable(),
    monthlyOutcomeId: z.string().uuid().optional().nullable(),
    quarterlyGoalId: z.string().uuid().optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
    ownerId: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    taskType: z.enum(['goal_aligned', 'operational', 'meeting', 'deep_work', 'administrative', 'personal', 'recurring', 'waiting', 'delegated']),
    status: z.enum(['inbox', 'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed']),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    urgencyScore: z.number().optional(),
    importanceScore: z.number().optional(),
    energyRequirement: z.enum(['high', 'medium', 'low']).optional(),
    estimatedDurationMinutes: z.number().optional(),
    actualDurationMinutes: z.number().optional(),
    deadline: z.string().optional(),
    scheduledStart: z.string().optional(),
    scheduledEnd: z.string().optional(),
    isBig3: z.boolean().optional(),
    isLocked: z.boolean().optional(),
    position: z.number().optional()
});

router.post('/tasks', async (req: Request, res: Response) => {
    try {
        const body = taskSchema.parse(req.body);
        const userId = getUserId(req);
        await checkPermission(req, 'create', userId);
        const repos = getRepos();
        const task = await repos.tasks.create({
            ...body,
            ownerId: userId,
            userId,
            position: body.position ?? 0,
            isBig3: body.isBig3 ?? false,
            isLocked: body.isLocked ?? false
        });

        const progressService = createProgressService(repos);
        await progressService.propagateProgress('task', task.id, body.workspaceId);

        res.status(201).json({ task });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.get('/tasks', async (req: Request, res: Response) => {
    try {
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const userId = getUserId(req);
        const dailyPlanId = req.query.dailyPlanId ? z.string().uuid().parse(req.query.dailyPlanId as string) : undefined;
        const weeklyObjectiveId = req.query.weeklyObjectiveId ? z.string().uuid().parse(req.query.weeklyObjectiveId as string) : undefined;
        
        const supabase = getSupabaseClientOrThrow();
        let query = supabase
            .from('tasks')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('owner_id', userId)
            .is('deleted_at', null);

        if (dailyPlanId) {
            query = query.eq('daily_plan_id', dailyPlanId);
        }
        if (weeklyObjectiveId) {
            query = query.eq('weekly_objective_id', weeklyObjectiveId);
        }

        const { data, error } = await query.order('position', { ascending: true });
        if (error) throw error;
        const repos = getRepos();
        res.json({ tasks: (data || []).map(row => repos.tasks.toDomain(row)) });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/tasks/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const body = z.object({
            workspaceId: z.string().uuid(),
            title: z.string().min(1).max(200).optional(),
            description: z.string().optional(),
            taskType: z.enum(['goal_aligned', 'operational', 'meeting', 'deep_work', 'administrative', 'personal', 'recurring', 'waiting', 'delegated']).optional(),
            status: z.enum(['inbox', 'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed']).optional(),
            priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
            urgencyScore: z.number().optional(),
            importanceScore: z.number().optional(),
            energyRequirement: z.enum(['high', 'medium', 'low']).optional(),
            estimatedDurationMinutes: z.number().optional(),
            actualDurationMinutes: z.number().optional(),
            deadline: z.string().optional(),
            scheduledStart: z.string().optional(),
            scheduledEnd: z.string().optional(),
            isBig3: z.boolean().optional(),
            isLocked: z.boolean().optional(),
            dailyPlanId: z.string().uuid().optional().nullable(),
            weeklyObjectiveId: z.string().uuid().optional().nullable(),
            monthlyOutcomeId: z.string().uuid().optional().nullable(),
            quarterlyGoalId: z.string().uuid().optional().nullable()
        }).parse(req.body);
        const repos = getRepos();
        const task = await repos.tasks.get(id, body.workspaceId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        await checkPermission(req, 'edit', task.ownerId);

        const { workspaceId, ...updates } = body;
        const updated = await repos.tasks.update(id, workspaceId, updates);

        const progressService = createProgressService(repos);
        await progressService.propagateProgress('task', id, workspaceId);

        res.json({ task: updated });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.delete('/tasks/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const repos = getRepos();
        const task = await repos.tasks.get(id, workspaceId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        await checkPermission(req, 'delete', task.ownerId);
        await repos.tasks.softDelete(id, workspaceId);

        const progressService = createProgressService(repos);
        await progressService.propagateProgress('task', id, workspaceId);

        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// ── Notifications ─────────────────────────────────────────────────────────

router.get('/calendar-events', async (req: Request, res: Response) => {
    try {
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const startDate = z.string().parse(req.query.startDate as string);
        const endDate = z.string().parse(req.query.endDate as string);
        const userId = getUserId(req);
        const repos = getRepos();
        const events = await repos.calendarEvents.listForUser(userId, workspaceId, startDate, endDate);
        res.json({ events });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.get('/notifications', async (req: Request, res: Response) => {
    try {
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const userId = getUserId(req);
        const supabase = getSupabaseClientOrThrow();
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .is('dismissed_at', null)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ notifications: data });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/notifications/:id/read', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.body.workspaceId as string);
        const userId = getUserId(req);
        const supabase = getSupabaseClientOrThrow();
        const { error } = await supabase
            .from('notifications')
            .update({ read_at: nowIso() })
            .eq('id', id)
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.patch('/notifications/read-all', async (req: Request, res: Response) => {
    try {
        const workspaceId = z.string().uuid().parse(req.body.workspaceId as string);
        const userId = getUserId(req);
        const supabase = getSupabaseClientOrThrow();
        const { error } = await supabase
            .from('notifications')
            .update({ read_at: nowIso() })
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .is('read_at', null);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.delete('/notifications/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const userId = getUserId(req);
        const supabase = getSupabaseClientOrThrow();
        const { error } = await supabase
            .from('notifications')
            .update({ dismissed_at: nowIso() })
            .eq('id', id)
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.delete('/notifications/dismiss-all', async (req: Request, res: Response) => {
    try {
        const workspaceId = z.string().uuid().parse(req.body.workspaceId as string);
        const userId = getUserId(req);
        const supabase = getSupabaseClientOrThrow();
        const { error } = await supabase
            .from('notifications')
            .update({ dismissed_at: nowIso() })
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .is('dismissed_at', null);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

const createNotificationIfNotExists = async (
    workspaceId: string,
    userId: string,
    type: string,
    title: string,
    body: string,
    entityType?: string,
    entityId?: string
) => {
    const supabase = getSupabaseClientOrThrow();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let query = supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .eq('type', type)
        .gte('created_at', yesterday)
        .is('dismissed_at', null);
    if (entityId) {
        query = query.eq('entity_id', entityId);
    }
    const { data: existing, error } = await query;
    if (error) throw error;
    if (existing && existing.length > 0) {
        return;
    }
    const { error: insertError } = await supabase.from('notifications').insert({
        workspace_id: workspaceId,
        user_id: userId,
        type,
        title,
        body,
        entity_type: entityType || null,
        entity_id: entityId || null,
        created_at: new Date().toISOString()
    });
    if (insertError) throw insertError;
};

router.post('/notifications/trigger-checks', async (req: Request, res: Response) => {
    try {
        const workspaceId = z.string().uuid().parse(req.body.workspaceId as string);
        const userId = getUserId(req);
        const repos = getRepos();
        const supabase = getSupabaseClientOrThrow();

        // 1. daily_planning_reminder: If no daily plan by preferred start time
        const todayDate = new Date().toISOString().split('T')[0];
        const dailyPlan = await repos.dailyPlans.getByDate(userId, workspaceId, todayDate);
        if (!dailyPlan) {
            await createNotificationIfNotExists(
                workspaceId, userId, 'daily_planning_reminder',
                "Daily Plan Missing", "Your daily plan isn't set up yet. Start planning."
            );
        }

        // 2. weekly_planning_reminder: If no weekly plan active by Monday noon
        const now = new Date();
        const currentYear = now.getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const pastDays = (now.getTime() - startOfYear.getTime()) / 86400000;
        const currentWeekNumber = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        const { data: weeklyPlans } = await supabase
            .from('weekly_plans')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('year', currentYear)
            .eq('week_number', currentWeekNumber)
            .is('deleted_at', null);
        const activeWeeklyPlan = weeklyPlans?.find(p => p.status === 'active');
        if (!activeWeeklyPlan) {
            await createNotificationIfNotExists(
                workspaceId, userId, 'weekly_planning_reminder',
                "Weekly Plan Missing", "Week started without a plan. Run the weekly ritual."
            );
        }

        // 3. monthly_review_reminder: Last 3 days of the month
        const todayDay = now.getDate();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysLeft = lastDayOfMonth - todayDay;
        if (daysLeft <= 3) {
            await createNotificationIfNotExists(
                workspaceId, userId, 'monthly_review_reminder',
                "Monthly Review Reminder", `This month ends in ${daysLeft} days. Review your Monthly Outcomes.`
            );
        }

        // 4. quarterly_review_reminder: Last 7 days of quarter
        // 5. goal_behind
        const activeQuarters = await supabase
            .from('quarters')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('status', 'active')
            .is('deleted_at', null);
        if (activeQuarters.data && activeQuarters.data.length > 0) {
            const q = activeQuarters.data[0];
            const qEnd = new Date(q.end_date);
            const daysLeftQ = Math.max(0, Math.ceil((qEnd.getTime() - now.getTime()) / 86400000));
            if (daysLeftQ <= 7) {
                await createNotificationIfNotExists(
                    workspaceId, userId, 'quarterly_review_reminder',
                    "Quarterly Retrospective Reminder", `The quarter ends in ${daysLeftQ} days. Start your retrospective.`
                );
            }

            // check active goals under active quarter
            const { data: goals } = await supabase
                .from('quarterly_goals')
                .select('*')
                .eq('workspace_id', workspaceId)
                .eq('quarter_id', q.id)
                .is('deleted_at', null);
            for (const goal of (goals || [])) {
                if (goal.status !== 'completed' && goal.status !== 'cancelled') {
                    const isBehind = (goal.confidence_score != null && goal.confidence_score < 40) ||
                                     (goal.progress_percentage < 30 && daysLeftQ < 30);
                    if (isBehind) {
                        await createNotificationIfNotExists(
                            workspaceId, userId, 'goal_behind',
                            "Goal Falling Behind", `"${goal.title}" is behind. Review and adjust.`,
                            'goal', goal.id
                        );
                    }
                }
            }
        }

        // 6. deadline_risk: Task deadline within 48h and status != completed
        const { data: riskyTasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('owner_id', userId)
            .is('deleted_at', null)
            .neq('status', 'completed')
            .neq('status', 'cancelled');
        for (const task of (riskyTasks || [])) {
            if (task.deadline) {
                const dueTime = new Date(task.deadline).getTime();
                const hoursLeft = (dueTime - now.getTime()) / 3600000;
                if (hoursLeft > 0 && hoursLeft <= 48) {
                    await createNotificationIfNotExists(
                        workspaceId, userId, 'deadline_risk',
                        "Deadline Risk", `"${task.title}" is due in 2 days and hasn't started.`,
                        'task', task.id
                    );
                }
            }
        }

        // 7. missing_alignment: Goal-aligned task has no parent weekly objective
        const { data: unalignedTasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('task_type', 'goal_aligned')
            .is('weekly_objective_id', null)
            .is('deleted_at', null);
        for (const task of (unalignedTasks || [])) {
            await createNotificationIfNotExists(
                workspaceId, userId, 'missing_alignment',
                "Missing Alignment", `"${task.title}" has no weekly objective. Assign it or mark as operational.`,
                'task', task.id
            );
        }

        // 8. overloaded_day: Day's planned hours exceed available by > 10%
        const capacityService = createCapacityService(repos);
        const isTodayOverloaded = await capacityService.isOverloaded(userId, workspaceId, todayDate);
        if (isTodayOverloaded.overloaded) {
            await createNotificationIfNotExists(
                workspaceId, userId, 'overloaded_day',
                "Overloaded Schedule", `${todayDate} is overloaded by ${isTodayOverloaded.overloadAmount} hours.`
            );
        }

        // 9. blocked_task: Task's dependency is incomplete and task is due within 3 days
        const { data: deps } = await supabase
            .from('task_dependencies')
            .select('*, tasks!inner(*)');
        for (const dep of (deps || [])) {
            const task = dep.tasks;
            if (task && task.deadline && task.status !== 'completed' && task.status !== 'cancelled') {
                const dueTime = new Date(task.deadline).getTime();
                const daysLeft = (dueTime - now.getTime()) / 86400000;
                if (daysLeft > 0 && daysLeft <= 3) {
                    const { data: depTask } = await supabase
                        .from('tasks')
                        .select('status, title')
                        .eq('id', dep.depends_on_task_id)
                        .maybeSingle();
                    if (depTask && depTask.status !== 'completed') {
                        await createNotificationIfNotExists(
                            workspaceId, userId, 'blocked_task',
                            "Blocked Task", `"${task.title}" is blocked by "${depTask.title}" and due soon.`,
                            'task', task.id
                        );
                    }
                }
            }
        }

        // 10. key_result_update_due: KR has not been updated in 7 days
        const { data: allKrs } = await supabase
            .from('key_results')
            .select('*')
            .eq('workspace_id', workspaceId)
            .is('deleted_at', null)
            .neq('status', 'completed');
        for (const kr of (allKrs || [])) {
            const lastUpdate = new Date(kr.updated_at).getTime();
            const daysSinceUpdate = (now.getTime() - lastUpdate) / 86400000;
            if (daysSinceUpdate >= 7) {
                await createNotificationIfNotExists(
                    workspaceId, userId, 'key_result_update_due',
                    "Key Result Update Due", `"${kr.title}" hasn't been updated in 7 days.`,
                    'key_result', kr.id
                );
            }
        }

        // 11. ai_plan_ready: AI action preview created
        const { data: previews } = await supabase
            .from('ai_action_previews')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .eq('status', 'pending')
            .is('deleted_at', null);
        if (previews && previews.length > 0) {
            await createNotificationIfNotExists(
                workspaceId, userId, 'ai_plan_ready',
                "AI Plan Ready", "Your AI-generated plan is ready to review."
            );
        }

        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

// ── GET /ai/brief ──────────────────────────────────────────────────────────

router.get('/ai/brief', async (req: Request, res: Response) => {
    try {
        const workspaceId = z.string().uuid().parse(req.query.workspaceId as string);
        const userId = getUserId(req);
        const repos = getRepos();
        const supabase = getSupabaseClientOrThrow();

        const todayDate = new Date().toISOString().split('T')[0];

        // Check cache in nova_user_docs
        const { data: cachedDoc } = await supabase
            .from('nova_user_docs')
            .select('payload')
            .eq('user_id', userId)
            .eq('collection_name', 'ai_planning_brief')
            .eq('doc_id', todayDate)
            .maybeSingle();

        if (cachedDoc && cachedDoc.payload && typeof cachedDoc.payload === 'object' && 'brief' in cachedDoc.payload) {
            return res.json({ brief: (cachedDoc.payload as Record<string, { brief: string }>).brief });
        }

        // Fetch active quarter context
        const { data: activeQ } = await supabase
            .from('quarters')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('status', 'active')
            .is('deleted_at', null)
            .maybeSingle();

        let quarterCtx = 'No active quarter details.';
        if (activeQ) {
            const detailedQ = await repos.quarters.get(activeQ.id, workspaceId);
            if (detailedQ) {
                const goalSummaries = detailedQ.goals.map(g => 
                    `- Goal: "${g.title}" | progress=${g.progressPercentage}% | confidence=${g.confidenceScore}% | status=${g.status}`
                ).join('\n');
                quarterCtx = `Quarter Q${detailedQ.quarterNumber} ${detailedQ.year} (${detailedQ.startDate} to ${detailedQ.endDate}):\n${goalSummaries}`;
            }
        }

        // Fetch capacity
        const capacityService = createCapacityService(repos);
        const cap = await capacityService.getAvailableCapacity(userId, workspaceId, todayDate, todayDate);

        const prompt = [
            'You are an executive chief of staff and planning coach.',
            'Review the user\'s planning summary for today and output a concise, encouraging, one-paragraph AI Planning Brief (maximum 3 sentences).',
            'Focus on key goal progress, capacity risks, and where they should focus today.',
            '',
            '=== PLANNING CONTEXT ===',
            quarterCtx,
            `Today's Date: ${todayDate}`,
            `Today's Work Hours: ${cap.totalWorkHours}h`,
            `Meetings Scheduled: ${cap.meetingHours}h`,
            `Buffer: ${cap.bufferHours}h`
        ].join('\n');

        const aiResult = await callGemini({
            task: 'brain_qa',
            prompt,
            expectJson: false
        }, userId);

        const briefText = aiResult.ok
            ? aiResult.text.trim()
            : 'Focus on aligning today\'s Big 3 tasks with your active Quarterly Goals and protect your scheduled deep work blocks.';

        // Save to cache
        await supabase
            .from('nova_user_docs')
            .upsert({
                user_id: userId,
                collection_name: 'ai_planning_brief',
                doc_id: todayDate,
                payload: { brief: briefText },
                updated_at: nowIso()
            });

        res.json({ brief: briefText });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

export { router as plannerRoutes };
