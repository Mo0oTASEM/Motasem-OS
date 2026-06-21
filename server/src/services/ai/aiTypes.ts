export type AiProviderName = 'hermes' | 'gemini' | 'fallback';

export type AiTaskKind = 'reasoning' | 'planning' | 'classification' | 'transcription' | 'embedding' | 'generation';

export interface AiGenerateOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  requireJson?: boolean;
  timeoutMs?: number;
}

export interface AiGenerateResult {
  ok: boolean;
  text: string;
  provider: AiProviderName;
  errors: string[];
  latencyMs: number;
}

export interface AiEmbedResult {
  ok: boolean;
  vector: number[];
  provider: AiProviderName;
  errors: string[];
  latencyMs: number;
}

export interface AiProviderHealth {
  name: AiProviderName;
  available: boolean;
  configured: boolean;
  error?: string;
}

export interface AIProvider {
  readonly name: AiProviderName;
  isAvailable(): boolean;
  generateText(prompt: string, options?: AiGenerateOptions, userId?: string): Promise<AiGenerateResult>;
  embedText?(text: string, userId?: string): Promise<AiEmbedResult>;
  health(): AiProviderHealth;
}

export interface AIRouter {
  selectProvider(task: AiTaskKind): AIProvider;
  getPrimary(): AIProvider;
  getFallback(): AIProvider;
  getEmbeddingProvider(): AIProvider;
  allProviders(): AIProvider[];
  health(): AiProviderHealth[];
}
