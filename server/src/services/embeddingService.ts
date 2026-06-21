import { aiGateway } from './ai/aiGateway.js';

export const embedText = async (text: string, userId?: string): Promise<number[]> => {
  const result = await aiGateway.embedText(text, userId);
  return result.vector;
};
