import type { UpworkJob, UpworkProposalDraft } from './types';

const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

export const analyzeUpworkJob = (job: UpworkJob): UpworkJob => ({
  ...job,
  status: job.status === 'New' ? 'Reviewed' : job.status,
  aiFitAnalysis: job.skillMatchScore >= 80
    ? `Strong fit. ${job.projectType} aligns with motion design portfolio and the ${job.budget} budget can support a clear scope.`
    : `Weak fit. Scope or budget may not justify a custom proposal unless the job can be completed quickly.`,
  suggestedProposalAngle: job.skillMatchScore >= 80
    ? 'Lead with relevant proof, define a tight timeline, and keep all next steps inside Upwork.'
    : 'Skip or send a very narrow proposal with strict scope boundaries.'
});

export const generateUpworkProposalDraft = (job: UpworkJob): UpworkProposalDraft => ({
  id: uid('upwork-proposal'),
  jobId: job.id,
  title: `${job.projectType} proposal for ${job.jobTitle}`,
  body: `Hi,\n\nI can help with this ${job.projectType.toLowerCase()} project. Your brief sounds aligned with the kind of motion work I handle: clear visual direction, polished animation, and deliverables prepared for launch.\n\nMy approach would be:\n1. Confirm assets, style references, and timeline inside Upwork.\n2. Create a focused motion direction based on your brand.\n3. Deliver final exports with clear revision boundaries.\n\nRelevant angle: ${job.suggestedProposalAngle}\n\nI am happy to keep all communication, files, and payments inside Upwork as required by platform rules.`,
  status: 'Draft',
  createdAt: nowIso(),
  updatedAt: nowIso()
});

export const saveUpworkJob = (job: UpworkJob): UpworkJob => ({
  ...job,
  savedAt: nowIso(),
  status: job.status === 'New' ? 'Reviewed' : job.status
});

export const markUpworkProposalSubmitted = (job: UpworkJob): UpworkJob => ({
  ...job,
  status: 'Submitted'
});

export const addUpworkFollowUpReminder = (job: UpworkJob, date = '2026-06-14'): UpworkJob => ({
  ...job,
  followUpAt: date
});

export const syncUpworkJobsPlaceholder = async () => ({
  status: 'mock' as const,
  message: 'Future Upwork RSS/API integration placeholder. No scraping, messaging, or off-platform contact is performed.'
});
