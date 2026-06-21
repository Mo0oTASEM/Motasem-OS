// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { toolRegistry, getTool, listTools } from '../toolRegistry.js';

describe('toolRegistry', () => {
  it('has 44 registered tools', () => {
    expect(toolRegistry.size).toBe(44);
  });

  it('contains all expected tool names', () => {
    const names = [...toolRegistry.keys()].sort();
    expect(names).toEqual([
      'analyzeReflection',
      'askBrain',
      'compareDocuments',
      'createAutomationRule',
      'createCRMLead',
      'createCalendarEvent',
      'createContact',
      'createDocument',
      'createFinanceTransaction',
      'createGoal',
      'createNote',
      'createPortfolioProject',
      'createProject',
      'createTask',
      'createWorkspace',
      'generateAnalyticsReport',
      'generateCharacterQuest',
      'generateContentPlan',
      'generateDailyReport',
      'generateEmailDraft',
      'generateExposureLadder',
      'generateInsight',
      'generateWeeklyReport',
      'getChannelStatus',
      'getCharacterState',
      'getSocialInbox',
      'inviteToWorkspace',
      'listWorkspaces',
      'promoteLeadToGoogleContact',
      'searchBrain',
      'searchContacts',
      'searchDocuments',
      'searchNotes',
      'searchUserMemory',
      'sendChannelMessage',
      'sendEmail',
      'suggestDailyMission',
      'summarizeContent',
      'trackHabit',
      'updateCRMLead',
      'updateGoal',
      'updateProject',
      'updateTask',
      'updateUserMemory',
    ]);
  });

  describe('getTool', () => {
    it('returns a tool definition for existing tool', () => {
      const tool = getTool('createTask');
      expect(tool).toBeDefined();
      expect(tool!.name).toBe('createTask');
    });

    it('returns undefined for unknown tool', () => {
      expect(getTool('nonexistent')).toBeUndefined();
    });
  });

  describe('listTools', () => {
    it('returns summaries for all tools', () => {
      const tools = listTools();
      expect(tools.length).toBe(44);
      for (const t of tools) {
        expect(t.name).toBeTruthy();
        expect(t.description).toBeTruthy();
        expect(['low', 'medium', 'high']).toContain(t.riskLevel);
        expect(['never', 'always']).toContain(t.approvalRequirement);
        expect(t.moduleOwner).toBeTruthy();
      }
    });
  });

  describe('tool metadata', () => {
    const getRiskCount = (level: string) =>
      [...toolRegistry.values()].filter(t => t.riskLevel === level).length;

    const getApprovalCount = (req: string) =>
      [...toolRegistry.values()].filter(t => t.approvalRequirement === req).length;

    it('has 31 low-risk tools', () => {
      expect(getRiskCount('low')).toBe(31);
    });
    it('has 9 medium-risk tools', () => {
      expect(getRiskCount('medium')).toBe(9);
    });
    it('has 4 high-risk tools', () => {
      expect(getRiskCount('high')).toBe(4);
    });

    it('has 13 tools requiring approval', () => {
      expect(getApprovalCount('always')).toBe(13);
    });
    it('has 31 tools that never need approval', () => {
      expect(getApprovalCount('never')).toBe(31);
    });

    it('every tool with execute has risk low + never approval', () => {
      for (const [name, tool] of toolRegistry) {
        if (tool.execute) {
          expect(tool.riskLevel).toBe('low');
          expect(tool.approvalRequirement).toBe('never');
        }
      }
    });

    it('every tool without execute has risk medium/high or approval always', () => {
      for (const [name, tool] of toolRegistry) {
        if (!tool.execute) {
          const needsApproval = tool.riskLevel === 'medium' || tool.riskLevel === 'high' || tool.approvalRequirement === 'always';
          expect(needsApproval).toBe(true);
        }
      }
    });
  });

  describe('module ownership', () => {
    const getToolsByOwner = (owner: string) =>
      [...toolRegistry.values()].filter(t => t.moduleOwner === owner);

    it('character module has 5 tools', () => {
      expect(getToolsByOwner('character').map(t => t.name).sort()).toEqual([
        'analyzeReflection', 'generateCharacterQuest', 'generateExposureLadder',
        'getCharacterState', 'suggestDailyMission'
      ]);
    });

    it('brain module has 4 tools', () => {
      expect(getToolsByOwner('brain').map(t => t.name).sort()).toEqual([
        'askBrain', 'compareDocuments', 'searchBrain', 'summarizeContent'
      ]);
    });

    it('planner module has 2 tools', () => {
      expect(getToolsByOwner('planner').map(t => t.name).sort()).toEqual([
        'createTask', 'updateTask'
      ]);
    });

    it('crm module has 3 tools', () => {
      expect(getToolsByOwner('crm').map(t => t.name).sort()).toEqual([
        'createCRMLead', 'promoteLeadToGoogleContact', 'updateCRMLead'
      ]);
    });
  });

  describe('execute functions exist on expected tools', () => {
    const toolsWithExec = [...toolRegistry.values()].filter(t => t.execute).map(t => t.name);

    it('includes all CRUD tools', () => {
      expect(toolsWithExec).toContain('createTask');
      expect(toolsWithExec).toContain('updateTask');
      expect(toolsWithExec).toContain('createProject');
      expect(toolsWithExec).toContain('updateProject');
      expect(toolsWithExec).toContain('createNote');
      expect(toolsWithExec).toContain('createContact');
      expect(toolsWithExec).toContain('createDocument');
    });

    it('includes all AI-generating tools', () => {
      expect(toolsWithExec).toContain('generateEmailDraft');
      expect(toolsWithExec).toContain('generateContentPlan');
      expect(toolsWithExec).toContain('generateDailyReport');
      expect(toolsWithExec).toContain('generateWeeklyReport');
      expect(toolsWithExec).toContain('generateCharacterQuest');
      expect(toolsWithExec).toContain('analyzeReflection');
      expect(toolsWithExec).toContain('suggestDailyMission');
      expect(toolsWithExec).toContain('generateExposureLadder');
      expect(toolsWithExec).toContain('askBrain');
      expect(toolsWithExec).toContain('generateInsight');
      expect(toolsWithExec).toContain('summarizeContent');
      expect(toolsWithExec).toContain('compareDocuments');
      expect(toolsWithExec).toContain('generateAnalyticsReport');
    });

    it('includes search/list tools', () => {
      expect(toolsWithExec).toContain('searchUserMemory');
      expect(toolsWithExec).toContain('searchBrain');
      expect(toolsWithExec).toContain('searchNotes');
      expect(toolsWithExec).toContain('searchContacts');
      expect(toolsWithExec).toContain('searchDocuments');
      expect(toolsWithExec).toContain('listWorkspaces');
    });

    it('includes channel tools', () => {
      expect(toolsWithExec).toContain('getChannelStatus');
    });

    it('includes social tools', () => {
      expect(toolsWithExec).toContain('getSocialInbox');
    });

    it('includes habit tools', () => {
      expect(toolsWithExec).toContain('trackHabit');
    });

    it('includes portfolio tools', () => {
      expect(toolsWithExec).toContain('createPortfolioProject');
    });

    it('includes character state', () => {
      expect(toolsWithExec).toContain('getCharacterState');
    });
  });
});
