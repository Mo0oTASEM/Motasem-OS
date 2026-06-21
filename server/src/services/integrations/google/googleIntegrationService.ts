import { google, type Auth } from 'googleapis';
import { config } from '../../../config.js';
import { getSupabaseClientOrThrow } from '../../supabaseClient.js';
import { googleServiceFactory } from './googleServiceFactory.js';
import { googleTokenStore } from './googleTokenStore.js';
import { getScopesForServices, type GoogleServiceName } from './googleScopeRegistry.js';
import { ALL_GOOGLE_SCOPES, BASE_GOOGLE_SCOPES } from './googleScopeRegistry.js';

const PROVIDER_ID = 'google_workspace';

async function getOAuthClientForAuth(): Promise<Auth.OAuth2Client> {
  const { providerConfigService } = await import('../providerConfigService.js');
  const cfg = await providerConfigService.getEffectiveConfig(PROVIDER_ID);
  return new google.auth.OAuth2(
    String(cfg.client_id || config.googleClientId),
    String(cfg.client_secret || config.googleClientSecret),
    String(cfg.redirect_uri || config.googleOAuthRedirectUri),
  );
}

export const googleIntegrationService = {
  async generateAuthUrl(userId: string): Promise<string> {
    const client = await getOAuthClientForAuth();

    await googleServiceFactory.setConnectionStatus(userId, PROVIDER_ID, 'connecting');

    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [...BASE_GOOGLE_SCOPES, ...ALL_GOOGLE_SCOPES],
      state: Buffer.from(JSON.stringify({ userId })).toString('base64url'),
    });
  },

  async handleCallback(code: string, state: string): Promise<{
    userId: string;
    email: string;
    name: string;
    picture: string;
    scopes: string[];
  }> {
    const { userId } = JSON.parse(Buffer.from(state, 'base64url').toString());
    const client = await getOAuthClientForAuth();

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data: userInfo } = await oauth2.userinfo.get();

    const email = userInfo.email ?? '';
    const name = userInfo.name ?? email;
    const picture = userInfo.picture ?? '';
    const grantedScopes = (tokens.scope ?? '').split(' ');

    const connectionId = await googleServiceFactory.setConnectionStatus(userId, PROVIDER_ID, 'connected', {
      accountEmail: email,
      accountName: name,
      avatarUrl: picture,
      scopes: grantedScopes,
    });

    if (tokens.access_token) {
      await googleTokenStore.save(connectionId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiryDate: tokens.expiry_date ?? undefined,
        scopes: grantedScopes,
      });
    }

    return { userId, email, name, picture, scopes: grantedScopes };
  },

  async getStatus(userId: string): Promise<{
    connected: boolean;
    email: string | null;
    services: Record<GoogleServiceName, boolean>;
    scopes: string[];
  }> {
    const conn = await googleServiceFactory.getConnection(userId, PROVIDER_ID);
    if (!conn || conn.status !== 'connected') {
      return { connected: false, email: null, services: {} as Record<GoogleServiceName, boolean>, scopes: [] };
    }

    const grantedScopes = new Set(conn.scopes ?? []);
    const allServices: GoogleServiceName[] = ['gmail', 'calendar', 'drive', 'tasks', 'contacts', 'sheets', 'docs'];
    const services = {} as Record<GoogleServiceName, boolean>;

    for (const svc of allServices) {
      const scopes = getScopesForServices([svc]).filter(s => !BASE_GOOGLE_SCOPES.includes(s));
      services[svc] = scopes.some(s => grantedScopes.has(s));
    }

    return {
      connected: true,
      email: conn.account_email ?? null,
      services,
      scopes: conn.scopes ?? [],
    };
  },

  async disconnect(userId: string): Promise<void> {
    const connectionId = await googleServiceFactory.getConnectionId(userId, PROVIDER_ID);
    if (connectionId) {
      await googleTokenStore.delete(connectionId);
    }
    await googleServiceFactory.deleteConnection(userId, PROVIDER_ID);
  },

  async testConnection(userId: string): Promise<{
    ok: boolean;
    email?: string;
    error?: string;
  }> {
    try {
      const connectionId = await googleServiceFactory.getConnectionId(userId, PROVIDER_ID);
      if (!connectionId) return { ok: false, error: 'Not connected.' };

      const client = await getOAuthClientForAuth();

      const tokens = await googleTokenStore.get(connectionId);
      if (!tokens?.accessToken) return { ok: false, error: 'No access token.' };

      client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken ?? undefined,
        expiry_date: tokens.expiryDate ?? undefined,
      });

      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const { data } = await oauth2.userinfo.get();
      return { ok: true, email: data.email ?? undefined };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { ok: false, error: message };
    }
  },

  async syncService(userId: string, service: GoogleServiceName): Promise<{ ok: boolean; message: string }> {
    const connectionId = await googleServiceFactory.getConnectionId(userId, PROVIDER_ID);
    if (!connectionId) return { ok: false, message: 'Google Workspace not connected.' };

    const supabase = getSupabaseClientOrThrow();
    const now = new Date().toISOString();

    const { error } = await supabase.from('integration_sync_jobs').insert({
      connection_id: connectionId,
      service,
      status: 'pending',
      sync_type: 'incremental',
    });

    if (error) return { ok: false, message: error.message };

    return { ok: true, message: `Sync queued for ${service}.` };
  },
};


