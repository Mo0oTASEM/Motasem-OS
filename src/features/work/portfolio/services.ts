import type { PortfolioBestFor, PortfolioCopyType, PortfolioPlatform, PortfolioProject, PortfolioProjectDraft } from './types';

const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

const platforms: PortfolioPlatform[] = ['Behance', 'Dribbble', 'Pinterest', 'YouTube', 'Instagram', 'Facebook', 'Personal Website'];

export const createPortfolioProject = (draft: PortfolioProjectDraft): PortfolioProject => {
  const now = nowIso();
  return {
    ...draft,
    title: draft.title || draft.projectTitle,
    client: draft.client || draft.clientName,
    deliverables: draft.deliverables || draft.servicesProvided,
    links: draft.links || draft.finalLinks,
    thumbnailUrl: draft.thumbnailUrl || draft.thumbnail,
    status: draft.status || 'draft',
    industry: draft.industry || 'Creative / Brand',
    bestFor: draft.bestFor || ['motion design', 'freelance proof'],
    linkedLeadIds: draft.linkedLeadIds || [],
    linkedJobIds: draft.linkedJobIds || [],
    linkedDraftIds: draft.linkedDraftIds || [],
    id: uid('portfolio'),
    publishStatus: draft.publishStatus || platforms.map(platform => ({ platform, status: 'Not Started' })),
    createdAt: now,
    updatedAt: now
  };
};

export const generatePortfolioCopy = (project: PortfolioProject, type: PortfolioCopyType): string => {
  const tools = project.toolsUsed.join(', ');
  const services = (project.deliverables || project.servicesProvided).join(', ');
  const tags = project.tags.map(tag => `#${tag.replace(/\s+/g, '')}`).join(' ');
  const title = project.title || project.projectTitle;
  const client = project.client || project.clientName;

  const copy: Record<PortfolioCopyType, string> = {
    case_study: `${title} for ${client}\n\nIndustry: ${project.industry || 'Creative'}\n\nProblem: ${project.problem}\n\nSolution: ${project.solution}\n\nDeliverables: ${services}\n\nTools: ${tools}\n\nResults: ${project.resultsMetrics.join('; ')}.`,
    behance: `${title} is a ${project.category.toLowerCase()} project focused on ${project.solution.toLowerCase()}.\n\nBuilt with ${tools}. Deliverables included ${services}. ${tags}`,
    dribbble: `${title} - a polished ${project.category.toLowerCase()} frame for ${client}. Built with ${tools}. ${tags}`,
    pinterest: `${title}: ${project.category} inspiration for brand motion, launch visuals, and premium motion design. ${tags}`,
    instagram: `New motion breakdown: ${title}.\n\nThe challenge: ${project.problem}\nThe direction: ${project.solution}\n\n${tags}`,
    youtube: `${title} - Motion Design Breakdown\n\nIn this video: problem, motion direction, tools used (${tools}), and final result for ${client}.`,
    website: `${title} helped ${client} solve a clear visual communication problem: ${project.problem} The result was a focused ${project.category.toLowerCase()} system delivered through ${services}.`
  };

  return copy[type];
};

export const generatePortfolioPitch = (project: PortfolioProject): string => (
  `${project.title || project.projectTitle} is strong proof for ${(project.bestFor || ['motion design']).join(', ')}. ` +
  `It shows ${project.solution.toLowerCase()} with results like ${project.resultsMetrics.join(', ') || 'clearer brand communication'}.`
);

export const generateLinkedInPost = (project: PortfolioProject): string => (
  `Case study: ${project.title || project.projectTitle}\n\n` +
  `The problem: ${project.problem}\n\n` +
  `The approach: ${project.solution}\n\n` +
  `Deliverables: ${(project.deliverables || project.servicesProvided).join(', ')}\n\n` +
  `Results: ${project.resultsMetrics.join(', ')}\n\n` +
  `Useful for: ${(project.bestFor || []).join(', ')}`
);

export const generatePortfolioLinkMessage = (project: PortfolioProject, target = 'this opportunity'): string => (
  `For ${target}, I would share ${project.title || project.projectTitle}: ${(project.links || project.finalLinks).join(', ') || 'portfolio link pending'}. ` +
  `It is relevant because it covers ${(project.bestFor || ['motion design']).join(', ')} and demonstrates ${project.solution.toLowerCase()}.`
);

export const chooseBestPortfolioProjects = (projects: PortfolioProject[], targetText: string, limit = 3): PortfolioProject[] => {
  const haystack = targetText.toLowerCase();
  const score = (project: PortfolioProject) => {
    const terms = [
      project.category,
      project.industry || '',
      ...(project.bestFor || []),
      ...project.tags,
      ...project.toolsUsed,
      ...project.resultsMetrics
    ].map(term => term.toLowerCase());
    return terms.reduce((sum, term) => sum + (haystack.includes(term) ? 2 : 0), project.status === 'published' || project.status === 'ready' ? 2 : 0);
  };
  return [...projects].sort((a, b) => score(b) - score(a)).slice(0, limit);
};

export const portfolioMatchesBestFor = (project: PortfolioProject, filter: PortfolioBestFor | 'all') => (
  filter === 'all' || (project.bestFor || []).includes(filter)
);

export const setPortfolioPlatformStatus = (project: PortfolioProject, platform: PortfolioPlatform, status: PortfolioProject['publishStatus'][number]['status']): PortfolioProject => ({
  ...project,
  publishStatus: project.publishStatus.map(item => item.platform === platform ? { ...item, status, updatedAt: nowIso() } : item),
  updatedAt: nowIso()
});

export const getMonthlyPortfolioReminder = (projects: PortfolioProject[]): string => {
  const needsUpdate = projects.filter(project => project.publishStatus.some(item => item.status !== 'Published')).length;
  return `${needsUpdate} portfolio project${needsUpdate === 1 ? '' : 's'} still need publishing updates this month. Refresh thumbnails, metrics, and platform descriptions before the end-of-month review.`;
};
