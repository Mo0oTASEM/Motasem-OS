import { runCrmGemini } from './geminiProxy.js';

export const runCrmCommandBar = async (userId: string, input: Record<string, unknown>) => {
  const prompt = [
    `You are a CRM assistant. The user typed: "${String(input.command || '')}"`,
    `CRM context (contacts, deals, tasks): ${JSON.stringify(input.context || {})}`,
    'Determine the intent and return JSON: { "action": "navigate" | "create" | "draft" | "query" | "schedule", "target": string, "params": object, "answer": string | null }',
    'No markdown.'
  ].join('\n');

  return runCrmGemini(userId, 'command-bar', prompt, {
    action: 'query',
    target: 'crm',
    params: {},
    answer: 'AI command parsing is unavailable. Try searching the CRM or creating the item manually.'
  });
};
