import type { AIProvider, AIRouter, AiGenerateOptions, AiGenerateResult, AiEmbedResult, AiProviderHealth, AiTaskKind } from './aiTypes.js';
import { createHermesProvider } from '../aiBrain/providers/hermesProvider.js';
import { createGeminiProvider } from '../aiBrain/providers/geminiProvider.js';

const safeJsonExtract = (text: string): Record<string, unknown> => {
  const cleaned = text.trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const candidate = firstBrace >= 0 && lastBrace > firstBrace
    ? cleaned.slice(firstBrace, lastBrace + 1)
    : cleaned;
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return { output: text };
  }
};

const reasoningTasks: AiTaskKind[] = ['reasoning', 'planning', 'classification', 'generation'];
const embeddingTasks: AiTaskKind[] = ['embedding'];
const transcriptionTasks: AiTaskKind[] = ['transcription'];

export const createAiRouter = (): AIRouter => {
  const hermesProvider = createHermesProvider();
  const geminiProvider = createGeminiProvider();

  return {
    selectProvider(task: AiTaskKind): AIProvider {
      if (embeddingTasks.includes(task) || transcriptionTasks.includes(task)) {
        return geminiProvider;
      }
      if (reasoningTasks.includes(task) && hermesProvider.isAvailable()) {
        return hermesProvider;
      }
      return geminiProvider.isAvailable() ? geminiProvider : hermesProvider;
    },

    getPrimary(): AIProvider {
      return hermesProvider.isAvailable() ? hermesProvider : geminiProvider;
    },

    getFallback(): AIProvider {
      return geminiProvider.isAvailable() ? geminiProvider : hermesProvider;
    },

    getEmbeddingProvider(): AIProvider {
      return geminiProvider;
    },

    allProviders(): AIProvider[] {
      return [hermesProvider, geminiProvider];
    },

    health(): AiProviderHealth[] {
      return [hermesProvider.health(), geminiProvider.health()];
    }
  };
};

export const aiGateway = {
  isPrimaryAvailable(): boolean {
    return createHermesProvider().isAvailable();
  },

  isFallbackAvailable(): boolean {
    return createGeminiProvider().isAvailable();
  },

  getProviderHealth(): AiProviderHealth[] {
    return createAiRouter().health();
  },

  async generateText(prompt: string, options?: AiGenerateOptions, userId?: string): Promise<AiGenerateResult> {
    const router = createAiRouter();
    const provider = router.selectProvider('generation');

    if (provider.isAvailable()) {
      const result = await provider.generateText(prompt, options, userId);
      if (result.ok) return result;
    }

    const fallback = router.getFallback();
    if (fallback.name !== provider.name && fallback.isAvailable()) {
      return fallback.generateText(prompt, options, userId);
    }

    return {
      ok: false,
      text: '',
      provider: 'fallback',
      errors: ['No AI provider available.'],
      latencyMs: 0
    };
  },

  async generateStructured<T>(prompt: string, options?: AiGenerateOptions, userId?: string): Promise<AiGenerateResult & { parsed: T | null }> {
    const result = await this.generateText(prompt, { ...options, requireJson: true }, userId);
    let parsed: T | null = null;
    try {
      parsed = JSON.parse(result.text) as T;
    } catch {
      try {
        parsed = safeJsonExtract(result.text) as unknown as T;
      } catch {
        parsed = null;
      }
    }
    return { ...result, parsed };
  },

  async embedText(text: string, userId?: string): Promise<AiEmbedResult> {
    const router = createAiRouter();
    const provider = router.getEmbeddingProvider();
    if (provider.embedText) {
      return provider.embedText(text, userId);
    }
    return { ok: false, vector: [], provider: 'fallback', errors: ['No embedding provider available.'], latencyMs: 0 };
  }
};
