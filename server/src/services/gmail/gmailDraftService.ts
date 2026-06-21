import { google } from 'googleapis';
import { z } from 'zod';
import { assertApprovedForAction, createApproval, markApprovalExecuted } from '../approvals/approvalService.js';
import { createCrmRepository } from '../crm/crmRepository.js';
import { getUserOAuthClient } from '../googleAuthService.js';

export const gmailDraftSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  leadId: z.string().optional()
});

export const gmailSendApprovedSchema = gmailDraftSchema.extend({
  gmailDraftId: z.string().optional(),
  approvalId: z.string().optional()
});

const encodeMessage = ({ to, subject, body }: z.infer<typeof gmailDraftSchema>) => {
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    body
  ].join('\r\n');
  return Buffer.from(message).toString('base64url');
};

export const createGmailDraft = async (userId: string, input: z.infer<typeof gmailDraftSchema>) => {
  const parsed = gmailDraftSchema.parse(input);
  const auth = await getUserOAuthClient(userId);
  const gmail = google.gmail({ version: 'v1', auth });
  const response = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        raw: encodeMessage(parsed)
      }
    }
  });

  await logOutreachActivity(userId, parsed.leadId, 'gmail_draft_created', `Saved Gmail draft: ${parsed.subject}`, {
    gmailDraftId: response.data.id || '',
    to: parsed.to
  });

  return {
    status: 'draft_created',
    gmailDraftId: response.data.id,
    messageId: response.data.message?.id
  };
};

export const sendApprovedGmail = async (userId: string, input: z.infer<typeof gmailSendApprovedSchema>) => {
  const parsed = gmailSendApprovedSchema.parse(input);
  if (!parsed.approvalId) {
    const approval = await createApproval(userId, {
      actionType: 'sendEmail',
      riskLevel: 'high',
      targetType: 'gmail_message',
      targetId: parsed.leadId,
      reason: 'Sending Gmail outreach contacts a person externally and must be approved.',
      payload: parsed,
      integration: 'gmail'
    });
    return { status: 'pending_approval', approval };
  }

  await assertApprovedForAction(userId, parsed.approvalId, 'sendEmail');
  const auth = await getUserOAuthClient(userId);
  const gmail = google.gmail({ version: 'v1', auth });
  const response = parsed.gmailDraftId
    ? await gmail.users.drafts.send({ userId: 'me', requestBody: { id: parsed.gmailDraftId } })
    : await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodeMessage(parsed) } });

  await markApprovalExecuted(userId, parsed.approvalId, 'sendEmail', {
    gmailMessageId: response.data.id || '',
    threadId: response.data.threadId || ''
  });
  await logOutreachActivity(userId, parsed.leadId, 'gmail_sent_approved', `Sent approved Gmail outreach: ${parsed.subject}`, {
    gmailMessageId: response.data.id || '',
    to: parsed.to
  });

  return {
    status: 'sent',
    gmailMessageId: response.data.id,
    threadId: response.data.threadId
  };
};

const logOutreachActivity = async (
  userId: string,
  leadId: string | undefined,
  type: string,
  summary: string,
  payload: Record<string, unknown>
) => {
  if (!leadId) return;
  const repo = createCrmRepository(userId);
  await repo.activities.create({
    leadId,
    type,
    summary,
    occurredAt: new Date().toISOString(),
    payload,
    source: 'gmail',
    syncStatus: 'pending',
    externalIds: {}
  });
};
