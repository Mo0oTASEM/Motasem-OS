import { z } from 'zod';
import { createCrmRepository } from '../crm/crmRepository.js';

export const outreachDraftTypes = [
  'cold_outreach',
  'follow_up_1',
  'follow_up_2',
  'proposal_intro',
  'portfolio_share',
  'meeting_recap'
] as const;

export const outreachDraftRequestSchema = z.object({
  leadId: z.string().optional(),
  lead: z.record(z.unknown()).optional().default({}),
  draftType: z.enum(outreachDraftTypes).default('follow_up_1'),
  preferredLanguage: z.enum(['English', 'Arabic', 'Mixed']).default('English'),
  portfolioProjects: z.array(z.record(z.unknown())).optional().default([]),
  previousActivity: z.array(z.record(z.unknown())).optional().default([]),
  tone: z.string().optional().default('professional')
});

export type OutreachDraftRequest = z.infer<typeof outreachDraftRequestSchema>;

export interface OutreachEmailDraft {
  id: string;
  draftType: typeof outreachDraftTypes[number];
  to: string;
  subject: string;
  body: string;
  personalization: string[];
  riskLevel: 'low';
  requiresApprovalToSend: true;
}

const text = (value: unknown, fallback = '') => String(value || fallback);

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name || 'there';

const typeLabel = (type: OutreachEmailDraft['draftType']) => ({
  cold_outreach: 'Potential motion design fit',
  follow_up_1: 'Quick follow-up',
  follow_up_2: 'Following up with one useful idea',
  proposal_intro: 'Proposal direction',
  portfolio_share: 'Relevant portfolio example',
  meeting_recap: 'Recap and next steps'
})[type];

export const buildOutreachDraft = async (
  userId: string,
  input: OutreachDraftRequest
): Promise<OutreachEmailDraft> => {
  const parsed = outreachDraftRequestSchema.parse(input);
  const repo = createCrmRepository(userId);
  const storedLead = parsed.leadId ? await repo.leads.read(parsed.leadId).catch(() => null) : null;
  const lead = { ...parsed.lead, ...(storedLead || {}) } as Record<string, unknown>;
  const name = text(lead.name, 'there');
  const company = text(lead.company, 'your team');
  const serviceInterest = text(lead.serviceInterest, 'motion design');
  const notes = text(lead.notes);
  const nextAction = text(lead.nextAction || lead.nextBestAction, 'confirm fit and next steps');
  const portfolioTitle = text(parsed.portfolioProjects[0]?.title || parsed.portfolioProjects[0]?.projectTitle, 'a relevant motion design case study');
  const previous = text(parsed.previousActivity[0]?.summary || parsed.previousActivity[0]?.body);
  const to = text(lead.email);

  const personalization = [
    `Lead: ${name}`,
    `Company: ${company}`,
    `Service interest: ${serviceInterest}`,
    notes ? `CRM notes: ${notes}` : '',
    previous ? `Previous activity: ${previous}` : '',
    portfolioTitle ? `Portfolio reference: ${portfolioTitle}` : ''
  ].filter(Boolean);

  const greeting = parsed.preferredLanguage === 'Arabic'
    ? `مرحبا ${firstName(name)},`
    : parsed.preferredLanguage === 'Mixed'
      ? `Hi ${firstName(name)}, مرحبا،`
      : `Hi ${firstName(name)},`;

  const body = [
    greeting,
    '',
    parsed.draftType === 'proposal_intro'
      ? `Based on your interest in ${serviceInterest}, I can put together a focused proposal for ${company} with scope, timeline, deliverables, and next steps.`
      : parsed.draftType === 'portfolio_share'
        ? `I thought ${portfolioTitle} would be the most relevant reference for what you described. It shows the kind of motion direction and polish I would aim for.`
        : parsed.draftType === 'meeting_recap'
          ? `Quick recap from our conversation: ${previous || notes || `you are exploring ${serviceInterest}`}.`
          : `I wanted to follow up on ${serviceInterest} for ${company}. ${notes || 'I think there may be a useful motion design angle here.'}`,
    '',
    `Suggested next step: ${nextAction}.`,
    '',
    'Would it help if I sent a short outline with options and timing?',
    '',
    'Best,',
    'Motasem OS'
  ].join('\n');

  const draft: OutreachEmailDraft = {
    id: `outreach-${Date.now()}`,
    draftType: parsed.draftType,
    to,
    subject: `${typeLabel(parsed.draftType)} for ${company}`,
    body,
    personalization,
    riskLevel: 'low',
    requiresApprovalToSend: true
  };

  if (storedLead) {
    await repo.activities.create({
      leadId: storedLead.id,
      type: 'outreach_draft_created',
      summary: `Created ${parsed.draftType} draft`,
      occurredAt: new Date().toISOString(),
      payload: { subject: draft.subject, to: draft.to },
      source: 'ai',
      syncStatus: 'pending',
      externalIds: {}
    });
  }

  return draft;
};

export const buildOutreachSequence = async (userId: string, input: OutreachDraftRequest) => {
  const drafts = await Promise.all([
    buildOutreachDraft(userId, { ...input, draftType: 'cold_outreach' }),
    buildOutreachDraft(userId, { ...input, draftType: 'follow_up_1' }),
    buildOutreachDraft(userId, { ...input, draftType: 'follow_up_2' })
  ]);
  return {
    id: `sequence-${Date.now()}`,
    drafts,
    approvalMode: 'draft_first_send_requires_approval'
  };
};
