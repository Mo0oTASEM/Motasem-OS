import type { EmailTimelineEvent, FollowUpSequence, OutreachCampaign, OutreachEmailDraft } from './types';

export const outreachSeedDrafts: OutreachEmailDraft[] = [
  {
    id: 'draft-rezbook-followup',
    leadId: 'lead-rezbook',
    to: 'lina@rezbook.com',
    subject: 'Revised motion timeline and retainer option',
    body: 'Hi Lina,\n\nI can deliver the launch motion pack in two phases: hero product animation first, then social cutdowns. I also recommend a light monthly retainer for launch-month iteration.\n\nWant me to send the final scope today?',
    purpose: 'follow_up',
    status: 'Waiting Approval',
    createdAt: '2026-06-10T10:20:00.000Z',
    updatedAt: '2026-06-10T10:20:00.000Z'
  },
  {
    id: 'draft-north-portfolio',
    leadId: 'lead-north-pixel',
    to: 'omar@northpixel.co',
    subject: '3D logo reveal references',
    body: 'Hi Omar,\n\nSharing three relevant motion references for the metallic/glass reveal direction. If one is close, I can package the concept, animation, and export specs into a short proposal.',
    purpose: 'portfolio_showcase',
    status: 'Draft',
    createdAt: '2026-06-09T15:10:00.000Z',
    updatedAt: '2026-06-09T15:10:00.000Z'
  },
  {
    id: 'draft-amana-cold',
    leadId: 'lead-amana',
    to: 'ahmad@amana.studio',
    subject: 'Launch animation package options',
    body: 'Hi Ahmad,\n\nI can shape the Instagram launch into three motion options: starter cutdowns, full kinetic launch kit, or launch kit plus source files. What launch date are you aiming for?',
    purpose: 'cold_outreach',
    status: 'No Reply',
    createdAt: '2026-06-08T09:30:00.000Z',
    updatedAt: '2026-06-09T09:30:00.000Z'
  },
  {
    id: 'draft-glowline-bilingual',
    leadId: 'lead-ig-sara',
    to: 'sara@glowline.co',
    subject: 'Instagram ad animation sprint for Glowline',
    body: 'Hi Sara,\n\nI can help you package the skincare launch into short animated ad variations for reels, stories, and feed. For the Arabic/English versions, I would keep the motion system consistent while adapting typography spacing and reading direction.\n\nCan you send the launch date, product assets, and how many variations you need?',
    purpose: 'follow_up',
    status: 'Draft',
    createdAt: '2026-06-12T10:10:00.000Z',
    updatedAt: '2026-06-12T10:10:00.000Z'
  }
];

export const outreachSeedSequences: FollowUpSequence[] = [
  {
    id: 'sequence-rezbook',
    leadId: 'lead-rezbook',
    name: 'RezBook proposal follow-up',
    status: 'Waiting Approval',
    createdAt: '2026-06-10T10:25:00.000Z',
    updatedAt: '2026-06-10T10:25:00.000Z',
    steps: outreachSeedDrafts.slice(0, 1)
  }
];

export const outreachSeedCampaigns: OutreachCampaign[] = [
  { id: 'campaign-agency-cold', name: 'Agency logo reveal cold outreach', type: 'cold_outreach', audience: 'Brand studios and boutique agencies', status: 'Draft', drafts: 18, approved: 0, sent: 0, replied: 0, noReply: 0 },
  { id: 'campaign-past-clients', name: 'Past client launch reactivation', type: 'reengagement', audience: 'Past clients with inactive launch assets', status: 'Waiting Approval', drafts: 12, approved: 4, sent: 0, replied: 0, noReply: 0 },
  { id: 'campaign-portfolio-showcase', name: 'Portfolio proof showcase', type: 'portfolio_showcase', audience: 'Warm leads from Behance, Dribbble, portfolio form', status: 'Sent', drafts: 9, approved: 9, sent: 9, replied: 3, noReply: 6 }
];

export const outreachSeedTimeline: EmailTimelineEvent[] = [
  { id: 'timeline-rezbook-1', leadId: 'lead-rezbook', occurredAt: '2026-06-10 10:20', status: 'Waiting Approval', title: 'Draft prepared', detail: 'Revised motion timeline and retainer option' },
  { id: 'timeline-north-1', leadId: 'lead-north-pixel', occurredAt: '2026-06-09 15:10', status: 'Draft', title: 'Portfolio email drafted', detail: '3D logo reveal references' },
  { id: 'timeline-amana-1', leadId: 'lead-amana', occurredAt: '2026-06-08 09:30', status: 'No Reply', title: 'Initial package email logged', detail: 'Launch animation package options' }
];
