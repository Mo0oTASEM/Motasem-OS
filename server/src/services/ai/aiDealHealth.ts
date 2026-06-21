import { runCrmGemini } from './geminiProxy.js';

export const analyzeDealHealth = async (userId: string, input: Record<string, unknown>) => {
  const prompt = [
    "Analyze this deal's health.",
    `Data: ${JSON.stringify(input)}`,
    'Return JSON: { "momentum": "improving" | "stalled" | "declining", "win_probability": number, "risk_flags": string[], "recommendation": string, "reasoning": string }',
    'No markdown.'
  ].join('\n');

  return runCrmGemini(userId, 'deal-health', prompt, {
    momentum: 'stalled',
    win_probability: 50,
    risk_flags: ['AI unavailable'],
    recommendation: 'Send a concise follow-up with one clear next step.',
    reasoning: 'Fallback based on limited local CRM context.'
  });
};
