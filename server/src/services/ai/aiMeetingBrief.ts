import { runCrmGemini } from './geminiProxy.js';

export const createMeetingBrief = async (userId: string, input: Record<string, unknown>) => {
  const prompt = [
    'Generate a pre-meeting brief for a sales meeting.',
    `Contact data: ${JSON.stringify(input)}`,
    'Return JSON: { "who": string, "last_interaction": string, "what_they_care_about": string, "talking_points": string[], "open_items": string[], "suggested_next_step": string }',
    'No markdown, no explanation.'
  ].join('\n');

  return runCrmGemini(userId, 'meeting-brief', prompt, {
    who: 'CRM contact. AI unavailable, using local CRM context.',
    last_interaction: 'Check the timeline before the meeting.',
    what_they_care_about: 'Project outcome, timeline, budget, and next decision.',
    talking_points: ['Confirm business goal', 'Review current proposal', 'Clarify timeline'],
    open_items: ['Confirm any pending commitments'],
    suggested_next_step: 'End with one clear follow-up task and owner.'
  });
};
