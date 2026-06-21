export type UpworkJobStatus = 'New' | 'Reviewed' | 'Drafted' | 'Submitted' | 'Rejected' | 'Won';

export interface UpworkJob {
  id: string;
  jobTitle: string;
  clientCountry: string;
  budget: string;
  skillMatchScore: number;
  projectType: string;
  descriptionSummary: string;
  aiFitAnalysis: string;
  suggestedProposalAngle: string;
  status: UpworkJobStatus;
  savedAt?: string;
  followUpAt?: string;
}

export interface UpworkProposalDraft {
  id: string;
  jobId: string;
  title: string;
  body: string;
  status: 'Draft' | 'Submitted';
  createdAt: string;
  updatedAt: string;
}

export interface UpworkConversationSummary {
  id: string;
  jobId: string;
  clientName: string;
  summary: string;
  nextAction: string;
  complianceNote: string;
}

export interface UpworkPerformanceMetric {
  label: string;
  value: string;
  note: string;
}
