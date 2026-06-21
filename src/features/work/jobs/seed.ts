import type { ApplicationActivity, ApplicationDraft, JobOpportunity } from './types';

export const jobSeedOpportunities: JobOpportunity[] = [
  {
    id: 'job-remoteok-motion-artist',
    title: 'Motion Designer for SaaS Product Launches',
    company: 'LaunchLayer',
    location: 'Remote - EMEA',
    workMode: 'Remote',
    platform: 'RemoteOK',
    url: 'https://remoteok.com/remote-motion-design-jobs',
    salary: '$3k-$5k / project',
    requirements: ['After Effects', 'SaaS explainer videos', 'portfolio with product animation', 'English client communication'],
    matchScore: 91,
    status: 'reviewing',
    deadline: '2026-06-20',
    notes: 'Strong fit for product motion reel and startup positioning.',
    sourceMode: 'public_page',
    recommendedPortfolio: ['SaaS logo reveal', 'Product launch reel', 'Arabic/English kinetic typography'],
    createdAt: '2026-06-12',
    updatedAt: '2026-06-12'
  },
  {
    id: 'job-www-creative-video',
    title: 'Freelance Creative Video Designer',
    company: 'Northstar Media',
    location: 'Remote',
    workMode: 'Remote',
    platform: 'We Work Remotely',
    url: 'https://weworkremotely.com/categories/remote-design-jobs',
    salary: 'TBD',
    requirements: ['short-form ads', 'brand systems', 'weekly delivery cadence', 'case studies'],
    matchScore: 84,
    status: 'saved',
    deadline: '2026-06-24',
    notes: 'Could pitch retainer-style motion design packages.',
    sourceMode: 'rss',
    recommendedPortfolio: ['Ad creative sprint', 'Portfolio case study', 'Social content campaign'],
    createdAt: '2026-06-12',
    updatedAt: '2026-06-12'
  },
  {
    id: 'job-company-game-prototype',
    title: 'Unity Game Prototype Developer',
    company: 'Pixel Forge Studio',
    location: 'Amman / Hybrid',
    workMode: 'Hybrid',
    platform: 'Company Career Page',
    url: 'https://example.com/careers/unity-prototype',
    salary: 'Not listed',
    requirements: ['Unity', 'game feel', 'rapid prototyping', 'motion/visual polish'],
    matchScore: 78,
    status: 'draft_ready',
    deadline: '2026-06-30',
    notes: 'Good hybrid role if positioned as game + motion systems builder.',
    sourceMode: 'manual',
    recommendedPortfolio: ['Game prototype clip', 'Interactive motion demo', 'UI animation reel'],
    createdAt: '2026-06-11',
    updatedAt: '2026-06-12'
  }
];

export const jobSeedDrafts: ApplicationDraft[] = [];

export const jobSeedActivities: ApplicationActivity[] = [
  {
    id: 'job-act-1',
    jobId: 'job-remoteok-motion-artist',
    type: 'matched',
    summary: 'Matched job against motion design, product launch, and bilingual portfolio strengths.',
    createdAt: '2026-06-12T12:00:00.000Z'
  }
];
