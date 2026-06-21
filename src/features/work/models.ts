export type WorkRecordSource =
  | 'manual'
  | 'ai'
  | 'google_contacts'
  | 'gmail'
  | 'google_calendar'
  | 'google_tasks'
  | 'telegram'
  | 'supabase'
  | 'instagram'
  | 'facebook'
  | 'whatsapp'
  | 'youtube'
  | 'pinterest'
  | 'dribbble'
  | 'upwork'
  | 'behance'
  | 'adobe_portfolio'
  | 'portfolio_website'
  | 'import';

export type WorkStatus =
  | 'new'
  | 'active'
  | 'draft'
  | 'waiting_approval'
  | 'approved'
  | 'scheduled'
  | 'sent'
  | 'published'
  | 'completed'
  | 'paused'
  | 'rejected'
  | 'lost'
  | 'archived'
  | 'needs_setup'
  | 'connected'
  | 'not_connected';

export interface WorkBaseModel {
  id: string;
  createdAt: string;
  updatedAt: string;
  source: WorkRecordSource;
}

export interface WorkStatusModel extends WorkBaseModel {
  status: WorkStatus;
}

export interface Company extends WorkStatusModel {
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  country?: string;
  notes?: string;
}

export interface Contact extends WorkStatusModel {
  name: string;
  email?: string;
  phone?: string;
  companyId?: string;
  title?: string;
  preferredChannel: 'email' | 'phone' | 'whatsapp' | 'instagram' | 'facebook' | 'upwork' | 'gmail' | 'behance' | 'pinterest' | 'dribbble' | 'youtube' | 'website';
  tags: string[];
  notes?: string;
}

export interface Lead extends WorkStatusModel {
  contactId?: string;
  companyId?: string;
  name: string;
  platform: 'Upwork' | 'Instagram' | 'LinkedIn' | 'Referral' | 'Website' | 'Manual' | 'Other' | 'Facebook' | 'WhatsApp' | 'Gmail' | 'Google Contacts' | 'Behance' | 'Pinterest' | 'Dribbble' | 'YouTube' | 'Portfolio Website';
  serviceInterest: 'Motion Design' | 'Logo Animation' | 'Social Media Ads' | 'YouTube Intro' | 'Brand Video' | 'Other';
  budgetRange: string;
  temperature: 'Cold' | 'Warm' | 'Hot';
  aiScore: number;
  nextBestAction: string;
  nextFollowUpAt?: string;
  notes?: string;
}

export interface Interaction extends WorkStatusModel {
  contactId?: string;
  leadId?: string;
  companyId?: string;
  type: 'email' | 'call' | 'dm' | 'meeting' | 'proposal' | 'note' | 'system';
  channel: Contact['preferredChannel'];
  occurredAt: string;
  subject: string;
  body: string;
  summary?: string;
}

export interface EmailDraft extends WorkStatusModel {
  leadId?: string;
  contactId?: string;
  to: string;
  subject: string;
  body: string;
  purpose: 'follow_up' | 'proposal' | 'reactivation' | 'reengagement' | 'discovery' | 'cold_outreach' | 'portfolio_showcase';
  approvedAt?: string;
  sentAt?: string;
  externalDraftId?: string;
}

export interface OutreachSequence extends WorkStatusModel {
  leadId: string;
  name: string;
  steps: EmailDraft[];
  currentStepIndex: number;
  startedAt?: string;
  stoppedAt?: string;
}

export interface ContentItem extends WorkStatusModel {
  date: string;
  scheduledDate?: string;
  platform: 'Instagram' | 'LinkedIn' | 'YouTube' | 'Behance' | 'Pinterest' | 'Dribbble' | 'Portfolio Website';
  contentType: 'Reel' | 'Post' | 'Carousel' | 'Story' | 'YouTube Short' | 'Case Study' | 'Pin' | 'Dribbble Shot' | 'Behance Project' | 'Portfolio Update';
  title: string;
  idea?: string;
  hook?: string;
  script?: string;
  caption: string;
  hashtags: string[];
  relatedProject?: string;
  relatedGoal?: string;
  cta?: string;
  publishedUrl?: string;
  performanceMetrics?: string[];
  approvedAt?: string;
  publishedAt?: string;
}

export interface PortfolioProject extends WorkStatusModel {
  projectTitle: string;
  clientName: string;
  category: string;
  description: string;
  problem: string;
  solution: string;
  toolsUsed: string[];
  finalLinks: string[];
  thumbnail?: string;
  caseStudyText: string;
  servicesProvided: string[];
  resultsMetrics: string[];
  tags: string[];
}

export interface UpworkJob extends WorkStatusModel {
  jobTitle: string;
  clientCountry: string;
  budget: string;
  skillMatchScore: number;
  projectType: string;
  descriptionSummary: string;
  aiFitAnalysis: string;
  suggestedProposalAngle: string;
  savedAt?: string;
  followUpAt?: string;
}

export interface AutomationLog extends WorkStatusModel {
  timestamp: string;
  triggerSource: string;
  action: string;
  result: string;
  error?: string;
}

export interface ApprovalRequest extends WorkStatusModel {
  actionType: 'email_send' | 'social_publish' | 'sequence_start' | 'crm_bulk_update' | 'proposal_submit' | 'whatsapp_manual_message';
  target: string;
  contentPreview: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  reasonApprovalRequired: string;
  resolvedAt?: string;
}

export interface ReportMetric extends WorkStatusModel {
  reportType: 'daily' | 'weekly' | 'monthly';
  label: string;
  value: string | number;
  note: string;
  periodStart: string;
  periodEnd: string;
}

export interface WorkSettings extends WorkStatusModel {
  requireEmailApproval: boolean;
  requirePostApproval: boolean;
  requireCrmBulkApproval: boolean;
  disableWhatsappAutoSend: boolean;
  draftFirstMode: boolean;
  maxAiActionsPerDay: number;
  connectedIntegrations: Record<string, WorkStatus>;
}

export interface WorkDatabaseMock {
  leads: Lead[];
  contacts: Contact[];
  companies: Company[];
  interactions: Interaction[];
  emailDrafts: EmailDraft[];
  outreachSequences: OutreachSequence[];
  contentItems: ContentItem[];
  portfolioProjects: PortfolioProject[];
  upworkJobs: UpworkJob[];
  automationLogs: AutomationLog[];
  approvalRequests: ApprovalRequest[];
  reportMetrics: ReportMetric[];
  settings: WorkSettings;
}
