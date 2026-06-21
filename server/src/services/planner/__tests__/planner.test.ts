/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { getSupabaseClientOrThrow } from '../../supabaseClient.js';
import { createPlannerRepositories } from '../repository.js';
import {
  createProgressService,
  createCapacityService,
  createValidationService,
  createWorkspaceService,
} from '../services.js';
import * as Types from '../types.js';

describe('Planner Core Services Integration & Unit Tests', () => {
  const supabase = getSupabaseClientOrThrow();
  const repos = createPlannerRepositories(supabase);
  const progressService = createProgressService(repos);
  const capacityService = createCapacityService(repos);
  const validationService = createValidationService(repos);
  const workspaceService = createWorkspaceService(repos);

  let testWorkspaceId: string;
  let testOwnerId: string;
  let testMemberId: string;
  let otherWorkspaceId: string;
  let otherOwnerId: string;

  beforeAll(async () => {
    // Create test owner auth user
    const { data: ownerUser, error: ownerError } = await supabase.auth.admin.createUser({
      email: `test-owner-${crypto.randomUUID()}@example.com`,
      password: 'password123',
      email_confirm: true
    });
    if (ownerError) throw ownerError;
    testOwnerId = ownerUser.user.id;

    // Create test member auth user
    const { data: memberUser, error: memberError } = await supabase.auth.admin.createUser({
      email: `test-member-${crypto.randomUUID()}@example.com`,
      password: 'password123',
      email_confirm: true
    });
    if (memberError) throw memberError;
    testMemberId = memberUser.user.id;

    // Create other owner auth user
    const { data: otherUser, error: otherError } = await supabase.auth.admin.createUser({
      email: `other-owner-${crypto.randomUUID()}@example.com`,
      password: 'password123',
      email_confirm: true
    });
    if (otherError) throw otherError;
    otherOwnerId = otherUser.user.id;

    // Create a test workspace
    const ws = await repos.workspaces.create({
      name: `Test Workspace ${crypto.randomUUID()}`,
      ownerId: testOwnerId,
      userId: testOwnerId,
      workspaceId: '',
      settings: {},
    });
    testWorkspaceId = ws.id;

    // Add member to workspace
    const { error: memberInsertError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: testWorkspaceId,
        user_id: testMemberId,
        role: 'member',
      });
    if (memberInsertError) throw memberInsertError;

    // Create other workspace to test isolation
    const otherWs = await repos.workspaces.create({
      name: `Other Workspace ${crypto.randomUUID()}`,
      ownerId: otherOwnerId,
      userId: otherOwnerId,
      workspaceId: '',
      settings: {},
    });
    otherWorkspaceId = otherWs.id;
  });

  afterAll(async () => {
    // Delete test workspaces (triggers cascade delete to all child tables)
    if (testWorkspaceId) {
      await supabase.from('workspaces').delete().eq('id', testWorkspaceId);
    }
    if (otherWorkspaceId) {
      await supabase.from('workspaces').delete().eq('id', otherWorkspaceId);
    }

    // Delete test auth users
    if (testOwnerId) {
      await supabase.auth.admin.deleteUser(testOwnerId);
    }
    if (testMemberId) {
      await supabase.auth.admin.deleteUser(testMemberId);
    }
    if (otherOwnerId) {
      await supabase.auth.admin.deleteUser(otherOwnerId);
    }
  });

  describe('WorkspaceService', () => {
    test('assertMembership allows members and owner', async () => {
      await expect(workspaceService.assertMembership(testWorkspaceId, testOwnerId)).resolves.not.toThrow();
      await expect(workspaceService.assertMembership(testWorkspaceId, testMemberId)).resolves.not.toThrow();
    });

    test('assertMembership throws for non-members', async () => {
      await expect(workspaceService.assertMembership(testWorkspaceId, otherOwnerId)).rejects.toThrow();
    });

    test('getWorkspace returns workspace for members and null for non-members', async () => {
      const wsForOwner = await workspaceService.getWorkspace(testWorkspaceId, testOwnerId);
      expect(wsForOwner).not.toBeNull();
      expect(wsForOwner?.id).toBe(testWorkspaceId);

      const wsForNonMember = await workspaceService.getWorkspace(testWorkspaceId, otherOwnerId);
      expect(wsForNonMember).toBeNull();
    });
  });

  describe('CapacityService', () => {
    // CapacityService.getAvailableCapacity(userId, workspaceId, startDate, endDate)
    test('getAvailableCapacity Scenario 1: No meetings or personal blocks', async () => {
      // Upsert default settings (Mon-Fri, 8 hours/day, 20% buffer)
      await repos.userCapacitySettings.upsert({
        userId: testMemberId,
        workspaceId: testWorkspaceId,
        workStartTime: '09:00:00',
        workEndTime: '17:00:00',
        workDays: [1, 2, 3, 4, 5],
        dailyWorkHours: 8,
        bufferPercentage: 20,
        timezone: 'UTC',
      });

      // Query capacity for a Mon-Fri range (5 days)
      // Note: 2026-06-15 is Monday, 2026-06-19 is Friday
      const cap = await capacityService.getAvailableCapacity(
        testMemberId,
        testWorkspaceId,
        '2026-06-15',
        '2026-06-19'
      );

      // 5 days * 8 hours = 40 total work hours
      // 20% buffer of 40 = 8 buffer hours
      // remainingCapacity = 40 - 8 = 32 hours
      expect(cap.totalWorkHours).toBe(40);
      expect(cap.meetingHours).toBe(0);
      expect(cap.fixedCommitmentHours).toBe(0);
      expect(cap.bufferHours).toBe(8);
      expect(cap.remainingCapacity).toBe(32);
    });

    test('getAvailableCapacity Scenario 2: Full meetings (exceeding/filling capacity)', async () => {
      // Mon 2026-06-15 is a single day (8 total hours)
      // Let's create a meeting time block that spans 8 hours
      const block = await repos.timeBlocks.create({
        workspaceId: testWorkspaceId,
        userId: testMemberId,
        blockType: 'meeting',
        startTime: '2026-06-15T09:00:00Z',
        endTime: '2026-06-15T17:00:00Z',
        title: 'All Day Meeting',
        isLocked: false,
      });

      const cap = await capacityService.getAvailableCapacity(
        testMemberId,
        testWorkspaceId,
        '2026-06-15',
        '2026-06-15'
      );

      expect(cap.totalWorkHours).toBe(8);
      expect(cap.meetingHours).toBe(8);
      expect(cap.remainingCapacity).toBe(0);

      // Clean up block
      await supabase.from('time_blocks').delete().eq('id', block.id);
    });

    test('getAvailableCapacity Scenario 3: Partial day (meetings + personal blocks + buffer)', async () => {
      // Mon 2026-06-15 (8 total hours, 1.6h buffer)
      // 2 hours meeting, 1 hour personal block (fixedCommitment)
      const block1 = await repos.timeBlocks.create({
        workspaceId: testWorkspaceId,
        userId: testMemberId,
        blockType: 'meeting',
        startTime: '2026-06-15T10:00:00Z',
        endTime: '2026-06-15T12:00:00Z',
        title: 'Meeting 2h',
        isLocked: false,
      });

      const block2 = await repos.timeBlocks.create({
        workspaceId: testWorkspaceId,
        userId: testMemberId,
        blockType: 'personal',
        startTime: '2026-06-15T13:00:00Z',
        endTime: '2026-06-15T14:00:00Z',
        title: 'Personal Appointment 1h',
        isLocked: false,
      });

      const cap = await capacityService.getAvailableCapacity(
        testMemberId,
        testWorkspaceId,
        '2026-06-15',
        '2026-06-15'
      );

      // Total = 8
      // Meeting = 2
      // Fixed = 1
      // Buffer = 8 * 20% = 1.6
      // Remaining = 8 - 2 - 1 - 1.6 = 3.4
      expect(cap.totalWorkHours).toBe(8);
      expect(cap.meetingHours).toBe(2);
      expect(cap.fixedCommitmentHours).toBe(1);
      expect(cap.bufferHours).toBe(1.6);
      expect(cap.remainingCapacity).toBe(3.4);

      await supabase.from('time_blocks').delete().in('id', [block1.id, block2.id]);
    });

    test('isOverloaded Scenario 1: Not overloaded', async () => {
      // Monday 2026-06-15: 8 total work hours, max allowed = 8 * 0.8 = 6.4 hours (384 mins)
      // Create a task scheduled for Mon with 180 minutes duration (3 hours)
      const dailyPlan = await repos.dailyPlans.create({
        workspaceId: testWorkspaceId,
        userId: testMemberId,
        planDate: '2026-06-15',
        status: 'active',
      });

      const task = await repos.tasks.create({
        workspaceId: testWorkspaceId,
        dailyPlanId: dailyPlan.id,
        ownerId: testMemberId,
        userId: testMemberId,
        title: 'Important task',
        taskType: 'goal_aligned',
        status: 'scheduled',
        priority: 'high',
        estimatedDurationMinutes: 180,
        position: 0,
        isLocked: false,
        isBig3: false,
      });

      const status = await capacityService.isOverloaded(testMemberId, testWorkspaceId, '2026-06-15');
      expect(status.overloaded).toBe(false);

      await supabase.from('tasks').delete().eq('id', task.id);
      await supabase.from('daily_plans').delete().eq('id', dailyPlan.id);
    });

    test('isOverloaded Scenario 2: Overloaded', async () => {
      // Max allowed = 6.4 hours (384 mins)
      // Create a daily plan and a task with 420 minutes (7 hours)
      const dailyPlan = await repos.dailyPlans.create({
        workspaceId: testWorkspaceId,
        userId: testMemberId,
        planDate: '2026-06-15',
        status: 'active',
      });

      const task = await repos.tasks.create({
        workspaceId: testWorkspaceId,
        dailyPlanId: dailyPlan.id,
        ownerId: testMemberId,
        userId: testMemberId,
        title: 'Huge task',
        taskType: 'goal_aligned',
        status: 'scheduled',
        priority: 'critical',
        estimatedDurationMinutes: 420,
        position: 0,
        isLocked: false,
        isBig3: false,
      });

      const status = await capacityService.isOverloaded(testMemberId, testWorkspaceId, '2026-06-15');
      expect(status.overloaded).toBe(true);
      expect(status.overloadAmount).toBeGreaterThan(0);

      await supabase.from('tasks').delete().eq('id', task.id);
      await supabase.from('daily_plans').delete().eq('id', dailyPlan.id);
    });
  });

  describe('ProgressService', () => {
    let testQuarterId: string;
    let testGoalId: string;
    let testMonthPlanId: string;

    beforeAll(async () => {
      const q = await repos.quarters.create({
        workspaceId: testWorkspaceId,
        userId: testOwnerId,
        title: 'Test Quarter Q2 2026',
        quarterNumber: 2,
        year: 2026,
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        status: 'active',
      });
      testQuarterId = q.id;

      const g = await repos.quarterlyGoals.create({
        workspaceId: testWorkspaceId,
        quarterId: testQuarterId,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Test Quarterly Goal',
        priority: 'high',
        status: 'active',
        position: 0,
      });
      testGoalId = g.id;

      const mp = await repos.monthlyPlans.create({
        workspaceId: testWorkspaceId,
        quarterId: testQuarterId,
        userId: testOwnerId,
        monthNumber: 6,
        year: 2026,
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        status: 'active',
        plannedCapacityHours: 0,
        actualCapacityHours: 0,
      });
      testMonthPlanId = mp.id;
    });

    test('recalculateKeyResult scenarios', async () => {
      // Scenario 1: manual progress type
      const krManual = await repos.keyResults.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: testGoalId,
        title: 'KR Manual',
        progressType: 'manual',
        currentValue: 45,
        targetValue: 100,
        weight: 1.0,
        status: 'active',
        ownerId: testOwnerId,
        userId: testOwnerId,
      });

      let percent = await progressService.recalculateKeyResult(krManual.id, testWorkspaceId);
      expect(percent).toBe(45);

      // Scenario 2: boolean progress type
      const krBool = await repos.keyResults.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: testGoalId,
        title: 'KR Boolean',
        progressType: 'boolean',
        currentValue: 1, // done
        weight: 1.0,
        status: 'active',
        ownerId: testOwnerId,
        userId: testOwnerId,
      });

      percent = await progressService.recalculateKeyResult(krBool.id, testWorkspaceId);
      expect(percent).toBe(100);

      // Scenario 3: standard range with startValue, targetValue and currentValue
      const krNumeric = await repos.keyResults.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: testGoalId,
        title: 'KR Numeric',
        progressType: 'numeric',
        startValue: 10,
        targetValue: 50,
        currentValue: 30, // 50% progress
        weight: 2.0,
        status: 'active',
        ownerId: testOwnerId,
        userId: testOwnerId,
      });

      percent = await progressService.recalculateKeyResult(krNumeric.id, testWorkspaceId);
      expect(percent).toBe(50);

      // Scenario 4: percentage progress type
      const krPercent = await repos.keyResults.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: testGoalId,
        title: 'KR Percentage',
        progressType: 'percentage',
        currentValue: 78,
        weight: 1.0,
        status: 'active',
        ownerId: testOwnerId,
        userId: testOwnerId,
      });
      percent = await progressService.recalculateKeyResult(krPercent.id, testWorkspaceId);
      expect(percent).toBe(78);

      // Scenario 5: milestone progress type
      const krMilestone = await repos.keyResults.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: testGoalId,
        title: 'KR Milestone',
        progressType: 'milestone',
        currentValue: 2, // 2 completed milestones
        targetValue: 5, // 5 total milestones
        weight: 1.0,
        status: 'active',
        ownerId: testOwnerId,
        userId: testOwnerId,
      });
      percent = await progressService.recalculateKeyResult(krMilestone.id, testWorkspaceId);
      expect(percent).toBe(40); // 2/5 * 100 = 40%

      // Scenario 6: clamping standard range above 100%
      const krClampAbove = await repos.keyResults.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: testGoalId,
        title: 'KR Clamp Above',
        progressType: 'numeric',
        startValue: 0,
        targetValue: 10,
        currentValue: 12,
        weight: 1.0,
        status: 'active',
        ownerId: testOwnerId,
        userId: testOwnerId,
      });
      percent = await progressService.recalculateKeyResult(krClampAbove.id, testWorkspaceId);
      expect(percent).toBe(100);

      // Scenario 7: clamping standard range below 0%
      const krClampBelow = await repos.keyResults.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: testGoalId,
        title: 'KR Clamp Below',
        progressType: 'numeric',
        startValue: 10,
        targetValue: 20,
        currentValue: 5,
        weight: 1.0,
        status: 'active',
        ownerId: testOwnerId,
        userId: testOwnerId,
      });
      percent = await progressService.recalculateKeyResult(krClampBelow.id, testWorkspaceId);
      expect(percent).toBe(0);

      // Scenario 8: decreasing range (startValue = 50, targetValue = 10)
      const krDecreasing = await repos.keyResults.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: testGoalId,
        title: 'KR Decreasing',
        progressType: 'numeric',
        startValue: 50,
        targetValue: 10,
        currentValue: 30, // 50% progress
        weight: 1.0,
        status: 'active',
        ownerId: testOwnerId,
        userId: testOwnerId,
      });
      percent = await progressService.recalculateKeyResult(krDecreasing.id, testWorkspaceId);
      expect(percent).toBe(50);
    });

    test('recalculateQuarterlyGoal scenarios', async () => {
      // Create a fresh quarterly goal for this test to isolate the results
      const freshGoal = await repos.quarterlyGoals.create({
        workspaceId: testWorkspaceId,
        quarterId: testQuarterId,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Fresh Quarterly Goal',
        priority: 'medium',
        status: 'active',
        position: 0,
      });

      // Scenario 3: No key results -> should return 0 progress
      let progress = await progressService.recalculateQuarterlyGoal(freshGoal.id, testWorkspaceId);
      expect(progress).toBe(0);

      // Scenario 1: Key results with equal weights
      const kr1 = await repos.keyResults.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: freshGoal.id,
        title: 'KR 1',
        progressType: 'manual',
        currentValue: 40,
        weight: 1.0,
        status: 'active',
        ownerId: testOwnerId,
        userId: testOwnerId,
      });

      const kr2 = await repos.keyResults.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: freshGoal.id,
        title: 'KR 2',
        progressType: 'manual',
        currentValue: 80,
        weight: 1.0,
        status: 'active',
        ownerId: testOwnerId,
        userId: testOwnerId,
      });

      progress = await progressService.recalculateQuarterlyGoal(freshGoal.id, testWorkspaceId);
      expect(progress).toBe(60); // average of 40 and 80 is 60

      // Scenario 2: Key result with weight = 0 (excluded from calculation)
      const krZero = await repos.keyResults.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: freshGoal.id,
        title: 'KR Zero Weight',
        progressType: 'manual',
        currentValue: 100,
        weight: 0,
        status: 'active',
        ownerId: testOwnerId,
        userId: testOwnerId,
      });

      progress = await progressService.recalculateQuarterlyGoal(freshGoal.id, testWorkspaceId);
      expect(progress).toBe(60); // still 60 because weight 0 is excluded

      // Scenario 4: Key results with unequal weights
      const freshGoal2 = await repos.quarterlyGoals.create({
        workspaceId: testWorkspaceId,
        quarterId: testQuarterId,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Goal Unequal Weights',
        priority: 'medium',
        status: 'active',
        position: 0,
      });

      const krW1 = await repos.keyResults.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: freshGoal2.id,
        title: 'KR W1',
        progressType: 'manual',
        currentValue: 25,
        weight: 1.0,
        status: 'active',
        ownerId: testOwnerId,
        userId: testOwnerId,
      });

      const krW2 = await repos.keyResults.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: freshGoal2.id,
        title: 'KR W2',
        progressType: 'manual',
        currentValue: 75,
        weight: 3.0,
        status: 'active',
        ownerId: testOwnerId,
        userId: testOwnerId,
      });

      progress = await progressService.recalculateQuarterlyGoal(freshGoal2.id, testWorkspaceId);
      // weighted average: (25 * 1.0 + 75 * 3.0) / 4.0 = (25 + 225) / 4 = 250 / 4 = 62.5 -> 63%
      expect(progress).toBe(63);

      // Scenario 5: Success criteria override / at_risk goal override
      const freshGoal3 = await repos.quarterlyGoals.create({
        workspaceId: testWorkspaceId,
        quarterId: testQuarterId,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Goal success criteria not met',
        priority: 'medium',
        status: 'at_risk', // marked at_risk manually
        position: 0,
      });

      const krW3 = await repos.keyResults.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: freshGoal3.id,
        title: 'KR W3',
        progressType: 'manual',
        currentValue: 100,
        weight: 1.0,
        status: 'active',
        ownerId: testOwnerId,
        userId: testOwnerId,
      });

      progress = await progressService.recalculateQuarterlyGoal(freshGoal3.id, testWorkspaceId);
      expect(progress).toBe(100);

      // Fetch the goal status: should still be 'at_risk', not auto-completed!
      const fetchedGoal = await repos.quarterlyGoals.getWithKeyResults(freshGoal3.id, testWorkspaceId);
      expect(fetchedGoal?.status).toBe('at_risk');
    });

    test('recalculateMonthlyOutcome and recalculateWeeklyObjective scenarios', async () => {
      const outcome = await repos.monthlyOutcomes.create({
        workspaceId: testWorkspaceId,
        monthlyPlanId: testMonthPlanId,
        quarterlyGoalId: testGoalId,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Monthly Outcome',
        priority: 'medium',
        status: 'active',
        position: 0,
        plannedEffortHours: 0,
        actualEffortHours: 0,
      });

      // Scenario 1 (monthlyOutcome): No objectives linked -> returns current percentage (usually 0)
      let outProgress = await progressService.recalculateMonthlyOutcome(outcome.id, testWorkspaceId);
      expect(outProgress).toBe(0);

      // Create a weekly plan
      const wp = await repos.weeklyPlans.create({
        workspaceId: testWorkspaceId,
        monthlyPlanId: testMonthPlanId,
        userId: testOwnerId,
        weekNumber: 25,
        year: 2026,
        startDate: '2026-06-15',
        endDate: '2026-06-21',
        status: 'active',
        totalAvailableHours: 40,
        fixedCommitmentHours: 0,
        plannedTaskHours: 0,
        deepWorkHours: 0,
        bufferHours: 8,
      });

      const objective = await repos.weeklyObjectives.create({
        workspaceId: testWorkspaceId,
        weeklyPlanId: wp.id,
        monthlyOutcomeId: outcome.id,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Weekly Objective',
        priority: 'high',
        status: 'active',
        progressPercentage: 0,
        position: 0,
        riskIndicator: false,
      });

      // Scenario 1 (weeklyObjective): No tasks -> returns its current progress (0)
      let objProgress = await progressService.recalculateWeeklyObjective(objective.id, testWorkspaceId);
      expect(objProgress).toBe(0);

      // Scenario 2 (weeklyObjective): Multiple tasks (one completed, one scheduled)
      const task1 = await repos.tasks.create({
        workspaceId: testWorkspaceId,
        weeklyObjectiveId: objective.id,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Task 1',
        taskType: 'goal_aligned',
        status: 'completed',
        priority: 'high',
        position: 0,
        isLocked: false,
        isBig3: false,
      });

      const task2 = await repos.tasks.create({
        workspaceId: testWorkspaceId,
        weeklyObjectiveId: objective.id,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Task 2',
        taskType: 'goal_aligned',
        status: 'scheduled',
        priority: 'medium',
        position: 0,
        isLocked: false,
        isBig3: false,
      });

      objProgress = await progressService.recalculateWeeklyObjective(objective.id, testWorkspaceId);
      expect(objProgress).toBe(50); // 1 out of 2 tasks completed is 50%

      // Scenario 2 (monthlyOutcome): Recalculate monthly outcome based on linked weekly objective
      outProgress = await progressService.recalculateMonthlyOutcome(outcome.id, testWorkspaceId);
      expect(outProgress).toBe(50); // average of linked weekly objectives (only one objective at 50%)

      // Scenario 3 (weeklyObjective): All tasks completed
      await repos.tasks.update(task2.id, testWorkspaceId, { status: 'completed' });
      objProgress = await progressService.recalculateWeeklyObjective(objective.id, testWorkspaceId);
      expect(objProgress).toBe(100);
    });

    test('propagateProgress scenarios', async () => {
      // Create a fresh quarterly goal, key result, monthly outcome, weekly plan, weekly objective, and task
      const freshGoal = await repos.quarterlyGoals.create({
        workspaceId: testWorkspaceId,
        quarterId: testQuarterId,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Goal for Propagation',
        priority: 'medium',
        status: 'active',
        position: 0,
      });

      const kr = await repos.keyResults.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: freshGoal.id,
        title: 'KR for propagation',
        progressType: 'manual',
        currentValue: 0,
        weight: 1.0,
        status: 'active',
        ownerId: testOwnerId,
        userId: testOwnerId,
      });

      // Update currentValue directly in DB bypassing recalculateKeyResult
      await supabase
        .from('key_results')
        .update({ current_value: 80 })
        .eq('id', kr.id);

      // Scenario 1: propagate from key_result
      await progressService.propagateProgress('key_result', kr.id, testWorkspaceId);

      const updatedGoal = await repos.quarterlyGoals.getWithKeyResults(freshGoal.id, testWorkspaceId);
      expect(updatedGoal?.progressPercentage).toBe(80);

      // Scenario 3: propagate from task
      const outcome = await repos.monthlyOutcomes.create({
        workspaceId: testWorkspaceId,
        monthlyPlanId: testMonthPlanId,
        quarterlyGoalId: freshGoal.id,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Outcome for Propagation',
        priority: 'medium',
        status: 'active',
        position: 0,
        plannedEffortHours: 0,
        actualEffortHours: 0,
      });

      const wp = await repos.weeklyPlans.create({
        workspaceId: testWorkspaceId,
        monthlyPlanId: testMonthPlanId,
        userId: testOwnerId,
        weekNumber: 25,
        year: 2026,
        startDate: '2026-06-15',
        endDate: '2026-06-21',
        status: 'active',
        totalAvailableHours: 40,
        fixedCommitmentHours: 0,
        plannedTaskHours: 0,
        deepWorkHours: 0,
        bufferHours: 8,
      });

      const objective = await repos.weeklyObjectives.create({
        workspaceId: testWorkspaceId,
        weeklyPlanId: wp.id,
        monthlyOutcomeId: outcome.id,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Objective for Propagation',
        priority: 'medium',
        status: 'active',
        progressPercentage: 0,
        position: 0,
        riskIndicator: false,
      });

      const task = await repos.tasks.create({
        workspaceId: testWorkspaceId,
        weeklyObjectiveId: objective.id,
        monthlyOutcomeId: outcome.id,
        quarterlyGoalId: freshGoal.id,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Task for Propagation',
        taskType: 'goal_aligned',
        status: 'completed',
        priority: 'medium',
        position: 0,
        isLocked: false,
        isBig3: false,
      });

      // Propagate progress from the completed task
      await progressService.propagateProgress('task', task.id, testWorkspaceId);

      // Verify objective is 100% (only 1 task, completed)
      const updatedObj = await repos.weeklyObjectives.get(objective.id, testWorkspaceId);
      expect(updatedObj?.progressPercentage).toBe(100);

      // Verify outcome is 100% (linked objective is 100%)
      const updatedOutcome = await supabase
        .from('monthly_outcomes')
        .select('progress_percentage')
        .eq('id', outcome.id)
        .single();
      expect(updatedOutcome.data?.progress_percentage).toBe(100);
    });
  });

  describe('ValidationService', () => {
    let testQuarterId: string;
    let testMonthPlanId: string;

    beforeAll(async () => {
      const q = await repos.quarters.create({
        workspaceId: testWorkspaceId,
        userId: testOwnerId,
        title: 'Validation Quarter Q3 2026',
        quarterNumber: 3,
        year: 2026,
        startDate: '2026-07-01',
        endDate: '2026-09-30',
        status: 'draft',
      });
      testQuarterId = q.id;

      const mp = await repos.monthlyPlans.create({
        workspaceId: testWorkspaceId,
        quarterId: testQuarterId,
        userId: testOwnerId,
        monthNumber: 7,
        year: 2026,
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        status: 'draft',
        plannedCapacityHours: 0,
        actualCapacityHours: 0,
      });
      testMonthPlanId = mp.id;
    });

    test('validateQuarterBeforeActivation validation rules', async () => {
      // Setup capacity setting: 8 hours daily, 20% buffer, Mon-Fri (capacity ~ 520h for quarter)
      await repos.userCapacitySettings.upsert({
        userId: testOwnerId,
        workspaceId: testWorkspaceId,
        workStartTime: '09:00:00',
        workEndTime: '17:00:00',
        workDays: [1, 2, 3, 4, 5],
        dailyWorkHours: 8,
        bufferPercentage: 20,
        timezone: 'UTC',
      });

      // Scenario 1: Goal count too low (< 3 goals)
      let val = await validationService.validateQuarterBeforeActivation(testQuarterId, testWorkspaceId);
      expect(val.valid).toBe(false);
      expect(val.errors.some(e => e.includes('needs at least 3 goals'))).toBe(true);

      // Create 3 goals
      const g1 = await repos.quarterlyGoals.create({
        workspaceId: testWorkspaceId,
        quarterId: testQuarterId,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Unique Goal Title 1',
        priority: 'high',
        status: 'active',
        successCriteria: 'Done criteria 1',
        position: 0,
      });

      const g2 = await repos.quarterlyGoals.create({
        workspaceId: testWorkspaceId,
        quarterlyGoalId: g1.id, // we create a key result for g1 first
        workspace_id: testWorkspaceId,
        quarterId: testQuarterId,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Unique Goal Title 2',
        priority: 'high',
        status: 'active',
        successCriteria: 'Done criteria 2',
        position: 0,
      } as any);

      const g3 = await repos.quarterlyGoals.create({
        workspaceId: testWorkspaceId,
        quarterId: testQuarterId,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Unique Goal Title 3',
        priority: 'high',
        status: 'active',
        successCriteria: 'Done criteria 3',
        position: 0,
      });

      // Now goal count is 3. They all have success criteria (measurable) and owner, and unique titles.
      val = await validationService.validateQuarterBeforeActivation(testQuarterId, testWorkspaceId);
      expect(val.valid).toBe(true);
      expect(val.errors.length).toBe(0);

      // Scenario 2: Fails when goals are not measurable (clear successCriteria & keyResults)
      await supabase
        .from('quarterly_goals')
        .update({ success_criteria: '' })
        .eq('id', g3.id);

      val = await validationService.validateQuarterBeforeActivation(testQuarterId, testWorkspaceId);
      expect(val.valid).toBe(false);
      expect(val.errors.some(e => e.includes('measurable outcomes'))).toBe(true);

      // Restore measurability
      await supabase
        .from('quarterly_goals')
        .update({ success_criteria: 'Measurable success criteria' })
        .eq('id', g3.id);

      // Scenario 3: Fails on duplicate goal titles
      await supabase
        .from('quarterly_goals')
        .update({ title: 'Unique Goal Title 1' })
        .eq('id', g3.id);

      val = await validationService.validateQuarterBeforeActivation(testQuarterId, testWorkspaceId);
      expect(val.valid).toBe(false);
      expect(val.errors.some(e => e.includes('unique titles'))).toBe(true);

      // Restore unique title
      await supabase
        .from('quarterly_goals')
        .update({ title: 'Unique Goal Title 3' })
        .eq('id', g3.id);

      // Scenario 4: Fails on missing owners
      await supabase
        .from('quarterly_goals')
        .update({ owner_id: null })
        .eq('id', g3.id);

      val = await validationService.validateQuarterBeforeActivation(testQuarterId, testWorkspaceId);
      expect(val.valid).toBe(false);
      expect(val.errors.some(e => e.includes('missing owner assignments'))).toBe(true);

      // Restore owner
      await supabase
        .from('quarterly_goals')
        .update({ owner_id: testOwnerId })
        .eq('id', g3.id);

      // Scenario 5: Workload capacity check
      // Available hours for the quarter: Q3 is 92 days (July-Sept). Working days Mon-Fri is ~65 days.
      // Total hours ~ 520h. After 20% buffer, maxAllowed ~ 416h.
      // Let's create a monthly outcome that planned effort = 500h (exceeding 416h).
      const outcome = await repos.monthlyOutcomes.create({
        workspaceId: testWorkspaceId,
        monthlyPlanId: testMonthPlanId,
        quarterlyGoalId: g1.id,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Huge Monthly Outcome',
        priority: 'high',
        status: 'active',
        plannedEffortHours: 500,
        position: 0,
        actualEffortHours: 0,
      });

      val = await validationService.validateQuarterBeforeActivation(testQuarterId, testWorkspaceId);
      expect(val.valid).toBe(false);
      expect(val.errors.some(e => e.includes('exceeds the available capacity'))).toBe(true);

      await supabase.from('monthly_outcomes').delete().eq('id', outcome.id);
    });

    test('validateWeeklyPlanCapacity checks', async () => {
      // Available weekly capacity (Mon-Fri) is 40 hours. After 20% buffer, max = 32 hours.
      // Create a weekly plan and check capacity
      const wp = await repos.weeklyPlans.create({
        workspaceId: testWorkspaceId,
        monthlyPlanId: testMonthPlanId,
        userId: testOwnerId,
        weekNumber: 27,
        year: 2026,
        startDate: '2026-07-06',
        endDate: '2026-07-12',
        status: 'draft',
        totalAvailableHours: 40,
        fixedCommitmentHours: 0,
        plannedTaskHours: 35, // exceeds 32h
        deepWorkHours: 0,
        bufferHours: 8,
      });

      const res = await validationService.validateWeeklyPlanCapacity(wp.id, testWorkspaceId);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes('exceed the weekly available capacity'))).toBe(true);

      await supabase.from('weekly_plans').delete().eq('id', wp.id);
    });

    test('validateTaskAlignment checks', async () => {
      const task = await repos.tasks.create({
        workspaceId: testWorkspaceId,
        ownerId: testOwnerId,
        userId: testOwnerId,
        title: 'Unaligned Task',
        taskType: 'administrative', // not operational
        status: 'scheduled',
        priority: 'medium',
        isBig3: false,
        position: 0,
        isLocked: false,
      });

      const res = await validationService.validateTaskAlignment(task.id, testWorkspaceId);
      expect(res.valid).toBe(true); // validates true, but returns warning
      expect(res.warnings.some(w => w.includes('has no parent weekly objective'))).toBe(true);

      await supabase.from('tasks').delete().eq('id', task.id);
    });
  });

  describe('Workspace Isolation (Integration Test)', () => {
    test('Workspace A user cannot access or modify Workspace B data', async () => {
      // Create quarter in Workspace A (testWorkspaceId) owned by testOwnerId
      const qA = await repos.quarters.create({
        workspaceId: testWorkspaceId,
        userId: testOwnerId,
        title: 'Workspace A Quarter',
        quarterNumber: 1,
        year: 2026,
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        status: 'active',
      });

      // Try to read quarter A using other workspace context -> throws or returns null
      const qReadOther = await repos.quarters.get(qA.id, otherWorkspaceId);
      expect(qReadOther).toBeNull();

      // Assert WorkspaceService forbids workspace membership access
      await expect(
        workspaceService.assertMembership(otherWorkspaceId, testOwnerId)
      ).rejects.toThrow();

      // Clean up
      await supabase.from('quarters').delete().eq('id', qA.id);
    });
  });
}, 60000);
