import { z } from 'zod';
import type { ApprovalRecord } from '../database/models.js';
import { repositoryFactory } from '../database/repositoryFactory.js';
import type { ApprovalStatus } from './approvalPolicy.js';
import { approvalPolicy } from './approvalPolicy.js';

export const approvalCreateSchema = z.object({
  actionType: z.string().min(1),
  riskLevel: z.enum(['low', 'medium', 'high']).default('high'),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  reason: z.string().optional(),
  payload: z.record(z.unknown()).default({}),
  integration: z.string().optional(),
  externalIds: z.record(z.string()).optional().default({})
});

export const approvalDecisionSchema = z.object({
  status: z.enum(['approved', 'rejected', 'edited', 'cancelled']),
  payload: z.record(z.unknown()).optional(),
  reason: z.string().optional()
});

export const approvalExecuteSchema = z.object({
  actionType: z.string().min(1),
  result: z.record(z.unknown()).optional().default({})
});

export const approvalFailSchema = z.object({
  actionType: z.string().min(1),
  error: z.string().min(1)
});

export const listApprovals = async (userId: string, status?: string) => {
  const records = await repositoryFactory.forUserCollection(userId, 'approvals').list(100);
  return records
    .filter(record => !record.deletedAt)
    .filter(record => !status || record.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const createApproval = async (userId: string, input: z.input<typeof approvalCreateSchema>) => {
  const parsed = approvalCreateSchema.parse(input);
  const status: ApprovalStatus = approvalPolicy.requiresApproval(parsed.actionType, parsed.riskLevel)
    ? 'pending'
    : 'approved';

  return repositoryFactory.forUserCollection(userId, 'approvals').create({
    actionType: parsed.actionType,
    status,
    riskLevel: parsed.riskLevel,
    targetType: parsed.targetType || parsed.integration,
    targetId: parsed.targetId,
    reason: parsed.reason,
    payload: parsed.payload,
    source: 'ai',
    syncStatus: 'pending',
    externalIds: parsed.externalIds
  });
};

export const decideApproval = async (
  userId: string,
  approvalId: string,
  decision: z.infer<typeof approvalDecisionSchema>
) => {
  const parsed = approvalDecisionSchema.parse(decision);
  const repository = repositoryFactory.forUserCollection(userId, 'approvals');
  const approval = await repository.read(approvalId);
  if (!approval) throw new Error('Approval not found.');

  if (!approvalPolicy.canTransition(approval.status, parsed.status)) {
    throw new Error(`Cannot transition approval from ${approval.status} to ${parsed.status}.`);
  }

  return repository.update(approvalId, {
    status: parsed.status,
    payload: parsed.payload || approval.payload,
    reason: parsed.reason || approval.reason,
    decidedAt: new Date().toISOString(),
    syncStatus: 'pending'
  });
};

export const getApprovalOrThrow = async (userId: string, approvalId: string) => {
  const approval = await repositoryFactory.forUserCollection(userId, 'approvals').read(approvalId);
  if (!approval || approval.deletedAt) throw new Error('Approval not found.');
  return approval;
};

export const assertApprovedForAction = async (userId: string, approvalId: string, actionType: string) => {
  const approval = await getApprovalOrThrow(userId, approvalId);
  approvalPolicy.assertApproved(actionType, approval);
  return approval;
};

export const markApprovalExecuted = async (
  userId: string,
  approvalId: string,
  actionType: string,
  result: Record<string, unknown> = {}
) => {
  await assertApprovedForAction(userId, approvalId, actionType);
  await logApprovalAction(userId, approvalId, actionType, 'executed', result);
  return repositoryFactory.forUserCollection(userId, 'approvals').update(approvalId, {
    status: 'executed',
    executedAt: new Date().toISOString(),
    syncStatus: 'synced'
  });
};

export const markApprovalFailed = async (userId: string, approvalId: string, actionType: string, error: string) => {
  await assertApprovedForAction(userId, approvalId, actionType);
  await logApprovalAction(userId, approvalId, actionType, 'failed', undefined, error);
  return repositoryFactory.forUserCollection(userId, 'approvals').update(approvalId, {
    status: 'failed',
    failureReason: error,
    syncStatus: 'error'
  });
};

export const logApprovalAction = async (
  userId: string,
  approvalId: string,
  actionType: string,
  status: ApprovalRecord['status'],
  output?: Record<string, unknown>,
  error?: string
) => {
  return repositoryFactory.forUserCollection(userId, 'ai_action_logs').create({
    conversationId: approvalId,
    intent: 'approval',
    tool: actionType,
    status: status === 'pending'
      ? 'pending_approval'
      : status === 'approved' || status === 'edited' || status === 'editing' || status === 'cancelled'
        ? 'proposed'
        : status,
    riskLevel: 'high',
    input: { approvalId, actionType },
    output,
    error,
    source: 'ai',
    syncStatus: status === 'executed' ? 'synced' : 'pending',
    externalIds: { approvalId }
  });
};

export const listApprovalLogs = async (userId: string) => {
  const logs = await repositoryFactory.forUserCollection(userId, 'ai_action_logs').list(100);
  return logs
    .filter(record => !record.deletedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};
