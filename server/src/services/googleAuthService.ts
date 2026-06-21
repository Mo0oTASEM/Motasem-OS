import crypto from 'node:crypto';
import { config } from '../config.js';
import { buildOAuthClient } from './googleWorkspaceService.js';
import { userDocumentStore } from './userDocumentStore.js';

type GoogleTokenPayload = {
  accessToken?: string;
  refreshToken?: string;
  encryptedRefreshToken?: string;
  expiryDate?: number;
};

const getEncryptionKey = () => {
  if (!config.googleTokenEncryptionKey) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY is required for Google token storage.');
  }
  return crypto.createHash('sha256').update(config.googleTokenEncryptionKey).digest();
};

const encryptSecret = (plainText: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
};

const decryptSecret = (payload: string) => {
  const [version, ivRaw, tagRaw, encryptedRaw] = payload.split('.');
  if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) throw new Error('Stored Google token is invalid.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final()
  ]).toString('utf8');
};

export const saveGoogleWorkspaceTokens = async (userId: string, payload: GoogleTokenPayload & Record<string, unknown>) => {
  const { refreshToken, accessToken, ...safePayload } = payload;
  void accessToken;
  await userDocumentStore.writeUserDoc(userId, 'google_tokens', 'workspace', {
    ...safePayload,
    encryptedRefreshToken: refreshToken ? encryptSecret(refreshToken) : payload.encryptedRefreshToken,
    hasAccessToken: Boolean(accessToken),
    hasRefreshToken: Boolean(refreshToken || payload.encryptedRefreshToken)
  });
};

export const getUserOAuthClient = async (userId: string) => {
  const tokens = await userDocumentStore.readUserDoc<GoogleTokenPayload>(userId, 'google_tokens', 'workspace');

  if (!tokens?.encryptedRefreshToken && !tokens?.refreshToken && !tokens?.accessToken) {
    throw new Error('Google Workspace OAuth is not connected yet.');
  }

  const client = await buildOAuthClient(userId);
  client.setCredentials({
    access_token: typeof tokens.accessToken === 'string' ? tokens.accessToken : undefined,
    refresh_token: typeof tokens.encryptedRefreshToken === 'string'
      ? decryptSecret(tokens.encryptedRefreshToken)
      : typeof tokens.refreshToken === 'string'
        ? tokens.refreshToken
        : undefined,
    expiry_date: typeof tokens.expiryDate === 'number' ? tokens.expiryDate : undefined
  });
  return client;
};
