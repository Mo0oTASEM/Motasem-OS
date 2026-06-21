import { config } from '../../../config.js';
import type { BuiltAiContext } from '../../context/contextBuilder.js';
import type { AiCommandRequest, HermesOutput } from '../aiSchemas.js';
import { hermesOutputSchema } from '../aiSchemas.js';
import type { AIProvider, AiGenerateOptions, AiGenerateResult, AiEmbedResult, AiProviderHealth } from '../../ai/aiTypes.js';

export interface HermesProviderResult {
  ok: boolean;
  output: HermesOutput;
  errors: string[];
}

const HERMES_TIMEOUT_MS = 18_000;
const HERMES_MAX_ATTEMPTS = 3;

const safeFallbackOutput = (message: string, intent = 'fallback'): HermesOutput => ({
  answer: message,
  intent,
  confidence: 0.35,
  actions: [],
  memoryUpdates: [],
  followUpQuestions: []
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const endpoint = () => {
  const baseUrl = config.hermesBaseUrl.replace(/\/+$/, '');
  return baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
};

const systemPrompt = [
  'You are Hermes, the main AI brain for Motasem OS.',
  'Your role: main planner, intent detector, business/work advisor, CRM/project/goal interpreter, tool action proposer, and memory update recommender.',
  'You must return valid JSON only. Do not include markdown fences.',
  'You may propose only these registered backend tools: createGoal, updateGoal, createTask, updateTask, createProject, updateProject, createCRMLead, updateCRMLead, promoteLeadToGoogleContact, generateEmailDraft, sendEmail, createCalendarEvent, createFinanceTransaction, generateContentPlan, createPortfolioProject, searchUserMemory, updateUserMemory, generateDailyReport, generateWeeklyReport, generateCharacterQuest, analyzeReflection, suggestDailyMission, generateExposureLadder, getCharacterState, askBrain, searchBrain, generateInsight, summarizeContent, compareDocuments, listWorkspaces, createWorkspace, inviteToWorkspace, getChannelStatus, sendChannelMessage, generateAnalyticsReport, trackHabit, createAutomationRule, createNote, searchNotes, createContact, searchContacts, createDocument, searchDocuments, getSocialInbox.',
  'Never claim that an external send, deletion, publishing action, contact action, finance mutation, or bulk operation has been executed.',
  'High-risk actions must be proposed with risk "high" and requiresApproval true.',
  'Your JSON schema is: { "answer": string, "intent": string, "confidence": number, "actions": [{ "tool": string, "risk": "low"|"medium"|"high", "requiresApproval": boolean, "input": object, "reason": string }], "memoryUpdates": [{ "type": string, "title": string, "content": string, "tags": string[] }], "followUpQuestions": string[] }.'
].join('\n');

const stripCodeFence = (text: string) => text
  .trim()
  .replace(/^```(?:json)?/i, '')
  .replace(/```$/i, '')
  .trim();

const parseHermesJson = (text: string): HermesOutput => {
  const cleaned = stripCodeFence(text);
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const candidate = firstBrace >= 0 && lastBrace > firstBrace
    ? cleaned.slice(firstBrace, lastBrace + 1)
    : cleaned;
  return hermesOutputSchema.parse(JSON.parse(candidate));
};

const extractResponseText = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as Record<string, unknown>;
  const choices = Array.isArray(record.choices) ? record.choices : [];
  const firstChoice = choices[0] as Record<string, unknown> | undefined;
  const message = firstChoice?.message as Record<string, unknown> | undefined;
  if (typeof message?.content === 'string') return message.content;
  if (typeof firstChoice?.text === 'string') return firstChoice.text;
  if (typeof record.output_text === 'string') return record.output_text;
  if (typeof record.answer === 'string') return JSON.stringify(record);
  return '';
};

const isTransientStatus = (status: number) => status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;

const compactForPrompt = (context: BuiltAiContext) => ({
  userProfile: context.userProfile,
  currentPage: context.currentPage,
  selectedEntity: context.selectedEntity,
  recent: context.recent,
  integrations: context.integrations,
  pendingApprovals: context.pendingApprovals,
  memorySnippets: context.memorySnippets.map(memory => ({
    id: memory.id,
    title: memory.title,
    type: memory.type,
    content: memory.content.slice(0, 700),
    tags: memory.tags,
    score: memory.score
  }))
});

const requestHermes = async (request: AiCommandRequest, context: BuiltAiContext) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HERMES_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint(), {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.hermesApiKey}`
      },
      body: JSON.stringify({
        model: config.hermesModel,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: JSON.stringify({
              request: {
                message: request.message,
                currentView: request.currentView,
                selectedEntityId: request.selectedEntityId,
                conversationId: request.conversationId,
                dryRun: request.dryRun
              },
              context: compactForPrompt(context)
            })
          }
        ]
      })
    });

    const text = await response.text();
    let payload: unknown = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { output_text: text };
    }

    if (!response.ok) {
      const message = response.status >= 500 ? 'Hermes service is temporarily unavailable.' : `Hermes request failed with status ${response.status}.`;
      throw Object.assign(new Error(message), { transient: isTransientStatus(response.status) });
    }

    const responseText = extractResponseText(payload);
    if (!responseText) {
      throw Object.assign(new Error('Hermes returned an empty response.'), { transient: false });
    }

    return parseHermesJson(responseText);
  } finally {
    clearTimeout(timeout);
  }
};

const isTransientError = (error: unknown) => {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  return Boolean(error && typeof error === 'object' && 'transient' in error && (error as { transient?: boolean }).transient);
};

const exponentialBackoff = (attempt: number) => Math.min(1000 * 2 ** (attempt - 1), 10_000) + Math.random() * 500;

export const callHermes = async (request: AiCommandRequest, context: BuiltAiContext): Promise<HermesProviderResult> => {
  if (!config.hermesApiKey || !config.hermesBaseUrl || !config.hermesModel) {
    return {
      ok: false,
      output: safeFallbackOutput('Hermes is not configured yet. I can still route the command safely, but no provider call was made.', 'hermes_missing_env'),
      errors: ['Hermes is missing required environment configuration.']
    };
  }

  const errors: string[] = [];

  for (let attempt = 1; attempt <= HERMES_MAX_ATTEMPTS; attempt += 1) {
    try {
      return {
        ok: true,
        output: await requestHermes(request, context),
        errors
      };
    } catch (error) {
      const message = (error as Error).message || 'Hermes request failed.';
      errors.push(message);
      if (!isTransientError(error) || attempt === HERMES_MAX_ATTEMPTS) break;
      await sleep(exponentialBackoff(attempt));
    }
  }

  return {
    ok: false,
    output: safeFallbackOutput('Hermes could not return a valid structured response, so Motasem OS stayed in safe fallback mode. No action was executed.', 'hermes_fallback'),
    errors
  };
};

export const createHermesProvider = (): AIProvider => ({
  name: 'hermes',

  isAvailable(): boolean {
    return Boolean(config.hermesApiKey && config.hermesBaseUrl && config.hermesModel);
  },

  health(): AiProviderHealth {
    return {
      name: 'hermes',
      available: this.isAvailable(),
      configured: this.isAvailable(),
      error: !config.hermesApiKey ? 'HERMES_API_KEY not configured'
        : !config.hermesBaseUrl ? 'HERMES_BASE_URL not configured'
          : !config.hermesModel ? 'HERMES_MODEL not configured'
            : undefined
    };
  },

  embedText(): Promise<AiEmbedResult> {
    return Promise.resolve({ ok: false, vector: [], provider: 'fallback', errors: ['Hermes does not support embeddings.'], latencyMs: 0 });
  },

  async generateText(prompt: string, options?: AiGenerateOptions, userId?: string): Promise<AiGenerateResult> {
    const start = Date.now();
    if (!this.isAvailable()) {
      return { ok: false, text: '', provider: 'fallback', errors: ['Hermes is not configured.'], latencyMs: Date.now() - start };
    }

    const request: AiCommandRequest = {
      message: prompt.slice(0, 8000),
      currentView: 'gateway',
      contextHints: {},
      dryRun: true
    };

    try {
      const { buildAiContext } = await import('../../context/contextBuilder.js');
      const context = await buildAiContext(userId ?? 'system', request);
      const result = await callHermes(request, context);

      if (result.ok) {
        return {
          ok: true,
          text: result.output.answer,
          provider: 'hermes',
          errors: result.errors,
          latencyMs: Date.now() - start
        };
      }

      return { ok: false, text: result.output.answer, provider: 'fallback', errors: result.errors, latencyMs: Date.now() - start };
    } catch (error) {
      return { ok: false, text: '', provider: 'fallback', errors: [(error as Error).message], latencyMs: Date.now() - start };
    }
  }
});
