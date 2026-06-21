import crypto from 'node:crypto';
import { config } from '../../../config.js';
import { getSupabaseClientOrThrow } from '../../supabaseClient.js';

type StoredToken = {
  id: string;
  connection_id: string;
  encrypted_token: string;
  token_type: string;
  expires_at: string | null;
  refresh_encrypted_token: string | null;
  scopes: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const getEncryptionKey = (): Buffer => {
  if (!config.googleTokenEncryptionKey) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY is required.');
  }
  return crypto.createHash('sha256').update(config.googleTokenEncryptionKey).digest();
};

const encrypt = (plaintext: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
};

const decrypt = (payload: string): string => {
  const [version, ivRaw, tagRaw, encryptedRaw] = payload.split('.');
  if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error('Invalid encrypted token format.');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
};

export const googleTokenStore = {
  async save(connectionId: string, tokens: {
    accessToken: string;
    refreshToken?: string;
    expiryDate?: number;
    scopes: string[];
  }): Promise<void> {
    const supabase = getSupabaseClientOrThrow();
    const encryptedAccess = encrypt(tokens.accessToken);
    const encryptedRefresh = tokens.refreshToken ? encrypt(tokens.refreshToken) : null;

    const { error } = await supabase
      .from('integration_credentials')
      .upsert({
        connection_id: connectionId,
        encrypted_token: encryptedAccess,
        token_type: 'bearer',
        expires_at: tokens.expiryDate ? new Date(tokens.expiryDate).toISOString() : null,
        refresh_encrypted_token: encryptedRefresh,
        scopes: tokens.scopes,
        metadata: {},
        updated_at: new Date().toISOString(),
      }, { onConflict: 'connection_id' });

    if (error) throw error;
  },

  async get(connectionId: string): Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiryDate: number | null;
    scopes: string[];
  } | null> {
    const supabase = getSupabaseClientOrThrow();
    const { data, error } = await supabase
      .from('integration_credentials')
      .select('*')
      .eq('connection_id', connectionId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const row = data as unknown as StoredToken;
    return {
      accessToken: decrypt(row.encrypted_token),
      refreshToken: row.refresh_encrypted_token ? decrypt(row.refresh_encrypted_token) : null,
      expiryDate: row.expires_at ? new Date(row.expires_at).getTime() : null,
      scopes: row.scopes,
    };
  },

  async delete(connectionId: string): Promise<void> {
    const supabase = getSupabaseClientOrThrow();
    const { error } = await supabase
      .from('integration_credentials')
      .delete()
      .eq('connection_id', connectionId);
    if (error) throw error;
  },

  async updateTokens(connectionId: string, tokens: {
    accessToken: string;
    expiryDate?: number;
  }): Promise<void> {
    const supabase = getSupabaseClientOrThrow();
    const encryptedAccess = encrypt(tokens.accessToken);
    const { error } = await supabase
      .from('integration_credentials')
      .update({
        encrypted_token: encryptedAccess,
        expires_at: tokens.expiryDate ? new Date(tokens.expiryDate).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('connection_id', connectionId);
    if (error) throw error;
  },
};
