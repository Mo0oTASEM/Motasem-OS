import { runSecondBrain } from '../aiBrain/secondBrainRouter.js';

export const runCrmGemini = async (userId: string, feature: string, prompt: string, fallback: Record<string, unknown>) => {
  try {
    const result = await runSecondBrain({
      task: 'lightweight_classification',
      prompt,
      context: { userId, feature },
      expectJson: true
    });
    const text = result.output.trim();
    const jsonText = text.match(/\{[\s\S]*\}/)?.[0] || text;
    return {
      id: `second-brain-${Date.now()}`,
      agent: 'gemini_second_brain',
      output: result.output,
      sourceReferences: [],
      feature,
      json: JSON.parse(jsonText) as Record<string, unknown>,
      aiUnavailable: false
    };
  } catch (error) {
    return {
      id: `fallback-${Date.now()}`,
      agent: 'crm_manager',
      output: (error as Error).message,
      sourceReferences: [],
      feature,
      json: fallback,
      aiUnavailable: true
    };
  }
};
