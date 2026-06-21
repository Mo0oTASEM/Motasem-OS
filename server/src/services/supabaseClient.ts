import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';

let client: SupabaseClient | null = null;

export const hasSupabaseConfig = Boolean(config.supabaseUrl && config.supabaseServiceKey);

export const getSupabaseClient = () => {
  if (!hasSupabaseConfig) return null;
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return client;
};

export const getSupabaseClientOrThrow = () => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};
