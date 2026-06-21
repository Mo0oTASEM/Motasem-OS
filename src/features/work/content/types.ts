export type ContentPlatform = 'Instagram' | 'LinkedIn' | 'YouTube' | 'Behance' | 'Pinterest' | 'Dribbble' | 'Portfolio Website';
export type ContentType = 'Reel' | 'Post' | 'Carousel' | 'Story' | 'YouTube Short' | 'Case Study' | 'Pin' | 'Dribbble Shot' | 'Behance Project' | 'Portfolio Update';
export type ContentStatus = 'Idea' | 'Backlog' | 'Draft' | 'Waiting Approval' | 'Scheduled' | 'Published';
export type ContentViewMode = 'calendar' | 'kanban' | 'table' | 'backlog';
export type SocialApiSource = 'manual' | 'meta_graph_api' | 'youtube_data_api' | 'pinterest_api' | 'dribbble_api' | 'portfolio_cms';

export interface ContentItem {
  id: string;
  source: SocialApiSource;
  sourceId?: string;
  date: string;
  scheduledDate?: string;
  platform: ContentPlatform;
  contentType: ContentType;
  title: string;
  idea?: string;
  hook?: string;
  script?: string;
  caption: string;
  hashtags: string[];
  status: ContentStatus;
  relatedProject: string;
  relatedGoal?: string;
  cta: string;
  publishedUrl?: string;
  performanceMetrics?: string[];
  aiNotes: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  publishedAt?: string;
}

export type ContentDraftInput = Pick<ContentItem, 'date' | 'platform' | 'contentType' | 'title' | 'caption' | 'relatedProject' | 'cta'> & {
  scheduledDate?: string;
  idea?: string;
  hook?: string;
  script?: string;
  relatedGoal?: string;
  publishedUrl?: string;
  performanceMetrics?: string[];
  hashtags?: string[];
  aiNotes?: string;
};
