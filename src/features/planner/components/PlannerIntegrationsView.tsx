import React, { useCallback, useEffect, useState } from 'react';
import { CalendarSync, ExternalLink, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import { PlannerEmptyState, PlannerErrorState, PlannerLoadingState, PlannerSectionCard, PlannerSyncStatus } from './PlannerPrimitives';

type GoogleCalendarItem = {
  id: string;
  summary: string;
  primary?: boolean;
  selected?: boolean;
  backgroundColor?: string;
  accessRole?: string;
};

type GoogleCalendarStatus = {
  status?: string;
  connectedAccount?: string;
  calendars?: GoogleCalendarItem[];
  selectedCalendarIds?: string[];
  lastSuccessfulSyncAt?: string | null;
  lastSyncAttemptAt?: string | null;
  syncStatus?: string;
  errorMessage?: string;
  scopes?: string[];
  webhooksSupported?: boolean;
};

interface PlannerIntegrationsViewProps {
  workspaceId: string;
}

export const PlannerIntegrationsView: React.FC<PlannerIntegrationsViewProps> = ({ workspaceId }) => {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await cloudRunClient.plannerApi.getGoogleCalendarStatus();
      setStatus(result as GoogleCalendarStatus);
    } catch (err) {
      setError((err as Error).message || 'Google Calendar status could not load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const trigger = async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (active) loadStatus();
    };
    trigger();
    return () => { active = false; };
  }, [loadStatus]);

  const runAction = async (action: string, fn: () => Promise<unknown>) => {
    try {
      setBusy(action);
      setError('');
      await fn();
      await loadStatus();
    } catch (err) {
      setError((err as Error).message || 'Google Calendar action failed.');
    } finally {
      setBusy('');
    }
  };

  const connect = async () => {
    await runAction('connect', async () => {
      const result = await cloudRunClient.plannerApi.connectGoogleCalendar();
      if (result.url) window.open(result.url, '_blank', 'noopener,noreferrer');
    });
  };

  const selectedIds = status?.selectedCalendarIds || [];
  const connected = status?.status === 'connected';

  if (loading) return <PlannerLoadingState message="Loading Planner integration settings..." />;

  if (!status && error) {
    return <PlannerErrorState message={error} action={<button className="glass-btn btn-cyan" type="button" onClick={loadStatus}>Retry</button>} />;
  }

  return (
    <div className="planner-content-frame">
      {error && (
        <div className="planner-state planner-state-error" role="alert" style={{ minHeight: 'auto', alignItems: 'flex-start', textAlign: 'left' }}>
          <strong>Google Calendar action failed</strong>
          <span>{error}</span>
        </div>
      )}

      <PlannerSectionCard
        title="Google Calendar"
        icon={CalendarSync}
        action={<PlannerSyncStatus status={connected ? status?.syncStatus || 'synced' : 'local_only'} label={connected ? status?.syncStatus || 'connected' : 'not connected'} />}
      >
        <div className="planner-integration-card">
          <div className="planner-integration-summary">
            <div>
              <strong>{connected ? status?.connectedAccount || 'Google Calendar connected' : 'Connect Google Calendar'}</strong>
              <p>
                Motasem OS will read selected calendars and can write Planner-created events through the backend. Refresh tokens are encrypted server-side and are never stored in browser storage.
              </p>
            </div>
            <div className="planner-integration-actions">
              {!connected ? (
                <button className="glass-btn btn-cyan" type="button" onClick={connect} disabled={busy === 'connect'}>
                  <ExternalLink size={14} /> {busy === 'connect' ? 'Opening...' : 'Connect Google Calendar'}
                </button>
              ) : (
                <>
                  <button className="glass-btn btn-cyan" type="button" onClick={() => runAction('sync', () => cloudRunClient.plannerApi.syncGoogleCalendar(workspaceId))} disabled={Boolean(busy)}>
                    <RefreshCw size={14} /> {busy === 'sync' ? 'Syncing...' : 'Sync now'}
                  </button>
                  <button className="glass-btn" type="button" onClick={() => runAction('refresh', () => cloudRunClient.plannerApi.refreshGoogleCalendars())} disabled={Boolean(busy)}>
                    <CalendarSync size={14} /> Refresh calendars
                  </button>
                  <button className="glass-btn" type="button" onClick={() => runAction('disconnect', () => cloudRunClient.plannerApi.disconnectGoogleCalendar())} disabled={Boolean(busy)}>
                    <Unplug size={14} /> Disconnect
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="planner-integration-meta">
            <span>Last successful sync: <strong>{status?.lastSuccessfulSyncAt ? new Date(status.lastSuccessfulSyncAt).toLocaleString() : 'Never'}</strong></span>
            <span>Last sync attempt: <strong>{status?.lastSyncAttemptAt ? new Date(status.lastSyncAttemptAt).toLocaleString() : 'Never'}</strong></span>
            <span>Realtime updates: <strong>{status?.webhooksSupported ? 'Webhook URL configured' : 'Manual/scheduled sync fallback'}</strong></span>
          </div>

          {connected && (
            <>
              <div className="planner-privacy-note">
                <ShieldCheck size={16} />
                <span>Requested permissions: calendar list read-only and calendar events read/write for selected calendars.</span>
              </div>

              {status?.calendars?.length ? (
                <div className="planner-calendar-selection">
                  {status.calendars.map(calendar => {
                    const checked = selectedIds.includes(calendar.id);
                    return (
                      <label key={calendar.id} className="planner-calendar-choice">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={event => {
                            const next = event.target.checked
                              ? [...selectedIds, calendar.id]
                              : selectedIds.filter(id => id !== calendar.id);
                            setStatus(current => current ? { ...current, selectedCalendarIds: next } : current);
                            runAction('select', () => cloudRunClient.plannerApi.updateSelectedGoogleCalendars(next));
                          }}
                        />
                        <span className="planner-calendar-color" style={{ background: calendar.backgroundColor || 'var(--accent-cyan)' }} />
                        <span>
                          <strong>{calendar.summary}</strong>
                          <small>{calendar.primary ? 'Primary calendar' : calendar.accessRole || 'Calendar'}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <PlannerEmptyState
                  title="No calendars loaded"
                  message="Refresh calendars after connecting to choose what appears in Planner."
                  action={<button className="glass-btn btn-cyan" type="button" onClick={() => runAction('refresh', () => cloudRunClient.plannerApi.refreshGoogleCalendars())}>Refresh calendars</button>}
                />
              )}
            </>
          )}
        </div>
      </PlannerSectionCard>
    </div>
  );
};
