import { google } from 'googleapis';
import { config, googleScopes } from '../config.js';
import { userDocumentStore } from './userDocumentStore.js';
import { getSettingValue } from './integrations/integrationSettingsService.js';

export const buildOAuthClient = async (userId?: string) => {
  let clientId = config.googleClientId;
  let clientSecret = config.googleClientSecret;
  let redirectUri = config.googleOAuthRedirectUri;

  if (userId) {
    const dbClientId = await getSettingValue(userId, 'google-oauth', 'GOOGLE_CLIENT_ID');
    const dbClientSecret = await getSettingValue(userId, 'google-oauth', 'GOOGLE_CLIENT_SECRET');
    const dbRedirectUri = await getSettingValue(userId, 'google-oauth', 'GOOGLE_REDIRECT_URI');
    if (dbClientId) clientId = dbClientId;
    if (dbClientSecret) clientSecret = dbClientSecret;
    if (dbRedirectUri) redirectUri = dbRedirectUri;
  }

  const client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
  return client;
};

export const getGoogleAuthUrl = async (userId: string) => {
  const client = await buildOAuthClient(userId);
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: googleScopes,
    state: Buffer.from(JSON.stringify({ userId })).toString('base64url')
  });
};

export const exchangeGoogleCode = async (code: string, userId?: string) => {
  const client = await buildOAuthClient(userId);
  const { tokens } = await client.getToken(code);
  return tokens;
};

export const syncGoogleService = async (userId: string, service: string) => {
  const now = new Date().toISOString();
  await userDocumentStore.writeUserDoc(userId, 'sync_state', service, {
    userId,
    service,
    status: 'connected',
    lastSyncAt: now,
    updatedAt: now,
    source: 'cloud_run',
    tags: ['sync'],
    links: [],
    importanceScore: 70
  });

  return {
    service,
    status: 'queued',
    message: 'Sync adapter registered. Add token storage and per-API mappers for production data transfer.'
  };
};
