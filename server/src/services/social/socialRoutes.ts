import { Router } from 'express';
import { z } from 'zod';
import { assertOwner, requireSupabaseUser, type AuthedRequest } from '../../security/securityService.js';
import {
  approveSuggestedReply,
  generateSuggestedReply,
  listSocialInbox,
  markCommentHandled,
  rejectSuggestedReply
} from './socialInboxService.js';

export const socialRoutes = Router();

socialRoutes.get('/inbox', requireSupabaseUser, async (_req: AuthedRequest, res) => {
  res.json(await listSocialInbox());
});

socialRoutes.post('/comments/:id/suggest-reply', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const body = z.object({
    tone: z.enum(['professional', 'friendly', 'sales', 'helpful', 'arabic', 'english', 'mixed']).optional().default('professional')
  }).parse(req.body || {});
  res.json({ reply: await generateSuggestedReply(String(req.params.id), body.tone) });
});

socialRoutes.post('/replies/:id/approve', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.object({
    body: z.string().optional(),
    trustedAutoReply: z.boolean().optional().default(false)
  }).parse(req.body || {});
  res.json(await approveSuggestedReply(userId, String(req.params.id), body.body, body.trustedAutoReply));
});

socialRoutes.post('/replies/:id/reject', requireSupabaseUser, async (req: AuthedRequest, res) => {
  assertOwner(req);
  res.json({ reply: await rejectSuggestedReply(String(req.params.id)) });
});

socialRoutes.post('/comments/:id/handled', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  res.json({ comment: await markCommentHandled(userId, String(req.params.id)) });
});
