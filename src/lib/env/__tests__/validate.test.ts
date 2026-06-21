import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('validateEnv', () => {
  it('reports ok when required vars are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'anon-key-123');

    const { validateEnv } = await import('../validate');
    const result = validateEnv();
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('reports missing vars when required ones are empty', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');

    const { validateEnv } = await import('../validate');
    const result = validateEnv();
    expect(result.ok).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.missing.map((m) => m.key)).toContain('VITE_SUPABASE_URL');
    expect(result.missing.map((m) => m.key)).toContain('VITE_SUPABASE_PUBLISHABLE_KEY');
  });
});

describe('getEnvStatus', () => {
  it('returns true when both Supabase vars are set', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'anon-key-123');

    const { getEnvStatus } = await import('../validate');
    const status = getEnvStatus();
    expect(status.hasSupabase).toBe(true);
  });

  it('returns false when Supabase vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');

    const { getEnvStatus } = await import('../validate');
    const status = getEnvStatus();
    expect(status.hasSupabase).toBe(false);
  });
});

describe('env object', () => {
  it('reads env vars correctly', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');

    const { env } = await import('../validate');
    expect(env.supabaseUrl).toBe('https://test.supabase.co');
    expect(env.supabaseKey).toBe('test-key');
  });

  it('falls back from VITE_API_BASE_URL to VITE_CLOUD_RUN_API_URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('VITE_CLOUD_RUN_API_URL', 'https://cloudrun.example.com');

    const { env } = await import('../validate');
    expect(env.apiBaseUrl).toBe('https://cloudrun.example.com');
  });
});
