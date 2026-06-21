import type { UpworkConversationSummary, UpworkJob, UpworkPerformanceMetric, UpworkProposalDraft } from './types';

export const upworkSeedJobs: UpworkJob[] = [
  {
    id: 'upwork-logo-tech',
    jobTitle: 'Premium logo animation for tech YouTube channel',
    clientCountry: 'United States',
    budget: '$1,500 fixed',
    skillMatchScore: 91,
    projectType: 'Logo Animation',
    descriptionSummary: 'Client needs a clean premium logo reveal, intro transition, and channel animation package.',
    aiFitAnalysis: 'Excellent fit. Budget supports a focused logo animation package with strong portfolio relevance.',
    suggestedProposalAngle: 'Lead with 2 relevant logo reveal examples, a clear 5-day timeline, and revision boundaries.',
    status: 'New'
  },
  {
    id: 'upwork-product-video',
    jobTitle: '3D product launch video for wellness brand',
    clientCountry: 'United Kingdom',
    budget: '$45/hr',
    skillMatchScore: 84,
    projectType: 'Brand Video',
    descriptionSummary: 'Brand needs a short launch video with product renders, kinetic text, and social cutdowns.',
    aiFitAnalysis: 'Strong fit if assets are ready. Clarify whether 3D model files exist before committing.',
    suggestedProposalAngle: 'Ask about assets first, then propose a hero video plus vertical cutdowns.',
    status: 'Reviewed'
  },
  {
    id: 'upwork-ae-template',
    jobTitle: 'After Effects template customization',
    clientCountry: 'Canada',
    budget: '$250 fixed',
    skillMatchScore: 42,
    projectType: 'Other',
    descriptionSummary: 'Client wants quick edits to a purchased After Effects template.',
    aiFitAnalysis: 'Low margin and low portfolio value. Consider skipping unless turnaround is extremely fast.',
    suggestedProposalAngle: 'If bidding, keep scope narrow and require all assets upfront.',
    status: 'Rejected'
  },
  {
    id: 'upwork-youtube-intro-pack',
    jobTitle: 'YouTube intro and motion graphics package for education creator',
    clientCountry: 'Australia',
    budget: '$900 fixed',
    skillMatchScore: 87,
    projectType: 'YouTube Intro',
    descriptionSummary: 'Creator needs intro, lower third, chapter bumper, end screen animation, and reusable brand motion assets.',
    aiFitAnalysis: 'Strong portfolio fit with clear deliverables. Package assets as a channel motion system.',
    suggestedProposalAngle: 'Lead with a channel identity system, a 7-day delivery plan, and optional social cutdowns.',
    status: 'New'
  },
  {
    id: 'upwork-instagram-ad-motion',
    jobTitle: 'Animated Instagram ad variations for DTC product launch',
    clientCountry: 'United Arab Emirates',
    budget: '$35/hr',
    skillMatchScore: 79,
    projectType: 'Social Media Ads',
    descriptionSummary: 'Brand wants 6 short animated ads with kinetic type, product closeups, and Arabic/English versions.',
    aiFitAnalysis: 'Good fit if product assets are organized. Clarify version count and approval workflow.',
    suggestedProposalAngle: 'Offer a sprint structure: concept board, two design routes, animation batch, and export matrix.',
    status: 'Reviewed'
  }
];

export const upworkSeedDrafts: UpworkProposalDraft[] = [
  {
    id: 'proposal-logo-tech',
    jobId: 'upwork-logo-tech',
    title: 'Logo animation proposal draft',
    body: 'Hi, I can create a clean premium logo reveal with a strong first-frame hook, polished motion timing, and export versions for YouTube intro and transitions. I would start with a quick style direction, then deliver animation, sound sync, and final exports within 5 days.',
    status: 'Draft',
    createdAt: '2026-06-11T09:00:00.000Z',
    updatedAt: '2026-06-11T09:00:00.000Z'
  },
  {
    id: 'proposal-youtube-intro-pack',
    jobId: 'upwork-youtube-intro-pack',
    title: 'YouTube intro package proposal draft',
    body: 'Hi, I can build this as a compact channel motion system: intro, lower third, chapter bumper, and end screen animation with consistent timing and brand rhythm. I would start with a quick style frame, then animate the approved direction and export reusable versions for your editing workflow.',
    status: 'Draft',
    createdAt: '2026-06-12T09:00:00.000Z',
    updatedAt: '2026-06-12T09:00:00.000Z'
  }
];

export const upworkSeedConversations: UpworkConversationSummary[] = [
  {
    id: 'conversation-product-video',
    jobId: 'upwork-product-video',
    clientName: 'Wellness Launch Team',
    summary: 'Client asked whether product renders can be animated from existing stills. Needs launch cutdowns for Instagram and paid ads.',
    nextAction: 'Ask for model/source files and confirm number of deliverables inside Upwork messages.',
    complianceNote: 'Keep communication and payment inside Upwork unless Upwork rules explicitly allow otherwise.'
  }
];

export const upworkSeedMetrics: UpworkPerformanceMetric[] = [
  { label: 'Saved Matches', value: '12', note: 'High-fit motion design jobs this month' },
  { label: 'Proposal Drafts', value: '5', note: 'Awaiting manual review' },
  { label: 'Submit Rate', value: '42%', note: 'Drafts converted to submitted proposals' },
  { label: 'Reply Rate', value: '18%', note: 'Replies from submitted proposals' },
  { label: 'Avg Fit Score', value: '78', note: 'Target: 80+' }
];
