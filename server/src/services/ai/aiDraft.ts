import { runSecondBrain } from '../aiBrain/secondBrainRouter.js';

export const draftCrmEmail = async (userId: string, input: Record<string, unknown>) => {
  const prompt = [
    'CRM AI email drafting.',
    'You are an expert sales writer. Draft a professional, natural, concise email.',
    'Max 150 words. No filler phrases. No "I hope this finds you well". Return only the email body.',
    `Input: ${JSON.stringify(input)}`
  ].join('\n');
  const result = await runSecondBrain({
    task: 'rewrite_text',
    prompt,
    context: { userId, feature: 'crm-email-draft' }
  });
  return {
    id: `second-brain-${Date.now()}`,
    agent: 'gemini_second_brain',
    output: result.output,
    sourceReferences: [],
    feature: 'draft',
    aiUnavailable: result.source === 'fallback'
  };
};
