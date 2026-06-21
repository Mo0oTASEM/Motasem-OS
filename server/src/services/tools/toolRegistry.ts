import type { z } from 'zod';
import { repositoryFactory } from '../database/repositoryFactory.js';
import { searchMemory } from '../memoryService.js';
import { aiGateway } from '../ai/aiGateway.js';
import { runSecondBrain } from '../aiBrain/secondBrainRouter.js';
import {
  createCalendarEventInputSchema,
  createCRMLeadInputSchema,
  createFinanceTransactionInputSchema,
  createGoalInputSchema,
  createPortfolioProjectInputSchema,
  createProjectInputSchema,
  createTaskInputSchema,
  generateContentPlanInputSchema,
  generateEmailDraftInputSchema,
  generateReportInputSchema,
  moduleOwnerSchema,
  promoteLeadToGoogleContactInputSchema,
  searchUserMemoryInputSchema,
  sendEmailInputSchema,
  toolOutputSchema,
  toolRiskLevelSchema,
  updateCRMLeadInputSchema,
  updateGoalInputSchema,
  updateProjectInputSchema,
  updateTaskInputSchema,
  updateUserMemoryInputSchema,
  generateCharacterQuestInputSchema,
  analyzeReflectionInputSchema,
  suggestDailyMissionInputSchema,
  generateExposureLadderInputSchema,
  getCharacterStateInputSchema,
  askBrainInputSchema,
  searchBrainInputSchema,
  generateInsightInputSchema,
  summarizeContentInputSchema,
  compareDocumentsInputSchema,
  listWorkspacesInputSchema,
  createWorkspaceInputSchema,
  inviteToWorkspaceInputSchema,
  getChannelStatusInputSchema,
  sendChannelMessageInputSchema,
  generateAnalyticsReportInputSchema,
  trackHabitInputSchema,
  createAutomationRuleInputSchema,
  createNoteInputSchema,
  searchNotesInputSchema,
  createContactInputSchema,
  searchContactsInputSchema,
  createDocumentInputSchema,
  searchDocumentsInputSchema,
  getSocialInboxInputSchema,
  type ModuleOwner,
  type ToolOutput,
  type ToolRiskLevel
} from './toolSchemas.js';

export interface ToolExecutionContext {
  userId: string;
  conversationId?: string;
  intent?: string;
}

export interface ToolDefinition<Input = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<Input>;
  outputSchema: typeof toolOutputSchema;
  riskLevel: ToolRiskLevel;
  approvalRequirement: 'never' | 'always';
  moduleOwner: ModuleOwner;
  execute?(input: Input, context: ToolExecutionContext): Promise<ToolOutput>;
}

const created = (entityType: string, entityId: string, summary: string, data?: unknown): ToolOutput => ({
  ok: true,
  entityType,
  entityId,
  summary,
  requiresFollowUp: false,
  data
});

const defineTool = <Input>(definition: Omit<ToolDefinition<Input>, 'outputSchema'>): ToolDefinition<Input> => ({
  ...definition,
  outputSchema: toolOutputSchema
});

const tools = [
  defineTool({
    name: 'createGoal',
    description: 'Create a canonical SMART goal draft.',
    inputSchema: createGoalInputSchema,
    riskLevel: 'medium',
    approvalRequirement: 'always',
    moduleOwner: moduleOwnerSchema.enum.goals
  }),
  defineTool({
    name: 'updateGoal',
    description: 'Update an existing canonical goal.',
    inputSchema: updateGoalInputSchema,
    riskLevel: 'medium',
    approvalRequirement: 'always',
    moduleOwner: moduleOwnerSchema.enum.goals
  }),
  defineTool({
    name: 'createTask',
    description: 'Create a local planner task.',
    inputSchema: createTaskInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.planner,
    execute: async (input, context) => {
      const task = await repositoryFactory.forUserCollection(context.userId, 'planner_tasks').create({
        ...input,
        source: 'ai',
        syncStatus: 'pending',
        externalIds: {}
      });
      return created('planner_task', task.id, `Created planner task: ${task.title}`, task);
    }
  }),
  defineTool({
    name: 'updateTask',
    description: 'Update an existing planner task.',
    inputSchema: updateTaskInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.planner,
    execute: async (input, context) => {
      const task = await repositoryFactory.forUserCollection(context.userId, 'planner_tasks').update(input.taskId, input.updates);
      return created('planner_task', task.id, `Updated planner task: ${task.title}`, task);
    }
  }),
  defineTool({
    name: 'createProject',
    description: 'Create a canonical project.',
    inputSchema: createProjectInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.projects,
    execute: async (input, context) => {
      const project = await repositoryFactory.forUserCollection(context.userId, 'projects').create({
        ...input,
        source: 'ai',
        syncStatus: 'pending',
        externalIds: {}
      });
      return created('project', project.id, `Created project: ${project.title}`, project);
    }
  }),
  defineTool({
    name: 'updateProject',
    description: 'Update an existing canonical project.',
    inputSchema: updateProjectInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.projects,
    execute: async (input, context) => {
      const project = await repositoryFactory.forUserCollection(context.userId, 'projects').update(input.projectId, input.updates);
      return created('project', project.id, `Updated project: ${project.title}`, project);
    }
  }),
  defineTool({
    name: 'createCRMLead',
    description: 'Create a local CRM lead draft.',
    inputSchema: createCRMLeadInputSchema,
    riskLevel: 'medium',
    approvalRequirement: 'always',
    moduleOwner: moduleOwnerSchema.enum.crm
  }),
  defineTool({
    name: 'updateCRMLead',
    description: 'Update a CRM lead.',
    inputSchema: updateCRMLeadInputSchema,
    riskLevel: 'medium',
    approvalRequirement: 'always',
    moduleOwner: moduleOwnerSchema.enum.crm
  }),
  defineTool({
    name: 'promoteLeadToGoogleContact',
    description: 'Create an external Google Contact from a CRM lead.',
    inputSchema: promoteLeadToGoogleContactInputSchema,
    riskLevel: 'high',
    approvalRequirement: 'always',
    moduleOwner: moduleOwnerSchema.enum.crm
  }),
  defineTool({
    name: 'generateEmailDraft',
    description: 'Generate a draft email body without sending it.',
    inputSchema: generateEmailDraftInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.gmail,
    execute: async (input, context) => {
      const result = await runSecondBrain({
        task: 'rewrite_text',
        prompt: input.prompt,
        context: { userId: context.userId, leadId: input.leadId, tone: input.tone, language: input.language }
      });
      return created('email_draft', `draft-${Date.now()}`, 'Generated email draft.', { body: result.output, source: result.source });
    }
  }),
  defineTool({
    name: 'sendEmail',
    description: 'Send email through Gmail.',
    inputSchema: sendEmailInputSchema,
    riskLevel: 'high',
    approvalRequirement: 'always',
    moduleOwner: moduleOwnerSchema.enum.gmail
  }),
  defineTool({
    name: 'createCalendarEvent',
    description: 'Create an external calendar event.',
    inputSchema: createCalendarEventInputSchema,
    riskLevel: 'high',
    approvalRequirement: 'always',
    moduleOwner: moduleOwnerSchema.enum.calendar
  }),
  defineTool({
    name: 'createFinanceTransaction',
    description: 'Create a finance transaction.',
    inputSchema: createFinanceTransactionInputSchema,
    riskLevel: 'high',
    approvalRequirement: 'always',
    moduleOwner: moduleOwnerSchema.enum.finance
  }),
  defineTool({
    name: 'generateContentPlan',
    description: 'Generate a content plan draft without publishing or scheduling.',
    inputSchema: generateContentPlanInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.content,
    execute: async (input, context) => {
      const result = await runSecondBrain({
        task: 'content_variations',
        prompt: input.prompt,
        context: { userId: context.userId, platforms: input.platforms, cadence: input.cadence, goalId: input.goalId, projectId: input.projectId }
      });
      return created('content_plan', `content-plan-${Date.now()}`, 'Generated content plan draft.', { plan: result.output, source: result.source });
    }
  }),
  defineTool({
    name: 'createPortfolioProject',
    description: 'Create a portfolio case-study draft as a memory item.',
    inputSchema: createPortfolioProjectInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.portfolio,
    execute: async (input, context) => {
      const memory = await repositoryFactory.forUserCollection(context.userId, 'memory_items').create({
        type: 'portfolio_project',
        title: input.title,
        content: input.description || input.title,
        tags: ['portfolio', ...(input.tags || [])],
        relatedEntityIds: [input.projectId].filter((value): value is string => Boolean(value)),
        aiSummary: input.description || input.title,
        importanceScore: 70,
        source: 'ai',
        syncStatus: 'pending',
        externalIds: {}
      });
      return created('portfolio_project', memory.id, `Created portfolio project draft: ${memory.title}`, memory);
    }
  }),
  defineTool({
    name: 'searchUserMemory',
    description: 'Search user memory for relevant records.',
    inputSchema: searchUserMemoryInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.memory,
    execute: async (input, context) => {
      const results = (await searchMemory(context.userId, input.query)).slice(0, input.limit);
      return created('memory_search', `memory-search-${Date.now()}`, `Found ${results.length} memory result${results.length === 1 ? '' : 's'}.`, results);
    }
  }),
  defineTool({
    name: 'updateUserMemory',
    description: 'Store durable user memory.',
    inputSchema: updateUserMemoryInputSchema,
    riskLevel: 'medium',
    approvalRequirement: 'always',
    moduleOwner: moduleOwnerSchema.enum.memory
  }),
  defineTool({
    name: 'generateDailyReport',
    description: 'Generate a daily report draft.',
    inputSchema: generateReportInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.reports,
    execute: async (input, context) => {
      const result = await runSecondBrain({
        task: 'summarize_page',
        prompt: input.prompt || `Generate a concise daily report for ${input.date || 'today'}.`,
        context: { userId: context.userId, includeCollections: input.includeCollections }
      });
      return created('daily_report', `daily-report-${Date.now()}`, 'Generated daily report draft.', { report: result.output, source: result.source });
    }
  }),
  defineTool({
    name: 'generateWeeklyReport',
    description: 'Generate a weekly report draft.',
    inputSchema: generateReportInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.reports,
    execute: async (input, context) => {
      const result = await runSecondBrain({
        task: 'summarize_page',
        prompt: input.prompt || `Generate a concise weekly report for ${input.date || 'this week'}.`,
        context: { userId: context.userId, includeCollections: input.includeCollections }
      });
      return created('weekly_report', `weekly-report-${Date.now()}`, 'Generated weekly report draft.', { report: result.output, source: result.source });
    }
  }),
  defineTool({
    name: 'generateCharacterQuest',
    description: 'Generate a character development quest to build a specific trait.',
    inputSchema: generateCharacterQuestInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.character,
    execute: async (input, context) => {
      const prompt = `Generate a character quest for trait "${input.trait}" at difficulty ${input.difficulty}. ${input.userPreferences ? `Preferences: ${input.userPreferences}` : ''}. Return valid JSON with quest details.`;
      const result = await aiGateway.generateText(prompt, { requireJson: true }, context.userId);
      return created('character_quest', `quest-${Date.now()}`, `Generated quest for ${input.trait}`, { quest: result.text });
    }
  }),
  defineTool({
    name: 'analyzeReflection',
    description: 'Analyze a character reflection entry for patterns and insights.',
    inputSchema: analyzeReflectionInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.character,
    execute: async (input, context) => {
      const prompt = `Analyze this character reflection:\n${input.reflectionText}\n\n${input.characterContext ? `Context: ${input.characterContext}` : ''}\n\nReturn valid JSON with trigger, prediction, outcome, lesson, and suggested behavior.`;
      const result = await aiGateway.generateText(prompt, { requireJson: true }, context.userId);
      return created('reflection_analysis', `reflection-${Date.now()}`, 'Analyzed reflection entry', { analysis: result.text });
    }
  }),
  defineTool({
    name: 'suggestDailyMission',
    description: 'Suggest a small daily mission for character development.',
    inputSchema: suggestDailyMissionInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.character,
    execute: async (input, context) => {
      const prompt = `Suggest a daily character mission. Focus trait: ${input.focusTrait || 'general'}. Recovery mode: ${input.recoveryMode ? 'yes - keep it very small' : 'no'}. Return valid JSON with mission details.`;
      const result = await aiGateway.generateText(prompt, { requireJson: true }, context.userId);
      return created('daily_mission', `mission-${Date.now()}`, 'Generated daily mission', { mission: result.text });
    }
  }),
  defineTool({
    name: 'generateExposureLadder',
    description: 'Generate a graduated exposure ladder for anxiety-provoking behaviors.',
    inputSchema: generateExposureLadderInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.character,
    execute: async (input, context) => {
      const prompt = `Generate an exposure ladder for behavior: ${input.behavior}. Starting difficulty: ${input.startingDifficulty}. ${input.desiredOutcome ? `Desired outcome: ${input.desiredOutcome}` : ''}. Return valid JSON with steps array.`;
      const result = await aiGateway.generateText(prompt, { requireJson: true }, context.userId);
      return created('exposure_ladder', `ladder-${Date.now()}`, 'Generated exposure ladder', { ladder: result.text });
    }
  }),
  defineTool({
    name: 'getCharacterState',
    description: 'Get the current character development state summary.',
    inputSchema: getCharacterStateInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.character,
    execute: async (_input, context) => {
      const memory = await searchMemory(context.userId, 'character state');
      return created('character_state', `state-${Date.now()}`, 'Retrieved character state', { state: memory.slice(0, 5) });
    }
  }),
  defineTool({
    name: 'askBrain',
    description: 'Ask the AI brain a question using personal knowledge base.',
    inputSchema: askBrainInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.brain,
    execute: async (input, context) => {
      const ids: string[] = (input as { contextIds?: string[] }).contextIds || [];
      const contextPrompt = ids.length ? `\nRelevant context IDs: ${ids.join(', ')}` : '';
      const prompt = `Answer based on personal knowledge and memory: ${input.question}${contextPrompt}`;
      const result = await aiGateway.generateText(prompt, {}, context.userId);
      return created('brain_answer', `brain-${Date.now()}`, result.text);
    }
  }),
  defineTool({
    name: 'searchBrain',
    description: 'Search all brain knowledge including memory, documents, and notes.',
    inputSchema: searchBrainInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.brain,
    execute: async (input, context) => {
      const results = (await searchMemory(context.userId, input.query)).slice(0, input.limit);
      return created('brain_search', `search-${Date.now()}`, `Found ${results.length} results`, { results });
    }
  }),
  defineTool({
    name: 'generateInsight',
    description: 'Generate an analytical insight from provided data.',
    inputSchema: generateInsightInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.analytics,
    execute: async (input, context) => {
      const prompt = `Generate a ${input.insightType} insight from this data:\n${JSON.stringify(input.data)}\n${input.context ? `Context: ${input.context}` : ''}\nReturn valid JSON with insight, confidence, and recommendation.`;
      const result = await aiGateway.generateText(prompt, { requireJson: true }, context.userId);
      return created('insight', `insight-${Date.now()}`, 'Generated insight', { insight: result.text });
    }
  }),
  defineTool({
    name: 'summarizeContent',
    description: 'Summarize text content into a concise format.',
    inputSchema: summarizeContentInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.brain,
    execute: async (input, context) => {
      const prompt = `Summarize the following content in ${input.format} format (max ${input.maxLength} characters):\n\n${input.content}`;
      const result = await aiGateway.generateText(prompt, {}, context.userId);
      return created('summary', `summary-${Date.now()}`, 'Content summarized', { summary: result.text });
    }
  }),
  defineTool({
    name: 'compareDocuments',
    description: 'Compare two documents or pieces of content and highlight differences.',
    inputSchema: compareDocumentsInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.brain,
    execute: async (input, context) => {
      const prompt = `Compare these two documents on the aspect of "${input.aspect}":\n\nDOCUMENT A:\n${input.documentA}\n\nDOCUMENT B:\n${input.documentB}\n\nReturn key similarities, differences, and insights.`;
      const result = await aiGateway.generateText(prompt, {}, context.userId);
      return created('comparison', `compare-${Date.now()}`, 'Documents compared', { comparison: result.text });
    }
  }),
  defineTool({
    name: 'listWorkspaces',
    description: 'List all workspaces the user has access to.',
    inputSchema: listWorkspacesInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.workspace,
    execute: async (input, context) => {
      const { userDocumentStore } = await import('../userDocumentStore.js');
      let workspaces: Record<string, unknown>[] = [];
      try {
        const doc = await userDocumentStore.readUserDoc<{ workspaces: Record<string, unknown>[] }>(context.userId, 'workspace_list', 'all');
        workspaces = doc?.workspaces || [];
      } catch {
        workspaces = [];
      }
      const includeArchived = (input as { includeArchived?: boolean }).includeArchived ?? false;
      const filtered = includeArchived ? workspaces : workspaces.filter(r => (r as Record<string, unknown>).status !== 'archived');
      return created('workspace_list', `list-${Date.now()}`, `Found ${filtered.length} workspaces`, { workspaces: filtered });
    }
  }),
  defineTool({
    name: 'createWorkspace',
    description: 'Create a new workspace for organizing goals, projects, and tasks.',
    inputSchema: createWorkspaceInputSchema,
    riskLevel: 'medium',
    approvalRequirement: 'always',
    moduleOwner: moduleOwnerSchema.enum.workspace
  }),
  defineTool({
    name: 'inviteToWorkspace',
    description: 'Invite a user to a workspace by email.',
    inputSchema: inviteToWorkspaceInputSchema,
    riskLevel: 'medium',
    approvalRequirement: 'always',
    moduleOwner: moduleOwnerSchema.enum.workspace
  }),
  defineTool({
    name: 'getChannelStatus',
    description: 'Get the connection status of messaging channels.',
    inputSchema: getChannelStatusInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.channel,
    execute: async () => {
      const { telegramAdapter, whatsappAdapter } = await import('../../channels/index.js');
      const telegram = telegramAdapter.getHealth();
      const whatsapp = whatsappAdapter.getHealth();
      return created('channel_status', `status-${Date.now()}`, 'Channel status retrieved', { telegram, whatsapp });
    }
  }),
  defineTool({
    name: 'sendChannelMessage',
    description: 'Send a message through Telegram or WhatsApp.',
    inputSchema: sendChannelMessageInputSchema,
    riskLevel: 'medium',
    approvalRequirement: 'always',
    moduleOwner: moduleOwnerSchema.enum.channel
  }),
  defineTool({
    name: 'generateAnalyticsReport',
    description: 'Generate an analytics report for productivity, finance, CRM, or character data.',
    inputSchema: generateAnalyticsReportInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.analytics,
    execute: async (input, context) => {
      const prompt = `Generate a ${input.metricType} analytics report. ${input.dateRange ? `Date range: ${input.dateRange.start} to ${input.dateRange.end}.` : ''}\nReturn valid JSON with summary, metrics, and recommendations.`;
      const result = await aiGateway.generateText(prompt, { requireJson: true }, context.userId);
      return created('analytics_report', `report-${Date.now()}`, 'Generated analytics report', { report: result.text });
    }
  }),
  defineTool({
    name: 'trackHabit',
    description: 'Track a habit completion with optional difficulty rating.',
    inputSchema: trackHabitInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.analytics,
    execute: async (input, context) => {
      const { userDocumentStore } = await import('../userDocumentStore.js');
      const typed = input as { habitName: string; completed: boolean; date?: string; notes?: string; difficulty?: number };
      const id = `habit-${Date.now()}`;
      const record = {
        id,
        habitName: typed.habitName,
        completed: typed.completed,
        date: typed.date || new Date().toISOString(),
        notes: typed.notes || '',
        difficulty: typed.difficulty,
        createdAt: new Date().toISOString()
      };
      await userDocumentStore.writeUserDoc(context.userId, 'habit_logs', id, record);
      return created('habit_log', id, `Tracked habit: ${typed.habitName}`, record);
    }
  }),
  defineTool({
    name: 'createAutomationRule',
    description: 'Create a new automation rule that triggers on events.',
    inputSchema: createAutomationRuleInputSchema,
    riskLevel: 'medium',
    approvalRequirement: 'always',
    moduleOwner: moduleOwnerSchema.enum.automation
  }),
  defineTool({
    name: 'createNote',
    description: 'Create a durable note in memory or a collection.',
    inputSchema: createNoteInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.notes,
    execute: async (input, context) => {
      const memory = await repositoryFactory.forUserCollection(context.userId, 'memory_items').create({
        type: 'note',
        title: input.title,
        content: input.content,
        tags: input.tags,
        importanceScore: input.importance,
        source: 'ai',
        syncStatus: 'pending',
        externalIds: {}
      });
      return created('note', memory.id, `Created note: ${input.title}`, memory);
    }
  }),
  defineTool({
    name: 'searchNotes',
    description: 'Search through notes and memory items.',
    inputSchema: searchNotesInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.notes,
    execute: async (input, context) => {
      const results = (await searchMemory(context.userId, input.query)).slice(0, input.limit);
      return created('note_search', `search-${Date.now()}`, `Found ${results.length} notes`, { results });
    }
  }),
  defineTool({
    name: 'createContact',
    description: 'Create a contact record.',
    inputSchema: createContactInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.contacts,
    execute: async (input, context) => {
      const contact = await repositoryFactory.forUserCollection(context.userId, 'crm_contacts').create({
        ...input,
        source: 'ai',
        syncStatus: 'pending',
        externalIds: {}
      });
      return created('contact', contact.id, `Created contact: ${input.name}`, contact);
    }
  }),
  defineTool({
    name: 'searchContacts',
    description: 'Search through contact records.',
    inputSchema: searchContactsInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.contacts,
    execute: async (input, context) => {
      const results = await repositoryFactory.forUserCollection(context.userId, 'crm_contacts').list(input.limit);
      const filtered = results.filter(r =>
        !input.query || r.name?.toLowerCase().includes(input.query.toLowerCase()) || r.email?.toLowerCase().includes(input.query.toLowerCase())
      );
      return created('contact_search', `search-${Date.now()}`, `Found ${filtered.length} contacts`, { contacts: filtered });
    }
  }),
  defineTool({
    name: 'createDocument',
    description: 'Create a document or long-form note.',
    inputSchema: createDocumentInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.documents,
    execute: async (input, context) => {
      const doc = await repositoryFactory.forUserCollection(context.userId, 'memory_items').create({
        type: input.documentType,
        title: input.title,
        content: input.content,
        tags: input.tags,
        importanceScore: 65,
        source: 'ai',
        syncStatus: 'pending',
        externalIds: {}
      });
      return created('document', doc.id, `Created document: ${input.title}`, doc);
    }
  }),
  defineTool({
    name: 'searchDocuments',
    description: 'Search through documents by query and type.',
    inputSchema: searchDocumentsInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.documents,
    execute: async (input, context) => {
      const results = (await searchMemory(context.userId, input.query)).slice(0, input.limit);
      const filtered = input.documentType ? results.filter(r => r.type === input.documentType) : results;
      return created('document_search', `search-${Date.now()}`, `Found ${filtered.length} documents`, { documents: filtered });
    }
  }),
  defineTool({
    name: 'getSocialInbox',
    description: 'Get recent social inbox messages from various platforms.',
    inputSchema: getSocialInboxInputSchema,
    riskLevel: 'low',
    approvalRequirement: 'never',
    moduleOwner: moduleOwnerSchema.enum.social,
    execute: async (_input, context) => {
      const { userDocumentStore } = await import('../userDocumentStore.js');
      let messages: Record<string, unknown>[] = [];
      try {
        const doc = await userDocumentStore.readUserDoc<{ messages: Record<string, unknown>[] }>(context.userId, 'social_inbox', 'recent');
        messages = doc?.messages || [];
      } catch {
        messages = [];
      }
      return created('social_inbox', `inbox-${Date.now()}`, `Retrieved social inbox`, { messages });
    }
  })
] satisfies ToolDefinition[];

export const toolRegistry: Map<string, ToolDefinition> = new Map(tools.map(tool => [tool.name, tool as ToolDefinition]));

export const getTool = (name: string) => toolRegistry.get(name);
export const listTools = () => [...toolRegistry.values()].map(tool => ({
  name: tool.name,
  description: tool.description,
  riskLevel: tool.riskLevel,
  approvalRequirement: tool.approvalRequirement,
  moduleOwner: tool.moduleOwner
}));

export const toolDefinitionSchema = {
  riskLevel: toolRiskLevelSchema,
  output: toolOutputSchema
};
