import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, getEnvStatus } from '../env/validate';

const { hasSupabase } = getEnvStatus();

export const hasSupabaseConfig = hasSupabase;

export const supabaseConfigStatus = {
  hasSupabaseConfig: hasSupabase,
  missingKeys: [
    ['VITE_SUPABASE_URL', env.supabaseUrl],
    ['VITE_SUPABASE_PUBLISHABLE_KEY', env.supabaseKey]
  ].filter(([, value]) => !value).map(([key]) => key)
};

let client: SupabaseClient | null = null;

export const getSupabaseBrowserClient = () => {
  if (!hasSupabase) return null;
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseKey);
  }
  return client;
};

export const signInWithSupabaseGoogle = async () => {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase is not configured. Fill .env first.');
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
};

export const signOutSupabase = async () => {
  const supabase = getSupabaseBrowserClient();
  if (supabase) await supabase.auth.signOut();
};
