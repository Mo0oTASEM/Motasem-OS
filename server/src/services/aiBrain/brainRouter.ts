import type { AiAction, AiCommandRequest, AiCommandResponse, AiMemoryUpdate, HermesOutput } from './aiSchemas.js';
import { buildAiContext } from '../context/contextBuilder.js';
import { detectIntent, type DetectedIntent } from './intentDetector.js';
import { callHermes } from './providers/hermesProvider.js';
import { executeToolActions } from '../tools/toolExecutor.js';

const actionId = () => `ai-action-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const summarizeContext = (intent: DetectedIntent, contextSummary: {
  goalCount: number;
  taskCount: number;
  projectCount: number;
  leadCount: number;
  memoryCount: number;
  pendingApprovalCount: number;
}) => {
  const parts = [
    `Intent detected: ${intent.intent} (${Math.round(intent.confidence * 100)}% confidence).`,
    intent.reason,
    `Context slice: ${contextSummary.goalCount} goals, ${contextSummary.taskCount} planner tasks, ${contextSummary.projectCount} projects, ${contextSummary.leadCount} leads, ${contextSummary.memoryCount} memory snippets, ${contextSummary.pendingApprovalCount} pending approvals.`
  ];

  if (intent.risk === 'high') {
    parts.push('I will not execute high-risk or external actions from this route; I can only propose them for approval.');
  }

  return parts.join(' ');
};

const extractTitle = (message: string) => {
  const withoutSlash = message.replace(/^\/\w+\s*/, '').trim();
  return withoutSlash || message.trim();
};

const proposeActions = (request: AiCommandRequest, intent: DetectedIntent): AiAction[] => {
  const title = extractTitle(request.message);

  if (intent.intent === 'create_goal') {
    return [{
      id: actionId(),
      tool: 'createGoal',
      risk: 'medium',
      requiresApproval: true,
      input: {
        title,
        sourceMessage: request.message,
        currentView: request.currentView
      },
      reason: 'Creating or materially changing goals should be reviewed before persistence.',
      status: 'pending_approval'
    }];
  }

  if (intent.intent === 'planner_task' || request.message.trim().toLowerCase().startsWith('/todo')) {
    return [{
      id: actionId(),
      tool: 'createTask',
      risk: 'low',
      requiresApproval: false,
      input: {
        title,
        selectedEntityId: request.selectedEntityId,
        currentView: request.currentView
      },
      reason: 'Low-risk planner task proposal. Execution is deferred until the tool layer is connected.',
      status: 'proposed'
    }];
  }

  if (intent.intent === 'crm_assist') {
    const externalSend = /send|contact|email this|publish/i.test(request.message);
    return [{
      id: actionId(),
      tool: externalSend ? 'sendEmail' : 'generateEmailDraft',
      risk: externalSend ? 'high' : 'low',
      requiresApproval: externalSend,
      input: {
        prompt: request.message,
        selectedEntityId: request.selectedEntityId,
        currentView: request.currentView
      },
      reason: externalSend
        ? 'Contacting a lead or sending email requires explicit approval.'
        : 'Draft generation is low-risk and can be reviewed before any external action.',
      status: externalSend ? 'pending_approval' : 'proposed'
    }];
  }

  if (intent.intent === 'finance_review') {
    const mutating = /add|edit|delete|update|log|record/i.test(request.message);
    return [{
      id: actionId(),
      tool: mutating ? 'createFinanceTransaction' : 'generateDailyReport',
      risk: mutating ? 'high' : 'low',
      requiresApproval: mutating,
      input: {
        prompt: request.message,
        currentView: request.currentView
      },
      reason: mutating
        ? 'Finance changes are high-risk and must be approved.'
        : 'Finance review can be answered from the current context slice.',
      status: mutating ? 'pending_approval' : 'proposed'
    }];
  }

  if (intent.intent === 'memory_search_or_note') {
    const storeMemory = /remember|save|store|note/i.test(request.message);
    return [{
      id: actionId(),
      tool: storeMemory ? 'updateUserMemory' : 'searchUserMemory',
      risk: storeMemory ? 'medium' : 'low',
      requiresApproval: storeMemory,
      input: {
        query: request.message,
        currentView: request.currentView
      },
      reason: storeMemory
        ? 'Storing durable memory should be reviewed for privacy and accuracy.'
        : 'Memory search is read-only.',
      status: storeMemory ? 'pending_approval' : 'proposed'
    }];
  }

  if (intent.intent === 'high_risk_action_request') {
    return [{
      id: actionId(),
      tool: 'approvalRequiredAction',
      risk: 'high',
      requiresApproval: true,
      input: {
        prompt: request.message,
        currentView: request.currentView
      },
      reason: intent.reason,
      status: 'pending_approval'
    }];
  }

  return [];
};

const proposeMemoryUpdates = (request: AiCommandRequest, intent: DetectedIntent): AiMemoryUpdate[] => {
  if (!/remember|save this|store this/i.test(request.message)) return [];
  return [{
    type: 'note',
    title: `Memory candidate from ${request.currentView}`,
    content: request.message,
    tags: ['ai-command', intent.intent]
  }];
};

const normalizeHermesActions = (output: HermesOutput): AiAction[] => output.actions.map(action => {
  return {
    id: actionId(),
    tool: action.tool,
    risk: action.risk,
    requiresApproval: action.requiresApproval === true,
    input: action.input,
    reason: action.reason,
    status: 'proposed'
  };
});

export const runAiCommand = async (userId: string, request: AiCommandRequest): Promise<AiCommandResponse> => {
  try {
    const fallbackIntent = detectIntent(request.message);
    const context = await buildAiContext(userId, request);
    const hermesResult = await callHermes(request, context);
    const intent = hermesResult.ok
      ? {
          intent: hermesResult.output.intent,
          confidence: hermesResult.output.confidence,
          risk: fallbackIntent.risk,
          reason: 'Hermes primary provider returned structured command output.'
        }
      : fallbackIntent;

    const proposedActions = hermesResult.ok
      ? normalizeHermesActions(hermesResult.output)
      : proposeActions(request, fallbackIntent);
    const memoryUpdates = hermesResult.ok
      ? hermesResult.output.memoryUpdates
      : proposeMemoryUpdates(request, fallbackIntent);

    const toolResults = await executeToolActions(userId, request, intent, proposedActions);

    const fallbackSummary = summarizeContext(intent, {
      goalCount: context.recent.goals?.length || 0,
      taskCount: context.recent.planner_tasks?.length || 0,
      projectCount: context.recent.projects?.length || 0,
      leadCount: context.recent.crm_leads?.length || 0,
      memoryCount: context.memorySnippets.length,
      pendingApprovalCount: context.pendingApprovals.length + toolResults.pendingApprovals.length
    });
    const followUpText = hermesResult.ok && hermesResult.output.followUpQuestions.length
      ? `\n\nFollow-up questions:\n${hermesResult.output.followUpQuestions.map(question => `- ${question}`).join('\n')}`
      : '';
    const response = hermesResult.ok
      ? `${hermesResult.output.answer}${followUpText}`
      : `${hermesResult.output.answer} ${fallbackSummary}`;

    return {
      response,
      intent: intent.intent,
      confidence: intent.confidence,
      proposedActions: toolResults.proposedActions,
      executedActions: toolResults.executedActions,
      pendingApprovals: toolResults.pendingApprovals,
      memoryUpdates,
      sources: context.sources,
      errors: [...hermesResult.errors, ...toolResults.errors]
    };
  } catch (error) {
    return {
      response: 'The central AI command route is available, but the context builder hit an issue. No action was executed. You can retry, or continue with local fallback behavior.',
      intent: 'fallback',
      confidence: 0.25,
      proposedActions: [],
      executedActions: [],
      pendingApprovals: [],
      memoryUpdates: [],
      sources: [],
      errors: [(error as Error).message]
    };
  }
};
