import type { AiAction, AiCommandRequest } from '../aiBrain/aiSchemas.js';
import type { DetectedIntent } from '../aiBrain/intentDetector.js';
import { repositoryFactory } from '../database/repositoryFactory.js';
import { getTool, type ToolDefinition } from './toolRegistry.js';
import type { ToolOutput } from './toolSchemas.js';

export interface ToolExecutionSummary {
  proposedActions: AiAction[];
  executedActions: AiAction[];
  pendingApprovals: AiAction[];
  errors: string[];
}

const logAction = async (
  userId: string,
  request: AiCommandRequest,
  intent: DetectedIntent,
  action: AiAction,
  status: 'proposed' | 'executed' | 'pending_approval' | 'rejected' | 'failed',
  output?: Record<string, unknown>,
  error?: string
) => {
  await repositoryFactory.forUserCollection(userId, 'ai_action_logs').create({
    id: action.id,
    conversationId: request.conversationId,
    intent: intent.intent,
    tool: action.tool,
    status,
    riskLevel: action.risk,
    input: action.input,
    output,
    error,
    source: 'ai',
    syncStatus: status === 'executed' ? 'synced' : 'pending',
    externalIds: {}
  });
};

const createBlockedAction = (action: AiAction, error: string): AiAction => ({
  ...action,
  status: 'blocked',
  input: {
    ...action.input,
    validationError: error
  }
});

const approvalRequired = (tool: ToolDefinition, action: AiAction) =>
  tool.approvalRequirement === 'always' || tool.riskLevel === 'medium' || tool.riskLevel === 'high' || action.requiresApproval;

const createApproval = async (
  userId: string,
  tool: ToolDefinition,
  action: AiAction,
  payload: Record<string, unknown>
) => {
  return repositoryFactory.forUserCollection(userId, 'approvals').create({
    actionType: tool.name,
    status: 'pending',
    riskLevel: tool.riskLevel,
    targetType: tool.moduleOwner,
    reason: action.reason || `${tool.name} requires human approval.`,
    payload,
    source: 'ai',
    syncStatus: 'pending',
    externalIds: {
      aiActionId: action.id
    }
  });
};

const validateOutput = (tool: ToolDefinition, output: ToolOutput) => {
  const parsed = tool.outputSchema.safeParse(output);
  if (!parsed.success) {
    throw new Error(`Tool output failed validation: ${parsed.error.message}`);
  }
  return parsed.data;
};

export const executeToolActions = async (
  userId: string,
  request: AiCommandRequest,
  intent: DetectedIntent,
  actions: AiAction[]
): Promise<ToolExecutionSummary> => {
  const proposedActions: AiAction[] = [];
  const executedActions: AiAction[] = [];
  const pendingApprovals: AiAction[] = [];
  const errors: string[] = [];

  for (const action of actions) {
    const tool = getTool(action.tool);
    if (!tool) {
      const error = `Unknown tool: ${action.tool}`;
      const blocked = createBlockedAction(action, error);
      proposedActions.push(blocked);
      errors.push(error);
      await logAction(userId, request, intent, blocked, 'failed', undefined, error);
      continue;
    }

    const parsedInput = tool.inputSchema.safeParse(action.input);
    if (!parsedInput.success) {
      const error = `Invalid input for ${tool.name}: ${parsedInput.error.message}`;
      const blocked = createBlockedAction({
        ...action,
        risk: tool.riskLevel,
        requiresApproval: tool.approvalRequirement === 'always'
      }, error);
      proposedActions.push(blocked);
      errors.push(error);
      await logAction(userId, request, intent, blocked, 'failed', undefined, error);
      continue;
    }

    const normalizedAction: AiAction = {
      ...action,
      risk: tool.riskLevel,
      requiresApproval: approvalRequired(tool, action),
      input: parsedInput.data as Record<string, unknown>
    };

    await logAction(userId, request, intent, normalizedAction, 'proposed', {
      reason: normalizedAction.reason,
      moduleOwner: tool.moduleOwner
    });

    if (approvalRequired(tool, normalizedAction)) {
      const approval = await createApproval(userId, tool, normalizedAction, parsedInput.data as Record<string, unknown>);
      const pendingAction: AiAction = {
        ...normalizedAction,
        status: 'pending_approval',
        input: {
          ...normalizedAction.input,
          approvalId: approval.id
        }
      };
      proposedActions.push(pendingAction);
      pendingApprovals.push(pendingAction);
      await logAction(userId, request, intent, pendingAction, 'pending_approval', {
        approvalId: approval.id,
        reason: pendingAction.reason
      });
      continue;
    }

    if (!tool.execute) {
      const error = `${tool.name} has no executor.`;
      const blocked = createBlockedAction(normalizedAction, error);
      proposedActions.push(blocked);
      errors.push(error);
      await logAction(userId, request, intent, blocked, 'failed', undefined, error);
      continue;
    }

    try {
      const output = validateOutput(tool, await tool.execute(parsedInput.data, {
        userId,
        conversationId: request.conversationId,
        intent: intent.intent
      }));
      const executed: AiAction = {
        ...normalizedAction,
        status: 'executed'
      };
      proposedActions.push(executed);
      executedActions.push(executed);
      await logAction(userId, request, intent, executed, 'executed', output);
    } catch (error) {
      const message = (error as Error).message;
      const blocked = createBlockedAction(normalizedAction, message);
      proposedActions.push(blocked);
      errors.push(message);
      await logAction(userId, request, intent, blocked, 'failed', undefined, message);
    }
  }

  return {
    proposedActions,
    executedActions,
    pendingApprovals,
    errors
  };
};
