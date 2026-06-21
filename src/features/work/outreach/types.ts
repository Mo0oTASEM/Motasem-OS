import type { Lead } from '../crm/types';

export type OutreachStatus = 'Draft' | 'Waiting Approval' | 'Approved' | 'Sent' | 'Replied' | 'No Reply' | 'Stopped';
export type OutreachPurpose = 'follow_up' | 'cold_outreach' | 'reengagement' | 'portfolio_showcase';
export type WritingAssistantMessageType = 'Cold email' | 'Follow-up email' | 'Proposal email' | 'Re-engagement email' | 'Testimonial request' | 'Project update email' | 'Invoice reminder' | 'Thank-you email';
export type WritingAssistantTone = 'Friendly' | 'Professional' | 'Short' | 'Premium' | 'Casual';
export type WritingAssistantLanguage = 'Arabic' | 'English' | 'Mixed';

export interface OutreachEmailDraft {
  id: string;
  leadId: string;
  to: string;
  subject: string;
  body: string;
  purpose: OutreachPurpose;
  status: OutreachStatus;
  createdAt: string;
  updatedAt: string;
  scheduledFor?: string;
  approvedAt?: string;
  sentAt?: string;
  replyAt?: string;
  gmailDraftId?: string;
}

export interface FollowUpSequence {
  id: string;
  leadId: string;
  name: string;
  status: OutreachStatus;
  steps: OutreachEmailDraft[];
  createdAt: string;
  updatedAt: string;
}

export interface OutreachCampaign {
  id: string;
  name: string;
  type: OutreachPurpose;
  audience: string;
  status: OutreachStatus;
  drafts: number;
  approved: number;
  sent: number;
  replied: number;
  noReply: number;
}

export interface EmailTimelineEvent {
  id: string;
  leadId: string;
  occurredAt: string;
  status: OutreachStatus;
  title: string;
  detail: string;
}

export type LeadEmailContext = Pick<Lead, 'id' | 'name' | 'email' | 'platform' | 'serviceInterest' | 'budgetRange' | 'notes' | 'nextBestAction'>;

export interface WritingAssistantInput {
  messageType: WritingAssistantMessageType;
  leadName: string;
  platformSource: string;
  serviceInterest: string;
  budget: string;
  lastConversationSummary: string;
  tone: WritingAssistantTone;
  language: WritingAssistantLanguage;
  goal: string;
}

export interface WritingAssistantOutput {
  subjectLine: string;
  emailBody: string;
  shortVersion: string;
  manualMessage: string;
  suggestedNextStep: string;
}
