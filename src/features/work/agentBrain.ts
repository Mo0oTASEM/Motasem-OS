export type WorkIntent =
  | 'add_lead'
  | 'update_lead'
  | 'generate_email'
  | 'generate_follow_up'
  | 'create_content_plan'
  | 'repurpose_project'
  | 'generate_proposal'
  | 'analyze_upwork_job'
  | 'create_portfolio_case_study'
  | 'get_daily_report'
  | 'get_weekly_report'
  | 'schedule_task'
  | 'ask_clarifying_question'
  | 'require_approval';

export type WorkCommandLanguage = 'arabic' | 'english' | 'mixed' | 'unknown';
export type WorkRiskLevel = 'low' | 'medium' | 'high';

export interface WorkAgentBrainConfig {
  agentName: string;
  role: string;
  mission: string;
  supportedLanguages: WorkCommandLanguage[];
  intents: WorkIntent[];
  defaultIntent: WorkIntent;
  safeAutomaticActions: string[];
  approvalRequiredActions: string[];
  futureAiProvider: 'gemini';
  systemPrompt: string;
}

export interface WorkCommandEntities {
  leadName?: string;
  platform?: string;
  serviceInterest?: string;
  projectName?: string;
  dateHint?: string;
  targetChannel?: string;
  budgetHint?: string;
  rawCommand: string;
}

export interface WorkWorkflowChoice {
  id: string;
  label: string;
  module: 'crm' | 'outreach' | 'content' | 'portfolio' | 'upwork' | 'reports' | 'tasks' | 'approval';
  description: string;
  mockNextAction: string;
}

export interface WorkApprovalDecision {
  requiresApproval: boolean;
  approvalReason: string;
}

export interface WorkAgentResponse {
  role: string;
  language: WorkCommandLanguage;
  intent: WorkIntent;
  entities: WorkCommandEntities;
  workflow: WorkWorkflowChoice;
  riskLevel: WorkRiskLevel;
  requiresApproval: boolean;
  approvalReason: string;
  mockResponse: string;
  geminiReady: boolean;
}

const arabic = {
  approve: ['\u0648\u0627\u0641\u0642', '\u0645\u0648\u0627\u0641\u0642\u0629'],
  send: ['\u0627\u0631\u0633\u0644', '\u0627\u0631\u0633\u0644\u064a', '\u0627\u0628\u0639\u062a'],
  publish: ['\u0627\u0646\u0634\u0631', '\u0646\u0634\u0631'],
  delete: ['\u0627\u062d\u0630\u0641', '\u062d\u0630\u0641'],
  addLead: ['\u0636\u064a\u0641 \u0644\u064a\u062f', '\u0644\u064a\u062f \u062c\u062f\u064a\u062f', '\u0639\u0645\u064a\u0644 \u0645\u062d\u062a\u0645\u0644'],
  updateLead: ['\u062d\u062f\u062b \u0644\u064a\u062f', '\u063a\u064a\u0631 \u062d\u0627\u0644\u0629', '\u0639\u062f\u0644 \u0644\u064a\u062f'],
  email: ['\u0627\u064a\u0645\u064a\u0644', '\u0625\u064a\u0645\u064a\u0644', '\u0631\u0633\u0627\u0644\u0629'],
  followUp: ['\u0645\u062a\u0627\u0628\u0639\u0629', '\u062a\u0627\u0628\u0639', '\u0641\u0648\u0644\u0648 \u0627\u0628'],
  content: ['\u062e\u0637\u0629 \u0645\u062d\u062a\u0648\u0649', '\u0645\u062d\u062a\u0648\u0649', '\u0628\u0648\u0633\u062a\u0627\u062a'],
  repurpose: ['\u062d\u0648\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639', '\u0627\u0639\u0627\u062f\u0629 \u0627\u0633\u062a\u062e\u062f\u0627\u0645'],
  proposal: ['\u0628\u0631\u0648\u0628\u0648\u0632\u0627\u0644', '\u0639\u0631\u0636 \u0633\u0639\u0631', '\u0639\u0631\u0636'],
  upwork: ['\u0627\u0628 \u0648\u0631\u0643', '\u0623\u0628 \u0648\u0631\u0643'],
  portfolio: ['\u0645\u0639\u0631\u0636 \u0627\u0639\u0645\u0627\u0644', '\u0628\u0648\u0631\u062a\u0641\u0648\u0644\u064a\u0648', '\u0643\u064a\u0633 \u0633\u062a\u062f\u064a'],
  daily: ['\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u064a\u0648\u0645', '\u0634\u063a\u0644 \u0627\u0644\u064a\u0648\u0645', '\u0627\u0644\u064a\u0648\u0645'],
  weekly: ['\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0627\u0633\u0628\u0648\u0639', '\u0627\u0644\u0627\u0633\u0628\u0648\u0639', '\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0633\u0628\u0648\u0639\u064a\u0629'],
  schedule: ['\u062c\u062f\u0648\u0644', '\u0645\u0647\u0645\u0629', '\u0630\u0643\u0631\u0646\u064a', '\u0645\u0648\u0639\u062f'],
  today: ['\u0627\u0644\u064a\u0648\u0645'],
  tomorrow: ['\u0628\u0643\u0631\u0627', '\u063a\u062f\u0627']
};

const english = {
  approval: ['approve', 'send now', 'publish now', 'delete', 'submit', 'bulk update'],
  addLead: ['add lead', 'new lead', 'add prospect', 'new client lead'],
  updateLead: ['update lead', 'mark lead', 'change status', 'move lead'],
  email: ['email', 'mail', 'cold email', 'outreach email'],
  followUp: ['follow-up', 'follow up', 'check in', 'reminder message'],
  content: ['content plan', 'weekly content', 'content calendar', 'post plan'],
  repurpose: ['repurpose', 'turn project into posts', 'reuse project', 'convert project'],
  proposal: ['proposal', 'cover letter', 'bid', 'offer'],
  upwork: ['upwork', 'job post', 'job listing'],
  portfolio: ['case study', 'portfolio case', 'behance project', 'portfolio'],
  daily: ['daily report', "today's work", 'today brief', 'daily brief'],
  weekly: ['weekly report', 'weekly review', 'week review'],
  schedule: ['schedule', 'remind', 'task', 'calendar', 'due']
};

export const workAgentBrainConfig: WorkAgentBrainConfig = {
  agentName: 'Work Agent Brain',
  role: 'Personal business growth, marketing, CRM, and operations assistant for a freelance Motion Designer.',
  mission: 'Route every work command toward revenue, client trust, consistent marketing, and disciplined operations.',
  supportedLanguages: ['arabic', 'english', 'mixed'],
  intents: [
    'add_lead',
    'update_lead',
    'generate_email',
    'generate_follow_up',
    'create_content_plan',
    'repurpose_project',
    'generate_proposal',
    'analyze_upwork_job',
    'create_portfolio_case_study',
    'get_daily_report',
    'get_weekly_report',
    'schedule_task',
    'ask_clarifying_question',
    'require_approval'
  ],
  defaultIntent: 'ask_clarifying_question',
  safeAutomaticActions: ['classify', 'draft', 'summarize', 'score', 'organize', 'report', 'suggest'],
  approvalRequiredActions: ['send email', 'publish post', 'submit proposal', 'bulk update CRM', 'delete data', 'message external contact'],
  futureAiProvider: 'gemini',
  systemPrompt: [
    'You are the Work Agent Brain for a freelance Motion Designer.',
    'Classify commands in Arabic, English, or mixed Arabic-English.',
    'Prefer draft-first actions. Never send, publish, submit, delete, or bulk-update without approval.',
    'Return structured intent, entities, workflow, risk level, approval decision, and a concise response.'
  ].join('\n')
};

const workflowByIntent: Record<WorkIntent, WorkWorkflowChoice> = {
  add_lead: {
    id: 'crm.createLead',
    label: 'Add CRM lead',
    module: 'crm',
    description: 'Create a new CRM lead placeholder from the command.',
    mockNextAction: 'Open the lead modal with inferred name, platform, service interest, and source.'
  },
  update_lead: {
    id: 'crm.updateLead',
    label: 'Update CRM lead',
    module: 'crm',
    description: 'Update a lead status, notes, follow-up date, or service interest.',
    mockNextAction: 'Prepare a confirmable lead update preview.'
  },
  generate_email: {
    id: 'outreach.generateEmailDraft',
    label: 'Generate email draft',
    module: 'outreach',
    description: 'Create a draft-first email for review.',
    mockNextAction: 'Open compose with a draft only. Sending requires approval.'
  },
  generate_follow_up: {
    id: 'outreach.generateFollowUp',
    label: 'Generate follow-up',
    module: 'outreach',
    description: 'Generate a follow-up message or follow-up sequence draft.',
    mockNextAction: 'Create a suggested follow-up draft and optional task.'
  },
  create_content_plan: {
    id: 'content.createPlan',
    label: 'Create content plan',
    module: 'content',
    description: 'Create a weekly or campaign-based content plan.',
    mockNextAction: 'Draft content pillars, post ideas, and publishing schedule.'
  },
  repurpose_project: {
    id: 'content.repurposeProject',
    label: 'Repurpose project',
    module: 'content',
    description: 'Turn one portfolio project into platform-specific post drafts.',
    mockNextAction: 'Create reusable post angles for Instagram, Behance, LinkedIn, and YouTube.'
  },
  generate_proposal: {
    id: 'upwork.generateProposalDraft',
    label: 'Generate proposal draft',
    module: 'upwork',
    description: 'Draft a proposal without submitting it.',
    mockNextAction: 'Create a proposal draft with hook, proof, process, timeline, and CTA.'
  },
  analyze_upwork_job: {
    id: 'upwork.analyzeJob',
    label: 'Analyze Upwork job',
    module: 'upwork',
    description: 'Score fit, risk, budget, and proposal angle.',
    mockNextAction: 'Return a fit score, red flags, and recommended proposal angle.'
  },
  create_portfolio_case_study: {
    id: 'portfolio.createCaseStudy',
    label: 'Create case study',
    module: 'portfolio',
    description: 'Generate a portfolio case study draft.',
    mockNextAction: 'Draft problem, role, process, deliverables, result, and visuals checklist.'
  },
  get_daily_report: {
    id: 'reports.dailyBrief',
    label: 'Get daily work brief',
    module: 'reports',
    description: 'Summarize today leads, tasks, approvals, and opportunities.',
    mockNextAction: 'Show top priorities, overdue follow-ups, hot leads, and daily focus.'
  },
  get_weekly_report: {
    id: 'reports.weeklyReview',
    label: 'Get weekly business review',
    module: 'reports',
    description: 'Summarize weekly pipeline, outreach, content, and wins.',
    mockNextAction: 'Show weekly wins, risks, pipeline movement, and next-week plan.'
  },
  schedule_task: {
    id: 'tasks.scheduleTask',
    label: 'Schedule task',
    module: 'tasks',
    description: 'Create a local follow-up, content, or project task placeholder.',
    mockNextAction: 'Create a task draft with date hint and related lead/project.'
  },
  ask_clarifying_question: {
    id: 'work.askClarifyingQuestion',
    label: 'Ask clarification',
    module: 'tasks',
    description: 'Ask one focused question before changing records or drafting output.',
    mockNextAction: 'Ask for the missing client, platform, deadline, or desired output.'
  },
  require_approval: {
    id: 'approval.createApprovalItem',
    label: 'Create approval item',
    module: 'approval',
    description: 'Route a risky external action to the Approval Center.',
    mockNextAction: 'Create an approval request before any external action happens.'
  }
};

const containsAny = (text: string, keywords: string[]) =>
  keywords.some(keyword => text.includes(keyword));

const matchFirst = (text: string, keywordGroups: string[][]) =>
  keywordGroups.some(group => containsAny(text, group));

export const detectWorkCommandLanguage = (command: string): WorkCommandLanguage => {
  const hasArabic = /[\u0600-\u06FF]/.test(command);
  const hasEnglish = /[a-z]/i.test(command);
  if (hasArabic && hasEnglish) return 'mixed';
  if (hasArabic) return 'arabic';
  if (hasEnglish) return 'english';
  return 'unknown';
};

export const classifyWorkIntent = (command: string): WorkIntent => {
  const normalized = command.trim().toLowerCase();

  if (!normalized) return 'ask_clarifying_question';
  if (matchFirst(normalized, [english.approval, arabic.approve, arabic.send, arabic.publish, arabic.delete])) return 'require_approval';
  if (matchFirst(normalized, [english.addLead, arabic.addLead])) return 'add_lead';
  if (matchFirst(normalized, [english.updateLead, arabic.updateLead])) return 'update_lead';
  if (matchFirst(normalized, [english.followUp, arabic.followUp])) return 'generate_follow_up';
  if (matchFirst(normalized, [english.email, arabic.email])) return 'generate_email';
  if (matchFirst(normalized, [english.content, arabic.content])) return 'create_content_plan';
  if (matchFirst(normalized, [english.repurpose, arabic.repurpose])) return 'repurpose_project';
  if (matchFirst(normalized, [english.upwork, arabic.upwork])) return 'analyze_upwork_job';
  if (matchFirst(normalized, [english.proposal, arabic.proposal])) return 'generate_proposal';
  if (matchFirst(normalized, [english.portfolio, arabic.portfolio])) return 'create_portfolio_case_study';
  if (matchFirst(normalized, [english.weekly, arabic.weekly])) return 'get_weekly_report';
  if (matchFirst(normalized, [english.daily, arabic.daily])) return 'get_daily_report';
  if (matchFirst(normalized, [english.schedule, arabic.schedule])) return 'schedule_task';

  return workAgentBrainConfig.defaultIntent;
};

export const extractEntitiesFromCommand = (command: string): WorkCommandEntities => {
  const normalized = command.toLowerCase();
  const platforms = ['upwork', 'instagram', 'facebook', 'whatsapp', 'gmail', 'behance', 'pinterest', 'dribbble', 'youtube', 'portfolio'];
  const services = ['motion design', 'motion graphics', 'logo animation', 'social media ads', 'youtube intro', 'brand video', '3d animation'];
  const platform = platforms.find(item => normalized.includes(item));
  const serviceInterest = services.find(item => normalized.includes(item));
  const englishNameMatch = command.match(/(?:named|name is|called|client is|lead is)\s+([\p{L}\s]{2,40})/iu);
  const arabicNameMatch = command.match(/(?:\u0627\u0633\u0645\u0647|\u0627\u0633\u0645\u0647\u0627|\u0627\u0644\u0639\u0645\u064a\u0644)\s+([\p{L}\s]{2,40})/iu);
  const projectMatch = command.match(/(?:project|case study|portfolio|\u0645\u0634\u0631\u0648\u0639)\s+([\p{L}\d\s-]{2,50})/iu);
  const budgetMatch = command.match(/(?:budget|value|price|\u0645\u064a\u0632\u0627\u0646\u064a\u0629|jod|\$)\s*[:=-]?\s*([\d,.]+\s?(?:jod|usd|\$)?)/iu);

  return {
    leadName: englishNameMatch?.[1]?.trim() || arabicNameMatch?.[1]?.trim(),
    platform,
    serviceInterest,
    projectName: projectMatch?.[1]?.trim(),
    dateHint: containsAny(normalized, ['today', ...arabic.today]) ? 'today' : containsAny(normalized, ['tomorrow', ...arabic.tomorrow]) ? 'tomorrow' : undefined,
    targetChannel: platform,
    budgetHint: budgetMatch?.[1]?.trim(),
    rawCommand: command
  };
};

export const chooseWorkflow = (intent: WorkIntent): WorkWorkflowChoice =>
  workflowByIntent[intent] || workflowByIntent.ask_clarifying_question;

export const checkRiskLevel = (intent: WorkIntent, command: string): WorkRiskLevel => {
  const normalized = command.toLowerCase();
  const highRiskTerms = ['send', 'publish', 'delete', 'submit', 'bulk', ...arabic.send, ...arabic.publish, ...arabic.delete];
  if (intent === 'require_approval' || containsAny(normalized, highRiskTerms)) return 'high';
  if (['update_lead', 'generate_proposal', 'generate_email', 'generate_follow_up', 'schedule_task'].includes(intent)) return 'medium';
  return 'low';
};

export const requireApprovalIfNeeded = (intent: WorkIntent, riskLevel: WorkRiskLevel, command: string): WorkApprovalDecision => {
  const normalized = command.toLowerCase();
  const externalActionTerms = ['send', 'publish', 'delete', 'submit', 'contact', 'bulk', ...arabic.send, ...arabic.publish, ...arabic.delete];

  if (intent === 'require_approval' || riskLevel === 'high' || containsAny(normalized, externalActionTerms)) {
    return {
      requiresApproval: true,
      approvalReason: 'Approval required because the command may send, publish, delete, submit, contact someone, or update records in bulk.'
    };
  }

  if (riskLevel === 'medium') {
    return {
      requiresApproval: false,
      approvalReason: 'Safe to prepare as a draft or local update preview. Any external action still requires approval.'
    };
  }

  return {
    requiresApproval: false,
    approvalReason: 'Safe automatic work: classify, draft, summarize, score, organize, report, or suggest.'
  };
};

export const generateWorkResponse = (command: string): WorkAgentResponse => {
  const language = detectWorkCommandLanguage(command);
  const intent = classifyWorkIntent(command);
  const entities = extractEntitiesFromCommand(command);
  const workflow = chooseWorkflow(intent);
  const riskLevel = checkRiskLevel(intent, command);
  const approval = requireApprovalIfNeeded(intent, riskLevel, command);

  return {
    role: workAgentBrainConfig.role,
    language,
    intent,
    entities,
    workflow,
    riskLevel,
    requiresApproval: approval.requiresApproval,
    approvalReason: approval.approvalReason,
    mockResponse: [
      `Mock route: ${workflow.label}.`,
      `Intent: ${intent}.`,
      `Language: ${language}.`,
      `Next: ${workflow.mockNextAction}`,
      approval.approvalReason
    ].join(' '),
    geminiReady: true
  };
};

export const geminiWorkBrainPlaceholder = async (command: string) => ({
  status: 'mock' as const,
  provider: workAgentBrainConfig.futureAiProvider,
  prompt: workAgentBrainConfig.systemPrompt,
  response: generateWorkResponse(command),
  message: 'Gemini-ready placeholder. No real AI call is made yet.'
});
