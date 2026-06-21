export type CrmRecordSource =
  | 'manual'
  | 'google_contacts'
  | 'supabase'
  | 'upwork'
  | 'instagram'
  | 'facebook'
  | 'whatsapp'
  | 'gmail'
  | 'behance'
  | 'pinterest'
  | 'dribbble'
  | 'youtube'
  | 'portfolio_website';

export type ConsentStatus = 'unknown' | 'opted_in' | 'opted_out' | 'legitimate_interest';
export type PreferredChannel = 'email' | 'phone' | 'whatsapp' | 'instagram' | 'facebook' | 'upwork' | 'gmail' | 'behance' | 'dribbble' | 'youtube' | 'website';
export type CrmStatus = 'New' | 'Cold' | 'Warm' | 'Hot' | 'Client' | 'Past Client' | 'Lost' | 'Active' | 'Done' | 'Draft';
export type LeadPlatform = 'Upwork' | 'Instagram' | 'LinkedIn' | 'Referral' | 'Website' | 'Manual' | 'Other' | 'Facebook' | 'WhatsApp' | 'Gmail' | 'Google Contacts' | 'Behance' | 'Pinterest' | 'Dribbble' | 'YouTube' | 'Portfolio Website';
export type LeadStage = 'new' | 'qualified' | 'contacted' | 'replied' | 'proposal' | 'negotiation' | 'won' | 'lost' | 'archived';
export type ServiceInterest = 'Motion Design' | 'Logo Animation' | 'Social Media Ads' | 'YouTube Intro' | 'Brand Video' | 'Other';
export type LeadTemperature = 'Cold' | 'Warm' | 'Hot';
export type InteractionType = 'email' | 'call' | 'dm' | 'meeting' | 'proposal' | 'note' | 'system';

export interface InteractionSnapshot {
  id: string;
  type: InteractionType;
  occurredAt: string;
  summary: string;
  channel: PreferredChannel;
  actor: 'user' | 'lead' | 'system' | 'ai';
}

export interface CrmBaseRecord {
  id: string;
  source: CrmRecordSource;
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  status: CrmStatus;
  tags: string[];
  notes: string;
  aiSummary: string;
  aiScore: number;
  consentStatus: ConsentStatus;
  preferredChannel: PreferredChannel;
  interactionHistory: InteractionSnapshot[];
}

export interface Company extends CrmBaseRecord {
  name: string;
  website?: string;
  industry?: string;
  size?: string;
}

export interface Contact extends CrmBaseRecord {
  name: string;
  email: string;
  phone?: string;
  companyId?: string;
  title?: string;
  socialProfileIds: string[];
}

export interface SocialProfile extends CrmBaseRecord {
  contactId?: string;
  platform: LeadPlatform;
  handle: string;
  url?: string;
}

export interface Lead extends CrmBaseRecord {
  name: string;
  platform: LeadPlatform;
  stage?: LeadStage;
  email: string;
  phoneOrHandle: string;
  contactId?: string;
  companyId?: string;
  serviceInterest: ServiceInterest;
  budgetRange: string;
  temperature: LeadTemperature;
  nextBestAction: string;
}

export interface Interaction extends CrmBaseRecord {
  contactId?: string;
  leadId?: string;
  companyId?: string;
  type: InteractionType;
  occurredAt: string;
  subject: string;
  body: string;
}

export interface Task extends CrmBaseRecord {
  leadId?: string;
  contactId?: string;
  companyId?: string;
  title: string;
  dueAt: string;
  priority: 'Low' | 'Medium' | 'High';
}

export interface Project extends CrmBaseRecord {
  leadId?: string;
  companyId?: string;
  name: string;
  service: ServiceInterest;
  budgetRange: string;
  deadline?: string;
}

export interface EmailDraft extends CrmBaseRecord {
  leadId?: string;
  contactId?: string;
  subject: string;
  body: string;
  purpose: 'follow_up' | 'proposal' | 'reactivation' | 'discovery';
}

export interface CrmDataset {
  contacts: Contact[];
  leads: Lead[];
  companies: Company[];
  interactions: Interaction[];
  tasks: Task[];
  projects: Project[];
  emailDrafts: EmailDraft[];
  socialProfiles: SocialProfile[];
}

export type LeadCreateInput = Omit<Lead, keyof CrmBaseRecord | 'nextBestAction'> & Partial<Pick<CrmBaseRecord, 'source' | 'sourceId' | 'tags' | 'notes' | 'consentStatus' | 'preferredChannel' | 'lastContactedAt' | 'nextFollowUpAt' | 'aiScore' | 'aiSummary' | 'interactionHistory'>> & {
  status?: CrmStatus;
  nextBestAction?: string;
};
