import { runSecondBrain } from '../aiBrain/secondBrainRouter.js';

export const suggestCrmActions = async (userId: string, input: Record<string, unknown>) => {
  const prompt = [
    'CRM AI follow-up suggestions.',
    'Analyze CRM contacts and classify useful non-executing follow-up suggestions for the user to review.',
    'Return concise JSON suggestions when action is needed. Never execute, send, schedule, or contact anyone.',
    `Input: ${JSON.stringify(input)}`
  ].join('\n');
  const result = await runSecondBrain({
    task: 'lightweight_classification',
    prompt,
    context: { userId, feature: 'crm-suggestions' },
    expectJson: true
  });
  return {
    id: `second-brain-${Date.now()}`,
    agent: 'gemini_second_brain',
    output: result.output,
    sourceReferences: [],
    feature: 'suggestions',
    aiUnavailable: result.source === 'fallback'
  };
};
