import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  HelpCircle,
  Loader2,
  LockKeyhole,
  RefreshCw,
  SearchX,
  Settings2,
  ShieldAlert,
  ToggleLeft,
  WifiOff,
} from 'lucide-react';
import type { CanonicalStatus, StatusMeta } from '../../lib/integrationStatus/shared';
import { STATUS_META } from '../../lib/integrationStatus/shared';

// ── Icon resolver ─────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.FC<React.SVGProps<SVGSVGElement> & { size?: number }>> = {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  HelpCircle,
  Loader2,
  LockKeyhole,
  RefreshCw,
  SearchX,
  Settings2,
  ShieldAlert,
  ToggleLeft,
  WifiOff,
};

function resolveIcon(meta: StatusMeta): React.ReactNode {
  const Icon = ICON_MAP[meta.iconName];
  return Icon ? <Icon size={14} /> : <HelpCircle size={14} />;
}

// ── Canonical badge class mapping ─────────────────────────────────────────

function badgeClass(semantic: 'success' | 'error' | 'warning' | 'info' | 'neutral'): string {
  const map: Record<string, string> = {
    success: 'badge-success',
    error: 'badge-error',
    warning: 'badge-warning',
    info: 'badge-info',
    neutral: 'badge-neutral',
  };
  return map[semantic] || 'badge-neutral';
}

// ── Components ────────────────────────────────────────────────────────────

/**
 * Renders a status badge for a canonical integration status.
 * Always includes an icon, label, and semantic color.
 * Never relies on colour alone — the label and icon are always visible.
 */
export const IntegrationStatusBadge: React.FC<{
  status: CanonicalStatus;
  label?: string;
  showDescription?: boolean;
}> = ({ status, label, showDescription }) => {
  const meta = STATUS_META[status];
  if (!meta) return <span className="badge badge-neutral">Unknown</span>;
  return (
    <span
      className={`badge ${badgeClass(meta.semantic)}`}
      title={showDescription ? meta.description : undefined}
      aria-label={`${label || meta.label}: ${meta.description}`}
    >
      {resolveIcon(meta)}
      {label || meta.label}
    </span>
  );
};

/**
 * Displays a full connection status with icon, label, status badge, and
 * optional description.  Use this instead of ad-hoc status indicators.
 */
export const ConnectionStatus: React.FC<{
  status: CanonicalStatus;
  label?: string;
  description?: string;
}> = ({ status, label, description }) => {
  const meta = STATUS_META[status];
  if (!meta) return null;
  return (
    <div className="connection-status" role="status" aria-label={`Status: ${meta.label}`}>
      <span className={`connection-status-dot connection-status-dot--${meta.semantic}`} />
      <IntegrationStatusBadge status={status} label={label} />
      {(description || meta.description) && (
        <span className="connection-status-desc">{description || meta.description}</span>
      )}
    </div>
  );
};

/**
 * Renders a coloured dot indicator without a label — use only in tight
 * spaces where the badge would not fit and always pair with an aria-label.
 */
export const HealthIndicator: React.FC<{
  status: CanonicalStatus;
  size?: number;
  ariaLabel?: string;
}> = ({ status, size = 10, ariaLabel }) => {
  const meta = STATUS_META[status];
  if (!meta) return null;
  return (
    <span
      className={`health-indicator health-indicator--${meta.semantic}`}
      style={{ width: size, height: size, borderRadius: '50%', display: 'inline-block' }}
      aria-label={ariaLabel || `${meta.label}: ${meta.description}`}
      role="status"
    />
  );
};

/**
 * Styled alert banner for page-level status notifications.
 */
export const AlertBanner: React.FC<{
  status: CanonicalStatus;
  title?: string;
  message?: string;
  action?: React.ReactNode;
}> = ({ status, title, message, action }) => {
  const meta = STATUS_META[status];
  if (!meta) return null;
  return (
    <div
      className={`alert-banner alert-banner--${meta.semantic}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="alert-banner-body">
        {resolveIcon(meta)}
        <div>
          <strong>{title || meta.label}</strong>
          {message && <p>{message}</p>}
        </div>
      </div>
      {action && <div className="alert-banner-action">{action}</div>}
    </div>
  );
};

// ── Legacy type alias for backward compatibility ──────────────────────────

export type IntegrationBadgeStatus = CanonicalStatus;

// ── State card components (preserved from original) ───────────────────────

export const RetryButton: React.FC<{
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  variant?: 'default' | 'primary';
}> = ({ onClick, label = 'Retry', disabled = false, variant = 'default' }) => (
  <button className={`glass-btn ${variant === 'primary' ? 'btn-cyan' : ''}`} type="button" onClick={onClick} disabled={disabled}>
    <RefreshCw size={14} /> {label}
  </button>
);

export const LoadingState: React.FC<{ title?: string; message?: string }> = ({
  title = 'Loading',
  message = 'Fetching the latest Motasem OS data...',
}) => (
  <div className="nova-state-card glass-panel" role="status" aria-live="polite">
    <Loader2 className="spin" size={24} />
    <strong>{title}</strong>
    <span>{message}</span>
  </div>
);

export const EmptyState: React.FC<{
  title?: string;
  message?: string;
  action?: React.ReactNode;
}> = ({ title = 'Nothing here yet', message = 'Create or sync data to populate this view.', action }) => (
  <div className="nova-state-card glass-panel">
    <SearchX size={24} />
    <strong>{title}</strong>
    <span>{message}</span>
    {action}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  detail?: string;
  onRetry?: () => void;
}> = ({ title = 'Something needs attention', message, detail, onRetry }) => (
  <div className="nova-state-card nova-state-error glass-panel" role="alert">
    <AlertTriangle size={24} />
    <strong>{title}</strong>
    <span>{message}</span>
    {detail && <code>{detail}</code>}
    {onRetry && <RetryButton onClick={onRetry} />}
  </div>
);

export const PermissionMissingCard: React.FC<{
  title?: string;
  requirement: string;
  detail?: string;
  action?: React.ReactNode;
}> = ({ title = 'Permission missing', requirement, detail, action }) => (
  <div className="nova-state-card nova-state-permission glass-panel">
    <LockKeyhole size={24} />
    <strong>{title}</strong>
    <span>{requirement}</span>
    {detail && <code>{detail}</code>}
    {action}
  </div>
);
