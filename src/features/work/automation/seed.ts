import type { ApprovalItem, AutomationHistoryItem } from './types';

export const approvalSeedItems: ApprovalItem[] = [
  {
    id: 'approval-email-rezbook',
    actionType: 'Email ready to send',
    target: 'Lina Haddad - Gmail',
    contentPreview: 'Hi Lina, here is the revised motion timeline and retainer option...',
    riskLevel: 'High',
    reasonApprovalRequired: 'External email would contact a real person.',
    status: 'Pending',
    createdAt: '2026-06-11T09:15:00.000Z'
  },
  {
    id: 'approval-social-neon',
    actionType: 'Social post ready to publish',
    target: 'Instagram - Neon Shift Reel',
    contentPreview: 'Before/after kinetic type polish with motion breakdown caption.',
    riskLevel: 'Medium',
    reasonApprovalRequired: 'Publishing public content requires manual review.',
    status: 'Pending',
    createdAt: '2026-06-11T09:30:00.000Z'
  },
  {
    id: 'approval-sequence-amana',
    actionType: 'Follow-up sequence ready to start',
    target: 'Ahmad Naser - Instagram/Gmail',
    contentPreview: 'Three-step follow-up sequence for social launch animation package.',
    riskLevel: 'High',
    reasonApprovalRequired: 'A sequence may contact an external lead multiple times.',
    status: 'Pending',
    createdAt: '2026-06-11T10:05:00.000Z'
  },
  {
    id: 'approval-crm-status',
    actionType: 'CRM status change',
    target: 'Omar Khaled - Lead status Warm to Hot',
    contentPreview: 'AI recommends marking Omar as Hot based on budget and portfolio fit.',
    riskLevel: 'Low',
    reasonApprovalRequired: 'CRM state changes affect business prioritization.',
    status: 'Pending',
    createdAt: '2026-06-11T10:20:00.000Z'
  },
  {
    id: 'approval-whatsapp',
    actionType: 'WhatsApp manual message suggestion',
    target: 'Maya Salim - WhatsApp',
    contentPreview: 'Quick question: how many ad cutdowns do you need this month?',
    riskLevel: 'Medium',
    reasonApprovalRequired: 'Manual external message still needs user review before contacting.',
    status: 'Pending',
    createdAt: '2026-06-11T10:35:00.000Z'
  },
  {
    id: 'approval-proposal-draft',
    actionType: 'Proposal draft ready',
    target: 'Upwork - SaaS explainer animation proposal',
    contentPreview: 'Position the proposal around clear onboarding visuals, fast first milestone, and a compact motion sample.',
    riskLevel: 'Medium',
    reasonApprovalRequired: 'Proposal copy affects external client communication and pricing expectations.',
    status: 'Pending',
    createdAt: '2026-06-11T10:50:00.000Z'
  }
];

export const automationHistorySeedItems: AutomationHistoryItem[] = [
  { id: 'history-1', timestamp: '2026-06-11 11:42', triggerSource: 'Upwork Monitor', action: 'Analyzed 3 job matches', status: 'Completed', result: '2 high-fit jobs, 1 rejected as low margin' },
  { id: 'history-2', timestamp: '2026-06-11 11:20', triggerSource: 'Outreach Assistant', action: 'Generated follow-up draft', status: 'Waiting Approval', result: 'Draft created for Lina Haddad' },
  { id: 'history-3', timestamp: '2026-06-11 10:55', triggerSource: 'Content Planner', action: 'Created weekly plan', status: 'Drafted', result: '5 draft content items created' },
  { id: 'history-4', timestamp: '2026-06-11 09:35', triggerSource: 'Portfolio Manager', action: 'Generated Behance copy', status: 'Completed', result: 'Copy saved to generated workspace' },
  { id: 'history-5', timestamp: '2026-06-11 08:10', triggerSource: 'Telegram Simulator', action: 'Parsed command', status: 'Completed', result: 'Routed to crm.createLead' },
  { id: 'history-6', timestamp: '2026-06-10 18:40', triggerSource: 'Social Publisher', action: 'Publish Instagram reel', status: 'Failed', result: 'No external action performed', error: 'Approval token missing' }
];
