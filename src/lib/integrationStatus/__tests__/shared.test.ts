import { describe, it, expect, beforeEach } from 'vitest';
import {
  STATUS_META,
  getIntegrationStatusLabel,
  getIntegrationStatusDescription,
  mapStatusToSemantic,
  deriveCanonicalStatus,
  getConnectionCapabilities,
  readPersistedStatus,
  persistStatus,
  toCanonicalStatus,
} from '../shared';
import type { CanonicalStatus } from '../shared';

describe('STATUS_META', () => {
  const statuses: CanonicalStatus[] = [
    'connected', 'disconnected', 'connecting', 'reconnect_required',
    'token_expired', 'permission_required', 'setup_required',
    'syncing', 'degraded', 'error', 'disabled',
  ];

  it.each(statuses)('has entry for %s', (s) => {
    const meta = STATUS_META[s];
    expect(meta).toBeDefined();
    expect(meta.label).toBeTruthy();
    expect(meta.description).toBeTruthy();
    expect(meta.semantic).toMatch(/^(success|error|warning|info|neutral)$/);
    expect(meta.iconName).toBeTruthy();
  });
});

describe('getIntegrationStatusLabel', () => {
  it('returns label for known statuses', () => {
    expect(getIntegrationStatusLabel('connected')).toBe('Connected');
    expect(getIntegrationStatusLabel('error')).toBe('Error');
    expect(getIntegrationStatusLabel('setup_required')).toBe('Setup Required');
  });

  it('falls back for unknown status', () => {
    expect(getIntegrationStatusLabel('bogus' as CanonicalStatus)).toBe('Unknown');
  });
});

describe('getIntegrationStatusDescription', () => {
  it('returns description for known statuses', () => {
    expect(getIntegrationStatusDescription('connected')).toContain('health check');
    expect(getIntegrationStatusDescription('disabled')).toContain('explicitly disabled');
  });

  it('returns empty for unknown status', () => {
    expect(getIntegrationStatusDescription('bogus' as CanonicalStatus)).toBe('');
  });
});

describe('mapStatusToSemantic', () => {
  it('maps connected to success', () => {
    expect(mapStatusToSemantic('connected')).toBe('success');
  });

  it('maps error/token_expired to error', () => {
    expect(mapStatusToSemantic('error')).toBe('error');
    expect(mapStatusToSemantic('token_expired')).toBe('error');
  });

  it('maps warning statuses', () => {
    expect(mapStatusToSemantic('reconnect_required')).toBe('warning');
    expect(mapStatusToSemantic('degraded')).toBe('warning');
    expect(mapStatusToSemantic('permission_required')).toBe('warning');
  });

  it('maps info statuses', () => {
    expect(mapStatusToSemantic('connecting')).toBe('info');
    expect(mapStatusToSemantic('setup_required')).toBe('info');
    expect(mapStatusToSemantic('syncing')).toBe('info');
  });

  it('maps neutral statuses', () => {
    expect(mapStatusToSemantic('disconnected')).toBe('neutral');
    expect(mapStatusToSemantic('disabled')).toBe('neutral');
  });
});

describe('deriveCanonicalStatus', () => {
  it('returns disabled when explicitlyDisabled is true', () => {
    const r = deriveCanonicalStatus({
      envPresent: true, tokenPresent: true, tokenExpired: false,
      lastCheckFailed: false, hasRequiredScopes: true,
      hasRequiredCapabilities: true, explicitlyDisabled: true,
    });
    expect(r).toBe('disabled');
  });

  it('returns setup_required when env is missing', () => {
    const r = deriveCanonicalStatus({
      envPresent: false, tokenPresent: false, tokenExpired: false,
      lastCheckFailed: false, hasRequiredScopes: false,
      hasRequiredCapabilities: false, explicitlyDisabled: false,
    });
    expect(r).toBe('setup_required');
  });

  it('returns setup_required when token is missing', () => {
    const r = deriveCanonicalStatus({
      envPresent: true, tokenPresent: false, tokenExpired: false,
      lastCheckFailed: false, hasRequiredScopes: false,
      hasRequiredCapabilities: false, explicitlyDisabled: false,
    });
    expect(r).toBe('setup_required');
  });

  it('returns token_expired when token is expired', () => {
    const r = deriveCanonicalStatus({
      envPresent: true, tokenPresent: true, tokenExpired: true,
      lastCheckFailed: false, hasRequiredScopes: true,
      hasRequiredCapabilities: true, explicitlyDisabled: false,
    });
    expect(r).toBe('token_expired');
  });

  it('returns error when last check failed', () => {
    const r = deriveCanonicalStatus({
      envPresent: true, tokenPresent: true, tokenExpired: false,
      lastCheckFailed: true, hasRequiredScopes: true,
      hasRequiredCapabilities: true, explicitlyDisabled: false,
    });
    expect(r).toBe('error');
  });

  it('returns degraded when capabilities missing', () => {
    const r = deriveCanonicalStatus({
      envPresent: true, tokenPresent: true, tokenExpired: false,
      lastCheckFailed: false, hasRequiredScopes: true,
      hasRequiredCapabilities: false, explicitlyDisabled: false,
    });
    expect(r).toBe('degraded');
  });

  it('returns permission_required when scopes missing', () => {
    const r = deriveCanonicalStatus({
      envPresent: true, tokenPresent: true, tokenExpired: false,
      lastCheckFailed: false, hasRequiredScopes: false,
      hasRequiredCapabilities: true, explicitlyDisabled: false,
    });
    expect(r).toBe('permission_required');
  });

  it('returns connected when all good', () => {
    const r = deriveCanonicalStatus({
      envPresent: true, tokenPresent: true, tokenExpired: false,
      lastCheckFailed: false, hasRequiredScopes: true,
      hasRequiredCapabilities: true, explicitlyDisabled: false,
    });
    expect(r).toBe('connected');
  });
});

describe('getConnectionCapabilities', () => {
  const scopeMap = {
    read_email: ['https://www.googleapis.com/auth/gmail.readonly'],
    send_email: ['https://www.googleapis.com/auth/gmail.send'],
    full_access: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
  };

  it('returns available for fully-scoped capabilities', () => {
    const r = getConnectionCapabilities(
      ['https://www.googleapis.com/auth/gmail.readonly'],
      scopeMap,
    );
    expect(r.available).toEqual(['read_email']);
    expect(r.unavailable).toEqual(['send_email', 'full_access']);
  });

  it('returns all unavailable when no scopes', () => {
    const r = getConnectionCapabilities([], scopeMap);
    expect(r.available).toEqual([]);
    expect(r.unavailable).toEqual(['read_email', 'send_email', 'full_access']);
  });

  it('returns all available when all scopes present', () => {
    const scopes = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'];
    const r = getConnectionCapabilities(scopes, scopeMap);
    expect(r.available).toEqual(['read_email', 'send_email', 'full_access']);
    expect(r.unavailable).toEqual([]);
  });
});

describe('readPersistedStatus / persistStatus', () => {
  beforeEach(() => localStorage.clear());

  it('persists and reads back a valid status', () => {
    persistStatus('test:google', 'connected');
    expect(readPersistedStatus('test:google', 'disconnected')).toBe('connected');
  });

  it('returns fallback when no value stored', () => {
    expect(readPersistedStatus('test:nonexistent', 'disconnected')).toBe('disconnected');
  });

  it('returns fallback for invalid stored value', () => {
    localStorage.setItem('test:bad', '__invalid__');
    expect(readPersistedStatus('test:bad', 'error')).toBe('error');
  });

  it('ignores storage errors gracefully', () => {
    const orig = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('full'); };
    expect(() => persistStatus('test:crash', 'connected')).not.toThrow();
    localStorage.setItem = orig;
  });
});

describe('toCanonicalStatus', () => {
  it('maps legacy statuses', () => {
    expect(toCanonicalStatus('connected')).toBe('connected');
    expect(toCanonicalStatus('configured')).toBe('setup_required');
    expect(toCanonicalStatus('missing_env')).toBe('setup_required');
    expect(toCanonicalStatus('needs_auth')).toBe('setup_required');
    expect(toCanonicalStatus('checking')).toBe('connecting');
    expect(toCanonicalStatus('error')).toBe('error');
    expect(toCanonicalStatus('backend_unavailable')).toBe('error');
    expect(toCanonicalStatus('idle')).toBe('disconnected');
  });

  it('falls back to disconnected for unknown', () => {
    expect(toCanonicalStatus('completely_bogus')).toBe('disconnected');
  });
});
