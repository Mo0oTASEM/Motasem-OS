import { runSecondBrain } from '../aiBrain/secondBrainRouter.js';

export const createSmartReplies = async (userId: string, input: Record<string, unknown>) => {
  const prompt = [
    'CRM AI smart reply.',
    'Read the email thread and generate 3 distinct professional reply options under 80 words.',
    'Return ONLY valid JSON with keys quick_ack, move_forward, clarify.',
    `Input: ${JSON.stringify(input)}`
  ].join('\n');
  const result = await runSecondBrain({
    task: 'content_variations',
    prompt,
    context: { userId, feature: 'crm-smart-reply' },
    expectJson: true
  });
  return {
    id: `second-brain-${Date.now()}`,
    agent: 'gemini_second_brain',
    output: result.output,
    sourceReferences: [],
    feature: 'smart-reply',
    aiUnavailable: result.source === 'fallback'
  };
};
