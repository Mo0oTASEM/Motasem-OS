import type { ApplicationActivity, ApplicationDraft, ApplicationDraftType, JobOpportunity, JobStatus } from './types';

const nowIso = () => new Date().toISOString();

const skills = ['motion design', 'after effects', 'logo animation', 'product launch', 'portfolio', 'unity', 'game prototype', 'social ads', 'arabic', 'english'];

export const scoreJobMatch = (job: JobOpportunity): JobOpportunity => {
  const haystack = [job.title, job.company, job.notes, ...job.requirements].join(' ').toLowerCase();
  const hits = skills.filter(skill => haystack.includes(skill)).length;
  const remoteBonus = job.workMode === 'Remote' ? 8 : job.workMode === 'Hybrid' ? 4 : 0;
  const score = Math.min(98, Math.max(45, 50 + hits * 6 + remoteBonus));
  return { ...job, matchScore: score, updatedAt: nowIso() };
};

export const summarizeJobRequirements = (job: JobOpportunity) => (
  `${job.company} needs ${job.title.toLowerCase()} with ${job.requirements.slice(0, 4).join(', ')}. ` +
  `Best angle: show proof fast, connect portfolio pieces directly, and keep the application specific to ${job.platform}.`
);

export const generateApplicationDraft = (job: JobOpportunity, type: ApplicationDraftType): ApplicationDraft => {
  const portfolio = job.recommendedPortfolio.length ? job.recommendedPortfolio : ['main motion design reel', 'relevant case study'];
  const subject = type === 'email_application'
    ? `Application - ${job.title}`
    : `${job.title} application draft`;
  const bodies: Record<ApplicationDraftType, string> = {
    cv_bullets: [
      `Tailored CV bullets for ${job.title}:`,
      `- Built motion design systems for launch, social, and brand storytelling workflows.`,
      `- Delivered product-focused animation assets using After Effects, structured feedback loops, and clear creative milestones.`,
      `- Combined motion design and game-development thinking to prototype polished visual experiences quickly.`,
      `- Created bilingual Arabic/English creative assets when a campaign needed regional flexibility.`
    ].join('\n'),
    cover_letter: [
      `Hi ${job.company} team,`,
      '',
      `I am applying for the ${job.title} role because the work lines up with my strongest overlap: motion design, product storytelling, and fast creative execution.`,
      `Your requirements point to ${job.requirements.slice(0, 3).join(', ')}, and I would tailor the first pass around clear visual proof, fast iteration, and portfolio-backed examples.`,
      '',
      `Relevant pieces I would share: ${portfolio.join(', ')}.`,
      '',
      `Best,`,
      `Mo`
    ].join('\n'),
    portfolio_pitch: [
      `Portfolio pitch for ${job.company}:`,
      `Lead with ${portfolio[0]}. Then connect ${portfolio.slice(1).join(', ') || 'a second relevant case study'} to their need for ${job.requirements.slice(0, 2).join(' and ')}.`,
      `Keep the message short: one sentence of fit, two proof links, one proposed next step.`
    ].join('\n'),
    email_application: [
      `Hi ${job.company} team,`,
      '',
      `I found the ${job.title} opportunity and wanted to send a focused application. My work sits at the intersection of motion design, product/brand storytelling, and fast prototyping.`,
      '',
      `For this role, I would highlight:`,
      `- ${portfolio.join('\n- ')}`,
      '',
      `I can share a concise portfolio package and a short note on how I would approach the first deliverable.`,
      '',
      `Best,`,
      `Mo`
    ].join('\n')
  };

  return {
    id: `application-draft-${Date.now()}`,
    jobId: job.id,
    type,
    subject,
    body: bodies[type],
    portfolioLinks: portfolio,
    status: 'draft',
    requiresApprovalToSend: true,
    createdAt: nowIso()
  };
};

export const createApplicationActivity = (jobId: string, type: ApplicationActivity['type'], summary: string): ApplicationActivity => ({
  id: `job-activity-${Date.now()}`,
  jobId,
  type,
  summary,
  createdAt: nowIso()
});

export const updateJobStatus = (job: JobOpportunity, status: JobStatus): JobOpportunity => ({
  ...job,
  status,
  updatedAt: nowIso()
});
