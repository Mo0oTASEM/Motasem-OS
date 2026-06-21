import type { EmailTimelineEvent, FollowUpSequence, LeadEmailContext, OutreachEmailDraft, WritingAssistantInput, WritingAssistantOutput } from './types';

const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

export const generateEmailDraftForLead = (lead: LeadEmailContext): OutreachEmailDraft => {
  const now = nowIso();
  return {
    id: uid('email'),
    leadId: lead.id,
    to: lead.email,
    subject: `Motion design ideas for ${lead.serviceInterest}`,
    body: `Hi ${lead.name.split(' ')[0]},\n\nThanks for the context around ${lead.serviceInterest.toLowerCase()}. Based on what you shared on ${lead.platform}, I think the strongest next step is a short motion direction with 2 package options in the ${lead.budgetRange} range.\n\nI can send a concise proposal with timeline, deliverables, and examples from similar work.\n\nBest,\nLeo`,
    purpose: 'follow_up',
    status: 'Draft',
    createdAt: now,
    updatedAt: now
  };
};

export const generateThreeStepFollowUpSequence = (lead: LeadEmailContext): FollowUpSequence => {
  const now = nowIso();
  const first = generateEmailDraftForLead(lead);
  const steps: OutreachEmailDraft[] = [
    first,
    {
      ...first,
      id: uid('email'),
      subject: `Quick follow-up on ${lead.serviceInterest}`,
      body: `Hi ${lead.name.split(' ')[0]},\n\nQuick follow-up in case this got buried. I can help turn the idea into a polished motion piece with a tight production plan and clear revision boundaries.\n\nWould it help if I sent 2 package options?`,
      scheduledFor: '2026-06-14'
    },
    {
      ...first,
      id: uid('email'),
      subject: 'Should I close the loop?',
      body: `Hi ${lead.name.split(' ')[0]},\n\nShould I close the loop on this for now, or is the ${lead.serviceInterest.toLowerCase()} project still active?\n\nIf timing changed, I can also suggest a smaller starter scope.`,
      scheduledFor: '2026-06-18'
    }
  ];

  return {
    id: uid('sequence'),
    leadId: lead.id,
    name: `${lead.name} - 3-step follow-up`,
    status: 'Draft',
    steps,
    createdAt: now,
    updatedAt: now
  };
};

export const generateReengagementMessage = (lead: LeadEmailContext): OutreachEmailDraft => {
  const now = nowIso();
  return {
    id: uid('email'),
    leadId: lead.id,
    to: lead.email,
    subject: 'A fresh motion idea for your next launch',
    body: `Hi ${lead.name.split(' ')[0]},\n\nI was revisiting older conversations and thought of a simple way to revive the motion direction we discussed: a compact ${lead.serviceInterest.toLowerCase()} sprint focused on one strong launch asset plus cutdowns.\n\nIf this is still useful, I can send a fresh outline.`,
    purpose: 'reengagement',
    status: 'Draft',
    createdAt: now,
    updatedAt: now
  };
};

export const generatePortfolioShowcaseEmail = (lead: LeadEmailContext): OutreachEmailDraft => {
  const now = nowIso();
  return {
    id: uid('email'),
    leadId: lead.id,
    to: lead.email,
    subject: 'Relevant motion work examples',
    body: `Hi ${lead.name.split(' ')[0]},\n\nSharing a few relevant motion examples that match the quality level I would recommend for ${lead.serviceInterest.toLowerCase()}:\n\n1. Premium logo reveal with 3D lighting\n2. Product motion system with UI transitions\n3. Short social cutdowns built for launch campaigns\n\nIf one direction feels close, I can turn it into a proposal.`,
    purpose: 'portfolio_showcase',
    status: 'Draft',
    createdAt: now,
    updatedAt: now
  };
};

export const saveDraft = (drafts: OutreachEmailDraft[], draft: OutreachEmailDraft): OutreachEmailDraft[] => {
  const exists = drafts.some(item => item.id === draft.id);
  const saved = { ...draft, status: 'Draft' as const, updatedAt: nowIso() };
  return exists ? drafts.map(item => item.id === draft.id ? saved : item) : [saved, ...drafts];
};

export const approveDraftForSend = (draft: OutreachEmailDraft): OutreachEmailDraft => ({
  ...draft,
  status: 'Approved',
  approvedAt: nowIso(),
  updatedAt: nowIso()
});

export const stopSequence = (sequence: FollowUpSequence): FollowUpSequence => ({
  ...sequence,
  status: 'Stopped',
  updatedAt: nowIso(),
  steps: sequence.steps.map(step => ['Sent', 'Replied'].includes(step.status) ? step : { ...step, status: 'Stopped', updatedAt: nowIso() })
});

export const createTimelineEvent = (draft: OutreachEmailDraft, title: string): EmailTimelineEvent => ({
  id: uid('timeline'),
  leadId: draft.leadId,
  occurredAt: nowIso(),
  status: draft.status,
  title,
  detail: `${draft.subject} - ${draft.to}`
});

export const createGmailDraftPlaceholder = async (draft: OutreachEmailDraft): Promise<{ status: 'mock'; gmailDraftId: string; message: string; draft: OutreachEmailDraft }> => {
  return {
    status: 'mock',
    gmailDraftId: `gmail-draft-${draft.id}`,
    message: 'Gmail API placeholder. This creates no external email and performs no send.',
    draft: { ...draft, gmailDraftId: `gmail-draft-${draft.id}`, status: 'Waiting Approval', updatedAt: nowIso() }
  };
};

export const sendViaGmailPlaceholder = async (): Promise<never> => {
  throw new Error('External email sending is disabled. User approval and a real Gmail adapter are required before sending.');
};

export const generateWritingAssistantMessage = (input: WritingAssistantInput): WritingAssistantOutput => {
  const firstName = input.leadName.trim().split(' ')[0] || 'there';
  const premiumLine = input.tone === 'Premium'
    ? 'I would keep the direction polished, minimal, and built around a strong first impression.'
    : 'I can keep the scope clear, practical, and easy to review.';
  const languagePrefix = input.language === 'Arabic'
    ? 'مرحبا'
    : input.language === 'Mixed'
      ? 'Hi / مرحبا'
      : 'Hi';
  const subjectByType: Record<WritingAssistantInput['messageType'], string> = {
    'Cold email': `Motion design idea for ${input.serviceInterest}`,
    'Follow-up email': `Quick follow-up on ${input.serviceInterest}`,
    'Proposal email': `Proposal outline for ${input.serviceInterest}`,
    'Re-engagement email': 'A fresh motion idea for your next launch',
    'Testimonial request': 'Quick testimonial request',
    'Project update email': `Project update: ${input.serviceInterest}`,
    'Invoice reminder': 'Friendly invoice reminder',
    'Thank-you email': 'Thank you for the collaboration'
  };

  const body = `${languagePrefix} ${firstName},\n\n${input.lastConversationSummary || `I saw your interest in ${input.serviceInterest} through ${input.platformSource}.`}\n\nBased on the ${input.budget || 'planned'} budget range, ${premiumLine} The goal is: ${input.goal || 'move this conversation to a clear next step'}.\n\nIf useful, I can send a concise next step with timeline, deliverables, and examples.\n\nBest,\nLeo`;

  return {
    subjectLine: subjectByType[input.messageType],
    emailBody: body,
    shortVersion: `${languagePrefix} ${firstName}, I can help with ${input.serviceInterest}. Want me to send a concise next step with timeline and package options?`,
    manualMessage: `${firstName}, quick note: I can help with ${input.serviceInterest}. ${input.goal || 'Should I send details?'}`,
    suggestedNextStep: input.messageType === 'Invoice reminder'
      ? 'Wait 24 hours after approval, then send the reminder manually or through Gmail integration.'
      : 'Save as a draft, review manually, then approve only if the message is ready.'
  };
};

export const makeWritingOutputShorter = (output: WritingAssistantOutput): WritingAssistantOutput => ({
  ...output,
  emailBody: output.shortVersion,
  suggestedNextStep: 'Use the short version for quick replies or manual WhatsApp follow-up.'
});

export const makeWritingOutputProfessional = (output: WritingAssistantOutput): WritingAssistantOutput => ({
  ...output,
  emailBody: output.emailBody.replace('Hi / مرحبا', 'Hello').replace('Hi', 'Hello').replace('Want me to', 'Would you like me to'),
  manualMessage: output.manualMessage.replace('quick note:', 'following up professionally:'),
  suggestedNextStep: 'Review for accuracy, then save as a draft for approval.'
});

export const translateWritingOutput = (output: WritingAssistantOutput): WritingAssistantOutput => ({
  ...output,
  subjectLine: output.subjectLine.includes(' / ') ? output.subjectLine : `${output.subjectLine} / نسخة عربية`,
  emailBody: `${output.emailBody}\n\n---\nArabic draft placeholder:\nمرحبا، هذه نسخة عربية تجريبية بنفس المعنى. سيتم استبدالها لاحقا بترجمة حقيقية عند ربط خدمة الذكاء الاصطناعي.`,
  manualMessage: `${output.manualMessage}\nArabic: رسالة قصيرة تجريبية للواتساب أو تيليجرام.`,
  suggestedNextStep: 'Review both language versions before saving the draft.'
});

export const writingOutputToDraft = (lead: LeadEmailContext, output: WritingAssistantOutput): OutreachEmailDraft => {
  const now = nowIso();
  return {
    id: uid('email'),
    leadId: lead.id,
    to: lead.email,
    subject: output.subjectLine,
    body: output.emailBody,
    purpose: 'follow_up',
    status: 'Draft',
    createdAt: now,
    updatedAt: now
  };
};
