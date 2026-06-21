import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  Filter,
  FolderOpen,
  Globe2,
  Inbox,
  LayoutDashboard,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Palette,
  PenLine,
  PieChart,
  Plug,
  Plus,
  Radio,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UserPlus,
  Users,
  Wand2,
  X,
  Zap
} from 'lucide-react';
import { usePersistentState } from '../lib/uiPersistence';
import { PageHeader } from './system/Layout';
import { useApp } from '../context/useApp';
import {
  leadService
} from '../features/work/services';
import {
  createLead,
  generateNextBestAction,
  getLeadsForFollowUp,
  logInteraction,
  scoreLeadWithAI,
  updateLead
} from '../features/work/crm/services';
import type { InteractionType, Lead as CrmLead, LeadPlatform, LeadStage, LeadTemperature, ServiceInterest } from '../features/work/crm/types';
import {
  approveDraftForSend,
  createGmailDraftPlaceholder,
  createTimelineEvent,
  generateEmailDraftForLead,
  generatePortfolioShowcaseEmail,
  generateReengagementMessage,
  generateThreeStepFollowUpSequence,
  generateWritingAssistantMessage,
  makeWritingOutputProfessional,
  makeWritingOutputShorter,
  saveDraft,
  stopSequence,
  translateWritingOutput,
  writingOutputToDraft
} from '../features/work/outreach/services';
import type {
  EmailTimelineEvent,
  FollowUpSequence,
  OutreachCampaign,
  OutreachEmailDraft,
  OutreachStatus,
  WritingAssistantInput,
  WritingAssistantLanguage,
  WritingAssistantMessageType,
  WritingAssistantOutput,
  WritingAssistantTone
} from '../features/work/outreach/types';
import {
  approveContentForScheduling,
  createContentIdea,
  createWeeklyContentPlan,
  generateContentIdeasFromProject,
  generateCaptionForPlatform,
  generateCtaForContent,
  generateHookForContent,
  generateScriptForContent,
  repurposeProjectIntoPosts,
  suggestPostingSchedule,
  translateContentCaption
} from '../features/work/content/services';
import type { ContentDraftInput, ContentItem, ContentPlatform, ContentStatus, ContentType, ContentViewMode } from '../features/work/content/types';
import {
  createPortfolioProject,
  chooseBestPortfolioProjects,
  generateLinkedInPost,
  generatePortfolioLinkMessage,
  generatePortfolioCopy,
  generatePortfolioPitch,
  getMonthlyPortfolioReminder,
  portfolioMatchesBestFor,
  setPortfolioPlatformStatus
} from '../features/work/portfolio/services';
import type { PortfolioBestFor, PortfolioBusinessStatus, PortfolioCopyType, PortfolioPlatform, PortfolioProject, PortfolioProjectDraft } from '../features/work/portfolio/types';
import {
  addUpworkFollowUpReminder,
  analyzeUpworkJob,
  generateUpworkProposalDraft,
  markUpworkProposalSubmitted,
  saveUpworkJob
} from '../features/work/upwork/services';
import type { UpworkConversationSummary, UpworkJob, UpworkPerformanceMetric, UpworkProposalDraft, UpworkJobStatus } from '../features/work/upwork/types';
import { telegramCommandExamples } from '../features/work/telegram/seed';
import { simulateTelegramCommand } from '../features/work/telegram/services';
import type { TelegramCommandCategory, TelegramCommandSimulation } from '../features/work/telegram/types';
import { jobSeedActivities, jobSeedDrafts, jobSeedOpportunities } from '../features/work/jobs/seed';
import { createApplicationActivity, generateApplicationDraft, scoreJobMatch, summarizeJobRequirements, updateJobStatus } from '../features/work/jobs/services';
import type { ApplicationActivity, ApplicationDraft, ApplicationDraftType, JobOpportunity, JobPlatform, JobStatus, JobWorkMode } from '../features/work/jobs/types';
import {
  approvalToHistory,
  requiresExplicitApproval,
  SAFE_AUTOMATION_RULE,
  setApprovalStatus
} from '../features/work/automation/services';
import type { ApprovalItem, ApprovalStatus, AutomationHistoryItem, AutomationStatus, RiskLevel } from '../features/work/automation/types';
import { cloudRunClient, normalizeApiError } from '../lib/api/cloudRunClient';

type WorkModuleId =
  | 'overview'
  | 'crm'
  | 'deals'
  | 'outreach'
  | 'content'
  | 'portfolio'
  | 'upwork'
  | 'jobs'
  | 'social'
  | 'reports'
  | 'telegram'
  | 'logs'
  | 'settings';

interface DealDetails {
  id: string;
  clientName: string;
  serviceDeliverable: string;
  styleFormat: string;
  agreedPrice: number;
  depositPaid: number;
  balanceDue: number;
  paymentStatus: string;
  deliveryDate: string;
  revisionsUsed: string;
  contractSigned: boolean;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

type BadgeTone = 'blue' | 'teal' | 'amber' | 'rose' | 'purple';
type LeadStatus = 'New' | 'Cold' | 'Warm' | 'Hot' | 'Client' | 'Past Client' | 'Lost';
type WorkQuickFilter = 'All' | 'Hot' | 'Needs Approval' | 'Due Today';
type LeadDraft = Pick<CrmLead, 'name' | 'platform' | 'email' | 'phoneOrHandle' | 'serviceInterest' | 'budgetRange' | 'notes' | 'aiScore' | 'nextBestAction' | 'temperature'> & {
  status: LeadStatus;
  stage: LeadStage;
  lastContactedAt: string;
  nextFollowUpAt: string;
};
type CrmViewMode = 'board' | 'table' | 'calendar';
type OutreachDraftKind = 'cold_outreach' | 'follow_up_1' | 'follow_up_2' | 'proposal_intro' | 'portfolio_share' | 'meeting_recap';
type SocialPlatform = 'instagram' | 'linkedin';
type SocialTone = 'professional' | 'friendly' | 'sales' | 'helpful' | 'arabic' | 'english' | 'mixed';
type SocialStatus = 'unread' | 'unreplied' | 'drafted' | 'pending_approval' | 'handled' | 'rejected';
type JobRadarViewMode = 'board' | 'table';

interface SocialAccountUi {
  id: string;
  platform: SocialPlatform;
  displayName: string;
  mode: 'api_connected' | 'manual_mode';
  missingEnv?: string[];
}

interface SocialPostUi {
  id: string;
  platform: SocialPlatform;
  title: string;
  publishedAt: string;
}

interface SocialCommentUi {
  id: string;
  platform: SocialPlatform;
  postId: string;
  authorName: string;
  authorHandle?: string;
  text: string;
  createdAt: string;
  status: SocialStatus;
  crmLeadId?: string;
  riskFlags: string[];
}

interface SuggestedReplyUi {
  id: string;
  commentId: string;
  tone: SocialTone;
  body: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'handled';
  safeToAutoReply: boolean;
  reason: string;
  approvalId?: string;
}

const messageTypes: WritingAssistantMessageType[] = ['Cold email', 'Follow-up email', 'Proposal email', 'Re-engagement email', 'Testimonial request', 'Project update email', 'Invoice reminder', 'Thank-you email'];
const writingTones: WritingAssistantTone[] = ['Friendly', 'Professional', 'Short', 'Premium', 'Casual'];
const writingLanguages: WritingAssistantLanguage[] = ['Arabic', 'English', 'Mixed'];
const contentPlatforms: ContentPlatform[] = ['Instagram', 'LinkedIn', 'YouTube', 'Behance', 'Pinterest', 'Dribbble', 'Portfolio Website'];
const contentTypes: ContentType[] = ['Reel', 'Post', 'Carousel', 'Story', 'YouTube Short', 'Case Study', 'Pin', 'Dribbble Shot', 'Behance Project', 'Portfolio Update'];
const contentStatuses: ContentStatus[] = ['Idea', 'Backlog', 'Draft', 'Waiting Approval', 'Scheduled', 'Published'];
const workQuickFilters: WorkQuickFilter[] = ['All', 'Hot', 'Needs Approval', 'Due Today'];
const workReadyChannels = ['Telegram', 'Gemini', 'n8n', 'Supabase', 'Gmail', 'Social APIs'];
const WORK_TODAY = '2026-06-12';
const telegramSampleCommand = '\u0636\u064a\u0641 lead \u062c\u062f\u064a\u062f \u0627\u0633\u0645\u0647 \u0623\u062d\u0645\u062f \u0645\u0646 Instagram \u0645\u0647\u062a\u0645 \u0628\u0640 logo animation';
const portfolioCopyButtons: { label: string; type: PortfolioCopyType }[] = [
  { label: 'Generate Case Study', type: 'case_study' },
  { label: 'Behance Description', type: 'behance' },
  { label: 'Dribbble Shot', type: 'dribbble' },
  { label: 'Pinterest SEO', type: 'pinterest' },
  { label: 'Instagram Caption', type: 'instagram' },
  { label: 'YouTube Description', type: 'youtube' },
  { label: 'Website Text', type: 'website' }
];
const portfolioBestForOptions: PortfolioBestFor[] = ['motion design', 'social ads', 'brand video', 'game dev', 'product launch', 'freelance proof'];
const portfolioBusinessStatuses: PortfolioBusinessStatus[] = ['idea', 'draft', 'ready', 'published', 'archived'];
const telegramCategories: TelegramCommandCategory[] = ['CRM', 'Outreach', 'Content', 'Portfolio', 'Upwork', 'Reports', 'Task'];
const socialTones: { value: SocialTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'sales', label: 'Sales' },
  { value: 'helpful', label: 'Helpful' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'english', label: 'English' },
  { value: 'mixed', label: 'Mixed Arabic/English' }
];
const outreachDraftKinds: { value: OutreachDraftKind; label: string }[] = [
  { value: 'cold_outreach', label: 'Cold outreach' },
  { value: 'follow_up_1', label: 'Follow-up 1' },
  { value: 'follow_up_2', label: 'Follow-up 2' },
  { value: 'proposal_intro', label: 'Proposal intro' },
  { value: 'portfolio_share', label: 'Portfolio share' },
  { value: 'meeting_recap', label: 'Meeting recap' }
];
const jobPlatforms: JobPlatform[] = ['LinkedIn Jobs', 'Indeed', 'Wellfound', 'RemoteOK', 'We Work Remotely', 'Company Career Page', 'Custom URL'];
const jobStatuses: { value: JobStatus; label: string; tone: BadgeTone }[] = [
  { value: 'saved', label: 'Saved', tone: 'blue' },
  { value: 'reviewing', label: 'Reviewing', tone: 'amber' },
  { value: 'draft_ready', label: 'Draft Ready', tone: 'purple' },
  { value: 'applied', label: 'Applied', tone: 'teal' },
  { value: 'interview', label: 'Interview', tone: 'rose' },
  { value: 'rejected', label: 'Rejected', tone: 'blue' },
  { value: 'accepted', label: 'Accepted', tone: 'teal' },
  { value: 'archived', label: 'Archived', tone: 'blue' }
];
const jobWorkModes: JobWorkMode[] = ['Remote', 'Hybrid', 'Onsite'];
const applicationDraftTypes: { value: ApplicationDraftType; label: string }[] = [
  { value: 'cv_bullets', label: 'Tailored CV bullets' },
  { value: 'cover_letter', label: 'Cover letter' },
  { value: 'portfolio_pitch', label: 'Portfolio pitch' },
  { value: 'email_application', label: 'Email application' }
];

const crmSeedLeads = leadService.getUiLeads();
const outreachSeedCampaigns: OutreachCampaign[] = [];
const outreachSeedDrafts: OutreachEmailDraft[] = [];
const outreachSeedSequences: FollowUpSequence[] = [];
const outreachSeedTimeline: EmailTimelineEvent[] = [];
const contentSeedItems: ContentItem[] = [];
const portfolioSeedProjects: PortfolioProject[] = [];
const upworkSeedJobs: UpworkJob[] = [];
const upworkSeedDrafts: UpworkProposalDraft[] = [];
const upworkSeedConversations: UpworkConversationSummary[] = [];
const upworkSeedMetrics: UpworkPerformanceMetric[] = [];
const approvalSeedItems: ApprovalItem[] = [];
const automationHistorySeedItems: AutomationHistoryItem[] = [];

const seedDeals: DealDetails[] = [
  {
    id: 'deal-1',
    clientName: 'RezBook SaaS',
    serviceDeliverable: 'Product Explainer Video',
    styleFormat: '2D Flat Vector Animation',
    agreedPrice: 4200,
    depositPaid: 2100,
    balanceDue: 2100,
    paymentStatus: 'Partial',
    deliveryDate: '2026-06-30',
    revisionsUsed: '2 of 3',
    contractSigned: true,
    notes: 'Storyboard approved; starting animation.'
  },
  {
    id: 'deal-2',
    clientName: 'North Pixel Agency',
    serviceDeliverable: '3D Logo Reveal Package',
    styleFormat: '3D Glossy / Metallic',
    agreedPrice: 2600,
    depositPaid: 2600,
    balanceDue: 0,
    paymentStatus: 'Paid',
    deliveryDate: '2026-06-15',
    revisionsUsed: '1 of 3',
    contractSigned: true,
    notes: 'Delivered files.'
  },
  {
    id: 'deal-3',
    clientName: 'Amana Studio',
    serviceDeliverable: 'Social Ads Animation Kit',
    styleFormat: 'Mixed Media Typography',
    agreedPrice: 1800,
    depositPaid: 900,
    balanceDue: 900,
    paymentStatus: 'Partial',
    deliveryDate: '2026-07-05',
    revisionsUsed: '0 of 3',
    contractSigned: false,
    notes: 'Deposit paid; scripting phase.'
  }
];
const socialSeedAccounts: SocialAccountUi[] = [
  { id: 'instagram', platform: 'instagram', displayName: 'Instagram Business', mode: 'manual_mode', missingEnv: ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID'] },
  { id: 'linkedin', platform: 'linkedin', displayName: 'LinkedIn Page', mode: 'manual_mode', missingEnv: ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_ORGANIZATION_URN'] }
];
const socialSeedPosts: SocialPostUi[] = [
  { id: 'ig-post-logo-reveal', platform: 'instagram', title: 'Logo reveal breakdown reel', publishedAt: '2026-06-12T08:30:00.000Z' },
  { id: 'li-post-case-study', platform: 'linkedin', title: 'Motion design case study post', publishedAt: '2026-06-11T15:20:00.000Z' }
];
const socialSeedComments: SocialCommentUi[] = [
  {
    id: 'comment-ig-1',
    platform: 'instagram',
    postId: 'ig-post-logo-reveal',
    authorName: 'Sara Mansour',
    authorHandle: '@glowline.co',
    text: 'This style is exactly what we need for our product launch. Do you do Arabic/English versions?',
    createdAt: '2026-06-12T10:15:00.000Z',
    status: 'unreplied',
    crmLeadId: 'lead-ig-sara',
    riskFlags: []
  },
  {
    id: 'comment-li-1',
    platform: 'linkedin',
    postId: 'li-post-case-study',
    authorName: 'Omar Khaled',
    authorHandle: 'North Pixel',
    text: 'Great result. What timeline do you usually need for a similar launch animation?',
    createdAt: '2026-06-12T11:10:00.000Z',
    status: 'unread',
    crmLeadId: 'lead-north-pixel',
    riskFlags: ['pricing_or_timeline']
  }
];

const money = (value: number) => `$${value.toLocaleString('en-US')}`;

const workModules: {
  id: WorkModuleId;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  count?: string;
}[] = [
  { id: 'overview', label: 'Overview Dashboard', description: 'Studio health, revenue, focus, and next moves', icon: LayoutDashboard },
  { id: 'crm', label: 'CRM / Leads', description: 'Lead pipeline and client relationship control', icon: Users, count: '18' },
  { id: 'deals', label: 'Deals Done', description: 'Agreements, deliverables, and payments tracker', icon: DollarSign },
  { id: 'outreach', label: 'Outreach / Emails', description: 'Campaigns, inbox follow-ups, and templates', icon: Mail, count: '7' },
  { id: 'content', label: 'Content Planner', description: 'Reels, case studies, carousels, and launch posts', icon: CalendarDays },
  { id: 'portfolio', label: 'Portfolio Manager', description: 'Case studies, reels, assets, and proof library', icon: FolderOpen },
  { id: 'upwork', label: 'Upwork Monitor', description: 'Saved searches, proposals, and bid decisions', icon: BriefcaseBusiness, count: '12' },
  { id: 'jobs', label: 'Job Radar', description: 'Track roles, tailor portfolio/CV drafts, and prepare applications', icon: BriefcaseBusiness, count: '3' },
  { id: 'social', label: 'Social Inbox', description: 'Draft replies for LinkedIn, Instagram, and future socials', icon: MessageCircle, count: '2' },
  { id: 'reports', label: 'Reports & Analytics', description: 'Revenue, source quality, and creative ops KPIs', icon: BarChart3 },
  { id: 'telegram', label: 'Telegram Bot Commands', description: 'Command shortcuts for capture and automation', icon: MessageCircle },
  { id: 'logs', label: 'Automation Logs', description: 'Sync runs, alerts, and agent activity', icon: Activity },
  { id: 'settings', label: 'Integration Status', description: 'Connector readiness summary and handoff to OS Integrations', icon: Settings }
];

const kpis = [
  { label: 'Pipeline Value', value: money(18400), delta: '+22% this month', icon: DollarSign, tone: 'blue' as BadgeTone },
  { label: 'Hot Leads', value: '9', delta: '3 need reply today', icon: Target, tone: 'rose' as BadgeTone },
  { label: 'Active Projects', value: '5', delta: '2 in review', icon: Palette, tone: 'purple' as BadgeTone },
  { label: 'Content Queue', value: '14', delta: '6 ready to publish', icon: CalendarDays, tone: 'teal' as BadgeTone }
];

const overviewLeads = [
  { company: 'North Pixel Agency', contact: 'Omar Khaled', service: '3D logo reveal package', source: 'Behance', value: 2600, stage: 'Proposal Sent', score: 88, next: 'Send proof reel v2' },
  { company: 'RezBook SaaS', contact: 'Lina Haddad', service: 'Product launch motion system', source: 'Referral', value: 4200, stage: 'Negotiation', score: 94, next: 'Confirm retainer terms' },
  { company: 'Amana Studio', contact: 'Ahmad Naser', service: 'Social launch animation kit', source: 'Instagram', value: 1800, stage: 'Discovery', score: 81, next: 'Book creative call' },
  { company: 'Orbit Fitness', contact: 'Maya Salim', service: 'Ad creative sprint', source: 'Cold Email', value: 1200, stage: 'New Lead', score: 67, next: 'Qualify timeline' }
];

const platforms: LeadPlatform[] = ['Instagram', 'LinkedIn', 'Referral', 'Upwork', 'Website', 'Manual', 'Other', 'Facebook', 'WhatsApp', 'Gmail', 'Google Contacts', 'Behance', 'Pinterest', 'Dribbble', 'YouTube', 'Portfolio Website'];
const leadStatuses: LeadStatus[] = ['New', 'Cold', 'Warm', 'Hot', 'Client', 'Past Client', 'Lost'];
const serviceInterests: ServiceInterest[] = ['Motion Design', 'Logo Animation', 'Social Media Ads', 'YouTube Intro', 'Brand Video', 'Other'];
const leadTemperatures: LeadTemperature[] = ['Cold', 'Warm', 'Hot'];
const crmStages: { id: LeadStage; label: string; tone: BadgeTone }[] = [
  { id: 'new', label: 'New', tone: 'blue' },
  { id: 'qualified', label: 'Qualified', tone: 'purple' },
  { id: 'contacted', label: 'Contacted', tone: 'amber' },
  { id: 'replied', label: 'Replied', tone: 'teal' },
  { id: 'proposal', label: 'Proposal', tone: 'purple' },
  { id: 'negotiation', label: 'Negotiation', tone: 'amber' },
  { id: 'won', label: 'Won', tone: 'teal' },
  { id: 'lost', label: 'Lost', tone: 'rose' },
  { id: 'archived', label: 'Archived', tone: 'blue' }
];
const sourceBadgeTones: Record<string, BadgeTone> = {
  Instagram: 'rose',
  LinkedIn: 'blue',
  Referral: 'teal',
  Upwork: 'purple',
  Website: 'amber',
  Manual: 'blue',
  Other: 'blue'
};

const emptyLeadDraft: LeadDraft = {
  name: '',
  platform: 'Instagram',
  email: '',
  phoneOrHandle: '',
  status: 'New',
  stage: 'new',
  serviceInterest: 'Motion Design',
  budgetRange: '$750 - $1,500',
  lastContactedAt: '2026-06-11',
  nextFollowUpAt: '2026-06-13',
  notes: '',
  aiScore: 65,
  nextBestAction: 'Qualify budget, deadline, and decision owner.',
  temperature: 'Warm'
};

const writingInputFromLead = (lead: CrmLead): WritingAssistantInput => ({
  messageType: 'Follow-up email',
  leadName: lead.name,
  platformSource: lead.platform,
  serviceInterest: lead.serviceInterest,
  budget: lead.budgetRange,
  lastConversationSummary: lead.notes,
  tone: 'Professional',
  language: 'English',
  goal: lead.nextBestAction
});

const emptyWritingInput: WritingAssistantInput = {
  messageType: 'Follow-up email',
  leadName: '',
  platformSource: '',
  serviceInterest: '',
  budget: '',
  lastConversationSummary: '',
  tone: 'Professional',
  language: 'English',
  goal: ''
};

const emptyWritingOutput: WritingAssistantOutput = {
  subjectLine: '',
  emailBody: '',
  shortVersion: '',
  manualMessage: '',
  suggestedNextStep: ''
};

const emptyContentDraft: ContentDraftInput = {
  date: '2026-06-17',
  scheduledDate: '2026-06-17',
  platform: 'Instagram',
  contentType: 'Reel',
  title: '',
  idea: '',
  hook: '',
  script: '',
  caption: '',
  relatedProject: 'Neon Shift',
  relatedGoal: 'Finish the Neon Shift visual system',
  cta: 'DM for motion direction',
  performanceMetrics: [],
  hashtags: [],
  aiNotes: ''
};

const emptyPortfolioDraft: PortfolioProjectDraft = {
  title: '',
  projectTitle: '',
  client: '',
  clientName: '',
  industry: '',
  category: 'Motion Design',
  description: '',
  problem: '',
  solution: '',
  toolsUsed: ['After Effects'],
  deliverables: ['Motion Design'],
  links: [],
  finalLinks: [],
  thumbnailUrl: '',
  thumbnail: '',
  status: 'draft',
  caseStudyText: '',
  servicesProvided: ['Motion Design'],
  resultsMetrics: [],
  tags: [],
  bestFor: ['motion design', 'freelance proof'],
  linkedLeadIds: [],
  linkedJobIds: [],
  linkedDraftIds: []
};

const crmLeadSuggestion = (lead: LeadDraft | CrmLead) => {
  if ('aiSummary' in lead && lead.aiSummary) return lead.aiSummary;
  return generateNextBestAction(lead);
};

const stageFromStatus = (status: string): LeadStage => {
  if (status === 'Hot') return 'qualified';
  if (status === 'Warm') return 'contacted';
  if (status === 'Client' || status === 'Past Client') return 'won';
  if (status === 'Lost') return 'lost';
  return 'new';
};

const statusFromStage = (stage: LeadStage): LeadStatus => {
  if (stage === 'qualified' || stage === 'proposal' || stage === 'negotiation') return 'Hot';
  if (stage === 'contacted' || stage === 'replied') return 'Warm';
  if (stage === 'won') return 'Client';
  if (stage === 'lost' || stage === 'archived') return 'Lost';
  return 'New';
};

const stageLabel = (stage?: LeadStage) => crmStages.find(item => item.id === stage)?.label || 'New';

const normalizePlatform = (source?: string): LeadPlatform => {
  const value = (source || '').toLowerCase();
  if (value.includes('instagram')) return 'Instagram';
  if (value.includes('linkedin')) return 'LinkedIn';
  if (value.includes('referral')) return 'Referral';
  if (value.includes('upwork')) return 'Upwork';
  if (value.includes('website') || value.includes('portfolio')) return 'Website';
  if (value.includes('manual')) return 'Manual';
  return platforms.find(platform => platform.toLowerCase() === value) || 'Other';
};

const relationshipSummary = (lead: CrmLead) => {
  const last = lead.interactionHistory[0]?.summary || lead.notes || 'No interaction history yet.';
  const followUp = lead.nextFollowUpAt ? `Next follow-up: ${lead.nextFollowUpAt}.` : 'No follow-up scheduled.';
  return `${lead.name} is a ${lead.temperature.toLowerCase()} ${lead.serviceInterest.toLowerCase()} lead from ${lead.platform}. ${last} ${followUp}`;
};

const isStaleLead = (lead: CrmLead) => {
  if (['Client', 'Lost'].includes(lead.status)) return false;
  const lastTouch = lead.lastContactedAt || lead.updatedAt || lead.createdAt;
  return Date.now() - new Date(lastTouch).getTime() > 1000 * 60 * 60 * 24 * 14;
};

const backendLeadToUiLead = (record: Record<string, unknown>): CrmLead => {
  const platform = normalizePlatform(String(record.source || record.socialProfile || 'manual'));
  const stage = (record.stage || stageFromStatus(String(record.status || 'New'))) as LeadStage;
  const aiScore = Number(record.score ?? 50);
  const temperature: LeadTemperature = aiScore >= 82 ? 'Hot' : aiScore >= 60 ? 'Warm' : 'Cold';
  const createdAt = String(record.createdAt || new Date().toISOString());
  return {
    id: String(record.id),
    source: 'manual',
    sourceId: String((record.externalIds as Record<string, string> | undefined)?.googleContact || record.googleContactResourceName || record.sheetRowId || ''),
    createdAt,
    updatedAt: String(record.updatedAt || createdAt),
    lastContactedAt: String(record.lastContactedAt || ''),
    nextFollowUpAt: String(record.followUpDate || record.nextFollowUpAt || ''),
    status: statusFromStage(stage),
    stage,
    tags: [],
    notes: String(record.notes || ''),
    aiSummary: String(record.nextAction || 'Relationship summary pending.'),
    aiScore,
    consentStatus: 'unknown',
    preferredChannel: platform === 'Instagram' ? 'instagram' : platform === 'Upwork' ? 'upwork' : platform === 'Website' ? 'website' : 'email',
    interactionHistory: [],
    name: String(record.name || 'Unnamed lead'),
    platform,
    email: String(record.email || ''),
    phoneOrHandle: String(record.phone || record.socialProfile || ''),
    serviceInterest: (String(record.serviceInterest || 'Motion Design') as ServiceInterest),
    budgetRange: String(record.budget || ''),
    temperature,
    nextBestAction: String(record.nextAction || 'Qualify budget, deadline, and decision owner.')
  };
};

const uiLeadToBackendLead = (lead: Partial<CrmLead> & Pick<CrmLead, 'name'>) => ({
  name: lead.name,
  company: '',
  email: lead.email || '',
  phone: lead.phoneOrHandle || '',
  socialProfile: lead.platform && !['Gmail', 'Website', 'Manual', 'Referral'].includes(lead.platform) ? lead.phoneOrHandle || '' : '',
  source: (lead.platform || 'Manual').toLowerCase().replace(/\s+/g, '_'),
  status: lead.status || statusFromStage(lead.stage || 'new'),
  stage: lead.stage || stageFromStatus(lead.status || 'New'),
  serviceInterest: lead.serviceInterest || '',
  budget: lead.budgetRange || '',
  priority: lead.temperature === 'Hot' ? 'high' : lead.temperature === 'Warm' ? 'medium' : 'low',
  score: lead.aiScore ?? 50,
  notes: lead.notes || '',
  nextAction: lead.nextBestAction || '',
  followUpDate: lead.nextFollowUpAt || '',
  externalIds: lead.sourceId ? { localSourceId: lead.sourceId } : {}
});

const temperatureTone = (temperature: LeadTemperature): BadgeTone => {
  if (temperature === 'Hot') return 'rose';
  if (temperature === 'Warm') return 'amber';
  return 'blue';
};

const outreachStatusTone = (status: OutreachStatus): BadgeTone => {
  if (['Approved', 'Sent', 'Replied'].includes(status)) return 'teal';
  if (['Waiting Approval', 'No Reply'].includes(status)) return 'amber';
  if (['Stopped'].includes(status)) return 'rose';
  return 'blue';
};

const contentStatusTone = (status: ContentStatus): BadgeTone => {
  if (status === 'Published' || status === 'Scheduled') return 'teal';
  if (status === 'Waiting Approval') return 'amber';
  if (status === 'Draft') return 'blue';
  return 'purple';
};

const upworkStatusTone = (status: UpworkJobStatus): BadgeTone => {
  if (status === 'Won' || status === 'Submitted') return 'teal';
  if (status === 'Rejected') return 'rose';
  if (status === 'Drafted' || status === 'Reviewed') return 'amber';
  return 'blue';
};

const riskTone = (risk: RiskLevel): BadgeTone => {
  if (risk === 'High') return 'rose';
  if (risk === 'Medium') return 'amber';
  return 'teal';
};

const approvalStatusTone = (status: ApprovalStatus): BadgeTone => {
  if (status === 'Approved') return 'teal';
  if (status === 'Rejected') return 'rose';
  if (status === 'Editing') return 'purple';
  return 'amber';
};

const automationStatusTone = (status: AutomationStatus): BadgeTone => {
  if (status === 'Completed') return 'teal';
  if (status === 'Failed' || status === 'Rejected') return 'rose';
  if (status === 'Waiting Approval') return 'amber';
  return 'blue';
};

const normalizeSearch = (value: string) => value.trim().toLowerCase();

const matchesSearch = (query: string, values: Array<string | number | null | undefined>) => (
  !query || values.some(value => String(value ?? '').toLowerCase().includes(query))
);

const leadMatchesQuickFilter = (lead: CrmLead, filter: WorkQuickFilter) => (
  filter === 'All' ||
  (filter === 'Hot' && (lead.temperature === 'Hot' || lead.status === 'Hot' || lead.aiScore >= 85)) ||
  (filter === 'Needs Approval' && (lead.nextBestAction.toLowerCase().includes('proposal') || lead.aiScore >= 85)) ||
  (filter === 'Due Today' && lead.nextFollowUpAt === WORK_TODAY)
);

const contentMatchesQuickFilter = (item: ContentItem, filter: WorkQuickFilter) => (
  filter === 'All' ||
  (filter === 'Needs Approval' && item.status === 'Waiting Approval') ||
  (filter === 'Due Today' && item.date === WORK_TODAY) ||
  (filter === 'Hot' && ['Instagram', 'YouTube', 'Behance'].includes(item.platform))
);

const upworkMatchesQuickFilter = (job: UpworkJob, filter: WorkQuickFilter) => (
  filter === 'All' ||
  (filter === 'Hot' && job.skillMatchScore >= 80) ||
  (filter === 'Needs Approval' && job.status === 'Drafted') ||
  (filter === 'Due Today' && ['New', 'Reviewed'].includes(job.status))
);

const draftMatchesQuickFilter = (draft: OutreachEmailDraft, filter: WorkQuickFilter) => (
  filter === 'All' ||
  (filter === 'Needs Approval' && draft.status === 'Waiting Approval') ||
  (filter === 'Hot' && ['Draft', 'Waiting Approval'].includes(draft.status)) ||
  (filter === 'Due Today' && draft.updatedAt?.startsWith(WORK_TODAY))
);

const approvalMatchesQuickFilter = (item: ApprovalItem, filter: WorkQuickFilter) => (
  filter === 'All' ||
  (filter === 'Needs Approval' && ['Pending', 'Editing'].includes(item.status)) ||
  (filter === 'Hot' && item.riskLevel === 'High') ||
  (filter === 'Due Today' && ['Pending', 'Editing'].includes(item.status))
);

const reportMetricCards = [
  { label: 'New leads this week', value: '18', delta: '+6 vs last week', tone: 'blue' as BadgeTone },
  { label: 'Hot leads', value: '7', delta: '3 need proposal', tone: 'rose' as BadgeTone },
  { label: 'Follow-ups due today', value: '5', delta: '2 high value', tone: 'amber' as BadgeTone },
  { label: 'Proposals drafted', value: '9', delta: '4 waiting approval', tone: 'purple' as BadgeTone },
  { label: 'Emails sent', value: '42', delta: 'Draft-first approved sends', tone: 'blue' as BadgeTone },
  { label: 'Replies received', value: '11', delta: '26% reply rate', tone: 'teal' as BadgeTone },
  { label: 'Posts scheduled', value: '14', delta: 'Across 6 platforms', tone: 'purple' as BadgeTone },
  { label: 'Best performing platform', value: 'Instagram', delta: '41% of qualified leads', tone: 'teal' as BadgeTone }
];

const leadsGrowthData = [
  { label: 'Mon', value: 3 },
  { label: 'Tue', value: 5 },
  { label: 'Wed', value: 4 },
  { label: 'Thu', value: 7 },
  { label: 'Fri', value: 6 },
  { label: 'Sat', value: 2 },
  { label: 'Sun', value: 4 }
];

const leadSourceData = [
  { source: 'Instagram', leads: 14, qualified: 8 },
  { source: 'Upwork', leads: 9, qualified: 5 },
  { source: 'Behance', leads: 6, qualified: 4 },
  { source: 'Gmail', leads: 5, qualified: 2 },
  { source: 'Portfolio Website', leads: 4, qualified: 3 }
];

const reportDashboards = [
  { title: 'Follow-up performance', value: '78%', note: 'On-time follow-ups completed this week', trend: 78, tone: 'teal' as BadgeTone },
  { title: 'Email reply rate', value: '26%', note: '11 replies from 42 approved sends', trend: 52, tone: 'blue' as BadgeTone },
  { title: 'Proposal win rate', value: '33%', note: '3 wins from 9 proposal drafts', trend: 66, tone: 'purple' as BadgeTone },
  { title: 'Content performance', value: '18.4k', note: 'Estimated reach across scheduled posts', trend: 72, tone: 'amber' as BadgeTone },
  { title: 'Platform activity', value: '7 channels', note: 'Instagram, Upwork, Behance most active', trend: 86, tone: 'teal' as BadgeTone },
  { title: 'Weekly business summary', value: '$12.6k', note: 'Qualified pipeline created this week', trend: 64, tone: 'blue' as BadgeTone }
];

const platformActivityRows = [
  { platform: 'Instagram', activity: '14 leads, 6 posts, 5 replies', score: 'A', next: 'Publish reel breakdown and follow up with warm DMs.' },
  { platform: 'Upwork', activity: '9 saved jobs, 4 proposals drafted', score: 'B+', next: 'Submit approved proposals for high-fit explainer jobs.' },
  { platform: 'Behance', activity: '6 leads, 2 case study views', score: 'B', next: 'Refresh hero thumbnails and add project metrics.' },
  { platform: 'YouTube', activity: '2 shorts scheduled, 1 inquiry', score: 'C+', next: 'Repurpose logo animation case study into a short.' }
];

const todaysWorkBrief = [
  '5 follow-ups are due today; Lina and Ahmad are highest priority.',
  'Approve 4 proposal drafts before any external sending happens.',
  'Instagram is producing the best lead quality this week.',
  'One portfolio case study needs metrics before it supports outreach.'
];

const weeklyBusinessReview = [
  { label: 'Pipeline movement', value: '$12.6k new qualified pipeline from 18 leads' },
  { label: 'Outreach signal', value: '26% email reply rate, strongest in SaaS and agency segments' },
  { label: 'Content signal', value: 'Reel breakdowns are outperforming static portfolio posts' },
  { label: 'Next focus', value: 'Prioritize hot leads, submit approved Upwork proposals, update Behance proof' }
];

const integrations = [
  {
    name: 'Telegram Bot',
    status: 'Needs Setup',
    description: 'Receive Arabic/English commands, capture leads, trigger draft workflows, and return work summaries.',
    credentials: 'Bot token, webhook URL, allowed chat IDs',
    permissions: 'Read messages, send bot replies, trigger n8n/workflow endpoints'
  },
  {
    name: 'Gemini API',
    status: 'Not Connected',
    description: 'Generate summaries, next-best actions, message drafts, proposal outlines, and content repurposing ideas.',
    credentials: 'API key or service account configuration',
    permissions: 'Text generation only, no external sending permissions'
  },
  {
    name: 'Google Contacts',
    status: 'Not Connected',
    description: 'Sync contact records and enrich CRM lead profiles without overwriting user data automatically.',
    credentials: 'Google OAuth client',
    permissions: 'Read contacts, create/update contacts after approval'
  },
  {
    name: 'Gmail',
    status: 'Needs Setup',
    description: 'Draft outreach emails, track replies, and prepare approved messages for manual or API sending later.',
    credentials: 'Google OAuth client',
    permissions: 'Read threads, create drafts, send only after explicit approval'
  },
  {
    name: 'Google Calendar / Tasks',
    status: 'Not Connected',
    description: 'Schedule follow-ups, proposal deadlines, content reminders, and portfolio update tasks.',
    credentials: 'Google OAuth client',
    permissions: 'Read/write calendar events and tasks after approval'
  },
  {
    name: 'Supabase',
    status: 'Connected',
    description: 'Structured backend for CRM, content plans, approvals, automation history, and analytics.',
    credentials: 'Project URL, anon key, service role key stored server-side only',
    permissions: 'Database read/write through row-level security'
  },
  {
    name: 'Instagram / Facebook Meta API',
    status: 'Not Connected',
    description: 'Plan, draft, and later publish approved social posts across Instagram and Facebook.',
    credentials: 'Meta app ID, app secret, page/account tokens',
    permissions: 'Read insights, manage posts after approval'
  },
  {
    name: 'YouTube Data API',
    status: 'Not Connected',
    description: 'Prepare video descriptions, track shorts performance, and manage approved upload metadata later.',
    credentials: 'Google OAuth client, YouTube channel access',
    permissions: 'Read channel analytics, update metadata after approval'
  },
  {
    name: 'Pinterest API',
    status: 'Not Connected',
    description: 'Create SEO-ready pin drafts and monitor portfolio traffic from Pinterest.',
    credentials: 'Pinterest app credentials and account token',
    permissions: 'Read boards, create pins after approval'
  },
  {
    name: 'Dribbble API',
    status: 'Not Connected',
    description: 'Prepare shot descriptions and track motion design portfolio engagement.',
    credentials: 'API token or OAuth app credentials',
    permissions: 'Read profile activity, publish shots after approval'
  },
  {
    name: 'Upwork RSS/API',
    status: 'Needs Setup',
    description: 'Monitor job opportunities, summarize fit, and draft proposals while respecting Upwork rules.',
    credentials: 'RSS feed URL or approved API credentials',
    permissions: 'Read job feeds, no off-platform contact automation'
  },
  {
    name: 'Behance / Adobe Portfolio',
    status: 'Not Connected',
    description: 'Prepare case studies, update proof library, and track portfolio publishing readiness.',
    credentials: 'Adobe account OAuth or manual portfolio URL',
    permissions: 'Read portfolio data, publish/update only after approval'
  },
  {
    name: 'WhatsApp Business / Manual Mode',
    status: 'Needs Setup',
    description: 'Generate manual message suggestions while keeping WhatsApp auto-send disabled by default.',
    credentials: 'Business account details optional, manual mode requires none',
    permissions: 'Draft suggestions only, no automatic contact'
  }
];

const Badge = ({ value, tone = 'blue' }: { value: string | number; tone?: BadgeTone }) => (
  <span className={`work-badge work-badge-${tone}`}>{value}</span>
);

const Panel = ({ title, icon: Icon, action, children, className = '' }: {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`glass-panel work-panel ${className}`}>
    <div className="work-panel-head">
      <div className="work-panel-title"><Icon size={18} /> {title}</div>
      {action}
    </div>
    {children}
  </section>
);

const WorkTable = ({ columns, rows, emptyLabel = 'No records match the current search or filters.' }: { columns: string[]; rows: React.ReactNode[][]; emptyLabel?: string }) => (
  <div className="work-table-wrap">
    <table className="work-table">
      <thead>
        <tr>{columns.map(column => <th key={column}>{column}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length ? rows.map((row, index) => (
          <tr key={index}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>
        )) : (
          <tr>
            <td colSpan={columns.length}>
              <div className="work-table-empty">
                <Inbox size={18} />
                <span>{emptyLabel}</span>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export const Work: React.FC = () => {
  const { goals, projects } = useApp();
  const [activeModule, setActiveModule] = usePersistentState<WorkModuleId>('nova_work_active_module_v1', 'overview');
  const [globalSearch, setGlobalSearch] = usePersistentState('nova_work_global_search_v1', '', 'session');
  const [quickFilter, setQuickFilter] = usePersistentState<WorkQuickFilter>('nova_work_quick_filter_v1', 'All', 'session');
  const [crmLeads, setCrmLeads] = usePersistentState<CrmLead[]>('nova_work_crm_leads_v1', crmSeedLeads);
  const [dealsList, setDealsList] = usePersistentState<DealDetails[]>('nova_work_deals_list_v1', seedDeals);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [importingContacts, setImportingContacts] = useState(false);
  const [dealDraft, setDealDraft] = useState<Omit<DealDetails, 'id' | 'balanceDue'>>({
    clientName: '',
    serviceDeliverable: '',
    styleFormat: '',
    agreedPrice: 0,
    depositPaid: 0,
    paymentStatus: 'Pending',
    deliveryDate: '',
    revisionsUsed: '',
    contractSigned: false,
    notes: ''
  });
  const [leadQuery, setLeadQuery] = usePersistentState('nova_work_crm_query_v1', '', 'session');
  const [platformFilter, setPlatformFilter] = usePersistentState<LeadPlatform | 'All'>('nova_work_crm_platform_filter_v1', 'All', 'session');
  const [statusFilter, setStatusFilter] = usePersistentState<LeadStatus | 'All'>('nova_work_crm_status_filter_v1', 'All', 'session');
  const [serviceFilter, setServiceFilter] = usePersistentState<ServiceInterest | 'All'>('nova_work_crm_service_filter_v1', 'All', 'session');
  const [temperatureFilter, setTemperatureFilter] = usePersistentState<LeadTemperature | 'All'>('nova_work_crm_temp_filter_v1', 'All', 'session');
  const [selectedLeadId, setSelectedLeadId] = usePersistentState<string>('nova_work_crm_selected_lead_v1', crmSeedLeads[0]?.id || '', 'session');
  const [crmViewMode, setCrmViewMode] = usePersistentState<CrmViewMode>('nova_work_crm_view_mode_v1', 'board', 'session');
  const [crmBackendStatus, setCrmBackendStatus] = useState('Local CRM ready');
  const [crmLeadsLoading, setCrmLeadsLoading] = useState(false);

  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [quickLeadModalOpen, setQuickLeadModalOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [leadDraft, setLeadDraft] = useState<LeadDraft>(emptyLeadDraft);
  const [quickLeadDraft, setQuickLeadDraft] = useState({ name: '', source: 'Instagram' as LeadPlatform, email: '', need: '' });
  const [leadNoteDraft, setLeadNoteDraft] = useState('');
  const [leadActivityDraft, setLeadActivityDraft] = useState({ type: 'note' as InteractionType, summary: '' });
  const [generatedCrmText, setGeneratedCrmText] = useState('Select a lead and generate a follow-up message or proposal draft.');
  const [contactSyncStatus, setContactSyncStatus] = usePersistentState<Record<string, string>>('nova_work_google_contact_sync_status_v1', {});
  const [trustedContactCreation, setTrustedContactCreation] = usePersistentState<boolean>('nova_work_trusted_contact_creation_v1', false);
  const [outreachDrafts, setOutreachDrafts] = usePersistentState<OutreachEmailDraft[]>('nova_work_outreach_drafts_v1', outreachSeedDrafts);
  const [outreachSequences, setOutreachSequences] = usePersistentState<FollowUpSequence[]>('nova_work_outreach_sequences_v1', outreachSeedSequences);
  const [outreachCampaigns] = usePersistentState<OutreachCampaign[]>('nova_work_outreach_campaigns_v1', outreachSeedCampaigns);
  const [outreachTimeline, setOutreachTimeline] = usePersistentState<EmailTimelineEvent[]>('nova_work_outreach_timeline_v1', outreachSeedTimeline);
  const [selectedOutreachLeadId, setSelectedOutreachLeadId] = usePersistentState<string>('nova_work_outreach_selected_lead_v1', crmSeedLeads[0]?.id || '', 'session');
  const [selectedDraftId, setSelectedDraftId] = usePersistentState<string>('nova_work_outreach_selected_draft_v1', outreachSeedDrafts[0]?.id || '', 'session');
  const [emailPreview, setEmailPreview] = useState('Draft-first mode is active. Generate or select an email to preview it here before any approval step.');
  const [outreachDraftKind, setOutreachDraftKind] = usePersistentState<OutreachDraftKind>('nova_work_outreach_draft_kind_v1', 'follow_up_1', 'session');
  const [outreachLanguage, setOutreachLanguage] = usePersistentState<'English' | 'Arabic' | 'Mixed'>('nova_work_outreach_language_v1', 'English', 'session');
  const [outreachBackendStatus, setOutreachBackendStatus] = useState('Approval-first Gmail outreach ready.');
  const [savedGmailDraftId, setSavedGmailDraftId] = useState('');
  const [sendApprovalId, setSendApprovalId] = useState('');
  const [writingInput, setWritingInput] = useState<WritingAssistantInput>(() => crmSeedLeads[0] ? writingInputFromLead(crmSeedLeads[0]) : emptyWritingInput);
  const [writingOutput, setWritingOutput] = useState<WritingAssistantOutput>(() => crmSeedLeads[0] ? generateWritingAssistantMessage(writingInputFromLead(crmSeedLeads[0])) : emptyWritingOutput);
  const [contentPlannerItems, setContentPlannerItems] = usePersistentState<ContentItem[]>('nova_work_content_items_v1', contentSeedItems);
  const [contentPlatformFilter, setContentPlatformFilter] = usePersistentState<ContentPlatform | 'All'>('nova_work_content_platform_filter_v1', 'All', 'session');
  const [contentStatusFilter, setContentStatusFilter] = usePersistentState<ContentStatus | 'All'>('nova_work_content_status_filter_v1', 'All', 'session');
  const [contentViewMode, setContentViewMode] = usePersistentState<ContentViewMode>('nova_work_content_view_v1', 'calendar', 'session');
  const [contentLanguage, setContentLanguage] = usePersistentState<'Arabic' | 'English' | 'Mixed'>('nova_work_content_language_v1', 'English', 'session');
  const [contentDraft, setContentDraft] = useState<ContentDraftInput>(emptyContentDraft);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [contentInsight, setContentInsight] = useState('Select a content item to generate hooks, captions, CTA, and schedule guidance.');
  const [workIntegrationStatuses] = usePersistentState<Record<string, string>>('nova_work_integration_statuses_v1', {});
  const [portfolioProjects, setPortfolioProjects] = usePersistentState<PortfolioProject[]>('nova_work_portfolio_projects_v1', portfolioSeedProjects);
  const [selectedPortfolioProjectId, setSelectedPortfolioProjectId] = usePersistentState<string>('nova_work_portfolio_selected_v1', portfolioSeedProjects[0]?.id || '', 'session');
  const [portfolioDraft, setPortfolioDraft] = useState<PortfolioProjectDraft>(emptyPortfolioDraft);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [portfolioBestForFilter, setPortfolioBestForFilter] = usePersistentState<PortfolioBestFor | 'all'>('nova_work_portfolio_best_for_filter_v1', 'all', 'session');
  const [portfolioStatusFilter, setPortfolioStatusFilter] = usePersistentState<PortfolioBusinessStatus | 'all'>('nova_work_portfolio_status_filter_v1', 'all', 'session');
  const [generatedPortfolioCopy, setGeneratedPortfolioCopy] = useState('Select a portfolio project and generate platform-specific copy.');
  const [upworkJobs, setUpworkJobs] = usePersistentState<UpworkJob[]>('nova_work_upwork_jobs_v1', upworkSeedJobs);
  const [upworkDrafts, setUpworkDrafts] = usePersistentState<UpworkProposalDraft[]>('nova_work_upwork_drafts_v1', upworkSeedDrafts);
  const [upworkConversations] = usePersistentState<UpworkConversationSummary[]>('nova_work_upwork_conversations_v1', upworkSeedConversations);
  const [upworkMetrics] = usePersistentState<UpworkPerformanceMetric[]>('nova_work_upwork_metrics_v1', upworkSeedMetrics);
  const [selectedUpworkJobId, setSelectedUpworkJobId] = usePersistentState<string>('nova_work_upwork_selected_job_v1', upworkSeedJobs[0]?.id || '', 'session');
  const [jobOpportunities, setJobOpportunities] = usePersistentState<JobOpportunity[]>('nova_work_job_radar_opportunities_v1', jobSeedOpportunities);
  const [applicationDrafts, setApplicationDrafts] = usePersistentState<ApplicationDraft[]>('nova_work_job_application_drafts_v1', jobSeedDrafts);
  const [applicationActivities, setApplicationActivities] = usePersistentState<ApplicationActivity[]>('nova_work_job_application_activities_v1', jobSeedActivities);
  const [selectedJobId, setSelectedJobId] = usePersistentState<string>('nova_work_job_radar_selected_v1', jobSeedOpportunities[0]?.id || '', 'session');
  const [jobViewMode, setJobViewMode] = usePersistentState<JobRadarViewMode>('nova_work_job_radar_view_v1', 'board', 'session');
  const [jobPlatformFilter, setJobPlatformFilter] = usePersistentState<JobPlatform | 'All'>('nova_work_job_platform_filter_v1', 'All', 'session');
  const [jobStatusFilter, setJobStatusFilter] = usePersistentState<JobStatus | 'All'>('nova_work_job_status_filter_v1', 'All', 'session');
  const [jobModeFilter, setJobModeFilter] = usePersistentState<JobWorkMode | 'All'>('nova_work_job_mode_filter_v1', 'All', 'session');
  const [applicationDraftType, setApplicationDraftType] = usePersistentState<ApplicationDraftType>('nova_work_job_draft_type_v1', 'cover_letter', 'session');
  const [jobImportDraft, setJobImportDraft] = useState({
    title: '',
    company: '',
    platform: 'Custom URL' as JobPlatform,
    url: '',
    requirements: '',
    notes: ''
  });
  const [telegramCommandInput, setTelegramCommandInput] = useState('ضيف lead جديد اسمه أحمد من Instagram مهتم بـ logo animation');
  const [telegramSimulation, setTelegramSimulation] = useState<TelegramCommandSimulation>(() => simulateTelegramCommand('ضيف lead جديد اسمه أحمد من Instagram مهتم بـ logo animation'));
  const [socialAccounts, setSocialAccounts] = usePersistentState<SocialAccountUi[]>('nova_work_social_accounts_v1', socialSeedAccounts);
  const [socialPosts, setSocialPosts] = usePersistentState<SocialPostUi[]>('nova_work_social_posts_v1', socialSeedPosts);
  const [socialComments, setSocialComments] = usePersistentState<SocialCommentUi[]>('nova_work_social_comments_v1', socialSeedComments);
  const [suggestedReplies, setSuggestedReplies] = usePersistentState<SuggestedReplyUi[]>('nova_work_social_replies_v1', []);
  const [socialPlatformFilter, setSocialPlatformFilter] = usePersistentState<SocialPlatform | 'all'>('nova_work_social_platform_filter_v1', 'all', 'session');
  const [socialPostFilter, setSocialPostFilter] = usePersistentState<string>('nova_work_social_post_filter_v1', 'all', 'session');
  const [socialTone, setSocialTone] = usePersistentState<SocialTone>('nova_work_social_tone_v1', 'professional', 'session');
  const [selectedSocialCommentId, setSelectedSocialCommentId] = usePersistentState<string>('nova_work_social_selected_comment_v1', socialSeedComments[0]?.id || '', 'session');
  const [trustedAutoReply, setTrustedAutoReply] = usePersistentState<boolean>('nova_work_social_trusted_auto_reply_v1', false);
  const [socialStatus, setSocialStatus] = useState('Manual mode ready. Official APIs only; no scraping.');
  const [approvalItems, setApprovalItems] = usePersistentState<ApprovalItem[]>('nova_work_approval_items_v1', approvalSeedItems);
  const [automationHistory, setAutomationHistory] = usePersistentState<AutomationHistoryItem[]>('nova_work_automation_history_v1', automationHistorySeedItems);
  const active = workModules.find(module => module.id === activeModule) || workModules[0];
  const normalizedGlobalSearch = normalizeSearch(globalSearch);

  const pipelineTotal = useMemo(() => overviewLeads.reduce((sum, lead) => sum + lead.value, 0), []);
  const selectedOutreachLead = crmLeads.find(lead => lead.id === selectedOutreachLeadId) || crmLeads[0];
  const selectedDraft = outreachDrafts.find(draft => draft.id === selectedDraftId) || outreachDrafts[0];
  const selectedLeadTimeline = outreachTimeline.filter(event => event.leadId === selectedOutreachLead?.id);
  const filteredContentItems = useMemo(() => contentPlannerItems.filter(item => {
    const platformMatch = contentPlatformFilter === 'All' || item.platform === contentPlatformFilter;
    const statusMatch = contentStatusFilter === 'All' || item.status === contentStatusFilter;
    const searchMatch = matchesSearch(normalizedGlobalSearch, [item.title, item.caption, item.platform, item.contentType, item.relatedProject, item.cta, item.aiNotes, ...item.hashtags]);
    return platformMatch && statusMatch && searchMatch && contentMatchesQuickFilter(item, quickFilter);
  }), [contentPlannerItems, contentPlatformFilter, contentStatusFilter, normalizedGlobalSearch, quickFilter]);
  const filteredCrmLeads = useMemo(() => {
    const normalizedQuery = normalizeSearch(leadQuery);
    return crmLeads.filter(lead => {
      const localSearchMatch = matchesSearch(normalizedQuery, [lead.name, lead.email, lead.platform, lead.phoneOrHandle, lead.serviceInterest, lead.notes]);
      const globalSearchMatch = matchesSearch(normalizedGlobalSearch, [lead.name, lead.email, lead.platform, lead.phoneOrHandle, lead.serviceInterest, lead.notes, lead.nextBestAction, lead.aiSummary, ...lead.tags]);
      const platformMatch = platformFilter === 'All' || lead.platform === platformFilter;
      const statusMatch = statusFilter === 'All' || lead.status === statusFilter;
      const serviceMatch = serviceFilter === 'All' || lead.serviceInterest === serviceFilter;
      const tempMatch = temperatureFilter === 'All' || lead.temperature === temperatureFilter;
      return localSearchMatch && globalSearchMatch && platformMatch && statusMatch && serviceMatch && tempMatch && leadMatchesQuickFilter(lead, quickFilter);
    });
  }, [crmLeads, leadQuery, normalizedGlobalSearch, platformFilter, quickFilter, serviceFilter, statusFilter, temperatureFilter]);
  const visiblePortfolioProjects = useMemo(() => portfolioProjects.filter(project => {
    const searchMatch = matchesSearch(normalizedGlobalSearch, [
      project.title || project.projectTitle,
      project.client || project.clientName,
      project.industry,
      project.category,
      project.description,
      project.problem,
      project.solution,
      project.caseStudyText,
      project.status,
      ...project.tags,
      ...project.toolsUsed,
      ...(project.deliverables || project.servicesProvided),
      ...(project.links || project.finalLinks),
      ...(project.bestFor || []),
      ...project.resultsMetrics
    ]);
    const bestForMatch = portfolioMatchesBestFor(project, portfolioBestForFilter);
    const statusMatch = portfolioStatusFilter === 'all' || (project.status || 'draft') === portfolioStatusFilter;
    return searchMatch && bestForMatch && statusMatch;
  }), [normalizedGlobalSearch, portfolioBestForFilter, portfolioProjects, portfolioStatusFilter]);
  const visibleUpworkJobs = useMemo(() => upworkJobs.filter(job => {
    const searchMatch = matchesSearch(normalizedGlobalSearch, [job.jobTitle, job.clientCountry, job.budget, job.projectType, job.descriptionSummary, job.aiFitAnalysis, job.suggestedProposalAngle, job.status]);
    return searchMatch && upworkMatchesQuickFilter(job, quickFilter);
  }), [normalizedGlobalSearch, quickFilter, upworkJobs]);
  const visibleJobOpportunities = useMemo(() => jobOpportunities.filter(job => {
    const platformMatch = jobPlatformFilter === 'All' || job.platform === jobPlatformFilter;
    const statusMatch = jobStatusFilter === 'All' || job.status === jobStatusFilter;
    const modeMatch = jobModeFilter === 'All' || job.workMode === jobModeFilter;
    const searchMatch = matchesSearch(normalizedGlobalSearch, [
      job.title,
      job.company,
      job.location,
      job.platform,
      job.url,
      job.salary,
      job.notes,
      ...job.requirements,
      ...job.recommendedPortfolio
    ]);
    return platformMatch && statusMatch && modeMatch && searchMatch;
  }), [jobModeFilter, jobOpportunities, jobPlatformFilter, jobStatusFilter, normalizedGlobalSearch]);
  const visibleOutreachDrafts = useMemo(() => outreachDrafts.filter(draft => {
    const searchMatch = matchesSearch(normalizedGlobalSearch, [draft.subject, draft.body, draft.to, draft.status, draft.purpose]);
    return searchMatch && draftMatchesQuickFilter(draft, quickFilter);
  }), [normalizedGlobalSearch, outreachDrafts, quickFilter]);
  const visibleApprovalItems = useMemo(() => approvalItems.filter(item => {
    const searchMatch = matchesSearch(normalizedGlobalSearch, [item.actionType, item.target, item.contentPreview, item.reasonApprovalRequired, item.status, item.riskLevel]);
    return searchMatch && approvalMatchesQuickFilter(item, quickFilter);
  }), [approvalItems, normalizedGlobalSearch, quickFilter]);
  const visibleSocialComments = useMemo(() => socialComments.filter(comment => {
    const platformMatch = socialPlatformFilter === 'all' || comment.platform === socialPlatformFilter;
    const postMatch = socialPostFilter === 'all' || comment.postId === socialPostFilter;
    const searchMatch = matchesSearch(normalizedGlobalSearch, [comment.authorName, comment.authorHandle, comment.text, comment.platform, comment.status, ...comment.riskFlags]);
    return platformMatch && postMatch && searchMatch && ['unread', 'unreplied', 'drafted', 'pending_approval'].includes(comment.status);
  }), [normalizedGlobalSearch, socialComments, socialPlatformFilter, socialPostFilter]);
  const displayedLead = filteredCrmLeads.find(lead => lead.id === selectedLeadId) || filteredCrmLeads[0];
  const selectedSocialComment = visibleSocialComments.find(comment => comment.id === selectedSocialCommentId) || visibleSocialComments[0];
  const selectedSuggestedReply = suggestedReplies.find(reply => reply.commentId === selectedSocialComment?.id && reply.status !== 'rejected');
  const selectedContentItem = filteredContentItems[0];
  const displayedPortfolioProject = visiblePortfolioProjects.find(project => project.id === selectedPortfolioProjectId) || visiblePortfolioProjects[0];
  const displayedUpworkJob = visibleUpworkJobs.find(job => job.id === selectedUpworkJobId) || visibleUpworkJobs[0];
  const displayedJob = visibleJobOpportunities.find(job => job.id === selectedJobId) || visibleJobOpportunities[0] || jobOpportunities[0];
  const selectedJobDrafts = applicationDrafts.filter(draft => draft.jobId === displayedJob?.id);
  const selectedJobActivities = applicationActivities.filter(activity => activity.jobId === displayedJob?.id);
  const contentScheduleSuggestions = suggestPostingSchedule(filteredContentItems);
  const contentIntegrationSummary = [
    { id: 'instagram', label: 'Instagram', status: workIntegrationStatuses.instagram || 'not_connected' },
    { id: 'linkedin', label: 'LinkedIn', status: workIntegrationStatuses.linkedin || 'not_connected' },
    { id: 'youtube', label: 'YouTube', status: workIntegrationStatuses.youtube || 'not_connected' },
    { id: 'behance', label: 'Behance', status: workIntegrationStatuses.behance || 'not_connected' },
    { id: 'dribbble', label: 'Dribbble', status: workIntegrationStatuses.dribbble || 'not_connected' },
    { id: 'pinterest', label: 'Pinterest', status: workIntegrationStatuses.pinterest || 'not_connected' }
  ];
  const displayedTelegramInput = telegramCommandInput.includes('Ø') ? telegramSampleCommand : telegramCommandInput;
  const displayedTelegramSimulation = telegramCommandInput.includes('Ø') ? simulateTelegramCommand(telegramSampleCommand) : telegramSimulation;

  useEffect(() => {
    if (telegramCommandInput.includes('Ø')) {
      const timeoutId = window.setTimeout(() => {
        setTelegramCommandInput(telegramSampleCommand);
        setTelegramSimulation(simulateTelegramCommand(telegramSampleCommand));
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [telegramCommandInput]);

  useEffect(() => {
    let cancelled = false;
    setCrmLeadsLoading(true);
    cloudRunClient.getCrmLeads()
      .then(result => {
        if (cancelled || !Array.isArray(result.leads)) return;
        const loaded = result.leads.map((lead: Record<string, unknown>) => backendLeadToUiLead(lead));
        if (loaded.length) {
          setCrmLeads(loaded);
          setSelectedLeadId(current => loaded.some((lead: CrmLead) => lead.id === current) ? current : loaded[0].id);
          setCrmBackendStatus(`Loaded ${loaded.length} leads from CRM repository`);
        } else {
          setCrmBackendStatus('CRM repository connected; using local leads until backend has records');
        }
      })
      .catch(() => {
        if (!cancelled) setCrmBackendStatus('Backend unavailable; using local CRM fallback');
      })
      .finally(() => {
        if (!cancelled) setCrmLeadsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setCrmLeads, setSelectedLeadId]);

  const loadDeals = useCallback(() => {
    let cancelled = false;
    setLoadingDeals(true);
    cloudRunClient.getDeals()
      .then(result => {
        if (cancelled) return;
        if (Array.isArray(result.deals)) {
          setDealsList(result.deals as unknown as DealDetails[]);
        }
      })
      .catch(err => {
        if (!cancelled) console.error('Failed to load deals', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingDeals(false);
      });
    return () => { cancelled = true; };
  }, [setDealsList]);

  useEffect(() => {
    const cancel = loadDeals();
    return cancel;
  }, [loadDeals]);

  const openNewDealModal = () => {
    setEditingDealId(null);
    setDealDraft({
      clientName: '',
      serviceDeliverable: '',
      styleFormat: '',
      agreedPrice: 0,
      depositPaid: 0,
      paymentStatus: 'Pending',
      deliveryDate: '',
      revisionsUsed: '',
      contractSigned: false,
      notes: ''
    });
    setDealModalOpen(true);
  };

  const openEditDealModal = (deal: DealDetails) => {
    setEditingDealId(deal.id);
    setDealDraft({
      clientName: deal.clientName || '',
      serviceDeliverable: deal.serviceDeliverable || '',
      styleFormat: deal.styleFormat || '',
      agreedPrice: Number(deal.agreedPrice || 0),
      depositPaid: Number(deal.depositPaid || 0),
      paymentStatus: deal.paymentStatus || 'Pending',
      deliveryDate: deal.deliveryDate || '',
      revisionsUsed: String(deal.revisionsUsed || ''),
      contractSigned: Boolean(deal.contractSigned),
      notes: deal.notes || ''
    });
    setDealModalOpen(true);
  };

  const saveDealForm = async (event: React.FormEvent) => {
    event.preventDefault();
    const balanceDue = Math.max(0, dealDraft.agreedPrice - dealDraft.depositPaid);
    const payload = {
      ...dealDraft,
      balanceDue
    };

    if (editingDealId) {
      setDealsList(prev => prev.map(deal => deal.id === editingDealId ? { ...deal, ...payload } : deal));
      try {
        await cloudRunClient.updateDeal(editingDealId, payload);
      } catch (err) {
        console.error('Failed to update deal on backend', err);
      }
    } else {
      const tempId = `deal-temp-${Date.now()}`;
      const tempDeal = { id: tempId, ...payload, balanceDue };
      setDealsList(prev => [tempDeal, ...prev]);
      try {
        const result = await cloudRunClient.createDeal(payload);
        if (result.deal) {
          setDealsList(prev => prev.map(deal => deal.id === tempId ? (result.deal as unknown as DealDetails) : deal));
        }
      } catch (err) {
        console.error('Failed to create deal on backend', err);
      }
    }
    setDealModalOpen(false);
  };

  const deleteDealItem = async (dealId: string) => {
    if (!window.confirm('Are you sure you want to delete this deal?')) return;
    setDealsList(prev => prev.filter(deal => deal.id !== dealId));
    try {
      await cloudRunClient.deleteDeal(dealId);
    } catch (err) {
      console.error('Failed to delete deal from backend', err);
    }
  };

  const handleImportGoogleContacts = async () => {
    setImportingContacts(true);
    setCrmBackendStatus('Syncing Google Contacts labeled as Clients...');
    try {
      const result = await cloudRunClient.importGoogleClientsToCrm();
      setCrmBackendStatus(`Sync complete. Labeled contacts imported: ${result.imported || 0}.`);
      const leadsResult = await cloudRunClient.getCrmLeads();
      if (Array.isArray(leadsResult.leads)) {
        const loaded = leadsResult.leads.map((lead: Record<string, unknown>) => backendLeadToUiLead(lead));
        if (loaded.length) setCrmLeads(loaded);
      }
    } catch (error) {
      const normalized = normalizeApiError(error);
      setCrmBackendStatus(`Sync failed: ${normalized.message}`);
    } finally {
      setImportingContacts(false);
    }
  };

  const activeResultCount = {
    crm: filteredCrmLeads.length,
    deals: dealsList.length,
    outreach: visibleOutreachDrafts.length,
    content: filteredContentItems.length,
    portfolio: visiblePortfolioProjects.length,
    upwork: visibleUpworkJobs.length,
    jobs: visibleJobOpportunities.length,
    social: visibleSocialComments.length,
    logs: visibleApprovalItems.length,
    overview: overviewLeads.length,
    reports: reportMetricCards.length,
    telegram: telegramCommandExamples.length,
    settings: integrations.length
  }[activeModule];

  const hotLeadCount = crmLeads.filter(lead => lead.temperature === 'Hot' || lead.status === 'Hot').length;
  const followUpsDue = getLeadsForFollowUp(crmLeads, `${WORK_TODAY}T23:59:59.000Z`).length;

  const openNewLeadModal = () => {
    setEditingLeadId(null);
    setLeadDraft(emptyLeadDraft);
    setLeadModalOpen(true);
  };

  const openEditLeadModal = (lead: CrmLead) => {
    setEditingLeadId(lead.id);
    setLeadDraft({
      name: lead.name,
      platform: lead.platform,
      email: lead.email,
      phoneOrHandle: lead.phoneOrHandle,
      status: lead.status as LeadStatus,
      stage: lead.stage || stageFromStatus(lead.status),
      serviceInterest: lead.serviceInterest,
      budgetRange: lead.budgetRange,
      lastContactedAt: lead.lastContactedAt || WORK_TODAY,
      nextFollowUpAt: lead.nextFollowUpAt || '2026-06-13',
      notes: lead.notes,
      aiScore: lead.aiScore,
      nextBestAction: lead.nextBestAction,
      temperature: lead.temperature
    });
    setLeadModalOpen(true);
  };

  const saveLead = async (event: React.FormEvent) => {
    event.preventDefault();
    const scoredDraft = {
      ...leadDraft,
      status: leadDraft.status,
      stage: leadDraft.stage || stageFromStatus(leadDraft.status),
      aiScore: scoreLeadWithAI(leadDraft),
      aiSummary: crmLeadSuggestion(leadDraft),
      nextBestAction: leadDraft.nextBestAction || generateNextBestAction(leadDraft)
    };
    if (editingLeadId) {
      setCrmLeads(current => updateLead(current, editingLeadId, scoredDraft));
      setSelectedLeadId(editingLeadId);
      cloudRunClient.updateCrmLead(editingLeadId, uiLeadToBackendLead({ id: editingLeadId, ...scoredDraft }))
        .then(() => setCrmBackendStatus('Saved lead to CRM repository'))
        .catch(() => setCrmBackendStatus('Saved locally; backend update unavailable'));
    } else {
      const newLead = createLead({
        ...scoredDraft,
        status: scoredDraft.status,
        source: 'manual',
        consentStatus: 'unknown',
        preferredChannel: leadDraft.platform === 'WhatsApp' ? 'whatsapp' : leadDraft.platform === 'Instagram' ? 'instagram' : 'email',
        aiScore: scoredDraft.aiScore,
        aiSummary: scoredDraft.aiSummary
      });
      setCrmLeads(current => [newLead, ...current]);
      setSelectedLeadId(newLead.id);
      try {
        const result = await cloudRunClient.createCrmLead(uiLeadToBackendLead(newLead));
        if (result.lead) {
          const backendLead = backendLeadToUiLead(result.lead);
          setCrmLeads(current => current.map(lead => lead.id === newLead.id ? backendLead : lead));
          setSelectedLeadId(backendLead.id);
        }
        setCrmBackendStatus('Created lead in CRM repository');
      } catch {
        setCrmBackendStatus('Created locally; backend create unavailable');
      }
    }
    setLeadModalOpen(false);
  };

  const createQuickLead = async (event: React.FormEvent) => {
    event.preventDefault();
    const draft: LeadDraft = {
      ...emptyLeadDraft,
      name: quickLeadDraft.name,
      platform: quickLeadDraft.source,
      email: quickLeadDraft.email,
      notes: quickLeadDraft.need,
      serviceInterest: quickLeadDraft.need.toLowerCase().includes('logo') ? 'Logo Animation' : 'Motion Design',
      aiScore: 60,
      nextBestAction: 'Qualify budget, deadline, and decision owner.'
    };
    const newLead = createLead({
      ...draft,
      source: 'manual',
      consentStatus: 'unknown',
      preferredChannel: draft.platform === 'Instagram' ? 'instagram' : draft.platform === 'Upwork' ? 'upwork' : 'email',
      aiScore: scoreLeadWithAI(draft),
      aiSummary: crmLeadSuggestion(draft)
    });
    setCrmLeads(current => [newLead, ...current]);
    setSelectedLeadId(newLead.id);
    setQuickLeadModalOpen(false);
    setQuickLeadDraft({ name: '', source: 'Instagram', email: '', need: '' });
    try {
      const result = await cloudRunClient.createCrmLead(uiLeadToBackendLead(newLead));
      if (result.lead) {
        const backendLead = backendLeadToUiLead(result.lead);
        setCrmLeads(current => current.map(lead => lead.id === newLead.id ? backendLead : lead));
        setSelectedLeadId(backendLead.id);
      }
      setCrmBackendStatus('Quick lead saved to CRM repository');
    } catch {
      setCrmBackendStatus('Quick lead saved locally; backend unavailable');
    }
  };

  const deleteLead = (leadId: string) => {
    setCrmLeads(current => {
      const next = current.filter(lead => lead.id !== leadId);
      if (selectedLeadId === leadId) {
        setSelectedLeadId(next[0]?.id || '');
      }
      return next;
    });
    cloudRunClient.deleteCrmLead(leadId)
      .then(() => setCrmBackendStatus('Archived lead in CRM repository'))
      .catch(() => setCrmBackendStatus('Archived locally; backend delete unavailable'));
  };

  const patchLead = (leadId: string, updates: Partial<CrmLead>) => {
    setCrmLeads(current => current.map(lead => lead.id === leadId ? { ...lead, ...updates } : lead));
    const existing = crmLeads.find(lead => lead.id === leadId);
    if (existing) {
      const next = { ...existing, ...updates };
      cloudRunClient.updateCrmLead(leadId, uiLeadToBackendLead(next))
        .then(() => setCrmBackendStatus('Synced lead update to CRM repository'))
        .catch(() => setCrmBackendStatus('Updated locally; backend unavailable'));
    }
  };

  const scheduleFollowUp = (lead: CrmLead) => {
    const nextDate = new Date(WORK_TODAY);
    nextDate.setDate(nextDate.getDate() + 2);
    patchLead(lead.id, { nextFollowUpAt: nextDate.toISOString().split('T')[0], nextBestAction: 'Follow up in two days with a direct call-to-action.' });
  };

  const changeLeadStage = (lead: CrmLead, stage: LeadStage) => {
    patchLead(lead.id, {
      stage,
      status: statusFromStage(stage),
      nextBestAction: stage === 'proposal'
        ? 'Draft a proposal with scope, timeline, deliverables, and two package options.'
        : generateNextBestAction({
          aiScore: lead.aiScore,
          temperature: lead.temperature,
          serviceInterest: lead.serviceInterest,
          platform: lead.platform
        })
    });
  };

  const addLeadNote = (lead: CrmLead) => {
    const summary = leadNoteDraft.trim();
    if (!summary) return;
    setCrmLeads(current => logInteraction(current, lead.id, {
      type: 'note',
      occurredAt: new Date().toISOString(),
      summary,
      channel: lead.preferredChannel,
      actor: 'user'
    }));
    patchLead(lead.id, { notes: [lead.notes, summary].filter(Boolean).join('\n') });
    setLeadNoteDraft('');
  };

  const addLeadActivity = (lead: CrmLead) => {
    const summary = leadActivityDraft.summary.trim();
    if (!summary) return;
    setCrmLeads(current => logInteraction(current, lead.id, {
      type: leadActivityDraft.type,
      occurredAt: new Date().toISOString(),
      summary,
      channel: lead.preferredChannel,
      actor: 'user'
    }));
    setLeadActivityDraft({ type: 'note', summary: '' });
  };

  const refreshLeadAi = (lead: CrmLead) => {
    const aiScore = scoreLeadWithAI(lead);
    const nextBestAction = generateNextBestAction({ ...lead, aiScore });
    patchLead(lead.id, {
      aiScore,
      temperature: aiScore >= 82 ? 'Hot' : aiScore >= 60 ? 'Warm' : 'Cold',
      aiSummary: relationshipSummary({ ...lead, aiScore }),
      nextBestAction
    });
    setGeneratedCrmText(`AI relationship summary: ${relationshipSummary({ ...lead, aiScore })}\n\nSuggested next action: ${nextBestAction}`);
  };

  const generateLeadDraft = (lead: CrmLead) => {
    const draft = generateEmailDraftForLead(lead);
    persistOutreachDraft(draft, 'CRM lead outreach draft generated');
    setSelectedOutreachLeadId(lead.id);
    setGeneratedCrmText(`${draft.subject}\n\n${draft.body}`);
  };


  const promoteLeadToContact = async (lead: CrmLead) => {
    setContactSyncStatus(current => ({ ...current, [lead.id]: 'Checking Google Contacts...' }));
    try {
      const duplicate = crmLeads.find(item =>
        item.id !== lead.id &&
        ((lead.email && item.email && item.email.toLowerCase() === lead.email.toLowerCase()) ||
          (lead.phoneOrHandle && item.phoneOrHandle && item.phoneOrHandle === lead.phoneOrHandle))
      );
      if (duplicate && !window.confirm(`Possible duplicate CRM record: ${duplicate.name}. Continue with Google Contact promotion?`)) {
        setContactSyncStatus(current => ({ ...current, [lead.id]: 'Promotion cancelled after duplicate warning.' }));
        return;
      }

      const result = await cloudRunClient.promoteCrmLeadToContact(lead.id, { trusted: trustedContactCreation });
      if (result.status === 'pending_approval') {
        setContactSyncStatus(current => ({ ...current, [lead.id]: `Pending approval: ${result.approval?.id || 'created'}` }));
        return;
      }
      if (result.error) {
        setContactSyncStatus(current => ({ ...current, [lead.id]: result.error }));
        return;
      }

      patchLead(lead.id, {
        status: 'Client',
        platform: 'Google Contacts',
        sourceId: result.resourceName,
        notes: [lead.notes, result.duplicateWarning, result.result].filter(Boolean).join('\n')
      } as Partial<CrmLead>);
      setContactSyncStatus(current => ({ ...current, [lead.id]: result.duplicateWarning || `Synced: ${result.resourceName}` }));
    } catch (error) {
      setContactSyncStatus(current => ({ ...current, [lead.id]: (error as Error).message }));
    }
  };

  const persistOutreachDraft = (draft: OutreachEmailDraft, title = 'Draft saved') => {
    setOutreachDrafts(current => saveDraft(current, draft));
    setSelectedDraftId(draft.id);
    setEmailPreview(`${draft.subject}\n\n${draft.body}`);
    setOutreachTimeline(current => [createTimelineEvent(draft, title), ...current]);
  };

  const handleGenerateDraft = () => {
    if (!selectedOutreachLead) return;
    persistOutreachDraft(generateEmailDraftForLead(selectedOutreachLead), 'Follow-up draft generated');
  };

  const backendDraftToUiDraft = (draft: Record<string, unknown>, lead: CrmLead): OutreachEmailDraft => ({
    id: String(draft.id || `draft-${Date.now()}`),
    leadId: lead.id,
    to: String(draft.to || lead.email),
    subject: String(draft.subject || 'Outreach draft'),
    body: String(draft.body || ''),
    purpose: outreachDraftKind === 'cold_outreach'
      ? 'cold_outreach'
      : outreachDraftKind === 'portfolio_share'
        ? 'portfolio_showcase'
        : 'follow_up',
    status: 'Draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const handleGenerateBackendDraft = async () => {
    if (!selectedOutreachLead) return;
    setOutreachBackendStatus('Generating personalized outreach draft...');
    const result = await cloudRunClient.createOutreachDraft({
      leadId: selectedOutreachLead.id,
      lead: selectedOutreachLead,
      draftType: outreachDraftKind,
      preferredLanguage: outreachLanguage,
      portfolioProjects,
      previousActivity: selectedOutreachLead.interactionHistory
    });
    if (result.draft) {
      const draft = backendDraftToUiDraft(result.draft, selectedOutreachLead);
      persistOutreachDraft(draft, 'Backend outreach draft generated');
      setOutreachBackendStatus('Draft generated. Edit, save to Gmail, or request send approval.');
    } else {
      setOutreachBackendStatus(result.error || 'Could not generate outreach draft.');
    }
  };

  const handleGenerateBackendSequence = async () => {
    if (!selectedOutreachLead) return;
    setOutreachBackendStatus('Building approval-first outreach sequence...');
    const result = await cloudRunClient.createOutreachSequence({
      leadId: selectedOutreachLead.id,
      lead: selectedOutreachLead,
      preferredLanguage: outreachLanguage,
      portfolioProjects,
      previousActivity: selectedOutreachLead.interactionHistory
    });
    if (result.sequence?.drafts) {
      const steps = result.sequence.drafts.map((draft: Record<string, unknown>) => backendDraftToUiDraft(draft, selectedOutreachLead));
      setOutreachDrafts(current => [...steps, ...current]);
      setOutreachSequences(current => [{
        id: result.sequence.id || `sequence-${Date.now()}`,
        leadId: selectedOutreachLead.id,
        name: `${selectedOutreachLead.name} approval-first sequence`,
        status: 'Draft',
        steps,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, ...current]);
      setSelectedDraftId(steps[0].id);
      setEmailPreview(`${steps[0].subject}\n\n${steps[0].body}`);
      setOutreachBackendStatus('Sequence generated as editable drafts. No emails sent.');
    } else {
      setOutreachBackendStatus(result.error || 'Could not generate sequence.');
    }
  };

  const handleSaveGmailDraft = async () => {
    if (!selectedDraft) return;
    setOutreachBackendStatus('Saving Gmail draft...');
    const result = await cloudRunClient.saveGmailDraft({
      leadId: selectedDraft.leadId,
      to: selectedDraft.to,
      subject: selectedDraft.subject,
      body: selectedDraft.body
    });
    if (result.gmailDraftId) {
      setSavedGmailDraftId(result.gmailDraftId);
      setOutreachDrafts(current => current.map(draft => draft.id === selectedDraft.id ? { ...draft, gmailDraftId: result.gmailDraftId, updatedAt: new Date().toISOString() } : draft));
      setOutreachBackendStatus(`Saved Gmail draft ${result.gmailDraftId}`);
    } else {
      setOutreachBackendStatus(result.error || 'Could not save Gmail draft.');
    }
  };

  const handleRequestSendApproval = async () => {
    if (!selectedDraft) return;
    setOutreachBackendStatus('Requesting send approval...');
    const result = await cloudRunClient.sendApprovedGmail({
      leadId: selectedDraft.leadId,
      gmailDraftId: savedGmailDraftId || selectedDraft.gmailDraftId,
      to: selectedDraft.to,
      subject: selectedDraft.subject,
      body: selectedDraft.body,
      approvalId: sendApprovalId || undefined
    });
    if (result.status === 'pending_approval') {
      setSendApprovalId(result.approval?.id || '');
      setOutreachDrafts(current => current.map(draft => draft.id === selectedDraft.id ? { ...draft, status: 'Waiting Approval', updatedAt: new Date().toISOString() } : draft));
      setOutreachBackendStatus(`Send approval required: ${result.approval?.id}`);
      return;
    }
    if (result.status === 'sent') {
      setOutreachDrafts(current => current.map(draft => draft.id === selectedDraft.id ? { ...draft, status: 'Sent', sentAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : draft));
      setOutreachBackendStatus(`Approved email sent: ${result.gmailMessageId}`);
      return;
    }
    setOutreachBackendStatus(result.error || 'Could not request/send approved Gmail.');
  };

  const handleGenerateReengagement = () => {
    if (!selectedOutreachLead) return;
    persistOutreachDraft(generateReengagementMessage(selectedOutreachLead), 'Re-engagement draft generated');
  };

  const handleGeneratePortfolioEmail = () => {
    if (!selectedOutreachLead) return;
    persistOutreachDraft(generatePortfolioShowcaseEmail(selectedOutreachLead), 'Portfolio showcase draft generated');
  };

  const handleGenerateSequence = () => {
    if (!selectedOutreachLead) return;
    const sequence = generateThreeStepFollowUpSequence(selectedOutreachLead);
    setOutreachSequences(current => [sequence, ...current]);
    setOutreachDrafts(current => [...sequence.steps, ...current]);
    setSelectedDraftId(sequence.steps[0].id);
    setEmailPreview(`${sequence.steps[0].subject}\n\n${sequence.steps[0].body}`);
  };

  const handleSaveSelectedDraft = async () => {
    if (!selectedDraft) return;
    const result = await createGmailDraftPlaceholder(selectedDraft);
    setOutreachDrafts(current => current.map(draft => draft.id === selectedDraft.id ? result.draft : draft));
    setSelectedDraftId(result.draft.id);
    setOutreachTimeline(current => [createTimelineEvent(result.draft, 'Saved as Gmail draft placeholder'), ...current]);
  };

  const handleApproveDraft = () => {
    if (!selectedDraft) return;
    const approved = approveDraftForSend(selectedDraft);
    setOutreachDrafts(current => current.map(draft => draft.id === selectedDraft.id ? approved : draft));
    setOutreachTimeline(current => [createTimelineEvent(approved, 'Approved for future send'), ...current]);
  };

  const handleStopSequence = (sequenceId: string) => {
    setOutreachSequences(current => current.map(sequence => sequence.id === sequenceId ? stopSequence(sequence) : sequence));
  };

  const syncWritingInputToLead = (leadId: string) => {
    const lead = crmLeads.find(item => item.id === leadId);
    if (!lead) return;
    setSelectedOutreachLeadId(leadId);
    setWritingInput(writingInputFromLead(lead));
  };

  const handleGenerateWriting = () => {
    setWritingOutput(generateWritingAssistantMessage(writingInput));
  };

  const handleSaveWritingAsDraft = () => {
    if (!selectedOutreachLead) return;
    const draft = writingOutputToDraft(selectedOutreachLead, writingOutput);
    persistOutreachDraft(draft, 'AI writing assistant draft saved');
  };

  const handleAttachWritingToLead = () => {
    if (!selectedOutreachLead) return;
    setCrmLeads(current => logInteraction(current, selectedOutreachLead.id, {
      type: 'note',
      occurredAt: WORK_TODAY,
      summary: `AI writing assistant output attached: ${writingOutput.subjectLine}`,
      channel: selectedOutreachLead.preferredChannel,
      actor: 'ai'
    }));
    setOutreachTimeline(current => [{
      id: `timeline-writing-${Date.now()}`,
      leadId: selectedOutreachLead.id,
      occurredAt: WORK_TODAY,
      status: 'Draft',
      title: 'Writing assistant output attached',
      detail: writingOutput.subjectLine
    }, ...current]);
  };

  const handleAddContentIdea = (event: React.FormEvent) => {
    event.preventDefault();
    setContentPlannerItems(current => [createContentIdea(contentDraft), ...current]);
    setContentDraft(emptyContentDraft);
    setContentModalOpen(false);
  };

  const handleGenerateCaption = (itemId: string) => {
    setContentPlannerItems(current => current.map(item => item.id === itemId ? generateCaptionForPlatform(item) : item));
  };

  const handleGenerateHook = (itemId: string) => {
    setContentPlannerItems(current => current.map(item => item.id === itemId ? generateHookForContent(item) : item));
  };

  const handleGenerateCta = (itemId: string) => {
    setContentPlannerItems(current => current.map(item => item.id === itemId ? generateCtaForContent(item) : item));
  };

  const handleGenerateScript = (itemId: string) => {
    setContentPlannerItems(current => current.map(item => item.id === itemId ? generateScriptForContent(item) : item));
  };

  const handleTranslateCaption = (itemId: string) => {
    setContentPlannerItems(current => current.map(item => item.id === itemId ? translateContentCaption(item, contentLanguage) : item));
  };

  const handleRepurposeProject = () => {
    setContentPlannerItems(current => [...repurposeProjectIntoPosts('Neon Shift'), ...current]);
    setContentInsight('Repurposed a portfolio-style project into multi-platform content drafts.');
  };

  const handleWeeklyPlan = () => {
    setContentPlannerItems(current => [...createWeeklyContentPlan(), ...current]);
    setContentInsight('Generated a draft-first weekly schedule. Review each item before any approval step.');
  };

  const handleGenerateIdeasFromSignals = () => {
    const projectTitle = projects[0]?.title || 'Neon Shift';
    const goalTitle = goals[0]?.title || 'Build an independent creator business';
    setContentPlannerItems(current => [...generateContentIdeasFromProject(projectTitle, goalTitle), ...current]);
    setContentInsight(`Generated new content ideas from ${projectTitle} and the goal "${goalTitle}".`);
  };

  const handleApproveContent = (itemId: string) => {
    setContentPlannerItems(current => current.map(item => item.id === itemId ? approveContentForScheduling(item) : item));
    setContentInsight('Item moved to a scheduled state. Actual publishing still requires approval/manual action.');
  };

  const openPortfolioModal = (project?: PortfolioProject) => {
    if (project) {
      setEditingPortfolioId(project.id);
      setPortfolioDraft({
        ...project,
        title: project.title || project.projectTitle,
        projectTitle: project.projectTitle || project.title || '',
        client: project.client || project.clientName,
        clientName: project.clientName || project.client || '',
        deliverables: project.deliverables || project.servicesProvided,
        servicesProvided: project.servicesProvided || project.deliverables || [],
        links: project.links || project.finalLinks,
        finalLinks: project.finalLinks || project.links || [],
        thumbnailUrl: project.thumbnailUrl || project.thumbnail,
        thumbnail: project.thumbnail || project.thumbnailUrl || '',
        status: project.status || 'draft',
        bestFor: project.bestFor || ['motion design', 'freelance proof']
      });
    } else {
      setEditingPortfolioId(null);
      setPortfolioDraft(emptyPortfolioDraft);
    }
    setPortfolioModalOpen(true);
  };

  const handleAddPortfolioProject = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedDraft = {
      ...portfolioDraft,
      title: portfolioDraft.title || portfolioDraft.projectTitle,
      projectTitle: portfolioDraft.projectTitle || portfolioDraft.title || '',
      client: portfolioDraft.client || portfolioDraft.clientName,
      clientName: portfolioDraft.clientName || portfolioDraft.client || '',
      deliverables: portfolioDraft.deliverables || portfolioDraft.servicesProvided,
      servicesProvided: portfolioDraft.servicesProvided || portfolioDraft.deliverables || [],
      links: portfolioDraft.links || portfolioDraft.finalLinks,
      finalLinks: portfolioDraft.finalLinks || portfolioDraft.links || [],
      thumbnailUrl: portfolioDraft.thumbnailUrl || portfolioDraft.thumbnail,
      thumbnail: portfolioDraft.thumbnail || portfolioDraft.thumbnailUrl || ''
    };
    if (editingPortfolioId) {
      setPortfolioProjects(current => current.map(project => project.id === editingPortfolioId ? {
        ...project,
        ...normalizedDraft,
        updatedAt: new Date().toISOString()
      } : project));
      setSelectedPortfolioProjectId(editingPortfolioId);
    } else {
      const project = createPortfolioProject(normalizedDraft);
      setPortfolioProjects(current => [project, ...current]);
      setSelectedPortfolioProjectId(project.id);
    }
    setPortfolioDraft(emptyPortfolioDraft);
    setEditingPortfolioId(null);
    setPortfolioModalOpen(false);
  };

  const handleGeneratePortfolioCopy = (type: PortfolioCopyType) => {
    if (!displayedPortfolioProject) return;
    const copy = generatePortfolioCopy(displayedPortfolioProject, type);
    setGeneratedPortfolioCopy(copy);
    if (type === 'case_study') {
      setPortfolioProjects(current => current.map(project => project.id === displayedPortfolioProject.id ? { ...project, caseStudyText: copy, updatedAt: new Date().toISOString() } : project));
    }
  };

  const handlePortfolioStatus = (platform: PortfolioPlatform) => {
    if (!displayedPortfolioProject) return;
    setPortfolioProjects(current => current.map(project => project.id === displayedPortfolioProject.id ? setPortfolioPlatformStatus(project, platform, 'Waiting Approval') : project));
  };

  const handlePortfolioBusinessStatus = (projectId: string, status: PortfolioBusinessStatus) => {
    setPortfolioProjects(current => current.map(project => project.id === projectId ? { ...project, status, updatedAt: new Date().toISOString() } : project));
  };

  const handlePortfolioSalesCopy = (kind: 'pitch' | 'linkedin' | 'lead' | 'job') => {
    if (!displayedPortfolioProject) return;
    if (kind === 'pitch') setGeneratedPortfolioCopy(generatePortfolioPitch(displayedPortfolioProject));
    if (kind === 'linkedin') setGeneratedPortfolioCopy(generateLinkedInPost(displayedPortfolioProject));
    if (kind === 'lead') {
      const lead = displayedLead || crmLeads[0];
      const best = chooseBestPortfolioProjects(portfolioProjects, [lead?.serviceInterest, lead?.notes, lead?.nextBestAction].join(' '));
      setGeneratedPortfolioCopy(`Best projects for ${lead?.name || 'this lead'}:\n\n${best.map(project => `- ${project.title || project.projectTitle}: ${generatePortfolioPitch(project)}`).join('\n')}`);
    }
    if (kind === 'job') {
      const best = chooseBestPortfolioProjects(portfolioProjects, [displayedJob?.title, displayedJob?.requirements.join(' '), displayedJob?.notes].join(' '));
      setGeneratedPortfolioCopy(`Best projects for ${displayedJob?.title || 'this job'}:\n\n${best.map(project => `- ${project.title || project.projectTitle}: ${generatePortfolioLinkMessage(project, displayedJob?.title || 'this job')}`).join('\n')}`);
    }
  };

  const handleCreatePortfolioOutreachDraft = () => {
    if (!displayedPortfolioProject || !selectedOutreachLead) return;
    const body = generatePortfolioLinkMessage(displayedPortfolioProject, selectedOutreachLead.name);
    const draft: OutreachEmailDraft = {
      id: `portfolio-link-draft-${Date.now()}`,
      leadId: selectedOutreachLead.id,
      to: selectedOutreachLead.email || selectedOutreachLead.phoneOrHandle,
      subject: `Relevant portfolio example: ${displayedPortfolioProject.title || displayedPortfolioProject.projectTitle}`,
      body,
      status: 'Draft',
      purpose: 'portfolio_showcase',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    persistOutreachDraft(draft, 'Portfolio link outreach draft created');
    setPortfolioProjects(current => current.map(project => project.id === displayedPortfolioProject.id ? {
      ...project,
      linkedLeadIds: Array.from(new Set([...(project.linkedLeadIds || []), selectedOutreachLead.id])),
      linkedDraftIds: Array.from(new Set([...(project.linkedDraftIds || []), draft.id])),
      updatedAt: new Date().toISOString()
    } : project));
  };

  const patchUpworkJob = (jobId: string, update: (job: UpworkJob) => UpworkJob) => {
    setUpworkJobs(current => current.map(job => job.id === jobId ? update(job) : job));
  };

  const handleAnalyzeUpworkJob = (jobId: string) => patchUpworkJob(jobId, analyzeUpworkJob);
  const handleSaveUpworkJob = (jobId: string) => patchUpworkJob(jobId, saveUpworkJob);
  const handleSubmitUpworkJob = (jobId: string) => patchUpworkJob(jobId, markUpworkProposalSubmitted);
  const handleUpworkReminder = (jobId: string) => patchUpworkJob(jobId, job => addUpworkFollowUpReminder(job));

  const handleGenerateUpworkProposal = (job: UpworkJob) => {
    const draft = generateUpworkProposalDraft(job);
    setUpworkDrafts(current => [draft, ...current]);
    patchUpworkJob(job.id, current => ({ ...current, status: 'Drafted' }));
  };

  const patchJobOpportunity = (jobId: string, update: (job: JobOpportunity) => JobOpportunity) => {
    setJobOpportunities(current => current.map(job => job.id === jobId ? update(job) : job));
  };

  const logJobActivity = (jobId: string, type: ApplicationActivity['type'], summary: string) => {
    setApplicationActivities(current => [createApplicationActivity(jobId, type, summary), ...current]);
  };

  const handleImportJob = (event: React.FormEvent) => {
    event.preventDefault();
    if (!jobImportDraft.title.trim() || !jobImportDraft.company.trim()) return;
    const job = scoreJobMatch({
      id: `job-${Date.now()}`,
      title: jobImportDraft.title.trim(),
      company: jobImportDraft.company.trim(),
      location: 'Remote / TBD',
      workMode: 'Remote',
      platform: jobImportDraft.platform,
      url: jobImportDraft.url.trim(),
      salary: 'Not listed',
      requirements: jobImportDraft.requirements.split('\n').map(item => item.trim()).filter(Boolean),
      matchScore: 65,
      status: 'saved',
      deadline: '',
      notes: jobImportDraft.notes.trim() || 'Manual/custom URL import. Verify platform rules before applying.',
      sourceMode: jobImportDraft.platform === 'RemoteOK' || jobImportDraft.platform === 'We Work Remotely' ? 'rss' : 'manual',
      recommendedPortfolio: ['motion design reel', 'portfolio case study'],
      createdAt: WORK_TODAY,
      updatedAt: WORK_TODAY
    });
    setJobOpportunities(current => [job, ...current]);
    setSelectedJobId(job.id);
    logJobActivity(job.id, 'imported', `Imported from ${job.platform}. No scraping or auto-apply used.`);
    setJobImportDraft({ title: '', company: '', platform: 'Custom URL', url: '', requirements: '', notes: '' });
  };

  const handleScoreJob = (job: JobOpportunity) => {
    const scored = scoreJobMatch(job);
    patchJobOpportunity(job.id, () => scored);
    logJobActivity(job.id, 'matched', `Match score updated to ${scored.matchScore} based on skills, work mode, and requirements.`);
  };

  const handleSummarizeJob = (job: JobOpportunity) => {
    logJobActivity(job.id, 'requirements_summarized', summarizeJobRequirements(job));
  };

  const handleGenerateApplicationDraft = (job: JobOpportunity) => {
    const draft = generateApplicationDraft(job, applicationDraftType);
    setApplicationDrafts(current => [draft, ...current]);
    patchJobOpportunity(job.id, current => updateJobStatus(current, 'draft_ready'));
    logJobActivity(job.id, 'draft_created', `${applicationDraftTypes.find(type => type.value === applicationDraftType)?.label || applicationDraftType} created as a draft. Sending requires approval.`);
  };

  const handleJobStatus = (job: JobOpportunity, status: JobStatus) => {
    patchJobOpportunity(job.id, current => updateJobStatus(current, status));
    logJobActivity(job.id, 'status_changed', `Status moved to ${status}.`);
  };

  const handleRequestApplicationApproval = (draft: ApplicationDraft) => {
    setApplicationDrafts(current => current.map(item => item.id === draft.id ? { ...item, status: 'approval_requested' } : item));
    logJobActivity(draft.jobId, 'approval_requested', `Approval requested for ${draft.type}. No application was submitted automatically.`);
    setAutomationHistory(current => [{
      id: `job-approval-${Date.now()}`,
      timestamp: new Date().toISOString(),
      triggerSource: 'Job Radar',
      action: 'Application send approval requested',
      status: 'Waiting Approval',
      result: draft.subject
    }, ...current]);
  };

  const handleSimulateTelegramCommand = (event: React.FormEvent) => {
    event.preventDefault();
    setTelegramSimulation(simulateTelegramCommand(displayedTelegramInput));
  };

  const loadSocialInbox = async () => {
    try {
      const result = await cloudRunClient.getSocialInbox();
      setSocialAccounts(result.accounts || socialSeedAccounts);
      setSocialPosts(result.posts || socialSeedPosts);
      setSocialComments(result.comments || socialSeedComments);
      setSuggestedReplies(result.suggestedReplies || []);
      setSocialStatus(result.modeNote || 'Social Inbox loaded');
    } catch {
      setSocialStatus('Backend unavailable; manual social reply mode is active.');
    }
  };

  const suggestSocialReply = async (comment: SocialCommentUi) => {
    setSocialStatus('Generating safe reply draft...');
    const result = await cloudRunClient.suggestSocialReply(comment.id, socialTone);
    if (result.reply) {
      setSuggestedReplies(current => [result.reply, ...current.filter(reply => reply.id !== result.reply.id)]);
      setSocialComments(current => current.map(item => item.id === comment.id ? { ...item, status: 'drafted' } : item));
      setSocialStatus('Reply draft ready. Review before approval.');
    } else {
      setSocialStatus(result.error || 'Could not generate reply.');
    }
  };

  const approveSocialReply = async (reply: SuggestedReplyUi) => {
    const result = await cloudRunClient.approveSocialReply(reply.id, { body: reply.body, trustedAutoReply });
    if (result.reply) {
      setSuggestedReplies(current => current.map(item => item.id === reply.id ? result.reply : item));
      setSocialComments(current => current.map(item => item.id === reply.commentId ? { ...item, status: result.reply.status === 'handled' ? 'handled' : 'pending_approval' } : item));
      setSocialStatus(result.approval ? `Queued approval ${result.approval.id}` : (result.note || 'Reply handled.'));
    } else {
      setSocialStatus(result.error || 'Could not approve reply.');
    }
  };

  const rejectSocialReply = async (reply: SuggestedReplyUi) => {
    await cloudRunClient.rejectSocialReply(reply.id);
    setSuggestedReplies(current => current.map(item => item.id === reply.id ? { ...item, status: 'rejected' } : item));
    setSocialStatus('Reply rejected.');
  };

  const markSocialHandled = async (comment: SocialCommentUi) => {
    await cloudRunClient.markSocialCommentHandled(comment.id);
    setSocialComments(current => current.map(item => item.id === comment.id ? { ...item, status: 'handled' } : item));
    setSocialStatus('Comment marked as handled.');
  };

  const renderOverview = () => (
    <div className="work-grid">
      {renderFinanceReports()}
      <div className="work-kpi-row">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <article className="glass-panel work-kpi" key={kpi.label}>
              <div className={`work-kpi-icon ${kpi.tone}`}><Icon size={18} /></div>
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <small>{kpi.delta}</small>
            </article>
          );
        })}
      </div>

      <Panel title="Today Command Queue" icon={Zap} className="work-span-2" action={<button className="glass-btn btn-cyan"><Plus size={15} /> Add Action</button>}>
        <div className="work-action-list">
          {[
            ['High', 'Send RezBook revised timeline and retainer terms', 'Revenue'],
            ['High', 'Record 20 second intro for portfolio reel update', 'Portfolio'],
            ['Medium', 'Bid on Upwork logo animation job before it gets crowded', 'Upwork'],
            ['Medium', 'Publish kinetic type breakdown reel', 'Content']
          ].map(([priority, task, area]) => (
            <article key={task}>
              <CheckCircle2 size={16} />
              <div><strong>{task}</strong><span>{area}</span></div>
              <Badge value={priority} tone={priority === 'High' ? 'rose' : 'amber'} />
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Studio Pulse" icon={Radio}>
        <div className="work-pulse">
          <div><span>Pipeline</span><strong>{money(pipelineTotal)}</strong><small>4 active opportunities</small></div>
          <div><span>Delivery Load</span><strong>71%</strong><small>Healthy, but proposal work must stay capped</small></div>
          <div><span>Brand Surface</span><strong>6 posts</strong><small>Ready or near-ready this month</small></div>
        </div>
      </Panel>
    </div>
  );

  const renderCrm = () => {
    const followUpRows = filteredCrmLeads
      .filter(lead => lead.nextFollowUpAt)
      .sort((a, b) => String(a.nextFollowUpAt).localeCompare(String(b.nextFollowUpAt)))
      .slice(0, 8);
    const staleLeads = filteredCrmLeads.filter(isStaleLead);

    const renderLeadCard = (lead: CrmLead) => (
      <article key={lead.id} className={`work-crm-card ${displayedLead?.id === lead.id ? 'selected' : ''}`} onClick={() => setSelectedLeadId(lead.id)}>
        <div className="work-crm-card-head">
          <strong>{lead.name}</strong>
          <Badge value={lead.aiScore} tone={lead.aiScore >= 85 ? 'rose' : lead.aiScore >= 70 ? 'amber' : 'blue'} />
        </div>
        <div className="work-crm-card-meta">
          <Badge value={lead.platform} tone={sourceBadgeTones[lead.platform] || 'blue'} />
          <Badge value={lead.temperature} tone={temperatureTone(lead.temperature)} />
        </div>
        <p>{lead.serviceInterest} - {lead.budgetRange || 'Budget TBD'}</p>
        <small>{lead.nextBestAction}</small>
        {isStaleLead(lead) && <span className="work-crm-warning">Stale lead</span>}
      </article>
    );

    const board = (
      <div className="work-crm-board">
        {crmStages.map(stage => {
          const stageLeads = filteredCrmLeads.filter(lead => (lead.stage || stageFromStatus(lead.status)) === stage.id);
          return (
            <section key={stage.id} className="work-crm-stage">
              <div className="work-crm-stage-head">
                <Badge value={stage.label} tone={stage.tone} />
                <span>{stageLeads.length}</span>
              </div>
              <div className="work-crm-stage-list">
                {stageLeads.map(renderLeadCard)}
                {!stageLeads.length && <div className="work-empty-state compact"><Inbox size={16} /><span>No leads</span></div>}
              </div>
            </section>
          );
        })}
      </div>
    );

    const table = (
      <div className="work-table-wrap">
        <table className="work-table work-crm-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Source</th>
              <th>Stage</th>
              <th>Email</th>
              <th>Contact</th>
              <th>Service</th>
              <th>Budget</th>
              <th>Follow-up</th>
              <th>Score</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCrmLeads.map(lead => (
              <tr key={lead.id} className={displayedLead?.id === lead.id ? 'selected' : ''} onClick={() => setSelectedLeadId(lead.id)}>
                <td><strong>{lead.name}</strong><small>{lead.notes || relationshipSummary(lead)}</small></td>
                <td><Badge value={lead.platform} tone={sourceBadgeTones[lead.platform] || 'blue'} /></td>
                <td><Badge value={stageLabel(lead.stage || stageFromStatus(lead.status))} tone={crmStages.find(stage => stage.id === (lead.stage || stageFromStatus(lead.status)))?.tone || 'blue'} /></td>
                <td>{lead.email || '-'}</td>
                <td>{lead.phoneOrHandle || '-'}</td>
                <td>{lead.serviceInterest}</td>
                <td>{lead.budgetRange}</td>
                <td>{lead.nextFollowUpAt || '-'}</td>
                <td><Badge value={lead.aiScore} tone={lead.aiScore >= 85 ? 'rose' : lead.aiScore >= 70 ? 'amber' : 'blue'} /></td>
                <td>
                  <div className="work-row-actions">
                    <button className="glass-btn" type="button" onClick={event => { event.stopPropagation(); openEditLeadModal(lead); }} title="Edit lead"><Edit3 size={14} /></button>
                    <button className="glass-btn" type="button" onClick={event => { event.stopPropagation(); generateLeadDraft(lead); }} title="Generate outreach draft"><PenLine size={14} /></button>
                    <button className="glass-btn" type="button" onClick={event => { event.stopPropagation(); void promoteLeadToContact(lead); }} title="Promote to Google Contact"><UserPlus size={14} /></button>
                    <button className="glass-btn" type="button" onClick={event => { event.stopPropagation(); changeLeadStage(lead, 'archived'); }} title="Archive lead"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    const calendar = (
      <div className="work-crm-calendar">
        {followUpRows.map(lead => (
          <button key={lead.id} type="button" onClick={() => setSelectedLeadId(lead.id)}>
            <span>{lead.nextFollowUpAt}</span>
            <strong>{lead.name}</strong>
            <small>{lead.nextBestAction}</small>
          </button>
        ))}
        {!followUpRows.length && <div className="work-empty-state"><CalendarDays size={22} /><strong>No follow-ups scheduled</strong><span>Create a follow-up from a lead detail drawer.</span></div>}
      </div>
    );

    return (
      <div className="work-crm-pro">
        <section className="glass-panel work-panel work-crm-main">
          <div className="work-panel-head">
            <div className="work-panel-title"><Users size={18} /> CRM / Lead Management</div>
            <div className="work-crm-actions">
              <label className="work-safety-inline" title="When off, Google Contact creation is routed through backend approval first.">
                <input type="checkbox" checked={trustedContactCreation} onChange={event => setTrustedContactCreation(event.target.checked)} />
                Trusted contact creation
              </label>
              <button className="glass-btn" type="button" onClick={handleImportGoogleContacts} disabled={importingContacts}>
                <Link2 size={15} /> {importingContacts ? 'Linking...' : 'Link Google Contacts Clients'}
              </button>
              <button className="glass-btn" type="button" onClick={() => setQuickLeadModalOpen(true)}><Plus size={15} /> Quick Add</button>
              <button className="glass-btn btn-cyan" type="button" onClick={openNewLeadModal}><UserPlus size={15} /> Full Lead</button>
            </div>
          </div>

          <div className="work-crm-kpis">
            <article><strong>{crmLeads.length}</strong><span>Total leads</span></article>
            <article><strong>{hotLeadCount}</strong><span>Hot opportunities</span></article>
            <article><strong>{followUpsDue}</strong><span>Follow-ups due</span></article>
            <article><strong>{staleLeads.length}</strong><span>Stale leads</span></article>
          </div>

          <div className="work-crm-status-strip">
            <span><Plug size={14} /> {crmBackendStatus}{crmLeadsLoading ? ' (Loading...)' : ''}</span>

          </div>

          <div className="work-toolbar work-crm-toolbar">
            <label><Search size={15} /><input value={leadQuery} onChange={event => setLeadQuery(event.target.value)} placeholder="Search by name, email, source, handle..." /></label>
            <select className="glass-input" value={platformFilter} onChange={event => setPlatformFilter(event.target.value as LeadPlatform | 'All')}>
              <option>All</option>
              {platforms.map(platform => <option key={platform}>{platform}</option>)}
            </select>
            <select className="glass-input" value={statusFilter} onChange={event => setStatusFilter(event.target.value as LeadStatus | 'All')}>
              <option>All</option>
              {leadStatuses.map(status => <option key={status}>{status}</option>)}
            </select>
            <select className="glass-input" value={serviceFilter} onChange={event => setServiceFilter(event.target.value as ServiceInterest | 'All')}>
              <option>All</option>
              {serviceInterests.map(service => <option key={service}>{service}</option>)}
            </select>
            <select className="glass-input" value={temperatureFilter} onChange={event => setTemperatureFilter(event.target.value as LeadTemperature | 'All')}>
              <option>All</option>
              {leadTemperatures.map(temp => <option key={temp}>{temp}</option>)}
            </select>
          </div>

          <div className="work-crm-view-tabs">
            {(['board', 'table', 'calendar'] as CrmViewMode[]).map(view => (
              <button key={view} type="button" className={crmViewMode === view ? 'active' : ''} onClick={() => setCrmViewMode(view)}>
                {view === 'board' ? <LayoutDashboard size={15} /> : view === 'table' ? <BarChart3 size={15} /> : <CalendarDays size={15} />}
                {view}
              </button>
            ))}
          </div>

          {crmViewMode === 'board' && board}
          {crmViewMode === 'table' && table}
          {crmViewMode === 'calendar' && calendar}
        </section>

        {displayedLead ? (
          <aside className="glass-panel work-panel work-lead-detail work-crm-drawer">
            <div className="work-lead-profile">
              <div>
                <span className="badge badge-cyan">Lead detail</span>
                <h4>{displayedLead.name}</h4>
                <p>{displayedLead.platform} - {displayedLead.serviceInterest}</p>
              </div>
              <Badge value={displayedLead.aiScore} tone={displayedLead.aiScore >= 85 ? 'rose' : displayedLead.aiScore >= 70 ? 'amber' : 'blue'} />
            </div>

            <div className="work-crm-stage-picker">
              {crmStages.map(stage => (
                <button key={stage.id} type="button" className={(displayedLead.stage || stageFromStatus(displayedLead.status)) === stage.id ? 'active' : ''} onClick={() => changeLeadStage(displayedLead, stage.id)}>
                  {stage.label}
                </button>
              ))}
            </div>

            <div className="work-detail-grid">
              <div><span>Source</span><strong>{displayedLead.platform}</strong></div>
              <div><span>Stage</span><strong>{stageLabel(displayedLead.stage || stageFromStatus(displayedLead.status))}</strong></div>
              <div><span>Email</span><strong>{displayedLead.email || '-'}</strong></div>
              <div><span>Contact</span><strong>{displayedLead.phoneOrHandle || '-'}</strong></div>
              <div><span>Budget</span><strong>{displayedLead.budgetRange || 'TBD'}</strong></div>
              <div><span>Follow-up</span><strong>{displayedLead.nextFollowUpAt || 'None'}</strong></div>
            </div>

            <div className="work-ai-suggestion">
              <div><Sparkles size={15} /> AI relationship summary</div>
              <p>{relationshipSummary(displayedLead)}</p>
            </div>

            <div className="work-lead-buttons">
              <button className="glass-btn btn-cyan" onClick={() => refreshLeadAi(displayedLead)}><Sparkles size={15} /> Score & Suggest</button>
              <button className="glass-btn" onClick={() => generateLeadDraft(displayedLead)}><PenLine size={15} /> Draft Message</button>
              <button className="glass-btn" onClick={() => scheduleFollowUp(displayedLead)}><CalendarDays size={15} /> Follow-up</button>
              <button className="glass-btn" onClick={() => void promoteLeadToContact(displayedLead)}><UserPlus size={15} /> Google Contact</button>
              <button className="glass-btn" onClick={() => openEditLeadModal(displayedLead)}><Edit3 size={15} /> Edit</button>
              <button className="glass-btn" onClick={() => changeLeadStage(displayedLead, 'archived')}><Trash2 size={15} /> Archive</button>
              <button className="glass-btn" onClick={() => { if (window.confirm(`Delete ${displayedLead.name}? This removes the lead from CRM.`)) deleteLead(displayedLead.id); }}><X size={15} /> Delete</button>
            </div>

            <div className="work-data-note">
              <UserPlus size={15} />
              <span>Google Contact: {contactSyncStatus[displayedLead.id] || (displayedLead.platform === 'Google Contacts' ? 'Synced to Google Contacts' : 'Not promoted yet')}</span>
            </div>

            <div className="work-detail-section">
              <strong>Next action</strong>
              <p>{displayedLead.nextBestAction}</p>
            </div>

            <div className="work-crm-note-box">
              <label>Add note<textarea className="glass-input" value={leadNoteDraft} onChange={event => setLeadNoteDraft(event.target.value)} placeholder="Capture context, objections, brief details..." /></label>
              <button className="glass-btn" type="button" onClick={() => addLeadNote(displayedLead)}><Plus size={15} /> Add Note</button>
            </div>

            <div className="work-crm-note-box">
              <label>Activity<select className="glass-input" value={leadActivityDraft.type} onChange={event => setLeadActivityDraft({ ...leadActivityDraft, type: event.target.value as InteractionType })}>
                {['note', 'email', 'call', 'dm', 'meeting', 'proposal'].map(type => <option key={type}>{type}</option>)}
              </select></label>
              <label>Summary<input className="glass-input" value={leadActivityDraft.summary} onChange={event => setLeadActivityDraft({ ...leadActivityDraft, summary: event.target.value })} placeholder="Discovery call, DM reply, proposal sent..." /></label>
              <button className="glass-btn" type="button" onClick={() => addLeadActivity(displayedLead)}><Activity size={15} /> Add Activity</button>
            </div>

            <div className="work-detail-section">
              <strong>Timeline</strong>
              <div className="work-crm-timeline">
                {displayedLead.interactionHistory.slice(0, 5).map(item => (
                  <article key={item.id}>
                    <Badge value={item.type} tone="blue" />
                    <div><strong>{item.summary}</strong><span>{item.occurredAt}</span></div>
                  </article>
                ))}
                {!displayedLead.interactionHistory.length && <span>No activities yet.</span>}
              </div>
            </div>

            <div className="work-generated-box">
              <div><Wand2 size={15} /> Generated workspace</div>
              <p>{generatedCrmText}</p>
            </div>
          </aside>
        ) : (
          <aside className="glass-panel work-panel work-lead-detail">
            <div className="work-empty-state">
              <Inbox size={22} />
              <strong>No leads found</strong>
              <span>Adjust search or filters, or add a new lead.</span>
              <button className="glass-btn btn-cyan" type="button" onClick={() => setQuickLeadModalOpen(true)}><UserPlus size={15} /> Quick Add</button>
            </div>
          </aside>
        )}
      </div>
    );
  };

  const renderOutreach = () => (
    <div className="work-outreach-layout">
      <Panel title="Approval-First Gmail Outreach" icon={ShieldCheck} className="work-span-2">
        <div className="work-outreach-lead-picker">
          <label>Lead<select className="glass-input" value={selectedOutreachLeadId} onChange={event => syncWritingInputToLead(event.target.value)}>
            {crmLeads.map(lead => <option key={lead.id} value={lead.id}>{lead.name} - {lead.platform}</option>)}
          </select></label>
          <label>Draft type<select className="glass-input" value={outreachDraftKind} onChange={event => setOutreachDraftKind(event.target.value as OutreachDraftKind)}>
            {outreachDraftKinds.map(kind => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
          </select></label>
          <label>Language<select className="glass-input" value={outreachLanguage} onChange={event => setOutreachLanguage(event.target.value as 'English' | 'Arabic' | 'Mixed')}>
            <option>English</option>
            <option>Arabic</option>
            <option>Mixed</option>
          </select></label>
        </div>
        <div className="work-lead-buttons">
          <button className="glass-btn btn-cyan" type="button" onClick={() => void handleGenerateBackendDraft()}><Wand2 size={15} /> Generate Draft</button>
          <button className="glass-btn" type="button" onClick={() => void handleGenerateBackendSequence()}><Plus size={15} /> Build Sequence</button>
          <button className="glass-btn" type="button" onClick={() => void handleSaveGmailDraft()} disabled={!selectedDraft}><Download size={15} /> Save Gmail Draft</button>
          <button className="glass-btn" type="button" onClick={() => void handleRequestSendApproval()} disabled={!selectedDraft}><ShieldCheck size={15} /> Request Send Approval</button>
        </div>
        {sendApprovalId && (
          <label className="work-writing-full">Approval ID for approved send<input className="glass-input" value={sendApprovalId} onChange={event => setSendApprovalId(event.target.value)} /></label>
        )}
        <div className="work-data-note">
          <ShieldCheck size={15} />
          <span>{outreachBackendStatus} Creating drafts is low risk. Sending Gmail is high risk and approval-gated.</span>
        </div>
      </Panel>

      <Panel title="AI Writing Assistant" icon={Sparkles} className="work-outreach-assistant" action={<button className="glass-btn btn-cyan" onClick={handleGenerateWriting}><Wand2 size={15} /> Regenerate</button>}>
        <div className="work-writing-grid">
          <label>Lead name<input className="glass-input" value={writingInput.leadName} onChange={event => setWritingInput({ ...writingInput, leadName: event.target.value })} /></label>
          <label>Platform source<input className="glass-input" value={writingInput.platformSource} onChange={event => setWritingInput({ ...writingInput, platformSource: event.target.value })} /></label>
          <label>Service interest<input className="glass-input" value={writingInput.serviceInterest} onChange={event => setWritingInput({ ...writingInput, serviceInterest: event.target.value })} /></label>
          <label>Budget<input className="glass-input" value={writingInput.budget} onChange={event => setWritingInput({ ...writingInput, budget: event.target.value })} /></label>
          <label>Message type<select className="glass-input" value={writingInput.messageType} onChange={event => setWritingInput({ ...writingInput, messageType: event.target.value as WritingAssistantMessageType })}>{messageTypes.map(item => <option key={item}>{item}</option>)}</select></label>
          <label>Tone<select className="glass-input" value={writingInput.tone} onChange={event => setWritingInput({ ...writingInput, tone: event.target.value as WritingAssistantTone })}>{writingTones.map(item => <option key={item}>{item}</option>)}</select></label>
          <label>Language<select className="glass-input" value={writingInput.language} onChange={event => setWritingInput({ ...writingInput, language: event.target.value as WritingAssistantLanguage })}>{writingLanguages.map(item => <option key={item}>{item}</option>)}</select></label>
          <label>Goal of message<input className="glass-input" value={writingInput.goal} onChange={event => setWritingInput({ ...writingInput, goal: event.target.value })} /></label>
        </div>
        <label className="work-writing-full">Last conversation summary<textarea className="glass-input" value={writingInput.lastConversationSummary} onChange={event => setWritingInput({ ...writingInput, lastConversationSummary: event.target.value })} /></label>
        <div className="work-writing-output">
          <article><span>Subject line</span><strong>{writingOutput.subjectLine}</strong></article>
          <article className="wide"><span>Email body</span><p>{writingOutput.emailBody}</p></article>
          <article><span>Short version</span><p>{writingOutput.shortVersion}</p></article>
          <article><span>Telegram / WhatsApp</span><p>{writingOutput.manualMessage}</p></article>
          <article className="wide"><span>Suggested next step</span><p>{writingOutput.suggestedNextStep}</p></article>
        </div>
        <div className="work-writing-actions">
          <button className="glass-btn" onClick={() => setWritingOutput(makeWritingOutputShorter(writingOutput))}>Make shorter</button>
          <button className="glass-btn" onClick={() => setWritingOutput(makeWritingOutputProfessional(writingOutput))}>Make more professional</button>
          <button className="glass-btn" onClick={() => setWritingOutput(translateWritingOutput(writingOutput))}>Translate Arabic/English</button>
          <button className="glass-btn" onClick={handleSaveWritingAsDraft}>Save as draft</button>
          <button className="glass-btn btn-cyan" onClick={handleAttachWritingToLead}>Attach to lead</button>
        </div>
      </Panel>

      <Panel title="Email Drafts" icon={Mail} className="work-outreach-primary" action={<button className="glass-btn btn-cyan" onClick={handleGenerateDraft}><Wand2 size={15} /> Generate Email Draft</button>}>
        <div className="work-outreach-lead-picker">
          <label>Selected lead<select className="glass-input" value={selectedOutreachLeadId} onChange={event => syncWritingInputToLead(event.target.value)}>
            {crmLeads.map(lead => <option key={lead.id} value={lead.id}>{lead.name} - {lead.platform}</option>)}
          </select></label>
          <div className="work-draft-rule"><ShieldCheck size={15} /> Draft-first mode. Nothing sends externally without explicit approval.</div>
        </div>
        <div className="work-draft-list">
          {visibleOutreachDrafts.map(draft => (
            <button key={draft.id} className={selectedDraft?.id === draft.id ? 'active' : ''} type="button" onClick={() => { setSelectedDraftId(draft.id); setEmailPreview(`${draft.subject}\n\n${draft.body}`); }}>
              <div><strong>{draft.subject}</strong><span>{draft.to}</span></div>
              <Badge value={draft.status} tone={outreachStatusTone(draft.status)} />
            </button>
          ))}
          {!visibleOutreachDrafts.length && (
            <div className="work-empty-state compact">
              <Mail size={18} />
              <strong>No matching drafts</strong>
              <span>Generate a draft from the selected lead or clear the search filter.</span>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Preview & Approval" icon={Inbox}>
        {selectedDraft ? (
          <div className="work-form-grid">
            <label>
              Subject
              <input
                value={selectedDraft.subject}
                onChange={event => setOutreachDrafts(prev => prev.map(draft => (
                  draft.id === selectedDraft.id ? { ...draft, subject: event.target.value } : draft
                )))}
              />
            </label>
            <label className="work-form-span-2">
              Body
              <textarea
                rows={12}
                value={selectedDraft.body}
                onChange={event => setOutreachDrafts(prev => prev.map(draft => (
                  draft.id === selectedDraft.id ? { ...draft, body: event.target.value } : draft
                )))}
              />
            </label>
          </div>
        ) : (
          <div className="work-email-preview">
            <pre>{emailPreview}</pre>
          </div>
        )}
        <div className="work-lead-buttons">
          <button className="glass-btn" onClick={handleSaveSelectedDraft}><Download size={15} /> Save Draft</button>
          <button className="glass-btn btn-cyan" onClick={handleApproveDraft} disabled={!selectedDraft || selectedDraft.status === 'Sent'}><CheckCircle2 size={15} /> Mark Ready Locally</button>
        </div>
        <div className="work-data-note"><Plug size={15} /><span>Gmail drafts can be saved from here. Sending must go through backend approval.</span></div>
      </Panel>

      <Panel title="Follow-up Sequences" icon={Clock3} className="work-outreach-primary" action={<button className="glass-btn btn-cyan" onClick={handleGenerateSequence}><Plus size={15} /> Generate 3-Step Sequence</button>}>
        <div className="work-sequence-list">
          {outreachSequences.map(sequence => (
            <article key={sequence.id}>
              <div><strong>{sequence.name}</strong><span>{sequence.steps.length} draft steps</span></div>
              <Badge value={sequence.status} tone={outreachStatusTone(sequence.status)} />
              <button className="glass-btn" onClick={() => handleStopSequence(sequence.id)}><X size={14} /> Stop Sequence</button>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Cold Outreach Campaigns" icon={Send}>
        <div className="work-campaign-list">
          {outreachCampaigns.filter(campaign => campaign.type === 'cold_outreach').map(campaign => (
            <article key={campaign.id}><strong>{campaign.name}</strong><span>{campaign.audience}</span><Badge value={campaign.status} tone={outreachStatusTone(campaign.status)} /><small>{campaign.drafts} drafts - {campaign.replied} replies</small></article>
          ))}
        </div>
      </Panel>

      <Panel title="Re-engagement Campaigns" icon={Bell} action={<button className="glass-btn" onClick={handleGenerateReengagement}><Wand2 size={15} /> Generate Re-engagement</button>}>
        <div className="work-campaign-list">
          {outreachCampaigns.filter(campaign => campaign.type === 'reengagement').map(campaign => (
            <article key={campaign.id}><strong>{campaign.name}</strong><span>{campaign.audience}</span><Badge value={campaign.status} tone={outreachStatusTone(campaign.status)} /><small>{campaign.approved} approved - {campaign.sent} sent</small></article>
          ))}
        </div>
      </Panel>

      <Panel title="Portfolio Showcase Emails" icon={Palette} action={<button className="glass-btn" onClick={handleGeneratePortfolioEmail}><Sparkles size={15} /> Generate Showcase</button>}>
        <div className="work-campaign-list">
          {outreachCampaigns.filter(campaign => campaign.type === 'portfolio_showcase').map(campaign => (
            <article key={campaign.id}><strong>{campaign.name}</strong><span>{campaign.audience}</span><Badge value={campaign.status} tone={outreachStatusTone(campaign.status)} /><small>{campaign.sent} sent - {campaign.replied} replied</small></article>
          ))}
        </div>
      </Panel>

      <Panel title="Reply Tracking" icon={MessageCircle} className="work-outreach-primary">
        <div className="work-email-timeline">
          {selectedLeadTimeline.map(event => (
            <article key={event.id}>
              <span>{event.occurredAt}</span>
              <div><strong>{event.title}</strong><small>{event.detail}</small></div>
              <Badge value={event.status} tone={outreachStatusTone(event.status)} />
            </article>
          ))}
          {!selectedLeadTimeline.length && <p className="os-muted">No email history for this lead yet.</p>}
        </div>
      </Panel>
    </div>
  );

  const renderContent = () => (
    <div className="work-content-layout">
      <Panel title="Content Planner" icon={CalendarDays} className="work-content-main" action={<button className="glass-btn btn-cyan" onClick={() => setContentModalOpen(true)}><Plus size={15} /> Add Content Idea</button>}>
        <div className="work-toolbar work-content-toolbar">
          <select className="glass-input" value={contentPlatformFilter} onChange={event => setContentPlatformFilter(event.target.value as ContentPlatform | 'All')}>
            <option>All</option>
            {contentPlatforms.map(platform => <option key={platform}>{platform}</option>)}
          </select>
          <select className="glass-input" value={contentStatusFilter} onChange={event => setContentStatusFilter(event.target.value as ContentStatus | 'All')}>
            <option>All</option>
            {contentStatuses.map(status => <option key={status}>{status}</option>)}
          </select>
          <select className="glass-input" value={contentLanguage} onChange={event => setContentLanguage(event.target.value as 'Arabic' | 'English' | 'Mixed')}>
            <option>English</option>
            <option>Arabic</option>
            <option>Mixed</option>
          </select>
          <button className={`glass-btn ${contentViewMode === 'calendar' ? 'btn-cyan' : ''}`} onClick={() => setContentViewMode('calendar')}>Calendar</button>
          <button className={`glass-btn ${contentViewMode === 'kanban' ? 'btn-cyan' : ''}`} onClick={() => setContentViewMode('kanban')}>Kanban</button>
          <button className={`glass-btn ${contentViewMode === 'table' ? 'btn-cyan' : ''}`} onClick={() => setContentViewMode('table')}>Table</button>
          <button className={`glass-btn ${contentViewMode === 'backlog' ? 'btn-cyan' : ''}`} onClick={() => setContentViewMode('backlog')}>Backlog</button>
          <button className="glass-btn" onClick={handleGenerateIdeasFromSignals}><Sparkles size={15} /> Ideas From Projects/Goals</button>
          <button className="glass-btn" onClick={handleRepurposeProject}><Sparkles size={15} /> Repurpose Project</button>
          <button className="glass-btn" onClick={handleWeeklyPlan}><CalendarDays size={15} /> Weekly Plan</button>
        </div>

        {contentViewMode === 'calendar' ? (
          <div className="work-content-calendar">
            {filteredContentItems.map(item => (
              <article key={item.id}>
                <div className="work-content-date"><strong>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong><span>{item.platform}</span></div>
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.contentType} - {item.relatedProject}</p>
                  <small>{item.scheduledDate || item.date} - {item.cta}</small>
                </div>
                <Badge value={item.status} tone={contentStatusTone(item.status)} />
              </article>
            ))}
            {!filteredContentItems.length && (
              <div className="work-empty-state">
                <CalendarDays size={22} />
                <strong>No content matches this view</strong>
                <span>Add a content idea, clear filters, or generate a weekly plan.</span>
                <button className="glass-btn btn-cyan" type="button" onClick={() => setContentModalOpen(true)}><Plus size={15} /> Add Content Idea</button>
              </div>
            )}
          </div>
        ) : contentViewMode === 'kanban' ? (
          <div className="work-crm-board">
            {contentStatuses.map(status => (
              <section key={status} className="work-crm-stage">
                <div className="work-crm-stage-head"><Badge value={status} tone={contentStatusTone(status)} /><span>{filteredContentItems.filter(item => item.status === status).length}</span></div>
                <div className="work-crm-stage-list">
                  {filteredContentItems.filter(item => item.status === status).map(item => (
                    <article key={item.id} className="work-crm-card">
                      <div className="work-crm-card-head"><strong>{item.title}</strong><Badge value={item.platform} tone="purple" /></div>
                      <p>{item.hook || item.idea || item.caption}</p>
                      <small>{item.relatedProject}{item.relatedGoal ? ` - ${item.relatedGoal}` : ''}</small>
                      <div className="work-row-actions">
                        <button className="glass-btn" onClick={() => handleGenerateHook(item.id)}><Wand2 size={14} /></button>
                        <button className="glass-btn" onClick={() => handleApproveContent(item.id)}><CheckCircle2 size={14} /></button>
                      </div>
                    </article>
                  ))}
                  {!filteredContentItems.some(item => item.status === status) && <div className="work-empty-state compact"><Inbox size={16} /><span>No items</span></div>}
                </div>
              </section>
            ))}
          </div>
        ) : contentViewMode === 'backlog' ? (
          <div className="work-campaign-list">
            {filteredContentItems.filter(item => item.status === 'Idea' || item.status === 'Backlog').map(item => (
              <article key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.platform} - {item.contentType}</span>
                <small>{item.idea || item.hook || item.aiNotes}</small>
                <div className="work-row-actions">
                  <button className="glass-btn" onClick={() => handleGenerateHook(item.id)}><Sparkles size={14} /> Hook</button>
                  <button className="glass-btn" onClick={() => handleGenerateCta(item.id)}><PenLine size={14} /> CTA</button>
                  <button className="glass-btn" onClick={() => handleGenerateScript(item.id)}><Mail size={14} /> Script</button>
                </div>
              </article>
            ))}
            {!filteredContentItems.some(item => item.status === 'Idea' || item.status === 'Backlog') && <div className="work-empty-state"><Inbox size={22} /><strong>No backlog items</strong><span>Generate ideas from projects or goals to seed the backlog.</span></div>}
          </div>
        ) : (
          <WorkTable
            columns={['Date', 'Platform', 'Format', 'Title', 'Hook', 'Caption', 'Project', 'Goal', 'CTA', 'Status', 'Metrics', 'Actions']}
            rows={filteredContentItems.map(item => [
              item.scheduledDate || item.date,
              item.platform,
              item.contentType,
              item.title,
              item.hook || item.idea || '-',
              item.caption,
              item.relatedProject,
              item.relatedGoal || '-',
              item.cta,
              <Badge value={item.status} tone={contentStatusTone(item.status)} />,
              (item.performanceMetrics || []).join(' | ') || '-',
              <div className="work-row-actions">
                <button className="glass-btn" onClick={() => handleGenerateCaption(item.id)} title="Generate caption"><Wand2 size={14} /></button>
                <button className="glass-btn" onClick={() => handleTranslateCaption(item.id)} title="Translate caption"><Globe2 size={14} /></button>
                <button className="glass-btn" onClick={() => handleGenerateCta(item.id)} title="Generate CTA"><PenLine size={14} /></button>
                <button className="glass-btn" onClick={() => handleApproveContent(item.id)} title="Approve before publishing"><CheckCircle2 size={14} /></button>
              </div>
            ])}
            emptyLabel="No content ideas match this search or filter."
          />
        )}
      </Panel>

      <Panel title="Publishing Readiness" icon={ShieldCheck}>
        <div className="work-content-readiness">
          <article><strong>{contentPlannerItems.filter(item => item.status === 'Backlog' || item.status === 'Idea').length}</strong><span>Idea backlog</span></article>
          <article><strong>{contentPlannerItems.filter(item => item.status === 'Waiting Approval').length}</strong><span>Need approval</span></article>
          <article><strong>{contentPlannerItems.filter(item => item.status === 'Scheduled').length}</strong><span>Scheduled</span></article>
          <article><strong>{contentPlannerItems.filter(item => item.status === 'Published').length}</strong><span>Published</span></article>
        </div>
        <div className="work-data-note"><Plug size={15} /><span>Manual mode is default. If a platform API is connected, publishing should create a pending approval first. No auto-publish happens without approval or a trusted rule.</span></div>
        <div className="work-action-list">
          {contentIntegrationSummary.map(integration => (
            <article key={integration.id}>
              <Plug size={16} />
              <div><strong>{integration.label}</strong><span>Integration status from the main Integrations page</span></div>
              <Badge value={integration.status.replace('_', ' ')} tone={integration.status === 'connected' ? 'teal' : integration.status === 'needs_setup' ? 'amber' : 'blue'} />
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="AI Planner Assist" icon={Sparkles}>
        <div className="work-generated-box"><div><Sparkles size={15} /> Planner insight</div><p>{contentInsight}</p></div>
        <div className="work-campaign-list">
          {contentScheduleSuggestions.map(suggestion => <article key={suggestion}><strong>Schedule suggestion</strong><span>{suggestion}</span></article>)}
        </div>
        {selectedContentItem && (
          <div className="work-lead-buttons">
            <button className="glass-btn" onClick={() => handleGenerateHook(selectedContentItem.id)}><Sparkles size={15} /> Generate Hook</button>
            <button className="glass-btn" onClick={() => handleGenerateScript(selectedContentItem.id)}><Mail size={15} /> Generate Script</button>
            <button className="glass-btn" onClick={() => handleGenerateCaption(selectedContentItem.id)}><Wand2 size={15} /> Generate Caption</button>
            <button className="glass-btn" onClick={() => handleTranslateCaption(selectedContentItem.id)}><Globe2 size={15} /> {contentLanguage} Caption</button>
          </div>
        )}
      </Panel>
    </div>
  );

  const renderPortfolio = () => (
    <div className="work-portfolio-layout">
      <Panel
        title="Portfolio Proof Library"
        icon={FolderOpen}
        className="work-portfolio-main"
        action={<button className="glass-btn btn-cyan" onClick={() => openPortfolioModal()}><Plus size={15} /> Add Proof</button>}
      >
        <div className="work-data-note"><ShieldCheck size={15} /><span>No files are stored here. Use links, thumbnail URLs, structured details, and reusable selling proof.</span></div>
        <div className="work-crm-toolbar work-module-toolbar">
          <select className="glass-input" value={portfolioBestForFilter} onChange={event => setPortfolioBestForFilter(event.target.value as PortfolioBestFor | 'all')}>
            <option value="all">All best-for uses</option>
            {portfolioBestForOptions.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
          <select className="glass-input" value={portfolioStatusFilter} onChange={event => setPortfolioStatusFilter(event.target.value as PortfolioBusinessStatus | 'all')}>
            <option value="all">All statuses</option>
            {portfolioBusinessStatuses.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <div className="work-portfolio-list work-portfolio-grid">
          {visiblePortfolioProjects.map(project => (
            <button key={project.id} className={displayedPortfolioProject?.id === project.id ? 'active' : ''} onClick={() => setSelectedPortfolioProjectId(project.id)}>
              <div className="work-portfolio-thumb">{project.thumbnailUrl || project.thumbnail || 'Thumbnail URL'}</div>
              <div>
                <strong>{project.title || project.projectTitle}</strong>
                <span>{project.client || project.clientName} - {project.industry || project.category}</span>
                <small>{project.description}</small>
                <div className="work-portfolio-chip-list">
                  {(project.bestFor || []).map(item => <span key={item}>{item}</span>)}
                </div>
              </div>
              <Badge value={project.status || 'draft'} tone={(project.status || 'draft') === 'published' ? 'teal' : (project.status || 'draft') === 'ready' ? 'amber' : 'blue'} />
            </button>
          ))}
          {!visiblePortfolioProjects.length && (
            <div className="work-empty-state compact">
              <FolderOpen size={18} />
              <strong>No portfolio proof found</strong>
              <span>Add a project or clear the current filters.</span>
            </div>
          )}
        </div>
      </Panel>

      {displayedPortfolioProject && (
        <Panel title="Portfolio Detail" icon={Palette}>
          <div className="work-portfolio-detail">
            <div className="work-detail-card-head">
              <div>
                <h4>{displayedPortfolioProject.title || displayedPortfolioProject.projectTitle}</h4>
                <span>{displayedPortfolioProject.client || displayedPortfolioProject.clientName} - {displayedPortfolioProject.industry || displayedPortfolioProject.category}</span>
              </div>
              <Badge value={displayedPortfolioProject.status || 'draft'} tone={(displayedPortfolioProject.status || 'draft') === 'published' ? 'teal' : 'blue'} />
            </div>
            <p>{displayedPortfolioProject.description}</p>
            <div className="work-detail-section"><strong>Problem</strong><p>{displayedPortfolioProject.problem}</p></div>
            <div className="work-detail-section"><strong>Solution</strong><p>{displayedPortfolioProject.solution}</p></div>
            <div className="work-detail-section"><strong>Metrics / results</strong><p>{displayedPortfolioProject.resultsMetrics.join('; ') || 'Add measurable proof.'}</p></div>
            <div className="work-portfolio-chip-list">
              {displayedPortfolioProject.toolsUsed.map(tool => <span key={tool}>{tool}</span>)}
              {(displayedPortfolioProject.deliverables || displayedPortfolioProject.servicesProvided).map(item => <span key={item}>{item}</span>)}
            </div>
            <div className="work-crm-stage-picker">
              {portfolioBusinessStatuses.map(status => <button key={status} className={(displayedPortfolioProject.status || 'draft') === status ? 'active' : ''} type="button" onClick={() => handlePortfolioBusinessStatus(displayedPortfolioProject.id, status)}>{status}</button>)}
            </div>
            <div className="work-lead-buttons">
              <button className="glass-btn" type="button" onClick={() => openPortfolioModal(displayedPortfolioProject)}><Edit3 size={15} /> Edit</button>
              <button className="glass-btn" type="button" onClick={handleCreatePortfolioOutreachDraft}><Mail size={15} /> Create Outreach Draft</button>
            </div>
          </div>
        </Panel>
      )}

      {displayedPortfolioProject && (
        <Panel title="Links + Integrations" icon={Globe2} className="work-portfolio-main">
          <div className="work-portfolio-platforms">
            {(displayedPortfolioProject.links || displayedPortfolioProject.finalLinks).map(link => (
              <article key={link}>
                <div><strong>Portfolio link</strong><span>{link}</span></div>
                <a className="glass-btn" href={link} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open</a>
              </article>
            ))}
            {displayedPortfolioProject.publishStatus.map(item => (
              <article key={item.platform}>
                <div><strong>{item.platform}</strong><span>{item.url || 'No platform link yet'}</span></div>
                <Badge value={item.status} tone={item.status === 'Published' ? 'teal' : item.status === 'Waiting Approval' ? 'amber' : 'blue'} />
                <button className="glass-btn" onClick={() => handlePortfolioStatus(item.platform)}>Mark Waiting Approval</button>
              </article>
            ))}
          </div>
          <div className="work-data-note"><Plug size={15} /><span>Linked leads: {(displayedPortfolioProject.linkedLeadIds || []).length}. Linked job applications: {(displayedPortfolioProject.linkedJobIds || []).length}. Outreach drafts: {(displayedPortfolioProject.linkedDraftIds || []).length}.</span></div>
        </Panel>
      )}

      {displayedPortfolioProject && (
        <Panel title="AI Sales Copy + Matching" icon={Wand2}>
          <div className="work-portfolio-copy-actions">
            {portfolioCopyButtons.map(button => <button key={button.type} className="glass-btn" onClick={() => handleGeneratePortfolioCopy(button.type)}>{button.label}</button>)}
            <button className="glass-btn" onClick={() => handlePortfolioSalesCopy('pitch')}>Short Pitch</button>
            <button className="glass-btn" onClick={() => handlePortfolioSalesCopy('linkedin')}>LinkedIn Post</button>
            <button className="glass-btn" onClick={() => handlePortfolioSalesCopy('lead')}>Best For Lead</button>
            <button className="glass-btn" onClick={() => handlePortfolioSalesCopy('job')}>Best For Job</button>
          </div>
          <div className="work-generated-box"><div><Sparkles size={15} /> Generated copy</div><p>{generatedPortfolioCopy}</p></div>
          <div className="work-data-note"><Bell size={15} /><span>{getMonthlyPortfolioReminder(portfolioProjects)}</span></div>
        </Panel>
      )}
    </div>
  );

  const renderUpwork = () => (
    <div className="work-upwork-layout">
      <Panel title="Saved Job Matches" icon={BriefcaseBusiness} className="work-upwork-main">
        <div className="work-data-note"><ShieldCheck size={15} /><span>Compliance guardrail: keep client communication, files, and payments inside Upwork unless Upwork rules explicitly allow otherwise.</span></div>
        <div className="work-upwork-jobs">
          {visibleUpworkJobs.map(job => (
            <article key={job.id} className={displayedUpworkJob?.id === job.id ? 'active' : ''} onClick={() => setSelectedUpworkJobId(job.id)}>
              <div>
                <strong>{job.jobTitle}</strong>
                <span>{job.clientCountry} - {job.projectType} - {job.budget}</span>
                <p>{job.descriptionSummary}</p>
              </div>
              <Badge value={`${job.skillMatchScore}% fit`} tone={job.skillMatchScore >= 80 ? 'teal' : job.skillMatchScore >= 60 ? 'amber' : 'rose'} />
              <Badge value={job.status} tone={upworkStatusTone(job.status)} />
            </article>
          ))}
          {!visibleUpworkJobs.length && (
            <div className="work-empty-state">
              <BriefcaseBusiness size={22} />
              <strong>No Upwork jobs match</strong>
              <span>Clear search, switch quick filters, or save a new job opportunity.</span>
            </div>
          )}
        </div>
      </Panel>

      {displayedUpworkJob && (
        <Panel title="Job Actions" icon={Target}>
          <div className="work-detail-section"><strong>AI fit analysis</strong><p>{displayedUpworkJob.aiFitAnalysis}</p></div>
          <div className="work-detail-section"><strong>Suggested proposal angle</strong><p>{displayedUpworkJob.suggestedProposalAngle}</p></div>
          <div className="work-lead-buttons">
            <button className="glass-btn" onClick={() => handleAnalyzeUpworkJob(displayedUpworkJob.id)}><Sparkles size={15} /> Analyze Job</button>
            <button className="glass-btn btn-cyan" onClick={() => handleGenerateUpworkProposal(displayedUpworkJob)}><PenLine size={15} /> Generate Proposal Draft</button>
            <button className="glass-btn" onClick={() => handleSaveUpworkJob(displayedUpworkJob.id)}><Download size={15} /> Save Job</button>
            <button className="glass-btn" onClick={() => handleSubmitUpworkJob(displayedUpworkJob.id)}><CheckCircle2 size={15} /> Mark as Submitted</button>
            <button className="glass-btn" onClick={() => handleUpworkReminder(displayedUpworkJob.id)}><Clock3 size={15} /> Add Follow-up Reminder</button>
          </div>
        </Panel>
      )}

      <Panel title="Proposal Drafts" icon={PenLine} className="work-upwork-main">
        <div className="work-upwork-drafts">
          {upworkDrafts.map(draft => (
            <article key={draft.id}>
              <div><strong>{draft.title}</strong><span>{draft.status}</span><p>{draft.body}</p></div>
              <Badge value={draft.status} tone={draft.status === 'Submitted' ? 'teal' : 'blue'} />
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Submitted Proposals" icon={Send}>
        <div className="work-campaign-list">
          {upworkJobs.filter(job => job.status === 'Submitted' || job.status === 'Won').map(job => (
            <article key={job.id}><strong>{job.jobTitle}</strong><span>{job.budget}</span><Badge value={job.status} tone={upworkStatusTone(job.status)} /><small>{job.followUpAt ? `Follow up ${job.followUpAt}` : 'No reminder'}</small></article>
          ))}
          {!upworkJobs.some(job => job.status === 'Submitted' || job.status === 'Won') && <p className="os-muted">No submitted proposals yet.</p>}
        </div>
      </Panel>

      <Panel title="Client Conversations Summary" icon={MessageCircle}>
        <div className="work-campaign-list">
          {upworkConversations.map(conversation => (
            <article key={conversation.id}><strong>{conversation.clientName}</strong><span>{conversation.summary}</span><small>{conversation.nextAction}</small><small>{conversation.complianceNote}</small></article>
          ))}
        </div>
      </Panel>

      <Panel title="Upwork Performance Analytics" icon={BarChart3} className="work-upwork-main">
        <div className="work-content-readiness">
          {upworkMetrics.map(metric => <article key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span><small>{metric.note}</small></article>)}
        </div>
        <div className="work-data-note"><Plug size={15} /><span>Future RSS/API integration placeholder only. No scraping, off-platform contact, or automated submission is performed.</span></div>
      </Panel>
    </div>
  );

  const renderJobRadar = () => {
    const statusTone = (status: JobStatus) => jobStatuses.find(item => item.value === status)?.tone || 'blue';
    const sourceLabel = (job: JobOpportunity) => {
      if (job.platform === 'LinkedIn Jobs' || job.platform === 'Indeed') return 'Manual/import mode';
      if (job.platform === 'RemoteOK' || job.platform === 'We Work Remotely') return 'RSS/public listing';
      if (job.platform === 'Company Career Page') return 'Allowed public page/manual';
      return job.sourceMode.replace('_', ' ');
    };
    const board = (
      <div className="work-crm-board work-job-board">
        {jobStatuses.map(status => {
          const jobs = visibleJobOpportunities.filter(job => job.status === status.value);
          return (
            <section key={status.value} className="work-crm-stage">
              <div className="work-crm-stage-head"><Badge value={status.label} tone={status.tone} /><span>{jobs.length}</span></div>
              <div className="work-crm-stage-list">
                {jobs.map(job => (
                  <article key={job.id} className={`work-crm-card ${displayedJob?.id === job.id ? 'selected' : ''}`} onClick={() => setSelectedJobId(job.id)}>
                    <div className="work-crm-card-head"><strong>{job.title}</strong><Badge value={`${job.matchScore}%`} tone={job.matchScore >= 85 ? 'teal' : job.matchScore >= 70 ? 'amber' : 'blue'} /></div>
                    <div className="work-crm-card-meta"><Badge value={job.platform} tone="purple" /><Badge value={job.workMode} tone={job.workMode === 'Remote' ? 'teal' : 'blue'} /></div>
                    <p>{job.company} - {job.location}</p>
                    <small>{job.deadline ? `Deadline ${job.deadline}` : 'No deadline saved'}</small>
                  </article>
                ))}
                {!jobs.length && <div className="work-empty-state compact"><BriefcaseBusiness size={16} /><span>No jobs</span></div>}
              </div>
            </section>
          );
        })}
      </div>
    );
    const table = (
      <div className="work-table-wrap">
        <table className="work-table work-crm-table">
          <thead><tr><th>Role</th><th>Company</th><th>Platform</th><th>Mode</th><th>Score</th><th>Status</th><th>Deadline</th><th>Actions</th></tr></thead>
          <tbody>
            {visibleJobOpportunities.map(job => (
              <tr key={job.id} className={displayedJob?.id === job.id ? 'selected' : ''} onClick={() => setSelectedJobId(job.id)}>
                <td><strong>{job.title}</strong><small>{job.url}</small></td>
                <td>{job.company}</td>
                <td><Badge value={job.platform} tone="purple" /></td>
                <td>{job.workMode}</td>
                <td><Badge value={`${job.matchScore}%`} tone={job.matchScore >= 85 ? 'teal' : job.matchScore >= 70 ? 'amber' : 'blue'} /></td>
                <td><Badge value={job.status} tone={statusTone(job.status)} /></td>
                <td>{job.deadline || 'TBD'}</td>
                <td><div className="work-row-actions"><button className="glass-btn" type="button" onClick={event => { event.stopPropagation(); handleScoreJob(job); }}><Sparkles size={14} /> Match</button><button className="glass-btn" type="button" onClick={event => { event.stopPropagation(); handleGenerateApplicationDraft(job); }}><PenLine size={14} /> Draft</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    return (
      <div className="work-crm-pro">
        <Panel title="Job Radar" icon={BriefcaseBusiness} className="work-span-2">
          <div className="work-data-note"><ShieldCheck size={15} /><span>Uses manual import, official APIs, RSS feeds, or allowed public pages only. Applications are drafts until explicitly approved.</span></div>
          <div className="work-crm-status-strip">
            <span><BriefcaseBusiness size={15} /> {jobOpportunities.length} tracked jobs</span>
            <span><Sparkles size={15} /> {jobOpportunities.filter(job => job.matchScore >= 80).length} strong matches</span>
            <span><ShieldCheck size={15} /> approval-first sending</span>
          </div>
          <div className="work-crm-toolbar work-module-toolbar">
            <div className="work-crm-view-tabs">
              <button className={jobViewMode === 'board' ? 'active' : ''} type="button" onClick={() => setJobViewMode('board')}>Board</button>
              <button className={jobViewMode === 'table' ? 'active' : ''} type="button" onClick={() => setJobViewMode('table')}>Table</button>
            </div>
            <select className="glass-input" value={jobPlatformFilter} onChange={event => setJobPlatformFilter(event.target.value as JobPlatform | 'All')}><option value="All">All sources</option>{jobPlatforms.map(platform => <option key={platform} value={platform}>{platform}</option>)}</select>
            <select className="glass-input" value={jobStatusFilter} onChange={event => setJobStatusFilter(event.target.value as JobStatus | 'All')}><option value="All">All statuses</option>{jobStatuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
            <select className="glass-input" value={jobModeFilter} onChange={event => setJobModeFilter(event.target.value as JobWorkMode | 'All')}><option value="All">All work modes</option>{jobWorkModes.map(mode => <option key={mode} value={mode}>{mode}</option>)}</select>
          </div>
          {jobViewMode === 'board' ? board : table}
        </Panel>
        <Panel title="Manual / Custom URL Import" icon={Link2}>
          <form className="work-form-grid" onSubmit={handleImportJob}>
            <label>Title<input value={jobImportDraft.title} onChange={event => setJobImportDraft(current => ({ ...current, title: event.target.value }))} /></label>
            <label>Company<input value={jobImportDraft.company} onChange={event => setJobImportDraft(current => ({ ...current, company: event.target.value }))} /></label>
            <label>Source<select value={jobImportDraft.platform} onChange={event => setJobImportDraft(current => ({ ...current, platform: event.target.value as JobPlatform }))}>{jobPlatforms.map(platform => <option key={platform}>{platform}</option>)}</select></label>
            <label>URL<input value={jobImportDraft.url} onChange={event => setJobImportDraft(current => ({ ...current, url: event.target.value }))} /></label>
            <label className="work-form-span-2">Requirements<textarea rows={4} value={jobImportDraft.requirements} onChange={event => setJobImportDraft(current => ({ ...current, requirements: event.target.value }))} placeholder="One requirement per line" /></label>
            <label className="work-form-span-2">Notes<textarea rows={3} value={jobImportDraft.notes} onChange={event => setJobImportDraft(current => ({ ...current, notes: event.target.value }))} /></label>
            <button className="glass-btn btn-cyan" type="submit"><Plus size={15} /> Save Job</button>
          </form>
        </Panel>
        {displayedJob && (
          <Panel title="Opportunity Detail" icon={Target}>
            <div className="work-detail-card">
              <div className="work-detail-card-head"><div><strong>{displayedJob.title}</strong><span>{displayedJob.company}</span></div><Badge value={`${displayedJob.matchScore}% match`} tone={displayedJob.matchScore >= 85 ? 'teal' : displayedJob.matchScore >= 70 ? 'amber' : 'blue'} /></div>
              <div className="work-detail-grid"><span><MapPin size={14} /> {displayedJob.location}</span><span><Globe2 size={14} /> {displayedJob.workMode}</span><span><Link2 size={14} /> {sourceLabel(displayedJob)}</span><span><DollarSign size={14} /> {displayedJob.salary || 'Not listed'}</span></div>
              <p>{displayedJob.notes}</p>
              <div className="work-crm-stage-picker">{jobStatuses.map(status => <button key={status.value} className={displayedJob.status === status.value ? 'active' : ''} type="button" onClick={() => handleJobStatus(displayedJob, status.value)}>{status.label}</button>)}</div>
              <div className="work-lead-buttons"><button className="glass-btn" type="button" onClick={() => handleScoreJob(displayedJob)}><Sparkles size={15} /> Match Skills</button><button className="glass-btn" type="button" onClick={() => handleSummarizeJob(displayedJob)}><Wand2 size={15} /> Summarize Requirements</button>{displayedJob.url && <a className="glass-btn" href={displayedJob.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open Source</a>}</div>
            </div>
          </Panel>
        )}
        {displayedJob && (
          <Panel title="Application Builder" icon={PenLine}>
            <div className="work-outreach-lead-picker"><label>Draft type<select className="glass-input" value={applicationDraftType} onChange={event => setApplicationDraftType(event.target.value as ApplicationDraftType)}>{applicationDraftTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><button className="glass-btn btn-cyan" type="button" onClick={() => handleGenerateApplicationDraft(displayedJob)}><Wand2 size={15} /> Generate Draft</button></div>
            <div className="work-data-note"><ShieldCheck size={15} /><span>Drafts are safe. Email/application submission requires a separate approval step.</span></div>
            <div className="work-campaign-list">
              {selectedJobDrafts.map(draft => <article key={draft.id}><strong>{draft.subject}</strong><span>{draft.type} - {draft.status}</span><small>{draft.body.slice(0, 180)}...</small><div className="work-row-actions"><button className="glass-btn" type="button" onClick={() => handleRequestApplicationApproval(draft)}><ShieldCheck size={14} /> Request Approval</button></div></article>)}
              {!selectedJobDrafts.length && <div className="work-empty-state compact"><PenLine size={16} /><span>No application drafts yet.</span></div>}
            </div>
          </Panel>
        )}
        {displayedJob && (
          <Panel title="Portfolio / CV Fit" icon={FolderOpen}>
            <div className="work-action-list">{displayedJob.recommendedPortfolio.map(piece => <article key={piece}><CheckCircle2 size={16} /><div><strong>{piece}</strong><span>Recommended proof for this application</span></div><Badge value="Attach/link" tone="teal" /></article>)}</div>
          </Panel>
        )}
        <Panel title="Application History" icon={Activity}>
          <div className="work-crm-timeline">
            {selectedJobActivities.map(activity => <article key={activity.id}><Badge value={activity.type} tone="blue" /><div><strong>{activity.summary}</strong><span>{new Date(activity.createdAt).toLocaleString()}</span></div></article>)}
            {!selectedJobActivities.length && <div className="work-empty-state compact"><Activity size={16} /><span>No history yet.</span></div>}
          </div>
        </Panel>
      </div>
    );
  };

  const renderReports = () => (
    <div className="work-reports-layout" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {renderFinanceReports()}
      <div className="work-report-metric-grid">
        {reportMetricCards.map(card => (
          <article key={card.label} className="glass-panel work-report-metric">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <Badge value={card.delta} tone={card.tone} />
          </article>
        ))}
      </div>

      <div className="work-grid">
        <Panel title="Leads Growth" icon={BarChart3}>
          <div className="work-mini-chart">
            {leadsGrowthData.map(point => (
              <div key={point.label}>
                <i style={{ height: `${Math.max(point.value * 12, 18)}px` }} />
                <span>{point.label}</span>
                <b>{point.value}</b>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Lead Sources" icon={PieChart}>
          <div className="work-source-chart">
            {leadSourceData.map(source => (
              <article key={source.source}>
                <div>
                  <strong>{source.source}</strong>
                  <span>{source.qualified} qualified from {source.leads}</span>
                </div>
                <div className="work-source-bar"><i style={{ width: `${source.leads * 6}%` }} /></div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Performance Dashboards" icon={Activity} className="work-span-2">
          <div className="work-report-dashboard-grid">
            {reportDashboards.map(dashboard => (
              <article key={dashboard.title}>
                <div className="work-report-dashboard-head">
                  <span>{dashboard.title}</span>
                  <Badge value={dashboard.value} tone={dashboard.tone} />
                </div>
                <p>{dashboard.note}</p>
                <div className="work-report-progress"><i style={{ width: `${dashboard.trend}%` }} /></div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Platform Activity" icon={Globe2} className="work-span-2">
          <WorkTable
            columns={['Platform', 'Activity', 'Score', 'Next Move']}
            rows={platformActivityRows.map(row => [
              row.platform,
              row.activity,
              <Badge value={row.score} tone={row.score.startsWith('A') ? 'teal' : row.score.startsWith('B') ? 'blue' : 'amber'} />,
              row.next
            ])}
          />
        </Panel>

        <Panel title="Today's Work Brief" icon={Sparkles}>
          <div className="work-report-preview">
            <h4>Today's Work Brief</h4>
            {todaysWorkBrief.map(item => <p key={item}>{item}</p>)}
            <button className="glass-btn btn-cyan" type="button"><Download size={15} /> Export Daily Brief</button>
          </div>
        </Panel>

        <Panel title="Weekly Business Review" icon={CalendarDays}>
          <div className="work-weekly-review">
            <h4>Weekly Business Review</h4>
            {weeklyBusinessReview.map(item => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );

  const renderTelegram = () => (
    <div className="work-telegram-layout">
      <Panel title="Command Simulator" icon={Bot} className="work-telegram-main">
        <form className="work-telegram-simulator" onSubmit={handleSimulateTelegramCommand}>
          <label>Telegram command<input className="glass-input" value={telegramCommandInput} onChange={event => setTelegramCommandInput(event.target.value)} placeholder="اكتب أمر تيليجرام أو command in English..." /></label>
          <button className="glass-btn btn-cyan" type="submit"><Sparkles size={15} /> Simulate</button>
        </form>
        <div className="work-telegram-result">
          <article><span>Fake AI interpretation</span><strong>{displayedTelegramSimulation.interpretation}</strong></article>
          <article><span>Selected workflow</span><strong>{displayedTelegramSimulation.selectedWorkflow}</strong></article>
          <article><span>Required approval</span><Badge value={displayedTelegramSimulation.requiresApproval ? 'Yes' : 'No'} tone={displayedTelegramSimulation.requiresApproval ? 'amber' : 'teal'} /></article>
          <article className="wide"><span>Mock result</span><p>{displayedTelegramSimulation.mockResult}</p></article>
        </div>
        <div className="work-data-note"><Plug size={15} /><span>Frontend simulation only. Ready later for Telegram Bot API webhooks and n8n workflow routing.</span></div>
      </Panel>

      {telegramCategories.map(category => (
        <Panel key={category} title={`${category} Commands`} icon={MessageCircle}>
          <div className="work-telegram-command-list">
            {telegramCommandExamples.filter(command => command.category === category).map(command => (
              <button key={command.id} type="button" onClick={() => { setTelegramCommandInput(command.arabic); setTelegramSimulation(simulateTelegramCommand(command.arabic)); }}>
                <div>
                  <strong>{command.arabic}</strong>
                  <span>{command.english}</span>
                  <small>{command.workflow}</small>
                </div>
                <Badge value={command.requiresApproval ? 'Approval' : 'Auto-safe'} tone={command.requiresApproval ? 'amber' : 'teal'} />
              </button>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );

  const handleApprovalDecision = (id: string, status: ApprovalStatus) => {
    const approvalItem = approvalItems.find(item => item.id === id);
    setApprovalItems(current => setApprovalStatus(current, id, status));
    if (approvalItem) {
      setAutomationHistory(current => [approvalToHistory(approvalItem, status), ...current]);
    }
  };

  const renderLogs = () => (
    <div className="work-automation-layout">
      <Panel title="Automation Safety Rule" icon={ShieldCheck} className="work-automation-rule">
        <p>{SAFE_AUTOMATION_RULE}</p>
        <div className="work-automation-rule-grid">
          <article>
            <CheckCircle2 size={17} />
            <div>
              <strong>Auto-safe work</strong>
              <span>Draft, summarize, score, organize</span>
            </div>
            <Badge value={requiresExplicitApproval('draft') ? 'Approval' : 'Automatic'} tone="teal" />
          </article>
          <article>
            <ShieldCheck size={17} />
            <div>
              <strong>Controlled external actions</strong>
              <span>Send, publish, delete, contact people</span>
            </div>
            <Badge value={requiresExplicitApproval('send') ? 'Approval required' : 'Automatic'} tone="amber" />
          </article>
        </div>
      </Panel>

      <Panel
        title="Pending Approvals"
        icon={Bell}
        className="work-automation-main"
        action={<Badge value={`${approvalItems.filter(item => item.status === 'Pending' || item.status === 'Editing').length} open`} tone="amber" />}
      >
        <div className="work-approval-list">
          {visibleApprovalItems.map(item => (
            <article key={item.id} className="work-approval-card">
              <div className="work-approval-head">
                <div>
                  <strong>{item.actionType}</strong>
                  <span>{item.target}</span>
                </div>
                <div className="work-approval-badges">
                  <Badge value={item.riskLevel} tone={riskTone(item.riskLevel)} />
                  <Badge value={item.status} tone={approvalStatusTone(item.status)} />
                </div>
              </div>
              <p>{item.contentPreview}</p>
              <div className="work-approval-reason">
                <ShieldCheck size={15} />
                <span>{item.reasonApprovalRequired}</span>
              </div>
              <div className="work-approval-actions">
                <button className="glass-btn btn-cyan" type="button" onClick={() => handleApprovalDecision(item.id, 'Approved')}>
                  <CheckCircle2 size={15} /> Approve
                </button>
                <button className="glass-btn btn-magenta" type="button" onClick={() => handleApprovalDecision(item.id, 'Rejected')}>
                  <X size={15} /> Reject
                </button>
                <button className="glass-btn" type="button" onClick={() => handleApprovalDecision(item.id, 'Editing')}>
                  <Edit3 size={15} /> Edit
                </button>
              </div>
            </article>
          ))}
          {!visibleApprovalItems.length && (
            <div className="work-empty-state">
              <ShieldCheck size={22} />
              <strong>No approval items</strong>
              <span>High-risk sends, posts, and CRM updates will wait here before execution.</span>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Automation History" icon={Activity} className="work-automation-main" action={<button className="glass-btn"><Filter size={15} /> Filter</button>}>
        <WorkTable
          columns={['Timestamp', 'Trigger Source', 'Action', 'Status', 'Result', 'Error']}
          rows={automationHistory.map(item => [
            <span className="mono">{item.timestamp}</span>,
            item.triggerSource,
            item.action,
            <Badge value={item.status} tone={automationStatusTone(item.status)} />,
            item.result,
            item.error || 'None'
          ])}
        />
      </Panel>
    </div>
  );

  const renderSettings = () => {
    const summaryRows = [
      { label: 'Core infrastructure', status: 'Configured in OS Integrations', detail: 'Supabase, Vercel, GitHub' },
      { label: 'Google Workspace', status: 'OAuth managed centrally', detail: 'Gmail, Contacts, Calendar, Tasks, Sheets, Drive' },
      { label: 'AI providers', status: 'Backend-only secrets', detail: 'Hermes for planning, Gemini for second-brain tasks' },
      { label: 'Messaging and socials', status: 'Manual/API readiness', detail: 'Telegram, WhatsApp, Instagram, Facebook, LinkedIn, YouTube, Pinterest, Dribbble, Behance' },
      { label: 'Job platforms', status: 'Manual-first sourcing', detail: 'LinkedIn Jobs, Indeed, Wellfound, RemoteOK, We Work Remotely, career pages' }
    ];

    return (
      <div className="work-settings-layout">
        <Panel
          title="Integration Status Summary"
          icon={Plug}
          action={<button className="glass-btn btn-cyan" type="button" onClick={() => { window.location.hash = '#/integrations'; }}><ExternalLink size={15} /> Open Integrations</button>}
        >
          <div className="work-integration-summary">
            {summaryRows.map(row => (
              <article key={row.label} className="work-summary-card">
                <div>
                  <strong>{row.label}</strong>
                  <span>{row.detail}</span>
                </div>
                <Badge value={row.status} tone="teal" />
              </article>
            ))}
          </div>
          <div className="work-data-note">
            <ShieldCheck size={15} />
            <span>Work now stays focused on execution. Connector setup, testing, sync, docs, and safety toggles live in the main OS Integrations page.</span>
          </div>
        </Panel>

        <Panel title="Execution Safety" icon={ShieldCheck} action={<Badge value="Approval-first" tone="amber" />}>
          <div className="work-safety-settings">
            <label><input type="checkbox" checked readOnly /> Require approval before sending emails</label>
            <label><input type="checkbox" checked readOnly /> Require approval before publishing posts</label>
            <label><input type="checkbox" checked readOnly /> Require approval before CRM bulk updates</label>
            <label><input type="checkbox" checked readOnly /> Disable WhatsApp auto-send</label>
            <label><input type="checkbox" checked readOnly /> Draft-first mode</label>
          </div>
          <button className="glass-btn" type="button" onClick={() => { window.location.hash = '#/integrations'; }}>
            <Settings size={15} /> Manage safety settings in Integrations
          </button>
        </Panel>
      </div>
    );
  };

  const renderSocialInbox = () => (
    <div className="work-social-layout">
      <Panel
        title="Social Inbox"
        icon={MessageCircle}
        className="work-span-2"
        action={<button className="glass-btn btn-cyan" type="button" onClick={loadSocialInbox}><Download size={15} /> Refresh</button>}
      >
        <div className="work-crm-status-strip">
          <span><Plug size={14} /> {socialStatus}</span>
          <span><ShieldCheck size={14} /> Official APIs only. No scraping or browser automation.</span>
        </div>
        <div className="work-toolbar work-crm-toolbar">
          <select className="glass-input" value={socialPlatformFilter} onChange={event => setSocialPlatformFilter(event.target.value as SocialPlatform | 'all')}>
            <option value="all">All platforms</option>
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
          </select>
          <select className="glass-input" value={socialPostFilter} onChange={event => setSocialPostFilter(event.target.value)}>
            <option value="all">All posts</option>
            {socialPosts.map(post => <option key={post.id} value={post.id}>{post.title}</option>)}
          </select>
          <select className="glass-input" value={socialTone} onChange={event => setSocialTone(event.target.value as SocialTone)}>
            {socialTones.map(tone => <option key={tone.value} value={tone.value}>{tone.label}</option>)}
          </select>
          <label className="work-safety-inline"><input type="checkbox" checked={trustedAutoReply} onChange={event => setTrustedAutoReply(event.target.checked)} /> Trusted low-risk auto-reply</label>
        </div>

        <div className="work-social-grid">
          <div className="work-social-comments">
            {visibleSocialComments.map(comment => (
              <button key={comment.id} type="button" className={selectedSocialComment?.id === comment.id ? 'active' : ''} onClick={() => setSelectedSocialCommentId(comment.id)}>
                <div>
                  <strong>{comment.authorName}</strong>
                  <span>{comment.authorHandle || comment.platform}</span>
                </div>
                <p>{comment.text}</p>
                <div className="work-crm-card-meta">
                  <Badge value={comment.platform} tone={comment.platform === 'instagram' ? 'rose' : 'blue'} />
                  <Badge value={comment.status} tone={comment.status === 'pending_approval' ? 'amber' : comment.status === 'handled' ? 'teal' : 'blue'} />
                </div>
              </button>
            ))}
            {!visibleSocialComments.length && <div className="work-empty-state"><Inbox size={22} /><strong>No open comments</strong><span>All visible comments are handled or filtered out.</span></div>}
          </div>

          {selectedSocialComment && (
            <div className="work-social-detail">
              <div className="work-lead-profile">
                <div>
                  <span className="badge badge-cyan">{selectedSocialComment.platform}</span>
                  <h4>{selectedSocialComment.authorName}</h4>
                  <p>{selectedSocialComment.text}</p>
                </div>
                <Badge value={selectedSocialComment.riskFlags.length ? 'approval needed' : 'low risk'} tone={selectedSocialComment.riskFlags.length ? 'amber' : 'teal'} />
              </div>
              <div className="work-data-note">
                <ShieldCheck size={15} />
                <span>No hate/abuse auto-replies, no prices/promises without source data, no private info, no external links unless approved.</span>
              </div>
              <div className="work-lead-buttons">
                <button className="glass-btn btn-cyan" type="button" onClick={() => void suggestSocialReply(selectedSocialComment)}><Wand2 size={15} /> Suggest Reply</button>
                <button className="glass-btn" type="button" onClick={() => void markSocialHandled(selectedSocialComment)}><CheckCircle2 size={15} /> Mark Handled</button>
              </div>
              {selectedSuggestedReply && (
                <div className="work-crm-note-box">
                  <label>Edit reply<textarea className="glass-input" value={selectedSuggestedReply.body} onChange={event => setSuggestedReplies(current => current.map(reply => reply.id === selectedSuggestedReply.id ? { ...reply, body: event.target.value } : reply))} /></label>
                  <div className="work-data-note"><Sparkles size={15} /><span>{selectedSuggestedReply.reason}</span></div>
                  <div className="work-lead-buttons">
                    <button className="glass-btn btn-cyan" type="button" onClick={() => void approveSocialReply(selectedSuggestedReply)}><ShieldCheck size={15} /> Queue Approval</button>
                    <button className="glass-btn" type="button" onClick={() => void rejectSocialReply(selectedSuggestedReply)}><X size={15} /> Reject</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Accounts" icon={Plug}>
        <div className="work-integration-summary">
          {socialAccounts.map(account => (
            <article key={account.id} className="work-summary-card">
              <div><strong>{account.displayName}</strong><span>{account.missingEnv?.length ? `Missing ${account.missingEnv.join(', ')}` : 'Official API configured'}</span></div>
              <Badge value={account.mode === 'api_connected' ? 'API connected' : 'Manual mode'} tone={account.mode === 'api_connected' ? 'teal' : 'amber'} />
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );

  const renderFinanceReports = () => {
    const totalRevenue = dealsList.reduce((sum, d) => sum + (Number(d.agreedPrice || 0) - Number(d.balanceDue || 0)), 0);
    const totalDealValue = dealsList.reduce((sum, d) => sum + Number(d.agreedPrice || 0), 0);
    const avgDealSize = dealsList.length > 0 ? (totalDealValue / dealsList.length) : 0;

    const getDealSource = (deal: DealDetails) => {
      const matchedLead = crmLeads.find(lead => lead.name.toLowerCase() === (deal.clientName || '').toLowerCase());
      return matchedLead ? matchedLead.platform : 'Manual';
    };

    const revenueBySource: Record<string, number> = {};
    dealsList.forEach(deal => {
      const source = getDealSource(deal);
      const revenue = Number(deal.agreedPrice || 0) - Number(deal.balanceDue || 0);
      revenueBySource[source] = (revenueBySource[source] || 0) + revenue;
    });
    let bestSource = 'None';
    let maxRevenue = -1;
    Object.entries(revenueBySource).forEach(([source, rev]) => {
      if (rev > maxRevenue) {
        maxRevenue = rev;
        bestSource = source;
      }
    });

    const clientsBySource: Record<string, number> = {};
    crmLeads.filter(lead => lead.status === 'Client' || lead.stage === 'won').forEach(lead => {
      clientsBySource[lead.platform] = (clientsBySource[lead.platform] || 0) + 1;
    });
    let topSource = 'None';
    let maxClients = -1;
    Object.entries(clientsBySource).forEach(([source, count]) => {
      if (count > maxClients) {
        maxClients = count;
        topSource = source;
      }
    });

    const totalSourcesTracked = new Set(crmLeads.map(lead => lead.platform)).size;

    return (
      <section className="glass-panel work-panel" style={{ gridColumn: '1 / -1', border: '1px solid var(--accent-cyan-dim, rgba(34, 211, 238, 0.25))', background: 'rgba(10, 25, 47, 0.4)' }}>
        <div className="work-panel-head">
          <div className="work-panel-title">
            <DollarSign size={18} /> 💰 FINANCE
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', padding: '1rem' }}>
          <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Revenue ($)</span>
            <strong style={{ display: 'block', fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{money(totalRevenue)}</strong>
          </div>
          <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Avg Deal Size ($)</span>
            <strong style={{ display: 'block', fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{money(Math.round(avgDealSize))}</strong>
          </div>
          <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Deal Value ($)</span>
            <strong style={{ display: 'block', fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{money(totalDealValue)}</strong>
          </div>
          <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Best Source (by revenue)</span>
            <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>{bestSource}</strong>
          </div>
          <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Top Source (# clients)</span>
            <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>{topSource}</strong>
          </div>
          <div className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Sources Tracked</span>
            <strong style={{ display: 'block', fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{totalSourcesTracked}</strong>
          </div>
        </div>
      </section>
    );
  };

  const renderDeals = () => {
    return (
      <div className="work-crm-pro" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <section className="glass-panel work-panel work-crm-main" style={{ gridColumn: 'span 3' }}>
          <div className="work-panel-head">
            <div className="work-panel-title">
              <DollarSign size={18} /> 💼 DEAL DETAILS | Agreements, Deliverables & Payments
            </div>
            <button className="glass-btn btn-cyan" onClick={openNewDealModal}>
              <Plus size={15} /> Add Deal
            </button>
          </div>

          <div className="work-crm-status-strip">
            <span><Plug size={14} /> {loadingDeals ? 'Syncing deals...' : 'Deals synced to Supabase'}</span>
          </div>

          <div className="work-table-wrap">
            <table className="work-table work-crm-table">
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Service / Deliverable</th>
                  <th>Style / Format</th>
                  <th>Agreed Price ($)</th>
                  <th>Deposit Paid ($)</th>
                  <th>Balance Due ($)</th>
                  <th>Payment Status</th>
                  <th>Delivery Date</th>
                  <th>Revisions Used</th>
                  <th>Contract Signed?</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dealsList.map(deal => (
                  <tr key={deal.id}>
                    <td><strong>{deal.clientName}</strong></td>
                    <td>{deal.serviceDeliverable || '-'}</td>
                    <td>{deal.styleFormat || '-'}</td>
                    <td>{money(deal.agreedPrice || 0)}</td>
                    <td>{money(deal.depositPaid || 0)}</td>
                    <td>
                      <span style={{ color: (deal.agreedPrice - deal.depositPaid) > 0 ? 'var(--accent-amber)' : 'var(--accent-teal)' }}>
                        {money(Math.max(0, (deal.agreedPrice || 0) - (deal.depositPaid || 0)))}
                      </span>
                    </td>
                    <td>
                      <Badge
                        value={deal.paymentStatus || 'Pending'}
                        tone={
                          deal.paymentStatus === 'Paid' ? 'teal' :
                          deal.paymentStatus === 'Partial' ? 'amber' : 'rose'
                        }
                      />
                    </td>
                    <td>{deal.deliveryDate || '-'}</td>
                    <td>{deal.revisionsUsed || '-'}</td>
                    <td>
                      <Badge
                        value={deal.contractSigned ? 'Yes' : 'No'}
                        tone={deal.contractSigned ? 'teal' : 'amber'}
                      />
                    </td>
                    <td><small>{deal.notes || '-'}</small></td>
                    <td>
                      <div className="work-row-actions">
                        <button className="glass-btn" type="button" onClick={() => openEditDealModal(deal)} title="Edit deal">
                          <Edit3 size={14} />
                        </button>
                        <button className="glass-btn" type="button" onClick={() => deleteDealItem(deal.id)} title="Delete deal">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dealsList.length === 0 && (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '2rem' }}>
                      <Inbox size={22} style={{ marginBottom: '0.5rem', opacity: 0.5, display: 'inline' }} />
                      <div style={{ color: 'var(--text-secondary)' }}>No deals recorded. Click Add Deal to begin.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  };

  const renderActiveModule = () => {
    if (activeModule === 'overview') return renderOverview();
    if (activeModule === 'crm') return renderCrm();
    if (activeModule === 'deals') return renderDeals();
    if (activeModule === 'outreach') return renderOutreach();
    if (activeModule === 'content') return renderContent();
    if (activeModule === 'portfolio') return renderPortfolio();
    if (activeModule === 'upwork') return renderUpwork();
    if (activeModule === 'jobs') return renderJobRadar();
    if (activeModule === 'social') return renderSocialInbox();
    if (activeModule === 'reports') return renderReports();
    if (activeModule === 'telegram') return renderTelegram();
    if (activeModule === 'logs') return renderLogs();
    return renderSettings();
  };

  return (
    <div className="work-command-center">
      <PageHeader title="Work Command Center" description="Pipeline, outreach, content, portfolio proof, Upwork signals, reports, bot commands, and automations in one operating surface. Arabic, English, and mixed commands are supported in the local agent layer.">
        <div className="work-header-actions">
          <button className="glass-btn"><Globe2 size={15} /> Manual Mode</button>
          <button className="glass-btn btn-cyan"><Sparkles size={15} /> New Business Action</button>
        </div>
      </PageHeader>
      <div className="work-eyebrow"><BriefcaseBusiness size={15} /> Freelance Motion Design OS</div>

      <div className="work-readiness-strip">
        <div>
          <ShieldCheck size={16} />
          <strong>Draft-first business OS</strong>
          <span>Local data is saved now; external actions stay approval-gated until real connectors are active.</span>
        </div>
        <div className="work-readiness-channels">
          {workReadyChannels.map(channel => <span key={channel}>{channel}</span>)}
        </div>
      </div>

      <div className="page-body work-command-body">
        <aside className="glass-panel work-module-sidebar">
          <div className="work-module-sidebar-head">
            <span>Modules</span>
            <Badge value="Frontend v1" tone="purple" />
          </div>
          {workModules.map(module => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                type="button"
                className={activeModule === module.id ? 'active' : ''}
                onClick={() => setActiveModule(module.id)}
              >
                <Icon size={17} />
                <div>
                  <strong>{module.label}</strong>
                  <span>{module.description}</span>
                </div>
                {module.count && <small>{module.count}</small>}
              </button>
            );
          })}
        </aside>

        <main className="work-module-content">
          <div className="work-module-title">
            <div>
              <span className="badge badge-cyan">Ready for integrations</span>
              <h3>{active.label}</h3>
              <p>{active.description}</p>
            </div>
            <div className="work-module-actions">
              <Badge value={`${activeResultCount} visible`} tone="purple" />
              <button className="glass-btn"><ExternalLink size={15} /> Open Playbook</button>
            </div>
          </div>
          <div className="work-module-toolbar">
            <label className="work-global-search">
              <Search size={16} />
              <input
                value={globalSearch}
                onChange={event => setGlobalSearch(event.target.value)}
                placeholder="Search leads, drafts, jobs, projects, approvals..."
                dir="auto"
              />
            </label>
            <div className="work-filter-chips">
              {workQuickFilters.map(filter => (
                <button
                  key={filter}
                  type="button"
                  className={quickFilter === filter ? 'active' : ''}
                  onClick={() => setQuickFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          {renderActiveModule()}
        </main>
      </div>

      {quickLeadModalOpen && (
        <div className="modal-overlay" onClick={() => setQuickLeadModalOpen(false)}>
          <div className="modal-content glass-panel work-lead-modal compact" onClick={event => event.stopPropagation()}>
            <form onSubmit={createQuickLead}>
              <div className="work-lead-modal-head">
                <div>
                  <h3>Quick Add Lead</h3>
                  <p>Capture the lead now, enrich and score it from the detail drawer.</p>
                </div>
                <button className="glass-btn" type="button" onClick={() => setQuickLeadModalOpen(false)}><X size={16} /></button>
              </div>
              <div className="work-lead-form-grid">
                <label>Name<input className="glass-input" value={quickLeadDraft.name} onChange={event => setQuickLeadDraft({ ...quickLeadDraft, name: event.target.value })} required /></label>
                <label>Source<select className="glass-input" value={quickLeadDraft.source} onChange={event => setQuickLeadDraft({ ...quickLeadDraft, source: event.target.value as LeadPlatform })}>{platforms.map(platform => <option key={platform}>{platform}</option>)}</select></label>
                <label>Email<input className="glass-input" type="email" value={quickLeadDraft.email} onChange={event => setQuickLeadDraft({ ...quickLeadDraft, email: event.target.value })} /></label>
                <label>Need<input className="glass-input" value={quickLeadDraft.need} onChange={event => setQuickLeadDraft({ ...quickLeadDraft, need: event.target.value })} placeholder="Logo animation, campaign video..." /></label>
              </div>
              <div className="work-lead-modal-actions">
                <button className="glass-btn" type="button" onClick={() => setQuickLeadModalOpen(false)}>Cancel</button>
                <button className="glass-btn btn-cyan" type="submit"><UserPlus size={15} /> Add Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {leadModalOpen && (
        <div className="modal-overlay" onClick={() => setLeadModalOpen(false)}>
          <div className="modal-content glass-panel work-lead-modal" onClick={event => event.stopPropagation()}>
            <form onSubmit={saveLead}>
              <div className="work-lead-modal-head">
                <div>
                  <h3>{editingLeadId ? 'Edit Lead' : 'Add Lead'}</h3>
                  <p>Local CRM record now, integration-ready database row later.</p>
                </div>
                <button className="glass-btn" type="button" onClick={() => setLeadModalOpen(false)}><X size={16} /></button>
              </div>

              <div className="work-lead-form-grid">
                <label>Name<input className="glass-input" value={leadDraft.name} onChange={event => setLeadDraft({ ...leadDraft, name: event.target.value })} required /></label>
                <label>Platform / Source<select className="glass-input" value={leadDraft.platform} onChange={event => setLeadDraft({ ...leadDraft, platform: event.target.value as LeadPlatform })}>{platforms.map(platform => <option key={platform}>{platform}</option>)}</select></label>
                <label>Email<input className="glass-input" type="email" value={leadDraft.email} onChange={event => setLeadDraft({ ...leadDraft, email: event.target.value })} /></label>
                <label>Phone / Social handle<input className="glass-input" value={leadDraft.phoneOrHandle} onChange={event => setLeadDraft({ ...leadDraft, phoneOrHandle: event.target.value })} /></label>
                <label>Lead Status<select className="glass-input" value={leadDraft.status} onChange={event => setLeadDraft({ ...leadDraft, status: event.target.value as LeadStatus })}>{leadStatuses.map(status => <option key={status}>{status}</option>)}</select></label>
                <label>Pipeline Stage<select className="glass-input" value={leadDraft.stage} onChange={event => setLeadDraft({ ...leadDraft, stage: event.target.value as LeadStage, status: statusFromStage(event.target.value as LeadStage) })}>{crmStages.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></label>
                <label>Service Interest<select className="glass-input" value={leadDraft.serviceInterest} onChange={event => setLeadDraft({ ...leadDraft, serviceInterest: event.target.value as ServiceInterest })}>{serviceInterests.map(service => <option key={service}>{service}</option>)}</select></label>
                <label>Budget Range<input className="glass-input" value={leadDraft.budgetRange} onChange={event => setLeadDraft({ ...leadDraft, budgetRange: event.target.value })} /></label>
                <label>Lead Temperature<select className="glass-input" value={leadDraft.temperature} onChange={event => setLeadDraft({ ...leadDraft, temperature: event.target.value as LeadTemperature })}>{leadTemperatures.map(temp => <option key={temp}>{temp}</option>)}</select></label>
                <label>Last Contact Date<input className="glass-input" type="date" value={leadDraft.lastContactedAt} onChange={event => setLeadDraft({ ...leadDraft, lastContactedAt: event.target.value })} /></label>
                <label>Next Follow-up Date<input className="glass-input" type="date" value={leadDraft.nextFollowUpAt} onChange={event => setLeadDraft({ ...leadDraft, nextFollowUpAt: event.target.value })} /></label>
                <label>AI Score<input className="glass-input" type="number" min="0" max="100" value={leadDraft.aiScore} onChange={event => setLeadDraft({ ...leadDraft, aiScore: Number(event.target.value) })} /></label>
                <label>Next Best Action<input className="glass-input" value={leadDraft.nextBestAction} onChange={event => setLeadDraft({ ...leadDraft, nextBestAction: event.target.value })} /></label>
              </div>

              <label className="work-lead-full-label">Notes<textarea className="glass-input" value={leadDraft.notes} onChange={event => setLeadDraft({ ...leadDraft, notes: event.target.value })} /></label>

              <div className="work-ai-suggestion inline">
                <div><Sparkles size={15} /> AI suggestion preview</div>
                <p>{crmLeadSuggestion(leadDraft)}</p>
              </div>

              <div className="work-lead-modal-actions">
                <button className="glass-btn" type="button" onClick={() => setLeadModalOpen(false)}>Cancel</button>
                <button className="glass-btn btn-cyan" type="submit"><CheckCircle2 size={15} /> Save Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {contentModalOpen && (
        <div className="modal-overlay" onClick={() => setContentModalOpen(false)}>
          <div className="modal-content glass-panel work-lead-modal" onClick={event => event.stopPropagation()}>
            <form onSubmit={handleAddContentIdea}>
              <div className="work-lead-modal-head">
                <div>
                  <h3>Add Content Idea</h3>
                  <p>Draft-first social content record. Approve before publishing or scheduling through future APIs.</p>
                </div>
                <button className="glass-btn" type="button" onClick={() => setContentModalOpen(false)}><X size={16} /></button>
              </div>

              <div className="work-lead-form-grid">
                <label>Date<input className="glass-input" type="date" value={contentDraft.date} onChange={event => setContentDraft({ ...contentDraft, date: event.target.value })} /></label>
                <label>Scheduled Date<input className="glass-input" type="date" value={contentDraft.scheduledDate || ''} onChange={event => setContentDraft({ ...contentDraft, scheduledDate: event.target.value })} /></label>
                <label>Platform<select className="glass-input" value={contentDraft.platform} onChange={event => setContentDraft({ ...contentDraft, platform: event.target.value as ContentPlatform })}>{contentPlatforms.map(platform => <option key={platform}>{platform}</option>)}</select></label>
                <label>Format<select className="glass-input" value={contentDraft.contentType} onChange={event => setContentDraft({ ...contentDraft, contentType: event.target.value as ContentType })}>{contentTypes.map(type => <option key={type}>{type}</option>)}</select></label>
                <label>Title<input className="glass-input" value={contentDraft.title} onChange={event => setContentDraft({ ...contentDraft, title: event.target.value })} required /></label>
                <label>Related Project<select className="glass-input" value={contentDraft.relatedProject} onChange={event => setContentDraft({ ...contentDraft, relatedProject: event.target.value })}>{projects.map(project => <option key={project.id} value={project.title}>{project.title}</option>)}</select></label>
                <label>Related Goal<select className="glass-input" value={contentDraft.relatedGoal || ''} onChange={event => setContentDraft({ ...contentDraft, relatedGoal: event.target.value })}>{goals.map(goal => <option key={goal.id} value={goal.title}>{goal.title}</option>)}</select></label>
                <label>CTA<input className="glass-input" value={contentDraft.cta} onChange={event => setContentDraft({ ...contentDraft, cta: event.target.value })} /></label>
              </div>

              <label className="work-lead-full-label">Idea<textarea className="glass-input" value={contentDraft.idea || ''} onChange={event => setContentDraft({ ...contentDraft, idea: event.target.value })} /></label>
              <label className="work-lead-full-label">Hook<textarea className="glass-input" value={contentDraft.hook || ''} onChange={event => setContentDraft({ ...contentDraft, hook: event.target.value })} /></label>
              <label className="work-lead-full-label">Script<textarea className="glass-input" value={contentDraft.script || ''} onChange={event => setContentDraft({ ...contentDraft, script: event.target.value })} /></label>
              <label className="work-lead-full-label">Caption<textarea className="glass-input" value={contentDraft.caption} onChange={event => setContentDraft({ ...contentDraft, caption: event.target.value })} /></label>
              <label className="work-lead-full-label">Hashtags<input className="glass-input" value={(contentDraft.hashtags || []).join(' ')} onChange={event => setContentDraft({ ...contentDraft, hashtags: event.target.value.split(' ').filter(Boolean) })} /></label>
              <label className="work-lead-full-label">Performance Metrics<input className="glass-input" value={(contentDraft.performanceMetrics || []).join(' | ')} onChange={event => setContentDraft({ ...contentDraft, performanceMetrics: event.target.value.split('|').map(item => item.trim()).filter(Boolean) })} /></label>
              <label className="work-lead-full-label">AI Notes<textarea className="glass-input" value={contentDraft.aiNotes || ''} onChange={event => setContentDraft({ ...contentDraft, aiNotes: event.target.value })} /></label>

              <div className="work-lead-modal-actions">
                <button className="glass-btn" type="button" onClick={() => setContentModalOpen(false)}>Cancel</button>
                <button className="glass-btn btn-cyan" type="submit"><CheckCircle2 size={15} /> Save Idea</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {portfolioModalOpen && (
        <div className="modal-overlay" onClick={() => setPortfolioModalOpen(false)}>
          <div className="modal-content glass-panel work-lead-modal" onClick={event => event.stopPropagation()}>
            <form onSubmit={handleAddPortfolioProject}>
              <div className="work-lead-modal-head">
                <div>
                  <h3>{editingPortfolioId ? 'Edit Portfolio Proof' : 'Add Portfolio Proof'}</h3>
                  <p>Store structured proof, links, thumbnails, metrics, and sales context. Do not upload or save actual files here.</p>
                </div>
                <button className="glass-btn" type="button" onClick={() => setPortfolioModalOpen(false)}><X size={16} /></button>
              </div>

              <div className="work-lead-form-grid">
                <label>Title<input className="glass-input" value={portfolioDraft.title || portfolioDraft.projectTitle} onChange={event => setPortfolioDraft({ ...portfolioDraft, title: event.target.value, projectTitle: event.target.value })} required /></label>
                <label>Client<input className="glass-input" value={portfolioDraft.client || portfolioDraft.clientName} onChange={event => setPortfolioDraft({ ...portfolioDraft, client: event.target.value, clientName: event.target.value })} /></label>
                <label>Industry<input className="glass-input" value={portfolioDraft.industry || ''} onChange={event => setPortfolioDraft({ ...portfolioDraft, industry: event.target.value })} /></label>
                <label>Category<input className="glass-input" value={portfolioDraft.category} onChange={event => setPortfolioDraft({ ...portfolioDraft, category: event.target.value })} /></label>
                <label>Status<select className="glass-input" value={portfolioDraft.status || 'draft'} onChange={event => setPortfolioDraft({ ...portfolioDraft, status: event.target.value as PortfolioBusinessStatus })}>{portfolioBusinessStatuses.map(status => <option key={status} value={status}>{status}</option>)}</select></label>
                <label>Thumbnail URL<input className="glass-input" value={portfolioDraft.thumbnailUrl || portfolioDraft.thumbnail} onChange={event => setPortfolioDraft({ ...portfolioDraft, thumbnailUrl: event.target.value, thumbnail: event.target.value })} /></label>
                <label>Tools Used<input className="glass-input" value={portfolioDraft.toolsUsed.join(', ')} onChange={event => setPortfolioDraft({ ...portfolioDraft, toolsUsed: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} /></label>
                <label>Deliverables<input className="glass-input" value={(portfolioDraft.deliverables || portfolioDraft.servicesProvided).join(', ')} onChange={event => {
                  const deliverables = event.target.value.split(',').map(item => item.trim()).filter(Boolean);
                  setPortfolioDraft({ ...portfolioDraft, deliverables, servicesProvided: deliverables });
                }} /></label>
                <label>Best For<input className="glass-input" value={(portfolioDraft.bestFor || []).join(', ')} onChange={event => setPortfolioDraft({ ...portfolioDraft, bestFor: event.target.value.split(',').map(item => item.trim()).filter(Boolean) as PortfolioBestFor[] })} /></label>
              </div>

              <label className="work-lead-full-label">Description<textarea className="glass-input" value={portfolioDraft.description} onChange={event => setPortfolioDraft({ ...portfolioDraft, description: event.target.value })} /></label>
              <label className="work-lead-full-label">Problem<textarea className="glass-input" value={portfolioDraft.problem} onChange={event => setPortfolioDraft({ ...portfolioDraft, problem: event.target.value })} /></label>
              <label className="work-lead-full-label">Solution<textarea className="glass-input" value={portfolioDraft.solution} onChange={event => setPortfolioDraft({ ...portfolioDraft, solution: event.target.value })} /></label>
              <label className="work-lead-full-label">Links<input className="glass-input" value={(portfolioDraft.links || portfolioDraft.finalLinks).join(', ')} onChange={event => {
                const links = event.target.value.split(',').map(item => item.trim()).filter(Boolean);
                setPortfolioDraft({ ...portfolioDraft, links, finalLinks: links });
              }} /></label>
              <label className="work-lead-full-label">Results / Metrics<input className="glass-input" value={portfolioDraft.resultsMetrics.join(', ')} onChange={event => setPortfolioDraft({ ...portfolioDraft, resultsMetrics: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} /></label>
              <label className="work-lead-full-label">Tags<input className="glass-input" value={portfolioDraft.tags.join(', ')} onChange={event => setPortfolioDraft({ ...portfolioDraft, tags: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} /></label>
              <label className="work-lead-full-label">Case Study<textarea className="glass-input" value={portfolioDraft.caseStudyText} onChange={event => setPortfolioDraft({ ...portfolioDraft, caseStudyText: event.target.value })} /></label>

              <div className="work-lead-modal-actions">
                <button className="glass-btn" type="button" onClick={() => { setPortfolioModalOpen(false); setEditingPortfolioId(null); }}>Cancel</button>
                <button className="glass-btn btn-cyan" type="submit"><CheckCircle2 size={15} /> Save Proof</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dealModalOpen && (
        <div className="modal-overlay" onClick={() => setDealModalOpen(false)}>
          <div className="modal-content glass-panel work-lead-modal" onClick={event => event.stopPropagation()} style={{ maxWidth: '600px' }}>
            <form onSubmit={saveDealForm}>
              <div className="work-lead-modal-head">
                <div>
                  <h3>{editingDealId ? 'Edit Deal' : 'Add Deal'}</h3>
                  <p>Track project deliverables, agreements, and payment status securely.</p>
                </div>
                <button className="glass-btn" type="button" onClick={() => setDealModalOpen(false)}><X size={16} /></button>
              </div>

              <div className="work-lead-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label>Client Name<input className="glass-input" value={dealDraft.clientName} onChange={event => setDealDraft({ ...dealDraft, clientName: event.target.value })} required /></label>
                <label>Service / Deliverable<input className="glass-input" value={dealDraft.serviceDeliverable} onChange={event => setDealDraft({ ...dealDraft, serviceDeliverable: event.target.value })} /></label>
                <label>Style / Format<input className="glass-input" value={dealDraft.styleFormat} onChange={event => setDealDraft({ ...dealDraft, styleFormat: event.target.value })} /></label>
                <label>Agreed Price ($)<input className="glass-input" type="number" min="0" value={dealDraft.agreedPrice} onChange={event => setDealDraft({ ...dealDraft, agreedPrice: Number(event.target.value) })} /></label>
                <label>Deposit Paid ($)<input className="glass-input" type="number" min="0" value={dealDraft.depositPaid} onChange={event => setDealDraft({ ...dealDraft, depositPaid: Number(event.target.value) })} /></label>
                <label>Payment Status
                  <select className="glass-input" value={dealDraft.paymentStatus} onChange={event => setDealDraft({ ...dealDraft, paymentStatus: event.target.value })}>
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                  </select>
                </label>
                <label>Delivery Date<input className="glass-input" type="date" value={dealDraft.deliveryDate} onChange={event => setDealDraft({ ...dealDraft, deliveryDate: event.target.value })} /></label>
                <label>Revisions Used<input className="glass-input" value={dealDraft.revisionsUsed} onChange={event => setDealDraft({ ...dealDraft, revisionsUsed: event.target.value })} /></label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 2', cursor: 'pointer' }}>
                  <input type="checkbox" checked={dealDraft.contractSigned} onChange={event => setDealDraft({ ...dealDraft, contractSigned: event.target.checked })} />
                  Contract Signed?
                </label>
                <label style={{ gridColumn: 'span 2' }}>Notes<textarea className="glass-input" rows={3} value={dealDraft.notes} onChange={event => setDealDraft({ ...dealDraft, notes: event.target.value })} /></label>
              </div>

              <div className="work-lead-modal-actions">
                <button className="glass-btn" type="button" onClick={() => setDealModalOpen(false)}>Cancel</button>
                <button className="glass-btn btn-cyan" type="submit"><CheckCircle2 size={15} /> Save Deal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
