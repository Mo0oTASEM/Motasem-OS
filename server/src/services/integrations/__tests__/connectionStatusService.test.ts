// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('../../supabaseClient.js', () => ({
  getSupabaseClientOrThrow: () => mockSupabase,
}));

const env: Record<string, string> = {};
const ENV_MAP: Record<string, string> = {
  googleClientId: 'GOOGLE_CLIENT_ID',
  googleClientSecret: 'GOOGLE_CLIENT_SECRET',
  googleOAuthRedirectUri: 'GOOGLE_OAUTH_REDIRECT_URI',
  hermesBaseUrl: 'HERMES_BASE_URL',
  hermesModel: 'HERMES_MODEL',
  hermesApiKey: 'HERMES_API_KEY',
  geminiApiKey: 'GEMINI_API_KEY',
  telegramBotToken: 'TELEGRAM_BOT_TOKEN',
  telegramWebhookSecret: 'TELEGRAM_WEBHOOK_SECRET',
  telegramAllowedChatIds: 'TELEGRAM_ALLOWED_CHAT_IDS',
  whatsappPhoneNumberId: 'WHATSAPP_PHONE_NUMBER_ID',
  whatsappAccessToken: 'WHATSAPP_ACCESS_TOKEN',
  whatsappWebhookSecret: 'WHATSAPP_WEBHOOK_SECRET',
  whatsappVerifyToken: 'WHATSAPP_VERIFY_TOKEN',
  whatsappAllowedSenders: 'WHATSAPP_ALLOWED_SENDERS',
};
vi.mock('../../../config.js', () => ({
  config: new Proxy({} as Record<string, string>, {
    get: (_target, prop: string) => {
      const envKey = ENV_MAP[prop as keyof typeof ENV_MAP];
      return envKey ? (env[envKey] ?? '') : '';
    },
  }),
  googleScopes: [],
}));

import { connectionStatusService } from '../connectionStatusService.js';
import { invalidateProviderCache } from '../providerConfigService.js';

function makeBuilder(data: unknown, error: unknown = null) {
  const result = { data, error };
  const p = Promise.resolve(result);
  const builder = {
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    select: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return builder;
}

function makeProviderRow(id: string, config: Record<string, unknown> = {}) {
  return {
    id,
    name: id,
    description: null,
    icon_name: null,
    category: 'test',
    docs_url: null,
    auth_type: 'api_key',
    config,
    is_system: false,
    created_at: '',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  invalidateProviderCache();
  Object.keys(env).forEach(k => delete env[k]);
});

describe('connectionStatusService', () => {
  describe('ensureConnections', () => {
    it('creates connection for env-configured provider', async () => {
      env['TELEGRAM_BOT_TOKEN'] = 'bot:token';
      const existingBuilder = makeBuilder([]);
      const providerSelect = vi.fn().mockResolvedValue({ data: [makeProviderRow('telegram', { bot_token: '', webhook_secret: '', allowed_chat_ids: [] })], error: null });
      const upsertFn = vi.fn().mockResolvedValue({ data: null, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'integration_providers') return { select: providerSelect };
        if (table === 'integration_connections') return { select: vi.fn(() => existingBuilder), upsert: upsertFn };
        return { select: vi.fn() };
      });

      await connectionStatusService.ensureConnections('user-1');

      expect(upsertFn).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1', provider_id: 'telegram', status: 'configured' }),
        expect.any(Object),
      );
    });



    it('does not overwrite connected status', async () => {
      const providerSelect = vi.fn().mockResolvedValue({ data: [makeProviderRow('google_workspace', { client_id: '', client_secret: '', redirect_uri: '', scopes: [] })], error: null });
      const existingBuilder = makeBuilder([{ id: 'conn-1', provider_id: 'google_workspace', status: 'connected' }]);
      const upsertFn = vi.fn().mockResolvedValue({ data: null, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'integration_providers') return { select: providerSelect };
        if (table === 'integration_connections') return { select: vi.fn(() => existingBuilder), upsert: upsertFn };
        return { select: vi.fn() };
      });

      await connectionStatusService.ensureConnections('user-1');
      expect(upsertFn).not.toHaveBeenCalled();
    });

    it('creates connection for DB-configured provider', async () => {
      const providerSelect = vi.fn().mockResolvedValue({ data: [makeProviderRow('gemini', { api_key: 'real-key' })], error: null });
      const existingBuilder = makeBuilder([]);
      const upsertFn = vi.fn().mockResolvedValue({ data: null, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'integration_providers') return { select: providerSelect };
        if (table === 'integration_connections') return { select: vi.fn(() => existingBuilder), upsert: upsertFn };
        return { select: vi.fn() };
      });

      await connectionStatusService.ensureConnections('user-1');

      expect(upsertFn).toHaveBeenCalledWith(
        expect.objectContaining({ provider_id: 'gemini', status: 'configured' }),
        expect.any(Object),
      );
    });

    it('skips providers with no config at all', async () => {
      const providerSelect = vi.fn().mockResolvedValue({ data: [makeProviderRow('github', { access_token: '' })], error: null });
      const existingBuilder = makeBuilder([]);
      const upsertFn = vi.fn();

      mockFrom.mockImplementation((table: string) => {
        if (table === 'integration_providers') return { select: providerSelect };
        if (table === 'integration_connections') return { select: vi.fn(() => existingBuilder), upsert: upsertFn };
        return { select: vi.fn() };
      });

      await connectionStatusService.ensureConnections('user-1');
      expect(upsertFn).not.toHaveBeenCalled();
    });
  });

  describe('listConnections', () => {
    it('returns connections from supabase', async () => {
      env['GEMINI_API_KEY'] = 'test-key';

      const providerSelect = vi.fn().mockResolvedValue({ data: [makeProviderRow('gemini', {})], error: null });
      const ensureBuilder = makeBuilder([]);
      const queryBuilder = makeBuilder([
        { id: 'c1', provider_id: 'gemini', status: 'configured', account_email: null, account_name: 'Gemini AI', scopes: [] },
      ]);
      const upsertFn = vi.fn();

      let callIdx = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'integration_providers') return { select: providerSelect };
        if (table === 'integration_connections') {
          callIdx++;
          const b = callIdx <= 1 ? ensureBuilder : queryBuilder;
          return { select: vi.fn(() => b), upsert: upsertFn };
        }
        return { select: vi.fn() };
      });

      const result = await connectionStatusService.listConnections('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].providerId).toBe('gemini');
    });
  });

  describe('getConnection', () => {
    it('returns a single connection', async () => {
      env['GEMINI_API_KEY'] = 'test-key';

      const providerSelect = vi.fn().mockResolvedValue({ data: [makeProviderRow('gemini', {})], error: null });
      const ensureBuilder = makeBuilder([]);
      const queryBuilder = makeBuilder({ id: 'c1', provider_id: 'gemini', status: 'configured', account_email: null, account_name: null, scopes: [] });
      const upsertFn = vi.fn();

      let callIdx = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'integration_providers') return { select: providerSelect };
        if (table === 'integration_connections') {
          callIdx++;
          const b = callIdx <= 1 ? ensureBuilder : queryBuilder;
          return { select: vi.fn(() => b), upsert: upsertFn };
        }
        return { select: vi.fn() };
      });

      const result = await connectionStatusService.getConnection('user-1', 'gemini');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('configured');
    });

    it('returns null for missing connection', async () => {
      const providerSelect = vi.fn().mockResolvedValue({ data: [], error: null });
      const ensureBuilder = makeBuilder([]);
      const queryBuilder = makeBuilder(null);
      const upsertFn = vi.fn();

      let callIdx = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'integration_providers') return { select: providerSelect };
        if (table === 'integration_connections') {
          callIdx++;
          const b = callIdx <= 1 ? ensureBuilder : queryBuilder;
          return { select: vi.fn(() => b), upsert: upsertFn };
        }
        return { select: vi.fn() };
      });

      const result = await connectionStatusService.getConnection('user-1', 'nonexistent');
      expect(result).toBeNull();
    });
  });
});
