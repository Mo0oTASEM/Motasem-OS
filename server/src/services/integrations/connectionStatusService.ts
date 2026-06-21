import { getSupabaseClientOrThrow } from '../supabaseClient.js';
import { config } from '../../config.js';
import { providerConfigService } from './providerConfigService.js';

type ProviderStatus = {
  id: string;
  status: 'connected' | 'configured' | 'disconnected';
  accountEmail: string | null;
  accountName: string | null;
};

function envStatus(providerId: string): ProviderStatus | null {
  switch (providerId) {
    case 'hermes':
      if (config.hermesApiKey && config.hermesBaseUrl) {
        return { id: 'hermes', status: 'configured', accountEmail: null, accountName: 'Hermes AI' };
      }
      return null;
    case 'gemini':
      if (config.geminiApiKey) {
        return { id: 'gemini', status: 'configured', accountEmail: null, accountName: 'Gemini AI' };
      }
      return null;
    case 'telegram':
      if (config.telegramBotToken) {
        return { id: 'telegram', status: 'configured', accountEmail: null, accountName: config.telegramBotToken.slice(0, 8) + '…' };
      }
      return null;
    case 'whatsapp':
      if (config.whatsappAccessToken && config.whatsappPhoneNumberId) {
        return { id: 'whatsapp', status: 'configured', accountEmail: null, accountName: `+${config.whatsappPhoneNumberId}` };
      }
      return null;
    case 'github':
    case 'vercel':
    default:
      return null;
  }
}

function dbConfigStatus(config: Record<string, unknown>, providerId: string): ProviderStatus | null {
  const hasClientId = Boolean(config.client_id && typeof config.client_id === 'string' && config.client_id.length > 0);
  const hasClientSecret = Boolean(config.client_secret && typeof config.client_secret === 'string' && config.client_secret.length > 0);
  const hasApiKey = Boolean(config.api_key && typeof config.api_key === 'string' && config.api_key.length > 0);
  const hasAccessToken = Boolean(config.access_token && typeof config.access_token === 'string' && config.access_token.length > 0);
  const hasBotToken = Boolean(config.bot_token && typeof config.bot_token === 'string' && config.bot_token.length > 0);

  switch (providerId) {
    case 'google_workspace':
      if (hasClientId && hasClientSecret) {
        return { id: 'google_workspace', status: 'configured', accountEmail: null, accountName: 'Google Workspace' };
      }
      return null;
    case 'hermes':
      if (config.base_url && hasApiKey) {
        return { id: 'hermes', status: 'configured', accountEmail: null, accountName: String(config.base_url) };
      }
      return null;
    case 'gemini':
      if (hasApiKey) {
        return { id: 'gemini', status: 'configured', accountEmail: null, accountName: null };
      }
      return null;
    case 'telegram':
      if (hasBotToken) {
        return { id: 'telegram', status: 'configured', accountEmail: null, accountName: null };
      }
      return null;
    case 'whatsapp':
      if (config.phone_number_id && hasAccessToken) {
        return { id: 'whatsapp', status: 'configured', accountEmail: null, accountName: String(config.phone_number_id) };
      }
      return null;
    case 'github':
      if (hasAccessToken) {
        return { id: 'github', status: 'configured', accountEmail: null, accountName: null };
      }
      return null;
    case 'vercel':
      if (hasAccessToken) {
        return { id: 'vercel', status: 'configured', accountEmail: null, accountName: null };
      }
      return null;
    default:
      return null;
  }
}

export const connectionStatusService = {
  async ensureConnections(userId: string): Promise<void> {
    const supabase = getSupabaseClientOrThrow();

    const { data: existing } = await supabase
      .from('integration_connections')
      .select('id, provider_id, status')
      .eq('user_id', userId);

    const existingMap = new Map((existing ?? []).map(c => [c.provider_id, c]));

    const allProviders = await providerConfigService.listProviders();
    const now = new Date().toISOString();

    for (const provider of allProviders) {
      let status: ProviderStatus | null = envStatus(provider.id);
      if (!status) {
        const dbConfig = (provider.config ?? {}) as Record<string, unknown>;
        status = dbConfigStatus(dbConfig, provider.id);
      }
      if (!status) continue;

      const existingConn = existingMap.get(provider.id);
      if (existingConn && existingConn.status === 'connected') continue;

      const payload: Record<string, unknown> = {
        user_id: userId,
        provider_id: provider.id,
        status: status.status,
        updated_at: now,
        last_checked_at: now,
      };
      if (status.accountEmail) payload.account_email = status.accountEmail;
      if (status.accountName) payload.account_name = status.accountName;

      await supabase
        .from('integration_connections')
        .upsert(payload, { onConflict: 'user_id,provider_id' });
    }
  },

  async listConnections(userId: string): Promise<Array<{
    id: string;
    providerId: string;
    status: string;
    accountEmail: string | null;
    accountName: string | null;
    scopes: string[];
  }>> {
    await this.ensureConnections(userId);

    const supabase = getSupabaseClientOrThrow();
    const { data } = await supabase
      .from('integration_connections')
      .select('id, provider_id, status, account_email, account_name, scopes')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    return (data ?? []).map(c => ({
      id: c.id,
      providerId: c.provider_id,
      status: c.status,
      accountEmail: c.account_email,
      accountName: c.account_name,
      scopes: c.scopes ?? [],
    }));
  },

  async getConnection(userId: string, providerId: string): Promise<{
    id: string;
    providerId: string;
    status: string;
    accountEmail: string | null;
    accountName: string | null;
    scopes: string[];
  } | null> {
    await this.ensureConnections(userId);

    const supabase = getSupabaseClientOrThrow();
    const { data } = await supabase
      .from('integration_connections')
      .select('id, provider_id, status, account_email, account_name, scopes')
      .eq('user_id', userId)
      .eq('provider_id', providerId)
      .maybeSingle();

    if (!data) return null;
    return {
      id: data.id,
      providerId: data.provider_id,
      status: data.status,
      accountEmail: data.account_email,
      accountName: data.account_name,
      scopes: data.scopes ?? [],
    };
  },
};
