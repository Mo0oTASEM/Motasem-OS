import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import { config } from '../../../config.js';
import type { AIProvider, AiGenerateOptions, AiGenerateResult, AiEmbedResult, AiProviderHealth } from '../../ai/aiTypes.js';

export type GeminiTask =
  | 'summarize_page'
  | 'rewrite_text'
  | 'translate_ar_en'
  | 'content_variations'
  | 'summarize_memory'
  | 'voice_memo_to_memory'
  | 'telegram_transcription'
  | 'lightweight_classification'
  | 'second_opinion'
  | 'brain_qa';

export interface GeminiProviderInput {
  task: GeminiTask;
  prompt: string;
  context?: Record<string, unknown>;
  audio?: {
    mimeType: string;
    data: Buffer;
  };
  expectJson?: boolean;
}

export interface GeminiProviderResult {
  ok: boolean;
  text: string;
  errors: string[];
}

const GEMINI_TIMEOUT_MS = 20_000;

const taskInstruction: Record<GeminiTask, string> = {
  summarize_page: 'Summarize the provided page context concisely. Do not propose or execute tools.',
  rewrite_text: 'Rewrite the provided text according to the request. Do not send or publish anything.',
  translate_ar_en: 'Translate between Arabic and English while preserving tone and intent. Do not execute actions.',
  content_variations: 'Generate content variations only. Do not schedule, publish, or contact anyone.',
  summarize_memory: 'Summarize the memory content faithfully. Do not create, edit, or delete records.',
  voice_memo_to_memory: 'Transcribe and summarize the voice memo into memory-ready text. Do not store it yourself.',
  telegram_transcription: 'Transcribe this Telegram voice memo faithfully and add a short Memory summary sentence.',
  lightweight_classification: 'Classify the provided text or record. Do not execute tools.',
  second_opinion: 'Give a second opinion on the provided Hermes plan. Do not execute tools or override approvals.',
  brain_qa: 'Answer only from provided memory context. If evidence is weak, say what source is missing. Cite memory titles.'
};

const safeFallback = (task: GeminiTask, errors: string[]): GeminiProviderResult => ({
  ok: false,
  text: `Gemini second brain is unavailable for ${task}. No action was executed.`,
  errors
});

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('Gemini request timed out.')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

export const callGemini = async (input: GeminiProviderInput, userId?: string): Promise<GeminiProviderResult> => {
  let apiKey = config.geminiApiKey;
  if (!apiKey && userId) {
    const { getSettingValue } = await import('../../integrations/integrationSettingsService.js');
    apiKey = await getSettingValue(userId, 'gemini', 'GEMINI_API_KEY');
  }

  if (!apiKey) {
    return safeFallback(input.task, ['GEMINI_API_KEY is not configured.']);
  }

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: input.audio ? 'gemini-1.5-flash' : 'gemini-1.5-pro'
    });

    const parts: Array<string | Part> = [
      [
        'You are Gemini, Motasem OS second brain.',
        'Routing rule: Hermes handles planning, tools, decisions, and orchestration.',
        'Your job is summarize, rewrite, translate, generate variations, transcribe, classify, answer from provided memory, or provide a non-executing second opinion.',
        'Never send emails, publish posts, edit finances, delete data, contact people, mutate records, or claim a tool was executed.',
        input.expectJson ? 'Return valid JSON only. No markdown.' : 'Return plain text unless JSON is explicitly requested.',
        taskInstruction[input.task]
      ].join('\n'),
      `Task: ${input.task}`,
      `Prompt: ${input.prompt}`,
      `Context: ${JSON.stringify(input.context || {})}`
    ];

    if (input.audio) {
      parts.push({
        inlineData: {
          mimeType: input.audio.mimeType,
          data: input.audio.data.toString('base64')
        }
      });
    }

    const result = await withTimeout(model.generateContent(parts), GEMINI_TIMEOUT_MS);
    return {
      ok: true,
      text: result.response.text(),
      errors: []
    };
  } catch (error) {
    return safeFallback(input.task, [(error as Error).message]);
  }
};

export const createGeminiProvider = (): AIProvider => ({
  name: 'gemini',

  isAvailable(): boolean {
    return Boolean(config.geminiApiKey);
  },

  health(): AiProviderHealth {
    return {
      name: 'gemini',
      available: this.isAvailable(),
      configured: this.isAvailable(),
      error: config.geminiApiKey ? undefined : 'GEMINI_API_KEY not configured'
    };
  },

  async generateText(prompt: string, options?: AiGenerateOptions, userId?: string): Promise<AiGenerateResult> {
    const start = Date.now();
    if (!this.isAvailable()) {
      return { ok: false, text: '', provider: 'fallback', errors: ['Gemini is not configured.'], latencyMs: Date.now() - start };
    }

    const result = await callGemini({
      task: options?.requireJson ? 'lightweight_classification' : 'brain_qa',
      prompt: prompt.slice(0, 12000),
      expectJson: options?.requireJson
    }, userId);

    return {
      ok: result.ok,
      text: result.text,
      provider: result.ok ? 'gemini' : 'fallback',
      errors: result.errors,
      latencyMs: Date.now() - start
    };
  },

  async embedText(text: string, _userId?: string): Promise<AiEmbedResult> {
    const start = Date.now();
    if (!config.geminiApiKey) {
      return { ok: false, vector: [], provider: 'fallback', errors: ['GEMINI_API_KEY is not configured for embeddings.'], latencyMs: Date.now() - start };
    }

    try {
      const client = new GoogleGenerativeAI(config.geminiApiKey);
      const model = client.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      return {
        ok: true,
        vector: result.embedding.values,
        provider: 'gemini',
        errors: [],
        latencyMs: Date.now() - start
      };
    } catch (error) {
      return {
        ok: false,
        vector: [],
        provider: 'fallback',
        errors: [(error as Error).message],
        latencyMs: Date.now() - start
      };
    }
  }
});
