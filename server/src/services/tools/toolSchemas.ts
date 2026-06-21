import { z } from 'zod';

export const toolRiskLevelSchema = z.enum(['low', 'medium', 'high']);
export const moduleOwnerSchema = z.enum([
  'goals',
  'planner',
  'projects',
  'crm',
  'gmail',
  'calendar',
  'finance',
  'content',
  'portfolio',
  'memory',
  'reports',
  'character',
  'brain',
  'workspace',
  'channel',
  'analytics',
  'automation',
  'notes',
  'contacts',
  'documents',
  'social'
]);

export const toolOutputSchema = z.object({
  ok: z.boolean(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  summary: z.string(),
  requiresFollowUp: z.boolean().default(false),
  data: z.unknown().optional()
});

const idSchema = z.string().min(1);
const stringArraySchema = z.array(z.string()).optional().default([]);

export const createGoalInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  level: z.string().optional(),
  targetDate: z.string().optional(),
  smart: z.object({
    specific: z.string().optional(),
    measurable: z.string().optional(),
    achievable: z.string().optional(),
    relevant: z.string().optional(),
    timeBound: z.string().optional()
  }).optional(),
  activities: z.array(z.record(z.unknown())).optional().default([])
});

export const updateGoalInputSchema = z.object({
  goalId: idSchema,
  updates: createGoalInputSchema.partial()
});

export const createTaskInputSchema = z.object({
  title: z.string().min(1),
  status: z.string().optional().default('todo'),
  priority: z.string().optional(),
  dueDate: z.string().optional(),
  goalId: z.string().optional(),
  estimatedMinutes: z.number().optional()
});

export const updateTaskInputSchema = z.object({
  taskId: idSchema,
  updates: createTaskInputSchema.partial()
});

export const createProjectInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional().default('planning'),
  deadline: z.string().optional(),
  clientId: z.string().optional(),
  tags: stringArraySchema
});

export const updateProjectInputSchema = z.object({
  projectId: idSchema,
  updates: createProjectInputSchema.partial()
});

export const createCRMLeadInputSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  platform: z.string().optional(),
  email: z.string().email().optional(),
  phoneOrHandle: z.string().optional(),
  status: z.string().optional().default('new'),
  serviceInterest: z.string().optional(),
  budgetRange: z.string().optional(),
  aiScore: z.number().optional(),
  nextBestAction: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
  notes: z.string().optional()
});

export const updateCRMLeadInputSchema = z.object({
  leadId: idSchema,
  updates: createCRMLeadInputSchema.partial()
});

export const promoteLeadToGoogleContactInputSchema = z.object({
  leadId: idSchema,
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional()
});

export const generateEmailDraftInputSchema = z.object({
  prompt: z.string().min(1),
  leadId: z.string().optional(),
  tone: z.string().optional(),
  language: z.string().optional()
});

export const sendEmailInputSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  leadId: z.string().optional()
});

export const createCalendarEventInputSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  description: z.string().optional(),
  email: z.string().email().optional(),
  entityId: z.string().optional()
});

export const createFinanceTransactionInputSchema = z.object({
  date: z.string().min(1),
  amount: z.number(),
  currency: z.string().optional().default('USD'),
  type: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  clientId: z.string().optional(),
  merchant: z.string().optional()
});

export const generateContentPlanInputSchema = z.object({
  prompt: z.string().min(1),
  platforms: stringArraySchema,
  cadence: z.string().optional(),
  goalId: z.string().optional(),
  projectId: z.string().optional()
});

export const createPortfolioProjectInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  projectId: z.string().optional(),
  metrics: z.record(z.unknown()).optional().default({}),
  assets: z.array(z.record(z.unknown())).optional().default([]),
  tags: stringArraySchema
});

export const searchUserMemoryInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(20).optional().default(8)
});

export const updateUserMemoryInputSchema = z.object({
  type: z.string().optional().default('note'),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: stringArraySchema,
  links: stringArraySchema,
  relatedEntityIds: stringArraySchema,
  importanceScore: z.number().optional()
});

export const generateReportInputSchema = z.object({
  date: z.string().optional(),
  prompt: z.string().optional(),
  includeCollections: stringArraySchema
});

export const generateCharacterQuestInputSchema = z.object({
  trait: z.string().min(1),
  difficulty: z.number().min(1).max(10),
  userPreferences: z.string().optional(),
  currentLevel: z.number().optional()
});

export const analyzeReflectionInputSchema = z.object({
  reflectionText: z.string().min(1),
  characterContext: z.string().optional(),
  consentGiven: z.boolean()
});

export const suggestDailyMissionInputSchema = z.object({
  focusTrait: z.string().optional(),
  recoveryMode: z.boolean().optional().default(false),
  plannerWorkload: z.number().optional(),
  recentAvoidance: z.boolean().optional()
});

export const generateExposureLadderInputSchema = z.object({
  behavior: z.string().min(1),
  startingDifficulty: z.number().min(1).max(10),
  desiredOutcome: z.string().optional(),
  safetyNotes: z.string().optional()
});

export const getCharacterStateInputSchema = z.object({
  includeQuests: z.boolean().optional().default(false),
  includeLadders: z.boolean().optional().default(false),
  includeMissions: z.boolean().optional().default(false)
});

export const askBrainInputSchema = z.object({
  question: z.string().min(1),
  contextIds: z.array(z.string()).optional().default([])
});

export const searchBrainInputSchema = z.object({
  query: z.string().min(1),
  types: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(50).optional().default(10)
});

export const generateInsightInputSchema = z.object({
  data: z.record(z.unknown()),
  insightType: z.enum(['trend', 'anomaly', 'correlation', 'summary']).optional().default('summary'),
  context: z.string().optional()
});

export const summarizeContentInputSchema = z.object({
  content: z.string().min(1),
  maxLength: z.number().int().positive().optional().default(500),
  format: z.enum(['paragraph', 'bullets', 'tldr']).optional().default('paragraph')
});

export const compareDocumentsInputSchema = z.object({
  documentA: z.string().min(1),
  documentB: z.string().min(1),
  aspect: z.string().optional().default('general')
});

export const listWorkspacesInputSchema = z.object({
  includeArchived: z.boolean().optional().default(false)
});

export const createWorkspaceInputSchema = z.object({
  name: z.string().min(1),
  settings: z.record(z.unknown()).optional().default({})
});

export const inviteToWorkspaceInputSchema = z.object({
  workspaceId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'member']).optional().default('member')
});

export const getChannelStatusInputSchema = z.object({
  channelType: z.enum(['telegram', 'whatsapp', 'web', 'all']).optional().default('all')
});

export const sendChannelMessageInputSchema = z.object({
  channelType: z.enum(['telegram', 'whatsapp']),
  channelUserId: z.string().min(1),
  text: z.string().min(1),
  parseMode: z.enum(['markdown', 'html']).optional().default('markdown')
});

export const generateAnalyticsReportInputSchema = z.object({
  metricType: z.enum(['productivity', 'finance', 'crm', 'character', 'custom']),
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  filters: z.record(z.unknown()).optional().default({})
});

export const trackHabitInputSchema = z.object({
  habitName: z.string().min(1),
  completed: z.boolean(),
  date: z.string().optional(),
  notes: z.string().optional(),
  difficulty: z.number().min(1).max(10).optional()
});

export const createAutomationRuleInputSchema = z.object({
  name: z.string().min(1),
  trigger: z.object({
    event: z.string().min(1),
    filters: z.record(z.unknown()).optional().default({})
  }),
  action: z.object({
    type: z.string().min(1),
    params: z.record(z.unknown()).optional().default({})
  }),
  enabled: z.boolean().optional().default(true)
});

export const createNoteInputSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).optional().default([]),
  collection: z.string().optional(),
  importance: z.number().min(0).max(100).optional().default(50)
});

export const searchNotesInputSchema = z.object({
  query: z.string().min(1),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(50).optional().default(10)
});

export const createContactInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional().default([])
});

export const searchContactsInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional().default(10)
});

export const createDocumentInputSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  documentType: z.string().optional().default('note'),
  tags: z.array(z.string()).optional().default([])
});

export const searchDocumentsInputSchema = z.object({
  query: z.string().min(1),
  documentType: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional().default(10)
});

export const getSocialInboxInputSchema = z.object({
  platform: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional().default(10),
  unreadOnly: z.boolean().optional().default(true)
});

export type ToolOutput = z.infer<typeof toolOutputSchema>;
export type ToolRiskLevel = z.infer<typeof toolRiskLevelSchema>;
export type ModuleOwner = z.infer<typeof moduleOwnerSchema>;
