import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config, getConfigValidation, getIntegrationHealth, validateStartupEnv } from './config.js';
import { approvalRoutes } from './services/approvals/approvalRoutes.js';
import type { Request, Response, NextFunction } from 'express';
import { runAgent } from './agents/agentOrchestrator.js';
import { requireSupabaseUser, assertOwner, type AuthedRequest } from './security/securityService.js';
import { redact, safeStringify } from './lib/redact.js';
import { exchangeGoogleCode, getGoogleAuthUrl, syncGoogleService } from './services/googleWorkspaceService.js';
import { googleIntegrationService } from './services/integrations/google/googleIntegrationService.js';
import { googleServiceFactory } from './services/integrations/google/googleServiceFactory.js';
import { providerConfigService } from './services/integrations/providerConfigService.js';
import { connectionStatusService } from './services/integrations/connectionStatusService.js';
import type { GoogleServiceName } from './services/integrations/google/googleScopeRegistry.js';
import { ingestMemoryItem } from './services/memoryService.js';
import {
  createMemoryItem,
  deleteMemoryItem,
  durableMemoryTypes,
  updateMemoryItem
} from './services/memory/memoryRepository.js';
import { searchDurableMemory } from './services/memory/memorySearchService.js';
import { summarizeEntityIntoMemory } from './services/memory/domainSummaryService.js';
import { userDocumentStore } from './services/userDocumentStore.js';
import { saveGoogleWorkspaceTokens } from './services/googleAuthService.js';
import { answerBrainQuestion, importGoogleContacts } from './services/brainKnowledgeService.js';
import {
  appendCrmActivity,
  createCrmCalendarEvent,
  createCrmGoogleContact,
  readCrmSnapshot,
  sendCrmEmail
} from './services/crmWorkspaceService.js';
import {
  getTelegramIntegrationStatus,
  handleTelegramCommandWebhook
} from './services/telegram/telegramCommandService.js';
import { handleTelegramWebhookMessage } from './channels/telegramAdapter.js';
import { verifyWhatsAppWebhook, handleWhatsAppWebhookMessage } from './channels/whatsappAdapter.js';
import { draftCrmEmail } from './services/ai/aiDraft.js';
import { createSmartReplies } from './services/ai/aiSmartReply.js';
import { scoreCrmLead } from './services/ai/aiLeadScore.js';
import { suggestCrmActions } from './services/ai/aiSuggestions.js';
import { buildCrmSequence } from './services/ai/aiSequences.js';
import { createMeetingBrief } from './services/ai/aiMeetingBrief.js';
import { analyzeDealHealth } from './services/ai/aiDealHealth.js';
import { triageCrmInbox } from './services/ai/aiInboxTriage.js';
import { enrichCrmContact } from './services/ai/aiEnrichment.js';
import { runCrmCommandBar } from './services/ai/aiCommandBar.js';
import { importLocalStoragePayload } from './services/database/localStorageMigration.js';
import { aiCommandRequestSchema } from './services/aiBrain/aiSchemas.js';
import { runAiCommand } from './services/aiBrain/brainRouter.js';
import { runSecondBrain, secondBrainRequestSchema } from './services/aiBrain/secondBrainRouter.js';
import { crmRoutes } from './routes/crmRoutes.js';
import { socialRoutes } from './services/social/socialRoutes.js';
import { workOutreachRoutes } from './services/work/workOutreachRoutes.js';
import {
  integrationSettingSchema,
  listIntegrationSettings,
  saveIntegrationSetting,
  getDynamicIntegrationHealth
} from './services/integrations/integrationSettingsService.js';
import { plannerRoutes } from './routes/plannerRoutes.js';
import { handleGoogleCalendarCallback } from './services/planner/googleCalendarService.js';

validateStartupEnv();

const app = express();
const allowedOrigins = config.corsOrigin.split(',').map(origin => origin.trim()).filter(Boolean);

app.use(helmet());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again after 15 minutes.', code: 'RATE_LIMITED' },
});
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again after 15 minutes.', code: 'RATE_LIMITED' },
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Nova-User-Id']
}));
app.use(express.json({ limit: '2mb' }));

app.use(generalLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  (req as AuthedRequest).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.on('finish', () => {
    const duration = Date.now() - start;
    const sanitized = redact({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
    console.log(JSON.stringify({ requestId, ...sanitized as Record<string, unknown> }));
  });
  next();
});

app.get('/ready', (_req, res) => {
  res.json({ ok: true, status: 'ready', timestamp: new Date().toISOString() });
});

app.get('/health', (_req, res) => {
  const validation = getConfigValidation();
  res.json({
    ok: true,
    service: 'nova-os-api',
    environment: config.nodeEnv,
    configOk: validation.ok,
    timestamp: new Date().toISOString()
  });
});

app.get('/integrations/health', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  res.json({
    ok: true,
    integrations: await getDynamicIntegrationHealth(userId),
    timestamp: new Date().toISOString()
  });
});

app.get('/integrations/settings', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  res.json({ settings: await listIntegrationSettings(userId) });
});

app.post('/integrations/settings', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = integrationSettingSchema.parse(req.body);
  res.json({ setting: await saveIntegrationSetting(userId, body) });
});

app.get('/auth/google/debug', requireSupabaseUser, (req: AuthedRequest, res) => {
  assertOwner(req);
  res.json({
    clientIdConfigured: Boolean(config.googleClientId),
    redirectUriConfigured: Boolean(config.googleOAuthRedirectUri),
    hasClientSecret: Boolean(config.googleClientSecret),
    localDevAuth: config.allowLocalDevAuth
  });
});

app.get('/auth/google/url', authLimiter, requireSupabaseUser, async (_req: AuthedRequest, res) => {
  const userId = assertOwner(_req);
  const googleHealth = getIntegrationHealth().google;
  if (googleHealth.status === 'missing_env') {
    res.status(503).json({
      error: 'Google OAuth is not configured.',
      missingEnv: googleHealth.missingEnv
    });
    return;
  }
  res.json({ url: await getGoogleAuthUrl(userId) });
});

app.post('/auth/google/callback', authLimiter, requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.object({ code: z.string() }).parse(req.body);
  res.json({ userId, received: Boolean(body.code), next: 'Exchange code for encrypted refresh token in Secret Manager.' });
});

app.get('/auth/google/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const error = typeof req.query.error === 'string' ? req.query.error : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';

  if (error) {
    res.status(400).json({ error: `Google OAuth failed: ${error}`, code: 'GOOGLE_OAUTH_ERROR' });
    return;
  }

  if (!code) {
    res.status(400).json({ error: 'Missing Google OAuth code.', code: 'MISSING_CODE' });
    return;
  }

  try {
    const parsedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as { userId?: string };
    if (!parsedState.userId) throw new Error('Missing user state');
    const tokens = await exchangeGoogleCode(code, parsedState.userId);
    const now = new Date().toISOString();

    const syncState = {
      userId: parsedState.userId,
      service: 'google_oauth',
      status: tokens.refresh_token ? 'connected' : 'setup_required',
      lastSyncAt: now,
      updatedAt: now,
      source: 'google_oauth',
      tags: ['oauth', 'google'],
      links: [],
      importanceScore: 90,
      tokenExpiryDate: tokens.expiry_date || null,
      hasRefreshToken: Boolean(tokens.refresh_token)
    };

    const tokenPayload = {
      updatedAt: now,
      accessToken: tokens.access_token || undefined,
      refreshToken: tokens.refresh_token || undefined,
      scope: tokens.scope || undefined,
      tokenType: tokens.token_type || undefined,
      expiryDate: tokens.expiry_date || undefined
    };

    await userDocumentStore.writeUserDoc(parsedState.userId, 'sync_state', 'google_oauth', syncState);
    await saveGoogleWorkspaceTokens(parsedState.userId, tokenPayload);

    res.send('Google Workspace connected. You can close this tab and return to Motasem OS.');
  } catch (callbackError) {
    const message = (callbackError as Error).message;
    const help = message.includes('invalid_client')
      ? 'The Google OAuth client secret is invalid for this client ID. Create/copy the secret from Google Cloud Console > APIs & Services > Credentials for this exact OAuth client, then restart the server.'
      : message.includes('redirect_uri')
        ? `The redirect URI must be added in Google Cloud Console exactly as: ${config.googleOAuthRedirectUri}`
        : 'Check Google OAuth credentials and enabled APIs.';
    res.status(500).json({ error: `Google OAuth callback could not be completed: ${message}`, code: 'OAUTH_CALLBACK_ERROR', details: help });
  }
});

app.get('/planner/google-calendar/oauth/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const error = typeof req.query.error === 'string' ? req.query.error : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';

  if (error) {
    res.status(400).send('Google Calendar connection was cancelled or denied.');
    return;
  }

  if (!code || !state) {
    res.status(400).send('Google Calendar OAuth callback is missing required data.');
    return;
  }

  try {
    await handleGoogleCalendarCallback(code, state);
    res.redirect(`${config.appBaseUrl}/#/planner-integrations`);
  } catch (callbackError) {
    res.status(400).send(`Google Calendar could not be connected: ${(callbackError as Error).message}`);
  }
});

app.post('/sync/google/full', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const services = ['calendar', 'tasks', 'sheets', 'drive', 'docs', 'gmail', 'contacts'];
  const results = await Promise.all(services.map(service => syncGoogleService(userId, service)));
  res.json({ results });
});

app.post('/sync/google/:service', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const service = String(req.params.service);
  res.json(await syncGoogleService(userId, service));
});

app.get('/integrations/google/status', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  res.json(await googleIntegrationService.getStatus(userId));
});

app.post('/integrations/google/test', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  res.json(await googleIntegrationService.testConnection(userId));
});

app.post('/integrations/google/disconnect', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  await googleIntegrationService.disconnect(userId);
  res.json({ ok: true });
});

app.post('/integrations/google/sync', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.object({ service: z.string() }).parse(req.body);
  res.json(await googleIntegrationService.syncService(userId, body.service as GoogleServiceName));
});

app.get('/integrations/connections', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const connections = await connectionStatusService.listConnections(userId);
  res.json(connections);
});

app.get('/integrations/providers', requireSupabaseUser, async (_req: AuthedRequest, res) => {
  const providers = await providerConfigService.listProviders();
  const result = await Promise.all(providers.map(async (p) => {
    const cfg = await providerConfigService.getProviderWithConfig(p.id);
    return cfg;
  }));
  res.json({ providers: result.filter(Boolean) });
});

app.get('/integrations/providers/:id', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const provider = await providerConfigService.getProviderWithConfig(String(req.params.id));
  if (!provider) {
    res.status(404).json({ error: 'Provider not found.' });
    return;
  }
  res.json({ provider });
});

app.put('/integrations/providers/:id', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const providerId = String(req.params.id);
  const provider = await providerConfigService.getProvider(providerId);
  if (!provider) {
    res.status(404).json({ error: 'Provider not found.' });
    return;
  }
  const body = z.object({
    config: z.record(z.unknown()).optional(),
    auth_type: z.string().optional(),
    is_system: z.boolean().optional(),
  }).parse(req.body);
  if (provider.is_system && body.is_system !== false) {
    res.status(403).json({ error: 'This provider is managed by environment variables. Set is_system=false to enable API configuration.' });
    return;
  }
  await providerConfigService.updateProviderConfig(providerId, body);
  await connectionStatusService.ensureConnections(assertOwner(req));
  const updated = await providerConfigService.getProviderWithConfig(providerId);
  res.json({ provider: updated });
});

app.post('/finance/apple-pay/import', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/),
    transactions: z.array(z.object({
      date: z.string(),
      merchant: z.string().optional(),
      amount: z.number(),
      description: z.string().optional(),
      source: z.enum(['apple_pay', 'bank_csv', 'manual']).default('apple_pay')
    }))
  }).parse(req.body);

  res.json({
    userId,
    month: body.month,
    accepted: body.transactions.length,
    pipeline: ['import', 'normalize', 'categorize', 'persist_by_month', 'refresh_dashboard'],
    status: 'ready_for_finance_store_integration'
  });
});

app.post('/sync/webhook/calendar', async (req, res) => {
  if (!config.googleCalendarWebhookSecret) {
    res.status(503).json({ accepted: false, error: 'Calendar webhook secret is not configured.' });
    return;
  }
  const providedSecret = req.header('X-Nova-Calendar-Webhook-Secret') || '';
  if (providedSecret !== config.googleCalendarWebhookSecret) {
    res.status(401).json({ accepted: false, error: 'Invalid calendar webhook secret.' });
    return;
  }
  res.status(501).json({
    accepted: false,
    channel: req.header('X-Goog-Channel-ID') || null,
    fallback: 'Google Calendar push channels are not enabled in this deployment. Use Planner manual sync or scheduled incremental sync.'
  });
});

app.post('/sync/webhook/gmail', async (_req, res) => {
  res.json({ accepted: true });
});

app.post('/telegram/webhook/:userId', async (req, res) => {
  const userId = String(req.params.userId);
  const secret = typeof req.query.secret === 'string' ? req.query.secret : '';

  if (!config.telegramWebhookSecret) {
    res.status(503).json({ error: 'Telegram webhook secret is not configured.' });
    return;
  }
  if (secret !== config.telegramWebhookSecret) {
    res.status(401).json({ error: 'Invalid Telegram webhook secret.' });
    return;
  }

  try {
    const result = await handleTelegramWebhookMessage(userId, req.body);
    res.status(result.statusCode ?? 200).json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/telegram/status', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const conn = await connectionStatusService.getConnection(userId, 'telegram');
  const legacyStatus = await getTelegramIntegrationStatus(userId);
  res.json({
    ...legacyStatus,
    connectionStatus: conn?.status ?? 'disconnected',
    connectionId: conn?.id ?? null,
  });
});

app.get('/whatsapp/status', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const conn = await connectionStatusService.getConnection(userId, 'whatsapp');
  res.json({
    connectionStatus: conn?.status ?? 'disconnected',
    connectionId: conn?.id ?? null,
    configured: Boolean(config.whatsappAccessToken && config.whatsappPhoneNumberId),
  });
});

app.get('/hermes/status', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const conn = await connectionStatusService.getConnection(userId, 'hermes');
  res.json({
    connectionStatus: conn?.status ?? 'disconnected',
    connectionId: conn?.id ?? null,
    configured: Boolean(config.hermesApiKey && config.hermesBaseUrl),
  });
});

app.get('/whatsapp/webhook', async (req, res) => {
  const query = req.query as Record<string, string | undefined>;
  const result = verifyWhatsAppWebhook(query);
  if (result.verified && result.challenge) {
    res.type('text/plain').send(result.challenge);
    return;
  }
  res.status(403).send('Verification failed');
});

app.post('/whatsapp/webhook', async (req, res) => {
  if (!config.whatsappWebhookSecret) {
    res.status(503).json({ error: 'WhatsApp webhook secret is not configured.' });
    return;
  }
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  if (!signature) {
    res.status(401).json({ error: 'Missing WhatsApp webhook signature.' });
    return;
  }
  const crypto = await import('crypto');
  const expected = `sha256=${crypto.createHmac('sha256', config.whatsappWebhookSecret).update(JSON.stringify(req.body)).digest('hex')}`;
  if (signature !== expected) {
    res.status(401).json({ error: 'Invalid WhatsApp webhook signature.' });
    return;
  }

  try {
    const result = await handleWhatsAppWebhookMessage(req.body);
    res.status(result.statusCode ?? 200).json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

const memoryWriteSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  type: z.enum(durableMemoryTypes).optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  importance: z.number().min(0).max(100).optional(),
  embeddingVector: z.array(z.number()).optional(),
  externalIds: z.record(z.string()).optional()
}).passthrough();

app.post('/memory/search', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.object({
    query: z.string().min(1),
    types: z.array(z.enum(durableMemoryTypes)).optional(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    limit: z.number().optional()
  }).parse(req.body);
  res.json({ results: await searchDurableMemory(userId, body) });
});

app.post('/memory/ingest', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.record(z.unknown()).parse(req.body);
  res.json(await ingestMemoryItem(userId, body));
});

app.post('/memory', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = memoryWriteSchema.parse(req.body);
  res.status(201).json({ memory: await createMemoryItem(userId, body) });
});

app.patch('/memory/:id', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = memoryWriteSchema.partial().parse(req.body);
  res.json({ memory: await updateMemoryItem(userId, String(req.params.id), body) });
});

app.delete('/memory/:id', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  res.json({ memory: await deleteMemoryItem(userId, String(req.params.id)) });
});

app.post('/memory/summarize-entity', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.object({
    entityType: z.string().min(1),
    entityId: z.string().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    entity: z.record(z.unknown()).optional(),
    type: z.enum(durableMemoryTypes).optional(),
    tags: z.array(z.string()).optional(),
    source: z.string().optional(),
    importance: z.number().min(0).max(100).optional()
  }).parse(req.body);
  res.json(await summarizeEntityIntoMemory(userId, body));
});

app.post('/ai/command', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = aiCommandRequestSchema.parse(req.body);
  res.json(await runAiCommand(userId, body));
});

app.post('/ai/second-brain', requireSupabaseUser, async (_req: AuthedRequest, res) => {
  const userId = assertOwner(_req);
  const body = secondBrainRequestSchema.parse(_req.body);
  res.json(await runSecondBrain(body, userId));
});

app.post('/data/migrate/local-storage', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.object({
    projects: z.array(z.record(z.unknown())).optional(),
    goals: z.array(z.record(z.unknown())).optional(),
    plannerTasks: z.array(z.record(z.unknown())).optional(),
    crmLeads: z.array(z.record(z.unknown())).optional(),
    financeTransactions: z.array(z.record(z.unknown())).optional(),
    finances: z.array(z.record(z.unknown())).optional(),
    memoryItems: z.array(z.record(z.unknown())).optional()
  }).parse(req.body);
  res.json(await importLocalStoragePayload(userId, body));
});

app.post('/brain/import/contacts', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  try {
    res.json(await importGoogleContacts(userId));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message, needsGoogleOAuth: true });
  }
});

app.post('/brain/ask', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.object({ question: z.string().min(1) }).parse(req.body);
  res.json(await answerBrainQuestion(userId, body.question));
});

app.use('/crm', crmRoutes);
app.use('/social', socialRoutes);
app.use('/work', workOutreachRoutes);
app.use('/planner', plannerRoutes);
app.use('/approvals', approvalRoutes);

app.post('/crm/bootstrap', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  res.json({ status: 'ready', storage: 'supabase', snapshot: await readCrmSnapshot(userId) });
});

app.get('/crm/snapshot', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  try {
    res.json(await readCrmSnapshot(userId));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message, needsGoogleOAuth: true });
  }
});


app.post('/crm/activity', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.record(z.unknown()).parse(req.body);
  try {
    res.json(await appendCrmActivity(userId, body));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message, needsGoogleOAuth: true });
  }
});

app.post('/crm/contacts', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.record(z.unknown()).parse(req.body);
  try {
    res.json(await createCrmGoogleContact(userId, body));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message, needsGoogleOAuth: true });
  }
});

app.post('/crm/calendar/event', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.record(z.unknown()).parse(req.body);
  try {
    res.json(await createCrmCalendarEvent(userId, body));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message, needsGoogleOAuth: true });
  }
});

app.post('/crm/gmail/send', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.record(z.unknown()).parse(req.body);
  try {
    res.json(await sendCrmEmail(userId, body));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message, needsGoogleOAuth: true });
  }
});

app.post('/crm/ai/draft', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.record(z.unknown()).parse(req.body);
  res.json(await draftCrmEmail(userId, body));
});

app.post('/crm/ai/smart-reply', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.record(z.unknown()).parse(req.body);
  res.json(await createSmartReplies(userId, body));
});

app.post('/crm/ai/lead-score', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.record(z.unknown()).parse(req.body);
  res.json(await scoreCrmLead(userId, body));
});

app.post('/crm/ai/suggestions', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.record(z.unknown()).parse(req.body);
  res.json(await suggestCrmActions(userId, body));
});

app.post('/crm/ai/sequences', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.record(z.unknown()).parse(req.body);
  res.json(await buildCrmSequence(userId, body));
});

app.post('/crm/ai/meeting-brief', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.record(z.unknown()).parse(req.body);
  res.json(await createMeetingBrief(userId, body));
});

app.post('/crm/ai/deal-health', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.record(z.unknown()).parse(req.body);
  res.json(await analyzeDealHealth(userId, body));
});

app.post('/crm/ai/inbox-triage', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.record(z.unknown()).parse(req.body);
  res.json(await triageCrmInbox(userId, body));
});

app.post('/crm/ai/enrichment', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.record(z.unknown()).parse(req.body);
  res.json(await enrichCrmContact(userId, body));
});

app.post('/crm/ai/command-bar', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.record(z.unknown()).parse(req.body);
  res.json(await runCrmCommandBar(userId, body));
});

app.post('/agents/run', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.object({ agent: z.string(), prompt: z.string() }).parse(req.body);
  res.json(await runAgent(userId, body.agent, body.prompt));
});

app.post('/agents/briefing', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  res.json(await runAgent(userId, 'chief_of_staff', 'Generate today briefing: focus, biggest opportunity, biggest risk.'));
});

app.post('/reports/weekly', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  res.json(await runAgent(userId, 'life_strategist', 'Generate weekly review from all memory and execution data.'));
});

app.post('/reports/monthly', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  res.json(await runAgent(userId, 'business_strategist', 'Generate monthly business and life operating report.'));
});

app.post('/automations/run', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  res.json({
    userId,
    jobs: ['email_task_detection', 'meeting_task_detection', 'weekly_review', 'neglected_clients', 'finance_forecast'],
    status: 'queued'
  });
});

// ── Character Coach Routes ─────────────────────────────────
import {
  coachChat,
  generateQuest,
  generateLadder,
  analyzeReflection,
  generateWeeklyReview,
  generateDailyMission,
  generateAdaptiveSuggestion,
} from './services/characterCoach/characterCoachService.js';
import {
  coachMessageSchema,
  questGenerationSchema,
  ladderGenerationSchema,
  reflectionAnalysisSchema,
  weeklyReviewSchema,
  dailyMissionSchema,
  adaptiveSuggestionSchema,
} from './services/characterCoach/characterCoachSchemas.js';

app.post('/character/coach/message', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = coachMessageSchema.parse(req.body);
  const result = await coachChat(userId, body);
  if (!result.ok) {
    res.status(503).json({ error: result.error, disclaimer: result.disclaimer });
    return;
  }
  res.json(result.data);
});

app.post('/character/coach/generate-quest', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = questGenerationSchema.parse(req.body);
  const result = await generateQuest(userId, body);
  if (!result.ok) {
    res.status(503).json({ error: result.error, disclaimer: result.disclaimer });
    return;
  }
  res.json({ quest: result.data, disclaimer: result.disclaimer });
});

app.post('/character/coach/generate-ladder', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = ladderGenerationSchema.parse(req.body);
  const result = await generateLadder(userId, body);
  if (!result.ok) {
    res.status(503).json({ error: result.error, disclaimer: result.disclaimer });
    return;
  }
  res.json({ ladder: result.data, disclaimer: result.disclaimer });
});

app.post('/character/coach/analyze-reflection', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = reflectionAnalysisSchema.parse(req.body);
  const result = await analyzeReflection(userId, body);
  if (!result.ok) {
    res.status(503).json({ error: result.error, disclaimer: result.disclaimer });
    return;
  }
  res.json(result.data);
});

app.post('/character/coach/weekly-review', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = weeklyReviewSchema.parse(req.body);
  const result = await generateWeeklyReview(userId, body);
  if (!result.ok) {
    res.status(503).json({ error: result.error, disclaimer: result.disclaimer });
    return;
  }
  res.json(result.data);
});

app.post('/character/coach/daily-mission', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = dailyMissionSchema.parse(req.body);
  const result = await generateDailyMission(userId, body);
  if (!result.ok) {
    res.status(503).json({ error: result.error, disclaimer: result.disclaimer });
    return;
  }
  res.json(result.data);
});

app.post('/character/coach/adaptive-suggestion', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = adaptiveSuggestionSchema.parse(req.body);
  const result = await generateAdaptiveSuggestion(userId, body);
  if (!result.ok) {
    res.status(503).json({ error: result.error, disclaimer: result.disclaimer });
    return;
  }
  res.json(result.data);
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as AuthedRequest;
  console.error(JSON.stringify({
    event: 'error',
    requestId: authReq.requestId,
    error: config.nodeEnv === 'production' ? err.name : err.message,
    timestamp: new Date().toISOString()
  }));
  if (err instanceof z.ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: config.nodeEnv === 'production' ? err.issues.map(i => ({ path: i.path, message: i.message })) : err.issues
    });
    return;
  }
  res.status(500).json({
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR'
  });
});

const server = app.listen(config.port, () => {
  console.log(JSON.stringify({ event: 'startup', service: 'motasem-os-api', port: config.port }));
});

function shutdown(signal: string) {
  console.log(JSON.stringify({ event: 'shutdown', signal, timestamp: new Date().toISOString() }));
  server.close(() => {
    console.log(JSON.stringify({ event: 'shutdown_complete' }));
    process.exit(0);
  });
  setTimeout(() => {
    console.error(JSON.stringify({ event: 'shutdown_force', reason: 'graceful timeout (10s)' }));
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
