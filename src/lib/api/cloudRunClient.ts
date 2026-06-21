import { getSupabaseBrowserClient } from '../supabase/client';
import { env, getEnvStatus } from '../env/validate';
import type { CanonicalStatus } from '../integrationStatus/shared';

export const hasApiConfig = getEnvStatus().hasApi;
export const apiBase = env.apiBaseUrl;

export type ApiErrorKind =
  | 'network_error'
  | 'auth_missing'
  | 'env_missing'
  | 'rate_limited'
  | 'permission_denied'
  | 'backend_unavailable'
  | 'request_failed';

export class ApiClientError extends Error {
  kind: ApiErrorKind;
  status?: number;
  details?: unknown;

  constructor(message: string, kind: ApiErrorKind = 'request_failed', status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.kind = kind;
    this.status = status;
    this.details = details;
  }
}

const classifyStatus = (status: number, body: Record<string, unknown> = {}): ApiErrorKind => {
  if (status === 0 || status >= 502) return 'backend_unavailable';
  if (status === 401) return 'auth_missing';
  if (status === 403) return 'permission_denied';
  if (status === 429) return 'rate_limited';
  if (status === 503 && (body.missingEnv || String(body.error || '').toLowerCase().includes('configured'))) return 'env_missing';
  return 'request_failed';
};

const errorMessage = (kind: ApiErrorKind, fallback: string) => {
  const messages: Record<ApiErrorKind, string> = {
    network_error: 'Network error. Check your connection and local backend.',
    auth_missing: 'Authentication is missing. Connect Supabase or use the local-owner fallback in development.',
    env_missing: 'Required backend environment variables are missing.',
    rate_limited: 'The provider rate limit was reached. Wait a moment and retry.',
    permission_denied: 'Permission denied. Reconnect OAuth with the required scopes.',
    backend_unavailable: 'Backend is unavailable. Start the API server and retry.',
    request_failed: fallback
  };
  return messages[kind] || fallback;
};

export const normalizeApiError = (error: unknown) => {
  if (error instanceof ApiClientError) return error;
  if (error instanceof TypeError) return new ApiClientError(errorMessage('network_error', error.message), 'network_error', undefined, error);
  if (error instanceof Error) return new ApiClientError(error.message, 'request_failed', undefined, error);
  return new ApiClientError('Request failed for an unknown reason.', 'request_failed', undefined, error);
};

const parseResponseBody = async (response: Response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const requestJson = async <T>(path: string, init: RequestInit = {}, fallback = 'Request failed.'): Promise<T> => {
  if (!hasApiConfig) {
    throw new ApiClientError('API base URL is not configured. Set VITE_API_BASE_URL in your .env file.', 'env_missing', undefined, { missingEnv: ['VITE_API_BASE_URL'] });
  }
  try {
    const response = await fetch(`${apiBase}${path}`, init);
    const body = await parseResponseBody(response) as Record<string, unknown>;
    if (!response.ok) {
      const kind = classifyStatus(response.status, body);
      const message = String(body.error || body.message || errorMessage(kind, fallback));
      throw new ApiClientError(message, kind, response.status, body);
    }
    return body as T;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

const authHeaders = async () => {
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
    } catch (e) {
      void e;
    }
  }

  return {
    'Content-Type': 'application/json',
    ...(userId ? { 'X-Nova-User-Id': userId } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export interface AiCommandPayload {
  message: string;
  currentView?: string;
  selectedEntityId?: string;
  conversationId?: string;
  contextHints?: Record<string, unknown>;
  dryRun?: boolean;
}

export interface AiCommandResponse {
  response: string;
  intent: string;
  confidence: number;
  proposedActions: Array<Record<string, unknown>>;
  executedActions: Array<Record<string, unknown>>;
  pendingApprovals: Array<Record<string, unknown>>;
  memoryUpdates: Array<Record<string, unknown>>;
  sources: Array<Record<string, unknown>>;
  errors: string[];
}

export interface MemorySearchPayload {
  query: string;
  types?: string[];
  entityType?: string;
  entityId?: string;
  limit?: number;
}

export interface IntegrationHealthResponse {
  ok?: boolean;
  integrations?: Record<string, {
    status?: string;
    requiredEnv?: string[];
    missingEnv?: string[];
    message?: string;
  }>;
  timestamp?: string;
}

export interface GoogleDebugResponse {
  clientIdConfigured?: boolean;
  redirectUriConfigured?: boolean;
  hasClientSecret?: boolean;
  localDevAuth?: boolean;
}

export interface GoogleAuthUrlResponse {
  url?: string;
  error?: string;
  missingEnv?: string[];
}


export interface IntegrationSettingSummary {
  integrationId: string;
  connectedAccount?: string;
  notes?: string;
  savedKeys: string[];
  maskedValues: Record<string, string>;
  updatedAt: string;
  source: string;
}

export const cloudRunClient = {
  async health() {
    return requestJson<Record<string, unknown>>('/health', {}, 'Health check failed.');
  },

  async integrationHealth() {
    return requestJson<IntegrationHealthResponse>('/integrations/health', {
      headers: await authHeaders()
    }, 'Integration health check failed.');
  },

  async getIntegrationSettings() {
    return requestJson<{ settings: IntegrationSettingSummary[] }>('/integrations/settings', {
      headers: await authHeaders()
    }, 'Integration settings load failed.');
  },

  async saveIntegrationSettings(payload: {
    integrationId: string;
    values: Record<string, string>;
    connectedAccount?: string;
    notes?: string;
  }) {
    return requestJson<{ setting: IntegrationSettingSummary }>('/integrations/settings', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    }, 'Integration settings save failed.');
  },

  async telegramStatus() {
    return requestJson<Record<string, unknown>>('/telegram/status', {
      headers: await authHeaders()
    }, 'Telegram status check failed.');
  },

  async whatsappStatus() {
    return requestJson<Record<string, unknown>>('/whatsapp/status', {
      headers: await authHeaders()
    }, 'WhatsApp status check failed.');
  },

  async hermesStatus() {
    return requestJson<Record<string, unknown>>('/hermes/status', {
      headers: await authHeaders()
    }, 'Hermes status check failed.');
  },

  async googleDebug() {
    return requestJson<GoogleDebugResponse>('/auth/google/debug', {}, 'Google OAuth debug check failed.');
  },

  async getGoogleAuthUrl(userId?: string) {
    return requestJson<GoogleAuthUrlResponse>('/auth/google/url', {
      headers: {
        ...(await authHeaders()),
        ...(userId ? { 'X-Nova-User-Id': userId } : {})
      }
    }, 'Google OAuth URL request failed.');
  },

  async searchMemory(query: string | MemorySearchPayload) {
    const payload = typeof query === 'string' ? { query } : query;
    const response = await fetch(`${apiBase}/memory/search`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async ingestMemory(payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/memory/ingest`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async createMemory(payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/memory`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async updateMemory(memoryId: string, payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/memory/${memoryId}`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async deleteMemory(memoryId: string) {
    const response = await fetch(`${apiBase}/memory/${memoryId}`, {
      method: 'DELETE',
      headers: await authHeaders()
    });
    return response.json();
  },

  async summarizeEntityMemory(payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/memory/summarize-entity`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async aiCommand(payload: AiCommandPayload): Promise<AiCommandResponse> {
    return requestJson<AiCommandResponse>('/ai/command', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    }, 'AI command request failed.');
  },

  async runAgent(agent: string, prompt: string) {
    const response = await fetch(`${apiBase}/agents/run`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ agent, prompt })
    });
    return response.json();
  },

  async syncGoogle(service = 'full') {
    const path = service === 'full' ? '/sync/google/full' : `/sync/google/${service}`;
    const response = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: await authHeaders()
    });
    return response.json();
  },

  async importContacts() {
    const response = await fetch(`${apiBase}/brain/import/contacts`, {
      method: 'POST',
      headers: await authHeaders()
    });
    return response.json();
  },

  async askBrain(question: string) {
    const response = await fetch(`${apiBase}/brain/ask`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ question })
    });
    return response.json();
  },

  async bootstrapCrm() {
    const response = await fetch(`${apiBase}/crm/bootstrap`, {
      method: 'POST',
      headers: await authHeaders()
    });
    return response.json();
  },

  async getCrmSnapshot() {
    const response = await fetch(`${apiBase}/crm/snapshot`, {
      headers: await authHeaders()
    });
    return response.json();
  },

  async syncCrm(payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/crm/sync`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async logCrmActivity(payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/crm/activity`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async createCrmContact(payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/crm/contacts`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async getCrmLeads() {
    const response = await fetch(`${apiBase}/crm/leads`, {
      headers: await authHeaders()
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'CRM lead load failed.');
    return body;
  },

  async createCrmLead(payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/crm/leads`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'CRM lead create failed.');
    return body;
  },

  async updateCrmLead(leadId: string, payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/crm/leads/${leadId}`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'CRM lead update failed.');
    return body;
  },

  async deleteCrmLead(leadId: string) {
    const response = await fetch(`${apiBase}/crm/leads/${leadId}`, {
      method: 'DELETE',
      headers: await authHeaders()
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'CRM lead delete failed.');
    return body;
  },


  async getSocialInbox() {
    const response = await fetch(`${apiBase}/social/inbox`, {
      headers: await authHeaders()
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Social inbox load failed.');
    return body;
  },

  async suggestSocialReply(commentId: string, tone: string) {
    const response = await fetch(`${apiBase}/social/comments/${commentId}/suggest-reply`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ tone })
    });
    return response.json();
  },

  async approveSocialReply(replyId: string, payload: { body?: string; trustedAutoReply?: boolean } = {}) {
    const response = await fetch(`${apiBase}/social/replies/${replyId}/approve`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async rejectSocialReply(replyId: string) {
    const response = await fetch(`${apiBase}/social/replies/${replyId}/reject`, {
      method: 'POST',
      headers: await authHeaders()
    });
    return response.json();
  },

  async markSocialCommentHandled(commentId: string) {
    const response = await fetch(`${apiBase}/social/comments/${commentId}/handled`, {
      method: 'POST',
      headers: await authHeaders()
    });
    return response.json();
  },

  async promoteCrmLeadToContact(leadId: string, payload: { approvalId?: string; trusted?: boolean } = {}) {
    const response = await fetch(`${apiBase}/crm/leads/${leadId}/promote`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async createCrmCalendarEvent(payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/crm/calendar/event`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async sendCrmEmail(payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/crm/gmail/send`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async crmAi(feature: 'draft' | 'smart-reply' | 'lead-score' | 'suggestions' | 'sequences' | 'meeting-brief' | 'deal-health' | 'inbox-triage' | 'enrichment' | 'command-bar', payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/crm/ai/${feature}`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async createOutreachDraft(payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/work/outreach/draft`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async createOutreachSequence(payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/work/outreach/sequence`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async saveGmailDraft(payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/work/gmail/drafts`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async sendApprovedGmail(payload: Record<string, unknown>) {
    const response = await fetch(`${apiBase}/work/gmail/send-approved`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async listProviders() {
    return requestJson<{ providers: Record<string, unknown>[] }>('/integrations/providers', {
      headers: await authHeaders()
    }, 'Providers list failed.');
  },

  async getProvider(id: string) {
    return requestJson<{ provider: Record<string, unknown> }>(`/integrations/providers/${encodeURIComponent(id)}`, {
      headers: await authHeaders()
    }, 'Provider get failed.');
  },

  async updateProvider(id: string, body: {
    config?: Record<string, unknown>;
    auth_type?: string;
    is_system?: boolean;
  }) {
    return requestJson<{ provider: Record<string, unknown> }>(`/integrations/providers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(body)
    }, 'Provider update failed.');
  },

  async importGoogleClientsToCrm() {
    return requestJson<{ imported: number; message?: string }>('/crm/contacts/import-google', {
      method: 'POST',
      headers: await authHeaders()
    }, 'Import Google clients to CRM failed.');
  },

  async getDeals() {
    return requestJson<{ deals: Record<string, unknown>[] }>('/crm/deals', {
      headers: await authHeaders()
    }, 'Deals load failed.');
  },

  async createDeal(payload: Record<string, unknown>) {
    return requestJson<{ deal: Record<string, unknown> }>('/crm/deals', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    }, 'Deal create failed.');
  },

  async updateDeal(dealId: string, payload: Record<string, unknown>) {
    return requestJson<{ deal: Record<string, unknown> }>(`/crm/deals/${dealId}`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify(payload)
    }, 'Deal update failed.');
  },

  async deleteDeal(dealId: string) {
    return requestJson<{ success: boolean }>(`/crm/deals/${dealId}`, {
      method: 'DELETE',
      headers: await authHeaders()
    }, 'Deal delete failed.');
  },

  // ── Planner API ────────────────────────────────────────────────────────

  plannerApi: {
    // Workspace resolution
    async getWorkspace() {
      return requestJson<{ workspace: Record<string, unknown> }>('/planner/workspace', {
        headers: await authHeaders()
      }, 'Workspace load failed.');
    },

    // Quarters
    async listQuarters(workspaceId: string) {
      return requestJson<{ quarters: Record<string, unknown>[] }>(`/planner/quarters?workspaceId=${workspaceId}`, {
        headers: await authHeaders()
      }, 'Quarters load failed.');
    },
    async getQuarter(id: string, workspaceId: string) {
      return requestJson<{ quarter: Record<string, unknown> }>(`/planner/quarters/${id}?workspaceId=${workspaceId}`, {
        headers: await authHeaders()
      }, 'Quarter load failed.');
    },
    async createQuarter(payload: Record<string, unknown>) {
      return requestJson<{ quarter: Record<string, unknown> }>('/planner/quarters', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Quarter create failed.');
    },
    async updateQuarter(id: string, payload: Record<string, unknown>) {
      return requestJson<{ quarter: Record<string, unknown> }>(`/planner/quarters/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Quarter update failed.');
    },
    async activateQuarter(id: string, workspaceId: string) {
      return requestJson<{ quarter: Record<string, unknown>; validation?: Record<string, unknown> }>(`/planner/quarters/${id}/activate`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ workspaceId })
      }, 'Quarter activation failed.');
    },
    async completeQuarter(id: string, workspaceId: string) {
      return requestJson<{ quarter: Record<string, unknown> }>(`/planner/quarters/${id}/complete`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ workspaceId })
      }, 'Quarter completion failed.');
    },
    async archiveQuarter(id: string, workspaceId: string) {
      return requestJson<{ quarter: Record<string, unknown> }>(`/planner/quarters/${id}/archive`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ workspaceId })
      }, 'Quarter archive failed.');
    },
    async deleteQuarter(id: string, workspaceId: string) {
      return requestJson<{ success: boolean }>(`/planner/quarters/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
        headers: await authHeaders()
      }, 'Quarter delete failed.');
    },
    async duplicateQuarter(id: string, payload: Record<string, unknown>) {
      return requestJson<{ quarter: Record<string, unknown> }>(`/planner/quarters/${id}/duplicate`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Quarter duplicate failed.');
    },
    async compareQuarters(id1: string, id2: string, workspaceId: string) {
      return requestJson<{ comparison: Record<string, unknown> }>(`/planner/quarters/${id1}/compare/${id2}?workspaceId=${workspaceId}`, {
        headers: await authHeaders()
      }, 'Quarter compare failed.');
    },
    async generateRetrospective(id: string, workspaceId: string) {
      return requestJson<{ review: Record<string, unknown> }>(`/planner/quarters/${id}/retrospective`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ workspaceId })
      }, 'Retrospective generation failed.');
    },

    // Quarterly Goals
    async listGoals(workspaceId: string, quarterId?: string) {
      const qs = quarterId ? `&quarterId=${quarterId}` : '';
      return requestJson<{ goals: Record<string, unknown>[] }>(`/planner/goals?workspaceId=${workspaceId}${qs}`, {
        headers: await authHeaders()
      }, 'Goals load failed.');
    },
    async createGoal(payload: Record<string, unknown>) {
      return requestJson<{ goal: Record<string, unknown> }>('/planner/goals', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Goal create failed.');
    },
    async updateGoal(id: string, payload: Record<string, unknown>) {
      return requestJson<{ goal: Record<string, unknown> }>(`/planner/goals/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Goal update failed.');
    },
    async deleteGoal(id: string, workspaceId: string) {
      return requestJson<{ success: boolean }>(`/planner/goals/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
        headers: await authHeaders()
      }, 'Goal delete failed.');
    },
    async carryGoal(id: string, payload: Record<string, unknown>) {
      return requestJson<{ goal: Record<string, unknown> }>(`/planner/goals/${id}/carry`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Goal carry failed.');
    },
    async reorderGoals(payload: Record<string, unknown>) {
      return requestJson<{ success: boolean }>('/planner/goals/reorder', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Goal reorder failed.');
    },

    // Key Results
    async listKeyResults(goalId: string, workspaceId: string) {
      return requestJson<{ keyResults: Record<string, unknown>[] }>(`/planner/key-results?goalId=${goalId}&workspaceId=${workspaceId}`, {
        headers: await authHeaders()
      }, 'Key results load failed.');
    },
    async createKeyResult(payload: Record<string, unknown>) {
      return requestJson<{ keyResult: Record<string, unknown> }>('/planner/key-results', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Key result create failed.');
    },
    async updateKeyResult(id: string, payload: Record<string, unknown>) {
      return requestJson<{ keyResult: Record<string, unknown> }>(`/planner/key-results/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Key result update failed.');
    },
    async deleteKeyResult(id: string, workspaceId: string) {
      return requestJson<{ success: boolean }>(`/planner/key-results/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
        headers: await authHeaders()
      }, 'Key result delete failed.');
    },
    async updateKeyResultProgress(id: string, payload: Record<string, unknown>) {
      return requestJson<{ success: boolean; progress: number }>(`/planner/key-results/${id}/progress`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Key result progress update failed.');
    },
    async reorderKeyResults(payload: Record<string, unknown>) {
      return requestJson<{ success: boolean }>('/planner/key-results/reorder', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Key result reorder failed.');
    },

    // Monthly Plans
    async listMonthlyPlans(workspaceId: string, quarterId?: string) {
      const qs = quarterId ? `&quarterId=${quarterId}` : '';
      return requestJson<{ monthlyPlans: Record<string, unknown>[] }>(`/planner/months?workspaceId=${workspaceId}${qs}`, {
        headers: await authHeaders()
      }, 'Monthly plans load failed.');
    },
    async getMonthlyPlan(id: string, workspaceId: string) {
      return requestJson<{ monthlyPlan: Record<string, unknown> }>(`/planner/months/${id}?workspaceId=${workspaceId}`, {
        headers: await authHeaders()
      }, 'Monthly plan load failed.');
    },
    async createMonthlyPlan(payload: Record<string, unknown>) {
      return requestJson<{ monthlyPlan: Record<string, unknown> }>('/planner/months', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Monthly plan create failed.');
    },
    async updateMonthlyPlan(id: string, payload: Record<string, unknown>) {
      return requestJson<{ monthlyPlan: Record<string, unknown> }>(`/planner/months/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Monthly plan update failed.');
    },
    async activateMonthlyPlan(id: string, workspaceId: string) {
      return requestJson<{ success: boolean; monthlyPlan: Record<string, unknown> }>(`/planner/months/${id}/activate`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ workspaceId })
      }, 'Monthly plan activation failed.');
    },
    async deleteMonthlyPlan(id: string, workspaceId: string) {
      return requestJson<{ success: boolean }>(`/planner/months/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
        headers: await authHeaders()
      }, 'Monthly plan delete failed.');
    },
    async generateMonthlyReview(id: string, workspaceId: string) {
      return requestJson<{ review: Record<string, unknown> }>(`/planner/months/${id}/review`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ workspaceId })
      }, 'Monthly review generation failed.');
    },

    // Monthly Outcomes
    async listOutcomes(monthlyPlanId: string, workspaceId: string) {
      return requestJson<{ monthlyOutcomes: Record<string, unknown>[] }>(`/planner/outcomes?monthlyPlanId=${monthlyPlanId}&workspaceId=${workspaceId}`, {
        headers: await authHeaders()
      }, 'Outcomes load failed.');
    },
    async createOutcome(payload: Record<string, unknown>) {
      return requestJson<{ monthlyOutcome: Record<string, unknown> }>('/planner/outcomes', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Outcome create failed.');
    },
    async updateOutcome(id: string, payload: Record<string, unknown>) {
      const res = await requestJson<{ monthlyOutcome: Record<string, unknown> }>(`/planner/outcomes/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Outcome update failed.');
      if (res && res.monthlyOutcome) {
        const monthlyOutcome = res.monthlyOutcome as { progress_percentage?: number; progressPercentage?: number; status?: string };
        window.dispatchEvent(new CustomEvent('planner-goal-updated', {
          detail: { id, updates: payload, goal: { id, progress: monthlyOutcome.progress_percentage ?? monthlyOutcome.progressPercentage ?? 0, status: monthlyOutcome.status || 'active' } }
        }));
      }
      return res;
    },
    async deleteOutcome(id: string, workspaceId: string) {
      return requestJson<{ success: boolean }>(`/planner/outcomes/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
        headers: await authHeaders()
      }, 'Outcome delete failed.');
    },
    async updateOutcomeProgress(id: string, payload: Record<string, unknown>) {
      return requestJson<{ success: boolean; monthlyOutcome: Record<string, unknown> }>(`/planner/outcomes/${id}/progress`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Outcome progress update failed.');
    },
    async reorderOutcomes(payload: Record<string, unknown>) {
      return requestJson<{ success: boolean }>('/planner/outcomes/reorder', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Outcome reorder failed.');
    },

    // Reviews
    async listReviews(workspaceId: string, reviewType?: string, referenceId?: string) {
      let qs = `workspaceId=${workspaceId}`;
      if (reviewType) qs += `&reviewType=${reviewType}`;
      if (referenceId) qs += `&referenceId=${referenceId}`;
      return requestJson<{ reviews: Record<string, unknown>[] }>(`/planner/reviews?${qs}`, {
        headers: await authHeaders()
      }, 'Reviews load failed.');
    },
    async createReview(payload: Record<string, unknown>) {
      return requestJson<{ review: Record<string, unknown> }>('/planner/reviews', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Review create failed.');
    },
    async updateReview(id: string, payload: Record<string, unknown>) {
      return requestJson<{ review: Record<string, unknown> }>(`/planner/reviews/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Review update failed.');
    },

    // ── AI Planning Assistant ─────────────────────────────────────────────
    async aiSuggestSchedule(payload: { workspaceId: string; quarterId: string; monthlyPlanId?: string }) {
      return requestJson<{ suggestions: Record<string, unknown>[] }>('/planner/ai/suggest-schedule', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'AI schedule suggestions failed.');
    },
    async aiPrioritize(payload: { workspaceId: string; quarterId: string }) {
      return requestJson<{ suggestions: Record<string, unknown>[] }>('/planner/ai/prioritize', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'AI prioritization failed.');
    },
    async aiDetectRisks(payload: { workspaceId: string; quarterId: string }) {
      return requestJson<{ suggestions: Record<string, unknown>[] }>('/planner/ai/detect-risks', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'AI risk detection failed.');
    },
    async aiAnalyzeCapacity(payload: { workspaceId: string; quarterId?: string }) {
      return requestJson<{ suggestions: Record<string, unknown>[] }>('/planner/ai/analyze-capacity', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'AI capacity analysis failed.');
    },
    async aiGoalInsights(payload: { workspaceId: string; goalId: string }) {
      return requestJson<{ suggestions: Record<string, unknown>[] }>('/planner/ai/goal-insights', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'AI goal insights failed.');
    },
    async aiLogAction(payload: {
      workspaceId: string;
      actionType: string;
      appliedChanges: Record<string, unknown>;
      success: boolean;
      errorMessage?: string;
    }) {
      return requestJson<{ log: Record<string, unknown> }>('/planner/ai/log-action', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'AI action logging failed.');
    },

    // Weekly Plans
    async listWeeklyPlans(workspaceId: string, monthlyPlanId?: string) {
      const q = monthlyPlanId ? `&monthlyPlanId=${monthlyPlanId}` : '';
      return requestJson<{ weeklyPlans: Record<string, unknown>[] }>(`/planner/weekly-plans?workspaceId=${workspaceId}${q}`, {
        headers: await authHeaders()
      }, 'Weekly plans load failed.');
    },
    async createWeeklyPlan(payload: Record<string, unknown>) {
      return requestJson<{ weeklyPlan: Record<string, unknown> }>('/planner/weekly-plans', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Weekly plan create failed.');
    },
    async updateWeeklyPlan(id: string, payload: Record<string, unknown>) {
      return requestJson<{ weeklyPlan: Record<string, unknown> }>(`/planner/weekly-plans/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Weekly plan update failed.');
    },
    async deleteWeeklyPlan(id: string, workspaceId: string) {
      return requestJson<{ success: boolean }>(`/planner/weekly-plans/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
        headers: await authHeaders()
      }, 'Weekly plan delete failed.');
    },
    async activateWeeklyPlan(id: string, workspaceId: string) {
      return requestJson<{ weeklyPlan: Record<string, unknown> }>(`/planner/weekly-plans/${id}/activate`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ workspaceId })
      }, 'Weekly plan activation failed.');
    },

    // Weekly Objectives
    async listWeeklyObjectives(workspaceId: string, weeklyPlanId: string) {
      return requestJson<{ objectives: Record<string, unknown>[] }>(`/planner/weekly-objectives?workspaceId=${workspaceId}&weeklyPlanId=${weeklyPlanId}`, {
        headers: await authHeaders()
      }, 'Weekly objectives load failed.');
    },
    async createWeeklyObjective(payload: Record<string, unknown>) {
      return requestJson<{ weeklyObjective: Record<string, unknown> }>('/planner/weekly-objectives', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Weekly objective create failed.');
    },
    async updateWeeklyObjective(id: string, payload: Record<string, unknown>) {
      const res = await requestJson<{ weeklyObjective: Record<string, unknown> }>(`/planner/weekly-objectives/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Weekly objective update failed.');
      if (res && res.weeklyObjective) {
        const weeklyObjective = res.weeklyObjective as { progress_percentage?: number; progressPercentage?: number; status?: string };
        window.dispatchEvent(new CustomEvent('planner-goal-updated', {
          detail: { id, updates: payload, goal: { id, progress: weeklyObjective.progress_percentage ?? weeklyObjective.progressPercentage ?? 0, status: weeklyObjective.status || 'active' } }
        }));
      }
      return res;
    },
    async deleteWeeklyObjective(id: string, workspaceId: string) {
      return requestJson<{ success: boolean }>(`/planner/weekly-objectives/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
        headers: await authHeaders()
      }, 'Weekly objective delete failed.');
    },

    // Daily Plans
    async listDailyPlans(workspaceId: string) {
      return requestJson<{ dailyPlans: Record<string, unknown>[] }>(`/planner/daily-plans?workspaceId=${workspaceId}`, {
        headers: await authHeaders()
      }, 'Daily plans load failed.');
    },
    async getDailyPlanByDate(date: string, workspaceId: string) {
      return requestJson<{ dailyPlan: Record<string, unknown> | null }>(`/planner/daily-plans/by-date?date=${date}&workspaceId=${workspaceId}`, {
        headers: await authHeaders()
      }, 'Daily plan load by date failed.');
    },
    async createDailyPlan(payload: Record<string, unknown>) {
      return requestJson<{ dailyPlan: Record<string, unknown> }>('/planner/daily-plans', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Daily plan create failed.');
    },
    async updateDailyPlan(id: string, payload: Record<string, unknown>) {
      return requestJson<{ dailyPlan: Record<string, unknown> }>(`/planner/daily-plans/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Daily plan update failed.');
    },
    async shutdownDailyPlan(id: string, payload: Record<string, unknown>) {
      return requestJson<{ dailyPlan: Record<string, unknown> }>(`/planner/daily-plans/${id}/shutdown`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Daily plan shutdown failed.');
    },

    // Tasks
    async listTasks(workspaceId: string, filters: Record<string, unknown> = {}) {
      let q = `workspaceId=${workspaceId}`;
      for (const [key, val] of Object.entries(filters)) {
        if (val !== undefined && val !== null) {
          q += `&${key}=${encodeURIComponent(String(val))}`;
        }
      }
      return requestJson<{ tasks: Record<string, unknown>[] }>(`/planner/tasks?${q}`, {
        headers: await authHeaders()
      }, 'Tasks load failed.');
    },
    async createTask(payload: Record<string, unknown>) {
      return requestJson<{ task: Record<string, unknown> }>('/planner/tasks', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Task create failed.');
    },
    async updateTask(id: string, payload: Record<string, unknown>) {
      const res = await requestJson<{ task: Record<string, unknown> }>(`/planner/tasks/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Task update failed.');
      if (res && res.task) {
        window.dispatchEvent(new CustomEvent('planner-task-updated', {
          detail: { id, updates: payload, task: res.task }
        }));
      }
      return res;
    },
    async deleteTask(id: string, workspaceId: string) {
      return requestJson<{ success: boolean }>(`/planner/tasks/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
        headers: await authHeaders()
      }, 'Task delete failed.');
    },

    async listCalendarEvents(workspaceId: string, startDate: string, endDate: string) {
      const q = `workspaceId=${workspaceId}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      return requestJson<{ events: Record<string, unknown>[] }>(`/planner/calendar-events?${q}`, {
        headers: await authHeaders()
      }, 'Calendar events load failed.');
    },

    async getGoogleCalendarStatus() {
      return requestJson<Record<string, unknown>>('/planner/google-calendar/status', {
        headers: await authHeaders()
      }, 'Google Calendar status load failed.');
    },
    async connectGoogleCalendar() {
      return requestJson<{ url: string }>('/planner/google-calendar/connect', {
        method: 'POST',
        headers: await authHeaders()
      }, 'Google Calendar connect failed.');
    },
    async refreshGoogleCalendars() {
      return requestJson<Record<string, unknown>>('/planner/google-calendar/refresh-calendars', {
        method: 'POST',
        headers: await authHeaders()
      }, 'Google calendars refresh failed.');
    },
    async updateSelectedGoogleCalendars(selectedCalendarIds: string[]) {
      return requestJson<Record<string, unknown>>('/planner/google-calendar/calendars', {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ selectedCalendarIds })
      }, 'Google calendar selection update failed.');
    },
    async syncGoogleCalendar(workspaceId: string, forceFullSync = false) {
      return requestJson<Record<string, unknown>>('/planner/google-calendar/sync', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ workspaceId, forceFullSync })
      }, 'Google Calendar sync failed.');
    },
    async disconnectGoogleCalendar() {
      return requestJson<Record<string, unknown>>('/planner/google-calendar/disconnect', {
        method: 'POST',
        headers: await authHeaders()
      }, 'Google Calendar disconnect failed.');
    },
    async createGoogleCalendarEvent(payload: Record<string, unknown>) {
      return requestJson<Record<string, unknown>>('/planner/google-calendar/events', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Google Calendar event create failed.');
    },
    async updateGoogleCalendarEvent(id: string, payload: Record<string, unknown>) {
      return requestJson<Record<string, unknown>>(`/planner/google-calendar/events/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(payload)
      }, 'Google Calendar event update failed.');
    },
    async deleteGoogleCalendarEvent(id: string, workspaceId: string) {
      return requestJson<Record<string, unknown>>(`/planner/google-calendar/events/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
        headers: await authHeaders()
      }, 'Google Calendar event delete failed.');
    },

    // Notifications
    async listNotifications(workspaceId: string) {
      return requestJson<{ notifications: Record<string, unknown>[] }>(`/planner/notifications?workspaceId=${workspaceId}`, {
        headers: await authHeaders()
      }, 'Notifications load failed.');
    },
    async readNotification(id: string, workspaceId: string) {
      return requestJson<{ success: boolean }>(`/planner/notifications/${id}/read`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ workspaceId })
      }, 'Notification read update failed.');
    },
    async readAllNotifications(workspaceId: string) {
      return requestJson<{ success: boolean }>('/planner/notifications/read-all', {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ workspaceId })
      }, 'All notifications read update failed.');
    },
    async deleteNotification(id: string, workspaceId: string) {
      return requestJson<{ success: boolean }>(`/planner/notifications/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
        headers: await authHeaders()
      }, 'Notification delete failed.');
    },
    async dismissAllNotifications(workspaceId: string) {
      return requestJson<{ success: boolean }>('/planner/notifications/dismiss-all', {
        method: 'DELETE',
        headers: await authHeaders(),
        body: JSON.stringify({ workspaceId })
      }, 'All notifications dismiss failed.');
    },
    async triggerNotificationChecks(workspaceId: string) {
      return requestJson<{ success: boolean }>('/planner/notifications/trigger-checks', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ workspaceId })
      }, 'Notification checks trigger failed.');
    },

    // AI brief
    async getAiBrief(workspaceId: string) {
      return requestJson<{ brief: string }>(`/planner/ai/brief?workspaceId=${workspaceId}`, {
        headers: await authHeaders()
      }, 'AI Planning Brief load failed.');
    },

    async get<T>(path: string, fallback = 'Request failed.') {
      return requestJson<T>(path, { headers: await authHeaders() }, fallback);
    },

    async post<T>(path: string, body: unknown, fallback = 'Request failed.') {
      return requestJson<T>(path, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(body)
      }, fallback);
    },

    async getGoogleIntegrationStatus(userId: string) {
      return this.get<{
        connected: boolean;
        email: string | null;
        services: Record<string, boolean>;
        scopes: string[];
      }>(`/integrations/google/status?userId=${encodeURIComponent(userId)}`, 'Google status check failed.');
    },

    async testGoogleConnection(userId: string) {
      return this.post<{ ok: boolean; email?: string; error?: string }>('/integrations/google/test', { userId }, 'Google test failed.');
    },

    async disconnectGoogle(userId: string) {
      return this.post<{ ok: boolean }>('/integrations/google/disconnect', { userId }, 'Google disconnect failed.');
    },

    async syncGoogleServiceFromIntegrations(userId: string, service: string) {
      return this.post<{ ok: boolean; message: string }>('/integrations/google/sync', { userId, service }, 'Google sync failed.');
    },

    async listIntegrationConnections(userId: string) {
      return this.get<Array<{
        id: string;
        providerId: string;
        status: CanonicalStatus;
        accountEmail: string | null;
        accountName: string | null;
        scopes: string[];
      }>>(`/integrations/connections?userId=${encodeURIComponent(userId)}`, 'Connections list failed.');
    }
  }
};
