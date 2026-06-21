import type { ContentDraftInput, ContentItem, ContentPlatform, ContentType } from './types';

const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

const platformHashtags: Record<ContentPlatform, string[]> = {
  Instagram: ['#motiondesign', '#aftereffects', '#brandmotion', '#3danimation'],
  LinkedIn: ['#motiondesign', '#branding', '#creativebusiness', '#productmarketing'],
  YouTube: ['#shorts', '#motiondesign', '#cinema4d'],
  Behance: ['#motiondesign', '#branding', '#caseStudy'],
  Pinterest: ['#designinspiration', '#motiongraphics', '#branding'],
  Dribbble: ['#dribbble', '#logomotion', '#visualdesign'],
  'Portfolio Website': ['#portfolio', '#casestudy', '#motiondesigner']
};

export const createContentIdea = (input: ContentDraftInput): ContentItem => {
  const now = nowIso();
  return {
    id: uid('content'),
    source: 'manual',
    date: input.date,
    scheduledDate: input.scheduledDate || input.date,
    platform: input.platform,
    contentType: input.contentType,
    title: input.title,
    idea: input.idea || input.title,
    hook: input.hook || '',
    script: input.script || '',
    caption: input.caption,
    hashtags: input.hashtags || platformHashtags[input.platform],
    status: 'Backlog',
    relatedProject: input.relatedProject,
    relatedGoal: input.relatedGoal || '',
    cta: input.cta,
    publishedUrl: input.publishedUrl || '',
    performanceMetrics: input.performanceMetrics || [],
    aiNotes: input.aiNotes || 'Draft-first content item. Requires approval before publishing.',
    createdAt: now,
    updatedAt: now
  };
};

export const generateCaptionForPlatform = (item: ContentItem): ContentItem => ({
  ...item,
  caption: `${item.hook || item.title}\n\nA quick look at the thinking behind ${item.relatedProject}. Built to make the work feel sharper in the first few seconds.\n\n${item.cta}`,
  hashtags: platformHashtags[item.platform],
  aiNotes: `Mock caption generated for ${item.platform}. Review tone, hook, and CTA before approval.`,
  status: item.status === 'Idea' || item.status === 'Backlog' ? 'Draft' : item.status,
  updatedAt: nowIso()
});

export const generateHookForContent = (item: ContentItem): ContentItem => ({
  ...item,
  hook: item.platform === 'LinkedIn'
    ? `Most motion posts stop at visuals. This one shows the business logic behind ${item.relatedProject}.`
    : `The first 3 seconds changed everything in ${item.relatedProject}.`,
  updatedAt: nowIso()
});

export const generateCtaForContent = (item: ContentItem): ContentItem => ({
  ...item,
  cta: item.platform === 'Behance' || item.platform === 'Portfolio Website'
    ? 'View the full case study'
    : item.platform === 'LinkedIn'
      ? 'Send a message if you want this kind of launch motion'
      : 'DM for the full breakdown',
  updatedAt: nowIso()
});

export const generateScriptForContent = (item: ContentItem): ContentItem => ({
  ...item,
  script: [
    `Hook: ${item.hook || item.title}`,
    `Context: ${item.relatedProject}`,
    `Process: Explain the problem, one key decision, and the final polish move.`,
    `CTA: ${item.cta || 'Invite the viewer to ask for the full case study.'}`
  ].join('\n'),
  updatedAt: nowIso()
});

export const translateContentCaption = (item: ContentItem, language: 'Arabic' | 'English' | 'Mixed'): ContentItem => {
  const variants = {
    Arabic: `فكرة المحتوى: ${item.hook || item.title}\n\nنظرة سريعة على ${item.relatedProject} ولماذا تم اتخاذ هذا الاتجاه.\n\n${item.cta}`,
    English: `${item.hook || item.title}\n\nA concise breakdown of ${item.relatedProject} and why this direction worked.\n\n${item.cta}`,
    Mixed: `${item.hook || item.title}\n\nQuick breakdown / شرح سريع لمشروع ${item.relatedProject} ولماذا هذا الاتجاه اشتغل.\n\n${item.cta}`
  };
  return {
    ...item,
    caption: variants[language],
    updatedAt: nowIso()
  };
};

export const generateContentIdeasFromProject = (project: string, goal = ''): ContentItem[] => ([
  createContentIdea({
    date: '2026-06-18',
    platform: 'Instagram',
    contentType: 'Reel',
    title: `${project}: process breakdown`,
    idea: `Show one transformation from raw frames to polished motion for ${project}.`,
    hook: `What changed between version one and the final ${project} cut?`,
    script: 'Open on the rough version, explain one decision, then show the polished result.',
    caption: '',
    relatedProject: project,
    relatedGoal: goal,
    cta: 'DM for the full process'
  }),
  createContentIdea({
    date: '2026-06-19',
    platform: 'LinkedIn',
    contentType: 'Post',
    title: `${project}: business lesson`,
    idea: `Turn ${project} into a founder-facing lesson about positioning, clarity, or launch communication.`,
    hook: `A strong motion piece does more than look good. ${project} is a good example.`,
    script: 'Frame the problem, name the business outcome, end with a practical takeaway.',
    caption: '',
    relatedProject: project,
    relatedGoal: goal,
    cta: 'Message me for a tailored version'
  })
]);

export const suggestPostingSchedule = (items: ContentItem[]): string[] => {
  const platforms = Array.from(new Set(items.map(item => item.platform)));
  return platforms.map(platform => {
    if (platform === 'Instagram') return 'Instagram: Tue / Thu / Sat evening for reels and process clips.';
    if (platform === 'LinkedIn') return 'LinkedIn: Mon / Wed morning for lessons, launches, and client-facing proof.';
    if (platform === 'YouTube') return 'YouTube: Fri afternoon for Shorts or breakdowns.';
    if (platform === 'Behance' || platform === 'Portfolio Website') return `${platform}: publish after metrics, context, and final thumbnails are ready.`;
    return `${platform}: queue as supporting distribution once the core post is approved.`;
  });
};

export const repurposeProjectIntoPosts = (project: string, startDate = '2026-06-17'): ContentItem[] => {
  const plan: Array<[ContentPlatform, ContentType, string, string]> = [
    ['Instagram', 'Reel', `${project}: before/after motion polish`, 'Watch the breakdown'],
    ['YouTube', 'YouTube Short', `${project}: 20-second animation breakdown`, 'Subscribe for more motion process'],
    ['Behance', 'Behance Project', `${project}: full visual system case study`, 'View the full case study'],
    ['Pinterest', 'Pin', `${project}: visual direction moodboard`, 'Save this motion reference'],
    ['Dribbble', 'Dribbble Shot', `${project}: hero frame and loop`, 'See the shot'],
    ['LinkedIn', 'Post', `${project}: what made it convert better`, 'Ask for the strategy version'],
    ['Portfolio Website', 'Case Study', `${project}: business outcome case study`, 'Book a motion audit']
  ];

  return plan.map(([platform, contentType, title, cta], index) => createContentIdea({
    date: new Date(new Date(startDate).getTime() + index * 86_400_000).toISOString().split('T')[0],
    platform,
    contentType,
    title,
    idea: `Repurpose ${project} for ${platform}.`,
    hook: `One useful angle from ${project} for ${platform}.`,
    script: '',
    caption: '',
    relatedProject: project,
    cta,
    aiNotes: `Repurposed from ${project}.`
  }));
};

export const createWeeklyContentPlan = (startDate = '2026-06-17'): ContentItem[] => {
  return [
    createContentIdea({ date: startDate, platform: 'Instagram', contentType: 'Reel', title: 'Kinetic type hook breakdown', idea: 'Fast motion hook breakdown.', hook: 'Three timing choices made this reel hit harder.', script: '', caption: '', relatedProject: 'Neon Shift', cta: 'DM for motion direction', aiNotes: 'Monday hook content.' }),
    createContentIdea({ date: '2026-06-18', platform: 'LinkedIn', contentType: 'Post', title: 'Client launch animation value post', idea: 'Explain launch-motion ROI.', hook: 'Good motion is not decoration if it removes friction.', script: '', caption: '', relatedProject: 'RezBook UI Motion Pack', cta: 'Ask for package options', aiNotes: 'Repurpose for business audience.' }),
    createContentIdea({ date: '2026-06-19', platform: 'YouTube', contentType: 'YouTube Short', title: '3 C4D lighting tricks', idea: 'Share one practical lighting lesson.', hook: 'Three tiny lighting moves can make an intro feel premium.', script: '', caption: '', relatedProject: 'Neon Shift', cta: 'Subscribe for process clips', aiNotes: 'Use fast visual cuts.' }),
    createContentIdea({ date: '2026-06-20', platform: 'Dribbble', contentType: 'Dribbble Shot', title: 'Logo reveal hero frame', idea: 'Single high-quality showcase frame.', hook: 'The hero frame often sells the loop before playback starts.', script: '', caption: '', relatedProject: 'North Pixel Logo Reveal', cta: 'View animation loop', aiNotes: 'Single premium frame.' }),
    createContentIdea({ date: '2026-06-21', platform: 'Portfolio Website', contentType: 'Case Study', title: 'Brand motion case study draft', idea: 'Long-form sales proof asset.', hook: 'A case study should explain the business outcome, not just the visuals.', script: '', caption: '', relatedProject: 'Zenith Brand Motion', cta: 'Book a project call', aiNotes: 'Long-form proof asset.' })
  ];
};

export const approveContentForScheduling = (item: ContentItem): ContentItem => ({
  ...item,
  status: 'Scheduled',
  approvedAt: nowIso(),
  updatedAt: nowIso()
});

export const syncMetaGraphPlaceholder = async () => ({ status: 'mock' as const, message: 'Meta Graph API placeholder for Instagram/Facebook scheduling.' });
export const syncYouTubeDataPlaceholder = async () => ({ status: 'mock' as const, message: 'YouTube Data API placeholder for Shorts publishing.' });
export const syncPinterestPlaceholder = async () => ({ status: 'mock' as const, message: 'Pinterest API placeholder for pins.' });
export const syncDribbblePlaceholder = async () => ({ status: 'mock' as const, message: 'Dribbble API placeholder for shots.' });
