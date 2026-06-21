import { z } from 'zod';
import { aiGateway } from '../ai/aiGateway.js';
import { COACH_SYSTEM_INSTRUCTION } from './coachInstructions.js';
import {
  coachResponseSchema,
  questGenerationResponseSchema,
  ladderGenerationResponseSchema,
  reflectionAnalysisResponseSchema,
  weeklyReviewResponseSchema,
  dailyMissionResponseSchema,
  adaptiveSuggestionResponseSchema,
} from './characterCoachSchemas.js';
import type {
  CoachMessageRequest,
  QuestGenerationRequest,
  LadderGenerationRequest,
  ReflectionAnalysisRequest,
  WeeklyReviewRequest,
  DailyMissionRequest,
  AdaptiveSuggestionRequest,
  GeneratedQuest,
  GeneratedLadder,
  ReflectionAnalysisResponse,
  WeeklyReviewResponse,
  DailyMissionResponse,
  AdaptiveSuggestionResponse,
} from './characterCoachSchemas.js';

interface CoachResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  disclaimer: string;
}

const stripCodeFence = (text: string) => text
  .trim()
  .replace(/^```(?:json)?/i, '')
  .replace(/```$/i, '')
  .trim();

const parseJsonSafe = <T>(text: string, schema: z.ZodType<T>): { data: T | null; error: string | null } => {
  const cleaned = stripCodeFence(text);
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const candidate = firstBrace >= 0 && lastBrace > firstBrace
    ? cleaned.slice(firstBrace, lastBrace + 1)
    : cleaned;
  try {
    const parsed = JSON.parse(candidate);
    const result = schema.parse(parsed);
    return { data: result, error: null };
  } catch (err) {
    const msg = err instanceof z.ZodError
      ? `Schema validation failed: ${err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`
      : `Failed to parse AI output: ${(err as Error).message}`;
    return { data: null, error: msg };
  }
};

const COACH_PROMPT_PREFIX = [
  COACH_SYSTEM_INSTRUCTION,
  'Return valid JSON only. No markdown fences unless the output contains a code block that is part of the coaching content.',
  '',
].join('\n');

const coachCall = async (userId: string, systemPrompt: string, userPrompt: string): Promise<CoachResult<Record<string, unknown>>> => {
  const fullPrompt = `${systemPrompt}\n\nUser context:\n${userPrompt}`;
  const result = await aiGateway.generateText(fullPrompt, {
    systemPrompt: 'You are the character coach for Motasem OS. Return valid JSON only.',
    requireJson: true
  }, userId);

  if (!result.ok) {
    return { ok: false, data: null, error: result.errors.join('; '), disclaimer: 'AI service is unavailable.' };
  }

  const parsed = parseJsonSafe(result.text, coachResponseSchema);
  if (parsed.error) {
    return { ok: false, data: null, error: parsed.error, disclaimer: '' };
  }

  return {
    ok: true,
    data: parsed.data as unknown as Record<string, unknown>,
    error: null,
    disclaimer: parsed.data?.disclaimer || '',
  };
};

const structuredCall = async <T>(
  userId: string,
  featurePrompt: string,
  userInput: string,
  schema: z.ZodType<T>,
): Promise<CoachResult<T>> => {
  const safeInput = userInput.slice(0, 12000);
  const fullPrompt = `${COACH_PROMPT_PREFIX}\n\n${featurePrompt}\n\nUser input:\n${safeInput}`;

  const result = await aiGateway.generateText(fullPrompt, {
    requireJson: true
  }, userId);

  if (!result.ok) {
    return { ok: false, data: null, error: result.errors.join('; '), disclaimer: 'AI service is unavailable.' };
  }

  const parsed = parseJsonSafe(result.text, schema);
  if (parsed.error) {
    return { ok: false, data: null, error: parsed.error, disclaimer: '' };
  }

  const data = parsed.data!;

  const disclaimer = 'disclaimer' in (data as object)
    ? (data as Record<string, string>).disclaimer || ''
    : '';

  return { ok: true, data, error: null, disclaimer };
};

// ── 1. Coach Chat ───────────────────────────────────────────
export const coachChat = async (
  userId: string,
  request: CoachMessageRequest,
): Promise<CoachResult<{ reply: string; suggestedActions: Array<{ type: string; label: string; payload: Record<string, unknown> }>; disclaimer: string }>> => {
  const historyText = (request.history ?? []).map(h => `${h.role}: ${h.content}`).join('\n');
  const contextSection = request.characterContext ? `\n\nCurrent character state:\n${request.characterContext}` : '';
  const userPrompt = `${contextSection}\n\nConversation history:\n${historyText}\n\nuser: ${request.message}`;

  return coachCall(userId, COACH_PROMPT_PREFIX, userPrompt) as Promise<CoachResult<{
    reply: string;
    suggestedActions: Array<{ type: string; label: string; payload: Record<string, unknown> }>;
    disclaimer: string;
  }>>;
};

// ── 2. Quest Generator ──────────────────────────────────────
export const generateQuest = async (
  userId: string,
  request: QuestGenerationRequest,
): Promise<CoachResult<GeneratedQuest>> => {
  const featurePrompt = [
    'You are generating a single character quest (a challenge to build a trait).',
    'The quest must match the user\'s preferences below.',
    'Return valid JSON matching the GeneratedQuest schema exactly.',
    '',
    'Rules:',
    '- Difficulty must be close to the user\'s preferred difficulty (±2).',
    '- If confidence is low (1-4), make the quest accessible with clear fallback.',
    '- If confidence is high (7-10), the quest can be more ambitious.',
    '- Include safety or respect notes if the quest involves other people.',
    '- The easier fallback must be a genuinely easier version, not the same task.',
    '- The harder next version must be a genuine progression.',
    '- XP recommendation: difficulty × 10 + bonus for steps taken.',
    '- Always explain why this quest matters for the chosen trait.',
  ].join('\n');

  const input = JSON.stringify(request, null, 2);
  return structuredCall(userId, featurePrompt, input, questGenerationResponseSchema).then(r => ({
    ...r,
    data: r.data ? (r.data as { quest: GeneratedQuest }).quest : null,
  }));
};

// ── 3. Ladder Generator ─────────────────────────────────────
export const generateLadder = async (
  userId: string,
  request: LadderGenerationRequest,
): Promise<CoachResult<GeneratedLadder>> => {
  const featurePrompt = [
    'You are generating an exposure ladder — a graduated set of steps from easy to challenging.',
    'The ladder helps the user build comfort with a behavior they currently avoid.',
    '',
    'Rules:',
    '- Generate 3 to 10 steps. Each step must be meaningfully harder than the previous.',
    '- Step 1 must feel very achievable (difficulty 1-3).',
    '- The final step must match the desired end behavior but still feel possible.',
    '- Never jump from low starting difficulty to a high-risk step.',
    '- Each step should have a clear instruction and repetition target.',
    '- If the behavior involves social interaction, start with minimal risk (e.g., eye contact, saying hello).',
    '- Add safety notes if the ladder involves physical or potentially sensitive situations.',
    '',
    'Example progression for social communication:',
    '1. Make eye contact and say hello (difficulty 2)',
    '2. Ask a simple factual question (difficulty 3)',
    '3. Ask for a recommendation (difficulty 4)',
    '4. Continue with one follow-up question (difficulty 5)',
    '5. Hold a one-minute conversation (difficulty 5)',
    '',
    'Return valid JSON matching the GeneratedLadder schema exactly.',
  ].join('\n');

  const input = JSON.stringify(request, null, 2);
  return structuredCall(userId, featurePrompt, input, ladderGenerationResponseSchema).then(r => ({
    ...r,
    data: r.data ? (r.data as { ladder: GeneratedLadder }).ladder : null,
  }));
};

// ── 4. Reflection Analysis ──────────────────────────────────
export const analyzeReflection = async (
  userId: string,
  request: ReflectionAnalysisRequest,
): Promise<CoachResult<ReflectionAnalysisResponse>> => {
  if (!request.consentGiven) {
    return { ok: false, data: null, error: 'You must opt in to AI analysis for this reflection.', disclaimer: '' };
  }

  const featurePrompt = [
    'You are analyzing a character reflection entry.',
    'The user has explicitly opted in to AI analysis.',
    '',
    'Extract from the reflection:',
    '- Trigger: What situation prompted the reflection?',
    '- Prediction: What did the user fear would happen?',
    '- Actual outcome: What actually happened?',
    '- Avoidance pattern: Did the user avoid or approach? What pattern is visible?',
    '- Useful lesson: What can be learned from this experience?',
    '- Cognitive distortion: Describe any distorted thinking patterns carefully, gently, and non-diagnostically.',
    '- Suggested next behavior: One specific action for next time.',
    '- Suggested If-Then rule: If [trigger], then [replacement action].',
    '- Suggested ladder adjustment: If this is part of an exposure ladder, how should it be adjusted?',
    '',
    'Important:',
    '- Label the entire analysis clearly as an AI interpretation.',
    '- Do not diagnose any personality disorder or mental health condition.',
    '- Keep descriptions of cognitive patterns non-clinical (e.g., "assuming the worst" rather than "catastrophizing").',
    '- If the reflection describes self-harm, suicidal thoughts, or severe distress, recommend professional support.',
    '',
    'Return valid JSON matching the ReflectionAnalysisResponse schema exactly.',
  ].join('\n');

  const input = JSON.stringify(request.reflectionText, null, 2);
  const ctxSection = request.characterContext ? `\n\nCharacter context:\n${request.characterContext}` : '';
  return structuredCall<ReflectionAnalysisResponse>(userId, featurePrompt, input + ctxSection, reflectionAnalysisResponseSchema as unknown as z.ZodSchema<ReflectionAnalysisResponse>);
};

// ── 5. Weekly Review ________________________________________________________
export const generateWeeklyReview = async (
  userId: string,
  request: WeeklyReviewRequest,
): Promise<CoachResult<WeeklyReviewResponse>> => {
  const featurePrompt = [
    'You are generating a structured weekly character review from real system data.',
    '',
    'Rules:',
    '- Only mention achievements supported by the data provided.',
    '- Do not invent or exaggerate completions.',
    '- Identify patterns, not just single events.',
    '- Keep recommendations actionable and specific.',
    '- If there is insufficient data to assess an area, say so rather than inventing.',
    '',
    'Return valid JSON matching the WeeklyReviewResponse schema exactly.',
  ].join('\n');

  return structuredCall<WeeklyReviewResponse>(userId, featurePrompt, request.characterData, weeklyReviewResponseSchema as unknown as z.ZodSchema<WeeklyReviewResponse>);
};

// ── 6. Daily Mission ────────────────────────────────────────
export const generateDailyMission = async (
  userId: string,
  request: DailyMissionRequest,
): Promise<CoachResult<DailyMissionResponse>> => {
  const featurePrompt = [
    'You are generating one small daily mission for the user\'s character development.',
    '',
    'Rules:',
    '- The mission must take between 2 and 30 minutes.',
    '- If recovery mode is active, the mission should be very small (2-5 minutes).',
    '- Link to the focus trait if one is provided.',
    '- Consider planner workload: heavy workload = smaller mission.',
    '- Consider recent avoidance: offer a tiny approach behavior if avoidance is noted.',
    '- The mission type should match the context: action for momentum, reflection for insight, preparation for upcoming challenges.',
    '',
    'Return valid JSON matching the DailyMissionResponse schema exactly.',
  ].join('\n');

  const input = JSON.stringify(request, null, 2);
  return structuredCall<DailyMissionResponse>(userId, featurePrompt, input, dailyMissionResponseSchema as unknown as z.ZodSchema<DailyMissionResponse>);
};

// ── 7. Adaptive Suggestion ──────────────────────────────────
export const generateAdaptiveSuggestion = async (
  userId: string,
  request: AdaptiveSuggestionRequest,
): Promise<CoachResult<AdaptiveSuggestionResponse>> => {
  const featurePrompt = [
    'You are suggesting an adaptive challenge adjustment for the user.',
    'Based on their recent performance and current state, recommend ONE adjustment.',
    '',
    'Available adjustment types:',
    '- increase_difficulty: User is succeeding consistently, needs more challenge.',
    '- repeat_current_step: User is struggling, needs more practice at current level.',
    '- split_task: Task is too big, needs smaller steps.',
    '- change_cue: Current trigger isn\'t working, try a different one.',
    '- change_environment: Location or setup is causing friction.',
    '- add_proof: Adding evidence or tracking increases commitment.',
    '- add_accountability: Social accountability could help (only if other strategies have failed).',
    '- pause_temporarily: User is overwhelmed or in recovery mode. Permission to pause.',
    '- enter_recovery_mode: User has broken a streak or is burned out. Reset expectations.',
    '',
    'Every suggestion must include a reason based on the provided data.',
    'Return valid JSON matching the AdaptiveSuggestionResponse schema exactly.',
  ].join('\n');

  const input = JSON.stringify(request, null, 2);
  return structuredCall<AdaptiveSuggestionResponse>(userId, featurePrompt, input, adaptiveSuggestionResponseSchema as unknown as z.ZodSchema<AdaptiveSuggestionResponse>);
};
