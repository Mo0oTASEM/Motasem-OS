import 'dotenv/config';

export type IntegrationHealthStatus = 'configured' | 'missing_env' | 'connected' | 'error';

type IntegrationHealth = {
  status: IntegrationHealthStatus;
  requiredEnv: string[];
  missingEnv: string[];
  message: string;
};

const env = (key: string) => process.env[key]?.trim() || '';
const envList = (key: string) => env(key)
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

const requiredVars: string[] = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'APP_BASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'GOOGLE_TOKEN_ENCRYPTION_KEY',
];

export const validateStartupEnv = (): void => {
  const missing = requiredVars.filter(key => !env(key));
  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
};

export const config = {
  nodeEnv: env('NODE_ENV') || 'development',
  port: Number(env('PORT') || 8080),
  appBaseUrl: env('APP_BASE_URL'),
  allowLocalDevAuth: env('NODE_ENV') === 'development' && env('ALLOW_LOCAL_DEV_AUTH') === 'true',
  localDevUserId: env('LOCAL_DEV_USER_ID') || '',

  googleClientId: env('GOOGLE_CLIENT_ID'),
  googleClientSecret: env('GOOGLE_CLIENT_SECRET'),
  googleOAuthRedirectUri: env('GOOGLE_REDIRECT_URI') || env('GOOGLE_OAUTH_REDIRECT_URI'),
  googleTokenEncryptionKey: env('GOOGLE_TOKEN_ENCRYPTION_KEY'),
  googleCalendarWebhookUrl: env('GOOGLE_CALENDAR_WEBHOOK_URL'),
  googleCalendarWebhookSecret: env('GOOGLE_CALENDAR_WEBHOOK_SECRET'),
  googleSheetsSpreadsheetId: env('GOOGLE_SHEETS_SPREADSHEET_ID'),
  pastGoogleSheetsIds: envList('PAST_GOOGLE_SHEETS_IDS'),
  geminiApiKey: env('GEMINI_API_KEY'),
  hermesApiKey: env('HERMES_API_KEY'),
  hermesBaseUrl: env('HERMES_BASE_URL'),
  hermesModel: env('HERMES_MODEL'),
  supabaseUrl: env('SUPABASE_URL'),
  supabasePublishableKey: env('SUPABASE_PUBLISHABLE_KEY'),
  supabaseServiceKey: env('SUPABASE_SERVICE_KEY'),
  telegramBotToken: env('TELEGRAM_BOT_TOKEN'),
  telegramWebhookSecret: env('TELEGRAM_WEBHOOK_SECRET'),
  telegramAllowedChatIds: envList('TELEGRAM_ALLOWED_CHAT_IDS'),
  whatsappPhoneNumberId: env('WHATSAPP_PHONE_NUMBER_ID'),
  whatsappAccessToken: env('WHATSAPP_ACCESS_TOKEN'),
  whatsappWebhookSecret: env('WHATSAPP_WEBHOOK_SECRET'),
  whatsappVerifyToken: env('WHATSAPP_VERIFY_TOKEN'),
  whatsappAllowedSenders: envList('WHATSAPP_ALLOWED_SENDERS'),
  corsOrigin: env('CORS_ORIGIN') || env('APP_BASE_URL')
};

const requiredByIntegration = {
  google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'GOOGLE_TOKEN_ENCRYPTION_KEY'],
  sheets: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'GOOGLE_SHEETS_SPREADSHEET_ID'],
  gemini: ['GEMINI_API_KEY'],
  hermes: ['HERMES_API_KEY', 'HERMES_BASE_URL', 'HERMES_MODEL'],
  telegram: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'TELEGRAM_ALLOWED_CHAT_IDS'],
  whatsapp: ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_WEBHOOK_SECRET'],
  app: ['APP_BASE_URL', 'NODE_ENV']
} as const;

const valueForEnv = (key: string) => {
  if (key === 'GOOGLE_REDIRECT_URI') return config.googleOAuthRedirectUri;
  return env(key);
};

const healthFor = (requiredEnv: readonly string[], connected = false): IntegrationHealth => {
  const missingEnv = requiredEnv.filter(key => !valueForEnv(key));
  if (missingEnv.length) {
    return {
      status: 'missing_env',
      requiredEnv: [...requiredEnv],
      missingEnv,
      message: `Missing required environment variable${missingEnv.length === 1 ? '' : 's'}: ${missingEnv.join(', ')}.`
    };
  }

  return {
    status: connected ? 'connected' : 'configured',
    requiredEnv: [...requiredEnv],
    missingEnv: [],
    message: connected ? 'Configured and available.' : 'Environment is configured. Connection is verified when a user completes OAuth or a service call succeeds.'
  };
};

export const getIntegrationHealth = () => ({
  google: healthFor(requiredByIntegration.google),
  sheets: healthFor(requiredByIntegration.sheets),
  gemini: healthFor(requiredByIntegration.gemini),
  hermes: healthFor(requiredByIntegration.hermes),
  telegram: healthFor(requiredByIntegration.telegram),
  whatsapp: healthFor(requiredByIntegration.whatsapp),
  app: healthFor(requiredByIntegration.app, true)
});

export const getConfigValidation = () => {
  const integrations = getIntegrationHealth();
  const errors = Object.entries(integrations)
    .filter(([, health]) => health.status === 'missing_env')
    .map(([name, health]) => ({
      integration: name,
      missingEnv: health.missingEnv,
      message: health.message
    }));

  return {
    ok: errors.length === 0,
    environment: config.nodeEnv,
    errors
  };
};

export const googleScopes = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/contacts'
];
