/// ---------------------------------------------------------------------------
/// Motasem OS — Canonical Integration Status Model
///
/// Every integration status is represented by one of these 11 canonical
/// values.  The meaning of each status is defined below and never varies
/// between components.  No UI component invents a connection status based
/// on incomplete conditions; all statuses flow through these helpers.
/// ---------------------------------------------------------------------------

// ── Canonical statuses ────────────────────────────────────────────────────

/**
 * **connected**
 *
 * Required credentials exist.
 * OAuth account exists when required.
 * Token is valid or refreshable.
 * A lightweight health check succeeds.
 * The integration is usable.
 */
export type CanonicalStatus =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'reconnect_required'
  | 'token_expired'
  | 'permission_required'
  | 'setup_required'
  | 'syncing'
  | 'degraded'
  | 'error'
  | 'disabled';

// ── Status metadata ───────────────────────────────────────────────────────

export interface StatusMeta {
  status: CanonicalStatus;
  label: string;
  description: string;
  semantic: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  iconName: string;
}

export const STATUS_META: Record<CanonicalStatus, StatusMeta> = {
  connected: {
    status: 'connected',
    label: 'Connected',
    description: 'All required credentials exist, the token is valid or refreshable, and a lightweight health check succeeds.',
    semantic: 'success',
    iconName: 'CheckCircle2',
  },
  disconnected: {
    status: 'disconnected',
    label: 'Disconnected',
    description: 'The integration is not connected. No known error — it has simply not been set up or has been disconnected.',
    semantic: 'neutral',
    iconName: 'WifiOff',
  },
  connecting: {
    status: 'connecting',
    label: 'Connecting',
    description: 'A connection attempt is in progress.',
    semantic: 'info',
    iconName: 'Loader2',
  },
  reconnect_required: {
    status: 'reconnect_required',
    label: 'Reconnection Required',
    description: 'The integration was previously connected but the session or token has expired and requires re-authentication.',
    semantic: 'warning',
    iconName: 'RefreshCw',
  },
  token_expired: {
    status: 'token_expired',
    label: 'Token Expired',
    description: 'A token exists but cannot be refreshed. The user must re-authenticate.',
    semantic: 'error',
    iconName: 'LockKeyhole',
  },
  permission_required: {
    status: 'permission_required',
    label: 'Permission Required',
    description: 'The integration is connected but one or more optional permissions are missing. Core functionality still works.',
    semantic: 'warning',
    iconName: 'ShieldAlert',
  },
  setup_required: {
    status: 'setup_required',
    label: 'Setup Required',
    description: 'Required environment configuration or OAuth client configuration is missing. The integration cannot be used until the missing values are provided.',
    semantic: 'info',
    iconName: 'Settings2',
  },
  syncing: {
    status: 'syncing',
    label: 'Syncing',
    description: 'A data sync operation is actively running.',
    semantic: 'info',
    iconName: 'Sync',
  },
  degraded: {
    status: 'degraded',
    label: 'Degraded',
    description: 'The integration is connected but at least one optional capability is unavailable. Core functionality still works.',
    semantic: 'warning',
    iconName: 'AlertTriangle',
  },
  error: {
    status: 'error',
    label: 'Error',
    description: 'A real recent health check failed. The integration is not usable at this time.',
    semantic: 'error',
    iconName: 'AlertCircle',
  },
  disabled: {
    status: 'disabled',
    label: 'Disabled',
    description: 'The integration has been explicitly disabled. It will not attempt to connect or sync.',
    semantic: 'neutral',
    iconName: 'ToggleLeft',
  },
};

// ── Full integration health snapshot ──────────────────────────────────────

export interface IntegrationHealth {
  status: CanonicalStatus;
  lastCheckedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastErrorAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  accountIdentifier: string;
  grantedScopes: string[];
  requiredScopes: string[];
  availableCapabilities: string[];
  unavailableCapabilities: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Return a UI-safe label for a canonical status.
 */
export function getIntegrationStatusLabel(status: CanonicalStatus): string {
  return STATUS_META[status]?.label ?? 'Unknown';
}

/**
 * Return a human-readable description explaining what the status means.
 */
export function getIntegrationStatusDescription(status: CanonicalStatus): string {
  return STATUS_META[status]?.description ?? '';
}

/**
 * Return the semantic colour group a status belongs to.
 *
 * Mapping:
 *  success → green   (connected)
 *  error   → red     (token_expired, error)
 *  warning → amber   (reconnect_required, permission_required, degraded)
 *  info    → blue    (connecting, setup_required, syncing)
 *  neutral → gray    (disconnected, disabled)
 */
export function mapStatusToSemantic(
  status: CanonicalStatus,
): 'success' | 'error' | 'warning' | 'info' | 'neutral' {
  return STATUS_META[status]?.semantic ?? 'neutral';
}

/**
 * Return a human-friendly label for the semantic group.
 */
export function semanticLabel(s: ReturnType<typeof mapStatusToSemantic>): string {
  return { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info', neutral: 'Neutral' }[s] ?? 'Neutral';
}

/**
 * Derive a canonical status from the backend's IntegrationHealthStatus and
 * additional signals (has-token, last-error, scopes, etc.).
 *
 * Call this when consuming a server health response so that front-end
 * components never reinterpret raw strings.
 */
export function deriveCanonicalStatus(args: {
  envPresent: boolean;
  tokenPresent: boolean;
  tokenExpired: boolean;
  lastCheckFailed: boolean;
  hasRequiredScopes: boolean;
  hasRequiredCapabilities: boolean;
  explicitlyDisabled: boolean;
}): CanonicalStatus {
  if (args.explicitlyDisabled) return 'disabled';
  if (!args.envPresent) return 'setup_required';
  if (!args.tokenPresent) return 'setup_required';
  if (args.tokenExpired) return 'token_expired';
  if (args.lastCheckFailed) return 'error';
  if (!args.hasRequiredCapabilities) return 'degraded';
  if (!args.hasRequiredScopes) return 'permission_required';
  return 'connected';
}

/**
 * Return capability names that are available given the granted scopes and
 * a mapping of { capability → requiredScope[] }.
 */
export function getConnectionCapabilities(
  grantedScopes: string[],
  capabilityScopeMap: Record<string, string[]>,
): { available: string[]; unavailable: string[] } {
  const available: string[] = [];
  const unavailable: string[] = [];
  for (const [cap, required] of Object.entries(capabilityScopeMap)) {
    const hasAll = required.every(s => grantedScopes.includes(s));
    (hasAll ? available : unavailable).push(cap);
  }
  return { available, unavailable };
}

/**
 * Safely read a status from localStorage with a fallback.
 * Never stores raw tokens — only the canonical status string.
 */
export function readPersistedStatus(key: string, fallback: CanonicalStatus): CanonicalStatus {
  try {
    const v = localStorage.getItem(key);
    if (v && Object.prototype.hasOwnProperty.call(STATUS_META, v)) return v as CanonicalStatus;
  } catch { /* ignore */ }
  return fallback;
}

export function persistStatus(key: string, status: CanonicalStatus): void {
  try { localStorage.setItem(key, status); } catch { /* ignore */ }
}

/**
 * Map legacy status strings (from server responses, old code) to
 * CanonicalStatus.  Keeps Integrations.tsx compatible while migrating.
 */
const LEGACY_MAP: Record<string, CanonicalStatus> = {
  connected: 'connected',
  configured: 'setup_required',
  missing_env: 'setup_required',
  checking: 'connecting',
  error: 'error',
  idle: 'disconnected',
  backend_unavailable: 'error',
  needs_auth: 'setup_required',
  needs_setup: 'setup_required',
  not_connected: 'disconnected',
  permission_denied: 'permission_required',
  rate_limited: 'error',
  connecting: 'connecting',
  disconnected: 'disconnected',
  reconnect_required: 'reconnect_required',
  token_expired: 'token_expired',
  permission_required: 'permission_required',
  setup_required: 'setup_required',
  syncing: 'syncing',
  degraded: 'degraded',
  disabled: 'disabled',
};

export function toCanonicalStatus(status: string): CanonicalStatus {
  return LEGACY_MAP[status] ?? 'disconnected';
}

export const LEGACY_INTEGRATION_HEALTH_STATUSES = [
  'configured',
  'missing_env',
  'connected',
  'error',
] as const;
export type LegacyIntegrationHealthStatus = (typeof LEGACY_INTEGRATION_HEALTH_STATUSES)[number];

