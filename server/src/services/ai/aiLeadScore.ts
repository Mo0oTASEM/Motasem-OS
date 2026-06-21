import { runSecondBrain } from '../aiBrain/secondBrainRouter.js';

export const scoreCrmLead = async (userId: string, input: Record<string, unknown>) => {
  const prompt = [
    'CRM AI lead scoring.',
    'Score this sales lead from 0 to 100 and assign Hot, Warm, Cold, or Urgent.',
    'Return ONLY valid JSON: { "score": number, "label": string, "reason": string }.',
    `Input: ${JSON.stringify(input)}`
  ].join('\n');
  const result = await runSecondBrain({
    task: 'lightweight_classification',
    prompt,
    context: { userId, feature: 'crm-lead-score' },
    expectJson: true
  });
  return {
    id: `second-brain-${Date.now()}`,
    agent: 'gemini_second_brain',
    output: result.output,
    sourceReferences: [],
    feature: 'lead-score',
    aiUnavailable: result.source === 'fallback'
  };
};
