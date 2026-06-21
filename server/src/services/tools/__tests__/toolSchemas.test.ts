// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  createGoalInputSchema,
  updateGoalInputSchema,
  createTaskInputSchema,
  updateTaskInputSchema,
  createProjectInputSchema,
  updateProjectInputSchema,
  createCRMLeadInputSchema,
  updateCRMLeadInputSchema,
  promoteLeadToGoogleContactInputSchema,
  generateEmailDraftInputSchema,
  sendEmailInputSchema,
  createCalendarEventInputSchema,
  createFinanceTransactionInputSchema,
  generateContentPlanInputSchema,
  createPortfolioProjectInputSchema,
  searchUserMemoryInputSchema,
  updateUserMemoryInputSchema,
  generateReportInputSchema,
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
  toolOutputSchema,
  toolRiskLevelSchema,
  moduleOwnerSchema,
} from '../toolSchemas.js';

const validId = 'abc-123';

describe('toolSchemas', () => {
  describe('toolRiskLevelSchema', () => {
    it('accepts low', () => {
      expect(toolRiskLevelSchema.parse('low')).toBe('low');
    });
    it('accepts medium', () => {
      expect(toolRiskLevelSchema.parse('medium')).toBe('medium');
    });
    it('accepts high', () => {
      expect(toolRiskLevelSchema.parse('high')).toBe('high');
    });
    it('rejects invalid risk level', () => {
      expect(() => toolRiskLevelSchema.parse('critical')).toThrow();
    });
  });

  describe('moduleOwnerSchema', () => {
    it('accepts all 21 module owners', () => {
      const owners = [
        'goals', 'planner', 'projects', 'crm', 'gmail', 'calendar',
        'finance', 'content', 'portfolio', 'memory', 'reports',
        'character', 'brain', 'workspace', 'channel', 'analytics',
        'automation', 'notes', 'contacts', 'documents', 'social'
      ];
      for (const owner of owners) {
        expect(moduleOwnerSchema.parse(owner)).toBe(owner);
      }
    });
    it('rejects invalid module owner', () => {
      expect(() => moduleOwnerSchema.parse('invalid_module')).toThrow();
    });
  });

  describe('toolOutputSchema', () => {
    it('accepts valid output', () => {
      const result = toolOutputSchema.parse({
        ok: true,
        entityType: 'task',
        entityId: 'id-1',
        summary: 'Task created',
        requiresFollowUp: false,
        data: { id: 'id-1' }
      });
      expect(result.ok).toBe(true);
      expect(result.summary).toBe('Task created');
    });
    it('accepts minimal output (ok + summary)', () => {
      const result = toolOutputSchema.parse({ ok: true, summary: 'done' });
      expect(result.requiresFollowUp).toBe(false);
    });
    it('rejects missing summary', () => {
      expect(() => toolOutputSchema.parse({ ok: true })).toThrow();
    });
  });

  describe('createGoalInputSchema', () => {
    it('accepts valid input', () => {
      const result = createGoalInputSchema.parse({ title: 'Learn Rust' });
      expect(result.title).toBe('Learn Rust');
      expect(result.activities).toEqual([]);
    });
    it('accepts with SMART fields', () => {
      const input = {
        title: 'Ship feature',
        description: 'Launch v2',
        level: 'quarterly',
        targetDate: '2026-12-31',
        smart: { specific: 'Build X', measurable: '100 users' }
      };
      expect(createGoalInputSchema.parse(input).smart?.specific).toBe('Build X');
    });
    it('rejects empty title', () => {
      expect(() => createGoalInputSchema.parse({ title: '' })).toThrow();
    });
  });

  describe('updateGoalInputSchema', () => {
    it('accepts valid update', () => {
      const result = updateGoalInputSchema.parse({ goalId: validId, updates: { title: 'New title' } });
      expect(result.goalId).toBe(validId);
      expect(result.updates.title).toBe('New title');
    });
    it('rejects missing goalId', () => {
      expect(() => updateGoalInputSchema.parse({ updates: { title: 'x' } })).toThrow();
    });
  });

  describe('createTaskInputSchema', () => {
    it('accepts valid input with defaults', () => {
      const result = createTaskInputSchema.parse({ title: 'Do thing' });
      expect(result.status).toBe('todo');
    });
    it('accepts full input', () => {
      const result = createTaskInputSchema.parse({
        title: 'Task', status: 'in_progress', priority: 'high',
        dueDate: '2026-07-01', goalId: 'g-1', estimatedMinutes: 60
      });
      expect(result.estimatedMinutes).toBe(60);
    });
    it('rejects empty title', () => {
      expect(() => createTaskInputSchema.parse({ title: '' })).toThrow();
    });
  });

  describe('updateTaskInputSchema', () => {
    it('accepts valid update', () => {
      expect(updateTaskInputSchema.parse({ taskId: validId, updates: { status: 'done' } }).updates.status).toBe('done');
    });
  });

  describe('createProjectInputSchema', () => {
    it('accepts valid input', () => {
      const result = createProjectInputSchema.parse({ title: 'Project X' });
      expect(result.status).toBe('planning');
      expect(result.tags).toEqual([]);
    });
    it('accepts full input', () => {
      const result = createProjectInputSchema.parse({
        title: 'P', description: 'desc', category: 'dev',
        status: 'active', deadline: '2026-08-01', clientId: 'c-1', tags: ['urgent']
      });
      expect(result.category).toBe('dev');
    });
  });

  describe('updateProjectInputSchema', () => {
    it('accepts valid update', () => {
      expect(updateProjectInputSchema.parse({ projectId: validId, updates: { status: 'completed' } }).updates.status).toBe('completed');
    });
  });

  describe('createCRMLeadInputSchema', () => {
    it('accepts minimal input', () => {
      const result = createCRMLeadInputSchema.parse({ name: 'John Doe' });
      expect(result.status).toBe('new');
    });
    it('accepts full input', () => {
      const result = createCRMLeadInputSchema.parse({
        name: 'Jane', email: 'jane@test.com', phoneOrHandle: '@jane',
        serviceInterest: 'design', budgetRange: '5k-10k'
      });
      expect(result.email).toBe('jane@test.com');
    });
    it('rejects invalid email', () => {
      expect(() => createCRMLeadInputSchema.parse({ name: 'x', email: 'not-an-email' })).toThrow();
    });
  });

  describe('updateCRMLeadInputSchema', () => {
    it('accepts valid update', () => {
      expect(updateCRMLeadInputSchema.parse({ leadId: validId, updates: { status: 'contacted' } }).updates.status).toBe('contacted');
    });
  });

  describe('generateEmailDraftInputSchema', () => {
    it('accepts valid input', () => {
      const result = generateEmailDraftInputSchema.parse({ prompt: 'Write intro email' });
      expect(result.prompt).toBe('Write intro email');
    });
    it('rejects empty prompt', () => {
      expect(() => generateEmailDraftInputSchema.parse({ prompt: '' })).toThrow();
    });
  });

  describe('sendEmailInputSchema', () => {
    it('accepts valid input', () => {
      const result = sendEmailInputSchema.parse({ to: 'a@b.com', subject: 'Hi', body: 'Hello there' });
      expect(result.to).toBe('a@b.com');
    });
    it('rejects invalid email', () => {
      expect(() => sendEmailInputSchema.parse({ to: 'bad', subject: 'x', body: 'x' })).toThrow();
    });
  });

  describe('createCalendarEventInputSchema', () => {
    it('accepts valid input', () => {
      const result = createCalendarEventInputSchema.parse({ title: 'Meeting', date: '2026-07-01T10:00:00Z' });
      expect(result.title).toBe('Meeting');
    });
  });

  describe('createFinanceTransactionInputSchema', () => {
    it('accepts valid input', () => {
      const result = createFinanceTransactionInputSchema.parse({ date: '2026-06-20', amount: 150.50 });
      expect(result.amount).toBe(150.50);
      expect(result.currency).toBe('USD');
    });
  });

  describe('generateContentPlanInputSchema', () => {
    it('accepts valid input', () => {
      const result = generateContentPlanInputSchema.parse({ prompt: 'Plan', platforms: ['twitter'] });
      expect(result.platforms).toEqual(['twitter']);
    });
  });

  describe('createPortfolioProjectInputSchema', () => {
    it('accepts valid input', () => {
      const result = createPortfolioProjectInputSchema.parse({ title: 'Portfolio Item' });
      expect(result.tags).toEqual([]);
    });
  });

  describe('searchUserMemoryInputSchema', () => {
    it('applies default limit', () => {
      const result = searchUserMemoryInputSchema.parse({ query: 'find this' });
      expect(result.limit).toBe(8);
    });
    it('rejects limit > 20', () => {
      expect(() => searchUserMemoryInputSchema.parse({ query: 'x', limit: 99 })).toThrow();
    });
  });

  describe('updateUserMemoryInputSchema', () => {
    it('accepts valid input', () => {
      const result = updateUserMemoryInputSchema.parse({ title: 'Memo', content: 'Content here' });
      expect(result.type).toBe('note');
      expect(result.tags).toEqual([]);
    });
  });

  describe('generateReportInputSchema', () => {
    it('accepts empty input with defaults', () => {
      const result = generateReportInputSchema.parse({});
      expect(result.includeCollections).toEqual([]);
    });
  });

  describe('character coach tool schemas', () => {
    it('generateCharacterQuestInputSchema', () => {
      const r = generateCharacterQuestInputSchema.parse({ trait: 'patience', difficulty: 5 });
      expect(r.difficulty).toBe(5);
    });

    it('analyzeReflectionInputSchema', () => {
      const r = analyzeReflectionInputSchema.parse({ reflectionText: 'Today I...', consentGiven: true });
      expect(r.consentGiven).toBe(true);
    });
    it('analyzeReflectionInputSchema rejects without consent', () => {
      expect(() => analyzeReflectionInputSchema.parse({ reflectionText: 'x', consentGiven: false })).not.toThrow();
    });

    it('suggestDailyMissionInputSchema', () => {
      const r = suggestDailyMissionInputSchema.parse({ recoveryMode: true });
      expect(r.recoveryMode).toBe(true);
      expect(r.focusTrait).toBeUndefined();
    });

    it('generateExposureLadderInputSchema', () => {
      const r = generateExposureLadderInputSchema.parse({ behavior: 'public speaking', startingDifficulty: 3 });
      expect(r.startingDifficulty).toBe(3);
    });

    it('getCharacterStateInputSchema', () => {
      const r = getCharacterStateInputSchema.parse({ includeQuests: true });
      expect(r.includeQuests).toBe(true);
      expect(r.includeLadders).toBe(false);
    });
  });

  describe('brain tool schemas', () => {
    it('askBrainInputSchema', () => {
      const r = askBrainInputSchema.parse({ question: 'What is my goal?' });
      expect(r.contextIds).toEqual([]);
    });
    it('searchBrainInputSchema', () => {
      const r = searchBrainInputSchema.parse({ query: 'goals' });
      expect(r.limit).toBe(10);
    });
  });

  describe('generateInsightInputSchema', () => {
    it('accepts valid input', () => {
      const r = generateInsightInputSchema.parse({ data: { value: 42 } });
      expect(r.insightType).toBe('summary');
    });
  });

  describe('summarizeContentInputSchema', () => {
    it('accepts valid input', () => {
      const r = summarizeContentInputSchema.parse({ content: 'Long text...' });
      expect(r.maxLength).toBe(500);
      expect(r.format).toBe('paragraph');
    });
  });

  describe('compareDocumentsInputSchema', () => {
    it('accepts valid input', () => {
      const r = compareDocumentsInputSchema.parse({ documentA: 'A', documentB: 'B' });
      expect(r.aspect).toBe('general');
    });
  });

  describe('workspace schemas', () => {
    it('listWorkspacesInputSchema', () => {
      const r = listWorkspacesInputSchema.parse({});
      expect(r.includeArchived).toBe(false);
    });
    it('createWorkspaceInputSchema', () => {
      const r = createWorkspaceInputSchema.parse({ name: 'New Workspace' });
      expect(r.settings).toEqual({});
    });
    it('inviteToWorkspaceInputSchema', () => {
      const r = inviteToWorkspaceInputSchema.parse({ workspaceId: validId, email: 'user@test.com' });
      expect(r.role).toBe('member');
    });
  });

  describe('channel schemas', () => {
    it('getChannelStatusInputSchema', () => {
      const r = getChannelStatusInputSchema.parse({});
      expect(r.channelType).toBe('all');
    });
    it('sendChannelMessageInputSchema', () => {
      const r = sendChannelMessageInputSchema.parse({ channelType: 'telegram', channelUserId: '123', text: 'Hello' });
      expect(r.parseMode).toBe('markdown');
    });
  });

  describe('generateAnalyticsReportInputSchema', () => {
    it('accepts valid input', () => {
      const r = generateAnalyticsReportInputSchema.parse({ metricType: 'productivity' });
      expect(r.filters).toEqual({});
    });
  });

  describe('trackHabitInputSchema', () => {
    it('accepts valid input', () => {
      const r = trackHabitInputSchema.parse({ habitName: 'Exercise', completed: true });
      expect(r.completed).toBe(true);
    });
  });

  describe('createAutomationRuleInputSchema', () => {
    it('accepts valid input', () => {
      const r = createAutomationRuleInputSchema.parse({
        name: 'Auto-tag', trigger: { event: 'lead.created' }, action: { type: 'tag' }
      });
      expect(r.enabled).toBe(true);
    });
  });

  describe('note schemas', () => {
    it('createNoteInputSchema', () => {
      const r = createNoteInputSchema.parse({ title: 'Note', content: 'Body' });
      expect(r.importance).toBe(50);
    });
    it('searchNotesInputSchema', () => {
      const r = searchNotesInputSchema.parse({ query: 'keyword' });
      expect(r.limit).toBe(10);
    });
  });

  describe('contact schemas', () => {
    it('createContactInputSchema', () => {
      const r = createContactInputSchema.parse({ name: 'Alice' });
      expect(r.tags).toEqual([]);
    });
    it('searchContactsInputSchema', () => {
      const r = searchContactsInputSchema.parse({ query: 'Alice' });
      expect(r.limit).toBe(10);
    });
  });

  describe('document schemas', () => {
    it('createDocumentInputSchema', () => {
      const r = createDocumentInputSchema.parse({ title: 'Doc', content: 'Body' });
      expect(r.documentType).toBe('note');
    });
    it('searchDocumentsInputSchema', () => {
      const r = searchDocumentsInputSchema.parse({ query: 'keyword' });
      expect(r.limit).toBe(10);
    });
  });

  describe('getSocialInboxInputSchema', () => {
    it('applies defaults', () => {
      const r = getSocialInboxInputSchema.parse({});
      expect(r.unreadOnly).toBe(true);
      expect(r.limit).toBe(10);
    });
  });
});
