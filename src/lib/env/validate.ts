const read = (key: string): string => String(import.meta.env[key] || '').trim();

export const env = {
  supabaseUrl: read('VITE_SUPABASE_URL'),
  supabaseKey: read('VITE_SUPABASE_PUBLISHABLE_KEY'),
  apiBaseUrl: read('VITE_API_BASE_URL') || read('VITE_CLOUD_RUN_API_URL'),
};

export type EnvVarName = keyof typeof env;

export const envMeta: Record<EnvVarName, { key: string; label: string; required: boolean }> = {
  supabaseUrl: { key: 'VITE_SUPABASE_URL', label: 'Supabase URL', required: true },
  supabaseKey: { key: 'VITE_SUPABASE_PUBLISHABLE_KEY', label: 'Supabase Publishable Key', required: true },
  apiBaseUrl: { key: 'VITE_API_BASE_URL', label: 'API Base URL', required: false },
};

export interface EnvValidation {
  ok: boolean;
  missing: { name: EnvVarName; key: string; label: string }[];
  environment: string;
}

export const validateEnv = (): EnvValidation => {
  const missing = (Object.keys(envMeta) as EnvVarName[]).filter(
    (name) => envMeta[name].required && !env[name]
  ).map((name) => ({
    name,
    key: envMeta[name].key,
    label: envMeta[name].label,
  }));

  return {
    ok: missing.length === 0,
    missing,
    environment: import.meta.env.MODE || 'development',
  };
};

export const getEnvStatus = () => ({
  hasSupabase: Boolean(env.supabaseUrl && env.supabaseKey),
  hasApi: Boolean(env.apiBaseUrl),
});
