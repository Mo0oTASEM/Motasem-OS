import { runCrmGemini } from './geminiProxy.js';

export const triageCrmInbox = async (userId: string, input: Record<string, unknown>) => {
  const prompt = [
    'Analyze this email from a sales contact.',
    `Email: ${JSON.stringify(input.email_text || input)}`,
    `Contact stage: ${String(input.deal_stage || 'unknown')}`,
    'Return JSON: { "intent": "reply_needed" | "fyi" | "action_required" | "urgent", "commitments": string[], "suggested_task": { "title": string, "type": string, "due": string } | null, "buying_signal": boolean, "buying_signal_note": string | null }',
    'No markdown.'
  ].join('\n');

  return runCrmGemini(userId, 'inbox-triage', prompt, {
    intent: 'reply_needed',
    commitments: [],
    suggested_task: null,
    buying_signal: false,
    buying_signal_note: null
  });
};
