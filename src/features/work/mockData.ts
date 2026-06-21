import { approvalSeedItems, automationHistorySeedItems } from './automation/seed';
import { contentSeedItems } from './content/seed';
import { crmSeedLeads } from './crm/seed';
import { outreachSeedDrafts, outreachSeedSequences } from './outreach/seed';
import { portfolioSeedProjects } from './portfolio/seed';
import { upworkSeedJobs, upworkSeedMetrics } from './upwork/seed';
import type {
  ApprovalRequest,
  AutomationLog,
  Company,
  Contact,
  ContentItem,
  EmailDraft,
  Lead,
  OutreachSequence,
  PortfolioProject,
  ReportMetric,
  UpworkJob,
  WorkDatabaseMock,
  WorkSettings,
  WorkStatus
} from './models';

const now = '2026-06-12T09:00:00.000Z';

const statusMap: Record<string, WorkStatus> = {
  New: 'new',
  Cold: 'active',
  Warm: 'active',
  Hot: 'active',
  Client: 'active',
  'Past Client': 'archived',
  Lost: 'lost',
  Active: 'active',
  Done: 'completed',
  Draft: 'draft',
  Idea: 'draft',
  'Waiting Approval': 'waiting_approval',
  Approved: 'approved',
  Sent: 'sent',
  Replied: 'completed',
  'No Reply': 'active',
  Stopped: 'paused',
  Scheduled: 'scheduled',
  Published: 'published',
  Reviewed: 'active',
  Drafted: 'draft',
  Submitted: 'sent',
  Rejected: 'rejected',
  Won: 'completed',
  Completed: 'completed',
  Failed: 'rejected',
  Pending: 'waiting_approval',
  Editing: 'draft'
};

const toStatus = (status: string): WorkStatus => statusMap[status] || 'active';

export const mockCompanies: Company[] = [
  {
    id: 'company-rezbook',
    createdAt: now,
    updatedAt: now,
    source: 'manual',
    status: 'active',
    name: 'RezBook SaaS',
    website: 'https://rezbook.example.com',
    industry: 'SaaS',
    size: '11-50',
    country: 'Jordan',
    notes: 'Product motion and launch assets client.'
  },
  {
    id: 'company-north-pixel',
    createdAt: now,
    updatedAt: now,
    source: 'behance',
    status: 'active',
    name: 'North Pixel',
    website: 'https://northpixel.example.com',
    industry: 'Creative Agency',
    size: '2-10',
    country: 'Jordan',
    notes: 'Potential agency collaboration for logo animation work.'
  }
];

export const mockContacts: Contact[] = crmSeedLeads.map(lead => ({
  id: lead.contactId || `contact-${lead.id}`,
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt,
  source: lead.source === 'google_contacts' ? 'google_contacts' : lead.source,
  status: toStatus(lead.status),
  name: lead.name,
  email: lead.email,
  phone: lead.phoneOrHandle.startsWith('+') ? lead.phoneOrHandle : undefined,
  companyId: lead.companyId,
  preferredChannel: lead.preferredChannel,
  tags: lead.tags,
  notes: lead.notes
}));

export const mockLeads: Lead[] = crmSeedLeads.map(lead => ({
  id: lead.id,
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt,
  source: lead.source,
  status: toStatus(lead.status),
  contactId: lead.contactId || `contact-${lead.id}`,
  companyId: lead.companyId,
  name: lead.name,
  platform: lead.platform,
  serviceInterest: lead.serviceInterest,
  budgetRange: lead.budgetRange,
  temperature: lead.temperature,
  aiScore: lead.aiScore,
  nextBestAction: lead.nextBestAction,
  nextFollowUpAt: lead.nextFollowUpAt,
  notes: lead.notes
}));

export const mockInteractions = crmSeedLeads.flatMap(lead => lead.interactionHistory.map(interaction => ({
  id: interaction.id,
  createdAt: interaction.occurredAt,
  updatedAt: interaction.occurredAt,
  source: 'manual' as const,
  status: 'completed' as const,
  leadId: lead.id,
  contactId: lead.contactId || `contact-${lead.id}`,
  type: interaction.type,
  channel: interaction.channel,
  occurredAt: interaction.occurredAt,
  subject: interaction.summary,
  body: interaction.summary,
  summary: interaction.summary
})));

export const mockEmailDrafts: EmailDraft[] = outreachSeedDrafts.map(draft => ({
  id: draft.id,
  createdAt: draft.createdAt,
  updatedAt: draft.updatedAt,
  source: 'manual',
  status: toStatus(draft.status),
  leadId: draft.leadId,
  to: draft.to,
  subject: draft.subject,
  body: draft.body,
  purpose: draft.purpose,
  approvedAt: draft.approvedAt,
  sentAt: draft.sentAt,
  externalDraftId: draft.gmailDraftId
}));

export const mockOutreachSequences: OutreachSequence[] = outreachSeedSequences.map(sequence => ({
  id: sequence.id,
  createdAt: sequence.createdAt,
  updatedAt: sequence.updatedAt,
  source: 'manual',
  status: toStatus(sequence.status),
  leadId: sequence.leadId,
  name: sequence.name,
  steps: sequence.steps.map(step => ({
    id: step.id,
    createdAt: step.createdAt,
    updatedAt: step.updatedAt,
    source: 'manual',
    status: toStatus(step.status),
    leadId: step.leadId,
    to: step.to,
    subject: step.subject,
    body: step.body,
    purpose: step.purpose,
    approvedAt: step.approvedAt,
    sentAt: step.sentAt,
    externalDraftId: step.gmailDraftId
  })),
  currentStepIndex: 0,
  stoppedAt: sequence.status === 'Stopped' ? sequence.updatedAt : undefined
}));

export const mockContentItems: ContentItem[] = contentSeedItems.map(item => ({
  id: item.id,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  source: item.source === 'manual' ? 'manual' : 'import',
  status: toStatus(item.status),
  date: item.date,
  scheduledDate: item.scheduledDate,
  platform: item.platform,
  contentType: item.contentType,
  title: item.title,
  idea: item.idea,
  hook: item.hook,
  script: item.script,
  caption: item.caption,
  hashtags: item.hashtags,
  relatedProject: item.relatedProject,
  relatedGoal: item.relatedGoal,
  cta: item.cta,
  publishedUrl: item.publishedUrl,
  performanceMetrics: item.performanceMetrics,
  approvedAt: item.approvedAt,
  publishedAt: item.publishedAt
}));

export const mockPortfolioProjects: PortfolioProject[] = portfolioSeedProjects.map(project => ({
  id: project.id,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  source: 'manual',
  status: project.publishStatus.every(item => item.status === 'Published') ? 'published' : 'draft',
  projectTitle: project.projectTitle,
  clientName: project.clientName,
  category: project.category,
  description: project.description,
  problem: project.problem,
  solution: project.solution,
  toolsUsed: project.toolsUsed,
  finalLinks: project.finalLinks,
  thumbnail: project.thumbnail,
  caseStudyText: project.caseStudyText,
  servicesProvided: project.servicesProvided,
  resultsMetrics: project.resultsMetrics,
  tags: project.tags
}));

export const mockUpworkJobs: UpworkJob[] = upworkSeedJobs.map(job => ({
  id: job.id,
  createdAt: job.savedAt || now,
  updatedAt: job.savedAt || now,
  source: 'upwork',
  status: toStatus(job.status),
  jobTitle: job.jobTitle,
  clientCountry: job.clientCountry,
  budget: job.budget,
  skillMatchScore: job.skillMatchScore,
  projectType: job.projectType,
  descriptionSummary: job.descriptionSummary,
  aiFitAnalysis: job.aiFitAnalysis,
  suggestedProposalAngle: job.suggestedProposalAngle,
  savedAt: job.savedAt,
  followUpAt: job.followUpAt
}));

export const mockAutomationLogs: AutomationLog[] = automationHistorySeedItems.map(item => ({
  id: item.id,
  createdAt: item.timestamp,
  updatedAt: item.timestamp,
  source: 'ai',
  status: toStatus(item.status),
  timestamp: item.timestamp,
  triggerSource: item.triggerSource,
  action: item.action,
  result: item.result,
  error: item.error
}));

export const mockApprovalRequests: ApprovalRequest[] = approvalSeedItems.map(item => ({
  id: item.id,
  createdAt: item.createdAt,
  updatedAt: item.createdAt,
  source: 'ai',
  status: toStatus(item.status),
  actionType: item.actionType === 'Email ready to send'
    ? 'email_send'
    : item.actionType === 'Social post ready to publish'
      ? 'social_publish'
      : item.actionType === 'Follow-up sequence ready to start'
        ? 'sequence_start'
        : item.actionType === 'CRM status change'
          ? 'crm_bulk_update'
          : item.actionType === 'Proposal draft ready'
            ? 'proposal_submit'
            : 'whatsapp_manual_message',
  target: item.target,
  contentPreview: item.contentPreview,
  riskLevel: item.riskLevel,
  reasonApprovalRequired: item.reasonApprovalRequired
}));

export const mockReportMetrics: ReportMetric[] = upworkSeedMetrics.map(metric => ({
  id: `metric-${metric.label.toLowerCase().replace(/\s+/g, '-')}`,
  createdAt: now,
  updatedAt: now,
  source: 'manual',
  status: 'active',
  reportType: 'weekly',
  label: metric.label,
  value: metric.value,
  note: metric.note,
  periodStart: '2026-06-08',
  periodEnd: '2026-06-14'
}));

export const mockWorkSettings: WorkSettings = {
  id: 'work-settings-default',
  createdAt: now,
  updatedAt: now,
  source: 'manual',
  status: 'active',
  requireEmailApproval: true,
  requirePostApproval: true,
  requireCrmBulkApproval: true,
  disableWhatsappAutoSend: true,
  draftFirstMode: true,
  maxAiActionsPerDay: 25,
  connectedIntegrations: {
    telegram: 'needs_setup',
    gemini: 'needs_setup',
    google_sheets_crm: 'needs_setup',
    gmail: 'needs_setup',
    whatsapp: 'not_connected'
  }
};

export const workMockDatabase: WorkDatabaseMock = {
  leads: mockLeads,
  contacts: mockContacts,
  companies: mockCompanies,
  interactions: mockInteractions,
  emailDrafts: mockEmailDrafts,
  outreachSequences: mockOutreachSequences,
  contentItems: mockContentItems,
  portfolioProjects: mockPortfolioProjects,
  upworkJobs: mockUpworkJobs,
  automationLogs: mockAutomationLogs,
  approvalRequests: mockApprovalRequests,
  reportMetrics: mockReportMetrics,
  settings: mockWorkSettings
};
