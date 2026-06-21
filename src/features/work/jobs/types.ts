export type JobPlatform = 'LinkedIn Jobs' | 'Indeed' | 'Wellfound' | 'RemoteOK' | 'We Work Remotely' | 'Company Career Page' | 'Custom URL';
export type JobWorkMode = 'Remote' | 'Hybrid' | 'Onsite';
export type JobStatus = 'saved' | 'reviewing' | 'draft_ready' | 'applied' | 'interview' | 'rejected' | 'accepted' | 'archived';
export type ApplicationDraftType = 'cv_bullets' | 'cover_letter' | 'portfolio_pitch' | 'email_application';

export interface Company {
  id: string;
  name: string;
  website?: string;
  notes?: string;
}

export interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: JobWorkMode;
  platform: JobPlatform;
  url: string;
  salary?: string;
  requirements: string[];
  matchScore: number;
  status: JobStatus;
  deadline?: string;
  notes: string;
  sourceMode: 'manual' | 'rss' | 'official_api' | 'public_page';
  recommendedPortfolio: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDraft {
  id: string;
  jobId: string;
  type: ApplicationDraftType;
  subject: string;
  body: string;
  portfolioLinks: string[];
  status: 'draft' | 'ready_for_approval' | 'approval_requested' | 'sent';
  requiresApprovalToSend: boolean;
  createdAt: string;
}

export interface ApplicationActivity {
  id: string;
  jobId: string;
  type: 'imported' | 'matched' | 'requirements_summarized' | 'draft_created' | 'approval_requested' | 'status_changed' | 'note';
  summary: string;
  createdAt: string;
}
