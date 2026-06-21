import { google, type Auth } from 'googleapis';
import type { GoogleServiceName } from './googleScopeRegistry.js';
import { SERVICE_SCOPES } from './googleScopeRegistry.js';
import { googleTokenStore } from './googleTokenStore.js';
import { getSupabaseClientOrThrow } from '../../supabaseClient.js';
import { config } from '../../../config.js';
import { providerConfigService } from '../providerConfigService.js';

async function getGoogleCredentials(): Promise<{ clientId: string; clientSecret: string; redirectUri: string }> {
  const cfg = await providerConfigService.getEffectiveConfig('google_workspace');
  return {
    clientId: String(cfg.client_id || config.googleClientId),
    clientSecret: String(cfg.client_secret || config.googleClientSecret),
    redirectUri: String(cfg.redirect_uri || config.googleOAuthRedirectUri),
  };
}

const getOAuthClient = async (connectionId: string) => {
  const tokens = await googleTokenStore.get(connectionId);
  if (!tokens?.accessToken) {
    throw new Error('No tokens found for connection.');
  }

  const creds = await getGoogleCredentials();
  const oauth = new google.auth.OAuth2(
    creds.clientId,
    creds.clientSecret,
    creds.redirectUri,
  );

  oauth.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken ?? undefined,
    expiry_date: tokens.expiryDate ?? undefined,
  });

  oauth.on('tokens', async (newTokens) => {
    if (newTokens.access_token) {
      await googleTokenStore.updateTokens(connectionId, {
        accessToken: newTokens.access_token,
        expiryDate: newTokens.expiry_date ?? undefined,
      });
    }
    if (newTokens.refresh_token) {
      const current = await googleTokenStore.get(connectionId);
      if (current) {
        await googleTokenStore.save(connectionId, {
          accessToken: newTokens.access_token ?? current.accessToken,
          refreshToken: newTokens.refresh_token,
          expiryDate: newTokens.expiry_date ?? current.expiryDate ?? undefined,
          scopes: current.scopes,
        });
      }
    }
  });

  return oauth;
};

export const googleServiceFactory = {
  async buildClient(connectionId: string, service: GoogleServiceName): Promise<{
    oauth: Auth.OAuth2Client;
    api: unknown;
  }> {
    const oauth = await getOAuthClient(connectionId);
    const scopeConfig = SERVICE_SCOPES[service];

    let api: unknown;
    switch (service) {
      case 'gmail':
        api = google.gmail({ version: 'v1', auth: oauth });
        break;
      case 'calendar':
        api = google.calendar({ version: 'v3', auth: oauth });
        break;
      case 'drive':
        api = google.drive({ version: 'v3', auth: oauth });
        break;
      case 'tasks':
        api = google.tasks({ version: 'v1', auth: oauth });
        break;
      case 'contacts':
        api = google.people({ version: 'v1', auth: oauth });
        break;
      case 'sheets':
        api = google.sheets({ version: 'v4', auth: oauth });
        break;
      case 'docs':
        api = google.docs({ version: 'v1', auth: oauth });
        break;
    }

    return { oauth, api };
  },

  async getConnectionId(userId: string, providerId: string): Promise<string | null> {
    const supabase = getSupabaseClientOrThrow();
    const { data } = await supabase
      .from('integration_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('provider_id', providerId)
      .maybeSingle();
    return data?.id ?? null;
  },

  async getConnection(userId: string, providerId: string) {
    const supabase = getSupabaseClientOrThrow();
    const { data } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider_id', providerId)
      .maybeSingle();
    return data ?? null;
  },

  async listConnections(userId: string) {
    const supabase = getSupabaseClientOrThrow();
    const { data } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    return data ?? [];
  },

  async setConnectionStatus(
    userId: string,
    providerId: string,
    status: string,
    updates?: Partial<{
      label: string;
      accountEmail: string;
      accountName: string;
      avatarUrl: string;
      scopes: string[];
      metadata: Record<string, unknown>;
    }>,
  ): Promise<string> {
    const supabase = getSupabaseClientOrThrow();
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      status,
      last_checked_at: now,
      updated_at: now,
    };
    if (status === 'connected') payload.connected_at = now;
    if (updates?.label) payload.label = updates.label;
    if (updates?.accountEmail) payload.account_email = updates.accountEmail;
    if (updates?.accountName) payload.account_name = updates.accountName;
    if (updates?.avatarUrl) payload.avatar_url = updates.avatarUrl;
    if (updates?.scopes) payload.scopes = updates.scopes;
    if (updates?.metadata) payload.metadata = updates.metadata;

    const { data, error } = await supabase
      .from('integration_connections')
      .upsert({
        user_id: userId,
        provider_id: providerId,
        ...payload,
      }, { onConflict: 'user_id,provider_id' })
      .select('id')
      .maybeSingle();

    if (error) throw error;
    return data?.id ?? crypto.randomUUID();
  },

  async deleteConnection(userId: string, providerId: string) {
    const supabase = getSupabaseClientOrThrow();
    const { error } = await supabase
      .from('integration_connections')
      .delete()
      .eq('user_id', userId)
      .eq('provider_id', providerId);
    if (error) throw error;
  },
};
