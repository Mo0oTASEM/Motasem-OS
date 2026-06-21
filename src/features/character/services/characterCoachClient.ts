import { getSupabaseBrowserClient } from '../../../lib/supabase/client';
import { apiBase, hasApiConfig } from '../../../lib/api/cloudRunClient';
import type {
  CoachMessageRequest,
  QuestGenerationRequest,
  GeneratedQuest,
  LadderGenerationRequest,
  GeneratedLadder,
  ReflectionAnalysisRequest,
  ReflectionAnalysisResponse,
  WeeklyReviewRequest,
  WeeklyReviewResponse,
  DailyMissionRequest,
  DailyMissionResponse,
  AdaptiveSuggestionRequest,
  AdaptiveSuggestionResponse,
} from './characterCoachTypes';

export interface CoachChatResponse {
  reply: string;
  suggestedActions?: Array<{ type: string; label: string; payload: Record<string, unknown> }>;
  disclaimer?: string;
}

export interface CoachResult<T> {
  ok: boolean;
  data: T | null;
  error?: string;
  disclaimer?: string;
}

const authHeaders = async (): Promise<Record<string, string>> => {
  const supabase = getSupabaseBrowserClient();
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = data.session?.access_token || '';
  let userId = data.session?.user?.id || '';

  if (!userId && import.meta.env.DEV) {
    try {
      const bypass = localStorage.getItem('nova_dev_user_bypass');
      if (bypass) {
        const parsed = JSON.parse(bypass);
        userId = parsed.id || '';
      }
    } catch {
      // ignore
    }
  }

  return {
    'Content-Type': 'application/json',
    ...(userId ? { 'X-Nova-User-Id': userId } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const post = async <TReq, TRes>(path: string, body: TReq): Promise<CoachResult<TRes>> => {
  if (!hasApiConfig) {
    return { ok: false, data: null, error: 'API base URL is not configured.' };
  }
  try {
    const headers = await authHeaders();
    const response = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : {};
    if (!response.ok) {
      return { ok: false, data: null, error: String(parsed.error || parsed.message || 'Request failed') };
    }
    return { ok: true, data: parsed as TRes };
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : 'Coach request failed' };
  }
};

export const characterCoachClient = {
  chat: (body: CoachMessageRequest) =>
    post<CoachMessageRequest, CoachChatResponse>('/character/coach/message', body),

  generateQuest: (body: QuestGenerationRequest) =>
    post<QuestGenerationRequest, { quest: GeneratedQuest; disclaimer?: string }>('/character/coach/generate-quest', body),

  generateLadder: (body: LadderGenerationRequest) =>
    post<LadderGenerationRequest, { ladder: GeneratedLadder; disclaimer?: string }>('/character/coach/generate-ladder', body),

  analyzeReflection: (body: ReflectionAnalysisRequest) =>
    post<ReflectionAnalysisRequest, ReflectionAnalysisResponse>('/character/coach/analyze-reflection', body),

  weeklyReview: (body: WeeklyReviewRequest) =>
    post<WeeklyReviewRequest, WeeklyReviewResponse>('/character/coach/weekly-review', body),

  dailyMission: (body: DailyMissionRequest) =>
    post<DailyMissionRequest, DailyMissionResponse>('/character/coach/daily-mission', body),

  adaptiveSuggestion: (body: AdaptiveSuggestionRequest) =>
    post<AdaptiveSuggestionRequest, AdaptiveSuggestionResponse>('/character/coach/adaptive-suggestion', body),
};
