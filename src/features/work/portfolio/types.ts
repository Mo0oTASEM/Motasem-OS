export type PortfolioPlatform = 'Behance' | 'Dribbble' | 'Pinterest' | 'YouTube' | 'Instagram' | 'Facebook' | 'Personal Website';
export type PortfolioPublishStatus = 'Not Started' | 'Draft' | 'Waiting Approval' | 'Published' | 'Needs Update';
export type PortfolioBusinessStatus = 'idea' | 'draft' | 'ready' | 'published' | 'archived';
export type PortfolioBestFor = 'motion design' | 'social ads' | 'brand video' | 'game dev' | 'product launch' | 'freelance proof';

export interface PlatformPublishState {
  platform: PortfolioPlatform;
  status: PortfolioPublishStatus;
  url?: string;
  updatedAt?: string;
}

export interface PortfolioProject {
  id: string;
  title?: string;
  projectTitle: string;
  client?: string;
  clientName: string;
  industry?: string;
  category: string;
  description: string;
  problem: string;
  solution: string;
  toolsUsed: string[];
  deliverables?: string[];
  links?: string[];
  finalLinks: string[];
  thumbnailUrl?: string;
  thumbnail: string;
  status?: PortfolioBusinessStatus;
  caseStudyText: string;
  servicesProvided: string[];
  resultsMetrics: string[];
  tags: string[];
  bestFor?: PortfolioBestFor[];
  linkedLeadIds?: string[];
  linkedJobIds?: string[];
  linkedDraftIds?: string[];
  publishStatus: PlatformPublishState[];
  createdAt: string;
  updatedAt: string;
}

export type PortfolioProjectDraft = Omit<PortfolioProject, 'id' | 'publishStatus' | 'createdAt' | 'updatedAt'> & {
  publishStatus?: PlatformPublishState[];
};

export type PortfolioCopyType =
  | 'case_study'
  | 'behance'
  | 'dribbble'
  | 'pinterest'
  | 'instagram'
  | 'youtube'
  | 'website';
