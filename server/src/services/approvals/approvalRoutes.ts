import { Router } from 'express';
import { z } from 'zod';
import { assertOwner, requireSupabaseUser, type AuthedRequest } from '../../security/securityService.js';
import {
  approvalCreateSchema,
  approvalDecisionSchema,
  createApproval,
  decideApproval,
  listApprovalLogs,
  listApprovals
} from './approvalService.js';

export const approvalRoutes = Router();

approvalRoutes.get('/', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  res.json({ approvals: await listApprovals(userId, status) });
});

approvalRoutes.get('/logs', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  res.json({ logs: await listApprovalLogs(userId) });
});

approvalRoutes.post('/', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  res.json({ approval: await createApproval(userId, approvalCreateSchema.parse(req.body)) });
});

approvalRoutes.post('/:approvalId/decision', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const params = z.object({ approvalId: z.string().min(1) }).parse(req.params);
  res.json({ approval: await decideApproval(userId, params.approvalId, approvalDecisionSchema.parse(req.body)) });
});

approvalRoutes.post('/:approvalId/approve', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const params = z.object({ approvalId: z.string().min(1) }).parse(req.params);
  res.json({ approval: await decideApproval(userId, params.approvalId, { status: 'approved', ...req.body }) });
});

approvalRoutes.post('/:approvalId/reject', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const params = z.object({ approvalId: z.string().min(1) }).parse(req.params);
  res.json({ approval: await decideApproval(userId, params.approvalId, { status: 'rejected', ...req.body }) });
});

approvalRoutes.post('/:approvalId/edit', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const params = z.object({ approvalId: z.string().min(1) }).parse(req.params);
  res.json({ approval: await decideApproval(userId, params.approvalId, { status: 'edited', ...req.body }) });
});

approvalRoutes.post('/:approvalId/cancel', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const params = z.object({ approvalId: z.string().min(1) }).parse(req.params);
  res.json({ approval: await decideApproval(userId, params.approvalId, { status: 'cancelled', ...req.body }) });
});
