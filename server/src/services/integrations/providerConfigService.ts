import { getSupabaseClientOrThrow } from '../supabaseClient.js';
import { config, googleScopes as configGoogleScopes } from '../../config.js';

interface ProviderRow {
  id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  category: string;
  docs_url: string | null;
  auth_type: string;
  config: Record<string, unknown>;
  is_system: boolean;
  created_at: string;
}

function envFallback(providerId: string): Record<string, string | string[]> {
  switch (providerId) {
    case 'google_workspace':
      return {
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: config.googleOAuthRedirectUri,
        scopes: configGoogleScopes,
      };
    case 'hermes':
      return {
        base_url: config.hermesBaseUrl,
        model: config.hermesModel,
        api_key: config.hermesApiKey,
      };
    case 'gemini':
      return {
        api_key: config.geminiApiKey,
      };
    case 'telegram':
      return {
        bot_token: config.telegramBotToken,
        webhook_secret: config.telegramWebhookSecret,
        allowed_chat_ids: config.telegramAllowedChatIds,
      };
    case 'whatsapp':
      return {
        phone_number_id: config.whatsappPhoneNumberId,
        access_token: config.whatsappAccessToken,
        webhook_secret: config.whatsappWebhookSecret,
        verify_token: config.whatsappVerifyToken,
        allowed_senders: config.whatsappAllowedSenders,
      };
    default:
      return {};
  }
}

let cachedProviders: ProviderRow[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000;

async function getAllProviders(): Promise<ProviderRow[]> {
  const now = Date.now();
  if (cachedProviders && now - cacheTime < CACHE_TTL) return cachedProviders;
  const supabase = getSupabaseClientOrThrow();
  const { data } = await supabase.from('integration_providers').select('*');
  cachedProviders = (data ?? []) as ProviderRow[];
  cacheTime = now;
  return cachedProviders;
}

export function invalidateProviderCache(): void {
  cachedProviders = null;
  cacheTime = 0;
}

export const providerConfigService = {
  async listProviders(): Promise<ProviderRow[]> {
    return getAllProviders();
  },

  async getProvider(id: string): Promise<ProviderRow | null> {
    const rows = await getAllProviders();
    return rows.find(r => r.id === id) ?? null;
  },

  async getProviderWithConfig(id: string): Promise<{
    id: string;
    name: string;
    description: string | null;
    icon_name: string | null;
    category: string;
    docs_url: string | null;
    auth_type: string;
    is_system: boolean;
    config: Record<string, unknown>;
  } | null> {
    const row = await this.getProvider(id);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      icon_name: row.icon_name,
      category: row.category,
      docs_url: row.docs_url,
      auth_type: row.auth_type,
      is_system: row.is_system,
      config: (row.config ?? {}) as Record<string, unknown>,
    };
  },

  async getEffectiveConfig(id: string): Promise<Record<string, unknown>> {
    const row = await this.getProvider(id);
    const dbConfig = (row?.config ?? {}) as Record<string, unknown>;
    const fallback = envFallback(id);

    const result: Record<string, unknown> = { ...fallback };
    for (const [k, v] of Object.entries(dbConfig)) {
      if (typeof v === 'string' && v.length > 0) {
        result[k] = v;
      }
    }
    return result;
  },

  async updateProviderConfig(
    id: string,
    patch: { config?: Record<string, unknown>; auth_type?: string; is_system?: boolean },
  ): Promise<void> {
    const supabase = getSupabaseClientOrThrow();
    const update: Record<string, unknown> = {};
    if (patch.config !== undefined) update.config = patch.config;
    if (patch.auth_type !== undefined) update.auth_type = patch.auth_type;
    if (patch.is_system !== undefined) update.is_system = patch.is_system;

    const { error } = await supabase
      .from('integration_providers')
      .update(update)
      .eq('id', id);

    if (error) throw error;
    invalidateProviderCache();
  },
};
