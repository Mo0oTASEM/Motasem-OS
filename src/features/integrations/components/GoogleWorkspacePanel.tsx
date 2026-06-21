import React, { useState } from 'react';
import { Globe, ExternalLink, RefreshCw, Trash2, Loader } from 'lucide-react';
import type { GoogleIntegrationStatus, GoogleServiceName } from '../types';
import { GoogleServiceList } from './GoogleServiceList';
import { integrationsApi } from '../services/integrationsApi';
import { Panel } from '../../../components/system/Layout';

type Props = {
  userId: string;
  status: GoogleIntegrationStatus | null;
  onRefresh: () => void;
};

export const GoogleWorkspacePanel: React.FC<Props> = ({ userId, status, onRefresh }) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConnect = async () => {
    try {
      const result = await integrationsApi.getGoogleAuthUrl(userId);
      if (result.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      setTestResult('Failed to get auth URL');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await integrationsApi.testGoogleConnection(userId);
      setTestResult(result.ok
        ? `Connected as ${result.email ?? 'unknown'}`
        : `Test failed: ${result.error ?? 'unknown error'}`);
    } catch (err) {
      setTestResult(`Test error: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await integrationsApi.disconnectGoogle(userId);
      onRefresh();
    } catch {
      setTestResult('Disconnect failed');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleToggleService = async (_service: GoogleServiceName) => {
    // Service toggling through MCP-backed tools
    setTestResult(`Use "google_workspace" tools via opencode to manage ${_service}`);
  };

  const connected = status?.connected ?? false;

  return (
    <Panel
      title="Google Workspace"
      icon={Globe}
      action={connected
        ? <span className="badge badge-teal">Connected</span>
        : <span className="badge badge-purple">Not connected</span>}
    >
      <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
        {connected
          ? `Connected as ${status?.email ?? 'unknown'}. Manage per-service access below.`
          : 'Connect your Google account to enable Gmail, Calendar, Drive, Tasks, Contacts, Sheets & Docs.'}
      </p>

      {status?.scopes && status.scopes.length > 0 && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Granted scopes: {status.scopes.length}
        </div>
      )}

      {connected && status && (
        <GoogleServiceList services={status.services} onToggle={handleToggleService} readOnly />
      )}

      {testResult && (
        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
          {testResult}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {!connected && (
          <button className="glass-btn btn-primary" onClick={handleConnect}>
            <ExternalLink size={14} /> Connect Google
          </button>
        )}
        {connected && (
          <>
            <button className="glass-btn btn-cyan" onClick={handleTest} disabled={testing}>
              {testing ? <Loader size={14} /> : <RefreshCw size={14} />}
              Test Connection
            </button>
            <button className="glass-btn btn-danger" onClick={handleDisconnect} disabled={disconnecting}>
              {disconnecting ? <Loader size={14} /> : <Trash2 size={14} />}
              Disconnect
            </button>
          </>
        )}
      </div>
    </Panel>
  );
};
