// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockSupabase = {
  from: mockFrom,
};

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
      const envKey = ENV_MAP[prop];
      return envKey ? (env[envKey] ?? '') : '';
    },
  }),
  googleScopes: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
}));

import { providerConfigService, invalidateProviderCache } from '../providerConfigService.js';

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'test_provider',
  name: 'Test Provider',
  description: 'A test provider',
  icon_name: 'test',
  category: 'test',
  docs_url: null,
  auth_type: 'api_key',
  config: {},
  is_system: false,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('providerConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateProviderCache();
    Object.keys(env).forEach(k => delete env[k]);
  });

  describe('listProviders', () => {
    it('returns providers from supabase', async () => {
      const rows = [makeRow({ id: 'p1' }), makeRow({ id: 'p2' })];
      mockFrom.mockReturnValue({ select: () => Promise.resolve({ data: rows, error: null }) });

      const result = await providerConfigService.listProviders();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('p1');
    });

    it('returns empty array when no providers', async () => {
      mockFrom.mockReturnValue({ select: () => Promise.resolve({ data: null, error: null }) });

      const result = await providerConfigService.listProviders();
      expect(result).toEqual([]);
    });

    it('caches results for 30s', async () => {
      const rows1 = [makeRow({ id: 'p1' })];
      const rows2 = [makeRow({ id: 'p2' })];
      const selectFn = vi.fn()
        .mockResolvedValueOnce({ data: rows1, error: null })
        .mockResolvedValueOnce({ data: rows2, error: null });
      mockFrom.mockReturnValue({ select: selectFn });

      await providerConfigService.listProviders();
      await providerConfigService.listProviders();
      expect(selectFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProvider', () => {
    it('returns provider by id', async () => {
      const rows = [makeRow({ id: 'target' }), makeRow({ id: 'other' })];
      mockFrom.mockReturnValue({ select: () => Promise.resolve({ data: rows, error: null }) });

      const result = await providerConfigService.getProvider('target');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('target');
    });

    it('returns null for missing provider', async () => {
      mockFrom.mockReturnValue({ select: () => Promise.resolve({ data: [], error: null }) });
      const result = await providerConfigService.getProvider('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getProviderWithConfig', () => {
    it('returns provider with config', async () => {
      const rows = [makeRow({ id: 'p1', config: { api_key: 'sk-test' }, auth_type: 'api_key' })];
      mockFrom.mockReturnValue({ select: () => Promise.resolve({ data: rows, error: null }) });

      const result = await providerConfigService.getProviderWithConfig('p1');
      expect(result).not.toBeNull();
      expect(result!.config.api_key).toBe('sk-test');
      expect(result!.auth_type).toBe('api_key');
    });

    it('returns null for missing provider', async () => {
      mockFrom.mockReturnValue({ select: () => Promise.resolve({ data: [], error: null }) });
      const result = await providerConfigService.getProviderWithConfig('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getEffectiveConfig', () => {
    it('merges DB config over env fallback', async () => {
      const rows = [makeRow({ id: 'hermes', config: { base_url: 'https://db.example.com', model: 'test-model' } })];
      mockFrom.mockReturnValue({ select: () => Promise.resolve({ data: rows, error: null }) });
      env['HERMES_BASE_URL'] = 'https://env.example.com';

      const result = await providerConfigService.getEffectiveConfig('hermes');
      expect(result.base_url).toBe('https://db.example.com');
    });

    it('falls back to env vars when DB config is empty', async () => {
      const rows = [makeRow({ id: 'hermes', config: { base_url: '', model: '' } })];
      mockFrom.mockReturnValue({ select: () => Promise.resolve({ data: rows, error: null }) });
      env['HERMES_BASE_URL'] = 'https://env.example.com';
      env['HERMES_MODEL'] = 'env-model';

      const result = await providerConfigService.getEffectiveConfig('hermes');
      expect(result.base_url).toBe('https://env.example.com');
      expect(result.model).toBe('env-model');
    });

    it('returns env vars when no DB row exists', async () => {
      mockFrom.mockReturnValue({ select: () => Promise.resolve({ data: [], error: null }) });
      env['GOOGLE_CLIENT_ID'] = 'env-client-id';

      const result = await providerConfigService.getEffectiveConfig('google_workspace');
      expect(result.client_id).toBe('env-client-id');
    });

    it('includes client_secret in google workspace fallback', async () => {
      mockFrom.mockReturnValue({ select: () => Promise.resolve({ data: [], error: null }) });
      env['GOOGLE_CLIENT_SECRET'] = 'env-secret';

      const result = await providerConfigService.getEffectiveConfig('google_workspace');
      expect(result.client_secret).toBe('env-secret');
    });

    it('includes api_key in hermes fallback', async () => {
      mockFrom.mockReturnValue({ select: () => Promise.resolve({ data: [], error: null }) });
      env['HERMES_API_KEY'] = 'hermes-key';

      const result = await providerConfigService.getEffectiveConfig('hermes');
      expect(result.api_key).toBe('hermes-key');
    });

    it('includes api_key in gemini fallback', async () => {
      mockFrom.mockReturnValue({ select: () => Promise.resolve({ data: [], error: null }) });
      env['GEMINI_API_KEY'] = 'gemini-key';

      const result = await providerConfigService.getEffectiveConfig('gemini');
      expect(result.api_key).toBe('gemini-key');
    });

    it('includes telegram fields in fallback', async () => {
      mockFrom.mockReturnValue({ select: () => Promise.resolve({ data: [], error: null }) });
      env['TELEGRAM_BOT_TOKEN'] = 'bot:token';
      env['TELEGRAM_WEBHOOK_SECRET'] = 'wh-secret';

      const result = await providerConfigService.getEffectiveConfig('telegram');
      expect(result.bot_token).toBe('bot:token');
      expect(result.webhook_secret).toBe('wh-secret');
    });

    it('includes whatsapp fields in fallback', async () => {
      mockFrom.mockReturnValue({ select: () => Promise.resolve({ data: [], error: null }) });
      env['WHATSAPP_PHONE_NUMBER_ID'] = '12345';
      env['WHATSAPP_ACCESS_TOKEN'] = 'wa-token';

      const result = await providerConfigService.getEffectiveConfig('whatsapp');
      expect(result.phone_number_id).toBe('12345');
      expect(result.access_token).toBe('wa-token');
    });
  });

  describe('updateProviderConfig', () => {
    it('updates config and invalidates cache', async () => {
      const updateFn = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ update: () => ({ eq: updateFn }) });

      await providerConfigService.updateProviderConfig('test', { config: { api_key: 'new-key' } });
      expect(updateFn).toHaveBeenCalledWith('id', 'test');
    });

    it('updates auth_type', async () => {
      const eqFn = vi.fn().mockResolvedValue({ error: null });
      const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
      mockFrom.mockReturnValue({ update: updateFn });

      await providerConfigService.updateProviderConfig('test', { auth_type: 'oauth2' });
      expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ auth_type: 'oauth2' }));
    });

    it('updates is_system flag', async () => {
      const eqFn = vi.fn().mockResolvedValue({ error: null });
      const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
      mockFrom.mockReturnValue({ update: updateFn });

      await providerConfigService.updateProviderConfig('test', { is_system: false });
      expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ is_system: false }));
    });
  });
});
