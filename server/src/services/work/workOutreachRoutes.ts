import { Router } from 'express';
import { assertOwner, requireSupabaseUser, type AuthedRequest } from '../../security/securityService.js';
import { createGmailDraft, gmailDraftSchema, gmailSendApprovedSchema, sendApprovedGmail } from '../gmail/gmailDraftService.js';
import { buildOutreachDraft, buildOutreachSequence, outreachDraftRequestSchema } from './outreachService.js';

export const workOutreachRoutes = Router();

workOutreachRoutes.post('/outreach/draft', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  res.json({ draft: await buildOutreachDraft(userId, outreachDraftRequestSchema.parse(req.body || {})) });
});

workOutreachRoutes.post('/outreach/sequence', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  res.json({ sequence: await buildOutreachSequence(userId, outreachDraftRequestSchema.parse(req.body || {})) });
});

workOutreachRoutes.post('/gmail/drafts', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  try {
    res.json(await createGmailDraft(userId, gmailDraftSchema.parse(req.body || {})));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message, needsGoogleOAuth: (error as Error).message.includes('Google Workspace OAuth') });
  }
});

workOutreachRoutes.post('/gmail/send-approved', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  try {
    res.json(await sendApprovedGmail(userId, gmailSendApprovedSchema.parse(req.body || {})));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message, needsGoogleOAuth: (error as Error).message.includes('Google Workspace OAuth') });
  }
});
