import { z } from 'zod';
import { aiGateway, createAiRouter } from '../ai/aiGateway.js';
import { callGemini, type GeminiTask } from './providers/geminiProvider.js';

export const secondBrainTaskSchema = z.enum([
  'summarize_page',
  'rewrite_text',
  'translate_ar_en',
  'content_variations',
  'summarize_memory',
  'voice_memo_to_memory',
  'telegram_transcription',
  'lightweight_classification',
  'second_opinion',
  'brain_qa'
]);

export const secondBrainRequestSchema = z.object({
  task: secondBrainTaskSchema,
  prompt: z.string().min(1).max(12000),
  context: z.record(z.unknown()).optional().default({}),
  expectJson: z.boolean().optional().default(false)
});

export interface SecondBrainResult {
  task: GeminiTask;
  output: string;
  source: 'hermes' | 'gemini' | 'fallback' | 'cache';
  errors: string[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const cache = new Map<string, { expiresAt: number; value: SecondBrainResult }>();
const inFlight = new Map<string, Promise<SecondBrainResult>>();

const cacheKey = (input: z.infer<typeof secondBrainRequestSchema>) => JSON.stringify({
  task: input.task,
  prompt: input.prompt,
  context: input.context,
  expectJson: input.expectJson
});

const pruneCache = () => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now || cache.size > MAX_CACHE_ENTRIES) cache.delete(key);
  }
};

const taskDescription: Record<string, string> = {
  summarize_page: 'Summarize the provided page context concisely.',
  rewrite_text: 'Rewrite the provided text according to the request.',
  translate_ar_en: 'Translate between Arabic and English while preserving tone and intent.',
  content_variations: 'Generate content variations only.',
  summarize_memory: 'Summarize the memory content faithfully.',
  voice_memo_to_memory: 'Transcribe and summarize the voice memo into memory-ready text.',
  telegram_transcription: 'Transcribe this Telegram voice memo faithfully and add a short Memory summary sentence.',
  lightweight_classification: 'Classify the provided text or record.',
  second_opinion: 'Give a second opinion on the provided plan.',
  brain_qa: 'Answer only from provided memory context. If evidence is weak, say what source is missing. Cite memory titles.'
};

const isReasoningTask = (task: string): boolean =>
  ['brain_qa', 'second_opinion', 'summarize_page', 'rewrite_text', 'translate_ar_en', 'content_variations', 'summarize_memory', 'lightweight_classification'].includes(task);

export const runSecondBrain = async (input: z.input<typeof secondBrainRequestSchema>, userId?: string): Promise<SecondBrainResult> => {
  const parsed = secondBrainRequestSchema.parse(input);
  const key = cacheKey(parsed);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.value, source: 'cache' };
  }

  const existing = inFlight.get(key);
  if (existing) return existing;

  const work = (async () => {
    const description = taskDescription[parsed.task] || '';
    const jsonHint = parsed.expectJson ? 'Return valid JSON only.' : 'Return plain text unless JSON is explicitly requested.';

    if (isReasoningTask(parsed.task)) {
      const router = createAiRouter();
      const provider = router.selectProvider('reasoning');
      const systemPrompt = [
        `You are Motasem OS second brain. Task: ${parsed.task}. ${description}`,
        'Never execute tools, mutate records, send messages, or claim actions were performed.',
        jsonHint
      ].join('\n');

      const result = await provider.generateText(parsed.prompt, { systemPrompt, requireJson: parsed.expectJson }, userId);
      const value: SecondBrainResult = {
        task: parsed.task,
        output: result.text,
        source: result.provider,
        errors: result.errors
      };
      cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
      pruneCache();
      return value;
    }

    const result = await aiGateway.generateText(parsed.prompt, {
      systemPrompt: [
        `You are Motasem OS second brain. Task: ${parsed.task}. ${description}`,
        'Never execute tools, mutate records, send messages, or claim actions were performed.',
        jsonHint
      ].join('\n'),
      requireJson: parsed.expectJson
    }, userId);
    const value: SecondBrainResult = {
      task: parsed.task,
      output: result.text,
      source: result.provider,
      errors: result.errors
    };
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    pruneCache();
    return value;
  })();

  inFlight.set(key, work);
  try {
    return await work;
  } finally {
    inFlight.delete(key);
  }
};

export const transcribeAudioWithSecondBrain = async (
  task: Extract<GeminiTask, 'voice_memo_to_memory' | 'telegram_transcription'>,
  prompt: string,
  audio: { mimeType: string; data: Buffer },
  context: Record<string, unknown> = {},
  userId?: string
): Promise<SecondBrainResult> => {
  const result = await callGemini({
    task,
    prompt,
    context,
    audio
  }, userId);

  return {
    task,
    output: result.text,
    source: result.ok ? 'gemini' : 'fallback',
    errors: result.errors
  };
};
