import { z } from 'zod';
import { userDocumentStore } from '../userDocumentStore.js';

export const integrationSettingSchema = z.object({
  integrationId: z.string().min(1),
  values: z.record(z.string()).default({}),
  connectedAccount: z.string().optional(),
  notes: z.string().optional()
});

export type IntegrationSettingInput = z.infer<typeof integrationSettingSchema>;

type StoredIntegrationSetting = IntegrationSettingInput & {
  id: string;
  updatedAt: string;
  source: 'frontend';
};

const sensitivePattern = /(secret|token|key|password|private|client_secret|access_token|refresh_token)/i;

const maskValue = (key: string, value: string) => {
  if (!value) return '';
  if (!sensitivePattern.test(key)) return value;
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 3)}••••${value.slice(-3)}`;
};

const publicShape = (setting: StoredIntegrationSetting) => ({
  integrationId: setting.integrationId,
  connectedAccount: setting.connectedAccount || '',
  notes: setting.notes || '',
  savedKeys: Object.keys(setting.values || {}),
  maskedValues: Object.fromEntries(
    Object.entries(setting.values || {}).map(([key, value]) => [key, maskValue(key, String(value || ''))])
  ),
  updatedAt: setting.updatedAt,
  source: setting.source
});

export const listIntegrationSettings = async (userId: string) => {
  const settings = await userDocumentStore.listUserCollection<StoredIntegrationSetting>(userId, 'integration_settings');
  return settings.map(setting => publicShape(setting));
};

export const saveIntegrationSetting = async (userId: string, input: IntegrationSettingInput) => {
  const existing = await userDocumentStore.readUserDoc<StoredIntegrationSetting>(userId, 'integration_settings', input.integrationId);
  const cleanValues = Object.fromEntries(
    Object.entries(input.values || {})
      .map(([key, value]) => [key.trim(), String(value || '').trim()])
      .filter(([key, value]) => key && value)
  );

  const setting: StoredIntegrationSetting = {
    id: input.integrationId,
    integrationId: input.integrationId,
    values: {
      ...(existing?.values || {}),
      ...cleanValues
    },
    connectedAccount: input.connectedAccount?.trim() || existing?.connectedAccount || '',
    notes: input.notes?.trim() || existing?.notes || '',
    updatedAt: new Date().toISOString(),
    source: 'frontend'
  };

  await userDocumentStore.writeUserDoc(userId, 'integration_settings', input.integrationId, setting);
  return publicShape(setting);
};

export const getSettingValue = async (userId: string, integrationId: string, key: string): Promise<string> => {
  try {
    const doc = await userDocumentStore.readUserDoc<{ values: Record<string, string> }>(userId, 'integration_settings', integrationId);
    return doc?.values?.[key] || '';
  } catch {
    return '';
  }
};

export const getDynamicIntegrationHealth = async (userId: string) => {
  let rawDocs: { id: string; values: Record<string, string>; connectedAccount?: string; notes?: string }[] = [];
  try {
    rawDocs = await userDocumentStore.listUserCollection<{ id: string; values: Record<string, string> }>(userId, 'integration_settings');
  } catch {
    // ignore
  }
  const settingsMap = Object.fromEntries(rawDocs.map(d => [d.id, d.values || {}]));

  const getValue = (integrationId: string, key: string, envFallbackKey: string) => {
    return settingsMap[integrationId]?.[key] || process.env[envFallbackKey]?.trim() || '';
  };

  const getEnvList = (integrationId: string, key: string, envFallbackKey: string) => {
    const raw = settingsMap[integrationId]?.[key] || process.env[envFallbackKey]?.trim() || '';
    return raw.split(',').map((v: string) => v.trim()).filter(Boolean);
  };

  const supabaseUrl = getValue('supabase', 'SUPABASE_URL', 'SUPABASE_URL') || '';
  const supabaseKey = getValue('supabase', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PUBLISHABLE_KEY') || '';

  const googleClientId = getValue('google-oauth', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_ID') || '';
  const googleClientSecret = getValue('google-oauth', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET') || '';
  const googleRedirectUri = getValue('google-oauth', 'GOOGLE_REDIRECT_URI', 'GOOGLE_REDIRECT_URI') || getValue('google-oauth', 'GOOGLE_OAUTH_REDIRECT_URI', 'GOOGLE_OAUTH_REDIRECT_URI') || '';

  const geminiApiKey = getValue('gemini', 'GEMINI_API_KEY', 'GEMINI_API_KEY');

  const hermesApiKey = getValue('hermes', 'HERMES_API_KEY', 'HERMES_API_KEY');
  const hermesBaseUrl = getValue('hermes', 'HERMES_BASE_URL', 'HERMES_BASE_URL');
  const hermesModel = getValue('hermes', 'HERMES_MODEL', 'HERMES_MODEL');

  const telegramBotToken = getValue('telegram', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_BOT_TOKEN');
  const telegramWebhookSecret = getValue('telegram', 'TELEGRAM_WEBHOOK_SECRET', 'TELEGRAM_WEBHOOK_SECRET');
  const telegramAllowedChatIds = getEnvList('telegram', 'TELEGRAM_ALLOWED_CHAT_IDS', 'TELEGRAM_ALLOWED_CHAT_IDS');

  const healthFor = (name: string, values: Record<string, string | string[]>) => {
    const missing: string[] = [];
    Object.entries(values).forEach(([k, v]) => {
      if (!v || (Array.isArray(v) && v.length === 0)) {
        missing.push(k);
      }
    });
    if (missing.length > 0) {
      return {
        status: 'setup_required' as const,
        requiredEnv: Object.keys(values),
        missingEnv: missing,
        message: `Missing required environment variables or saved keys: ${missing.join(', ')}.`
      };
    }
    return {
      status: 'setup_required' as const,
      requiredEnv: Object.keys(values),
      missingEnv: [] as string[],
      message: 'Environment is configured. Connection is verified when a user completes OAuth or a service call succeeds.'
    };
  };

  return {
    supabase: healthFor('supabase', { SUPABASE_URL: supabaseUrl, SUPABASE_PUBLISHABLE_KEY: supabaseKey }),
    google: healthFor('google', { GOOGLE_CLIENT_ID: googleClientId, GOOGLE_CLIENT_SECRET: googleClientSecret, GOOGLE_REDIRECT_URI: googleRedirectUri }),
    gemini: healthFor('gemini', { GEMINI_API_KEY: geminiApiKey }),
    hermes: healthFor('hermes', { HERMES_API_KEY: hermesApiKey, HERMES_BASE_URL: hermesBaseUrl, HERMES_MODEL: hermesModel }),
    telegram: healthFor('telegram', { TELEGRAM_BOT_TOKEN: telegramBotToken, TELEGRAM_WEBHOOK_SECRET: telegramWebhookSecret, TELEGRAM_ALLOWED_CHAT_IDS: telegramAllowedChatIds }),
    app: {
      status: 'connected' as const,
      requiredEnv: ['APP_BASE_URL', 'NODE_ENV'],
      missingEnv: [] as string[],
      message: 'Configured and available.'
    }
  };
};

