import { runSecondBrain } from '../aiBrain/secondBrainRouter.js';

export const buildCrmSequence = async (userId: string, input: Record<string, unknown>) => {
  const prompt = [
    'CRM AI outreach sequence builder.',
    'Build an outreach email sequence from the user description.',
    'Return a JSON array of steps with step, day, condition, subject, and body. Never auto-send.',
    `Input: ${JSON.stringify(input)}`
  ].join('\n');
  const result = await runSecondBrain({
    task: 'content_variations',
    prompt,
    context: { userId, feature: 'crm-sequence' },
    expectJson: true
  });
  return {
    id: `second-brain-${Date.now()}`,
    agent: 'gemini_second_brain',
    output: result.output,
    sourceReferences: [],
    feature: 'sequences',
    aiUnavailable: result.source === 'fallback'
  };
};
