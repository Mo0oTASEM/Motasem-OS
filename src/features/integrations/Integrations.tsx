import React, { useState } from 'react';
import { ShieldCheck, MessageSquare, Brain, Sparkles, GitBranch, Triangle, Wifi, Key } from 'lucide-react';
import { useIntegrations } from './hooks/useIntegrations';
import { GoogleWorkspacePanel } from './components/GoogleWorkspacePanel';
import ProviderConfigPanel from './components/ProviderConfigPanel';
import { PageHeader, Panel } from '../../components/system/Layout';
import { LoadingState, IntegrationStatusBadge } from '../../components/system/States';
import { useApp } from '../../context/useApp';
import type { CanonicalStatus } from '../../lib/integrationStatus/shared';
import type { IntegrationProvider } from './types';
import { PROVIDER_META } from './types';

const providerOrder: IntegrationProvider[] = ['google_workspace', 'telegram', 'whatsapp', 'hermes', 'gemini', 'github', 'vercel'];

const ProviderCard: React.FC<{
  providerId: IntegrationProvider;
  status: CanonicalStatus;
}> = ({ providerId, status }) => {
  const meta = PROVIDER_META[providerId];
  return (
    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <ProviderIcon providerId={providerId} />
        <div>
          <strong>{meta.name}</strong>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{meta.description}</p>
        </div>
      </div>
      <IntegrationStatusBadge status={status} />
    </div>
  );
};

const ProviderIcon: React.FC<{ providerId: IntegrationProvider }> = ({ providerId }) => {
  switch (providerId) {
    case 'telegram': return <MessageSquare size={20} color="#0088cc" />;
    case 'whatsapp': return <MessageSquare size={20} color="#25d366" />;
    case 'hermes': return <Brain size={20} color="#22d3ee" />;
    case 'gemini': return <Sparkles size={20} color="#a855f7" />;
    case 'github': return <GitBranch size={20} color="#94a3b8" />;
    case 'vercel': return <Triangle size={20} color="#ffffff" />;
    default: return <Wifi size={20} />;
  }
};

export const Integrations: React.FC = () => {
  const app = useApp();
  const userId = app?.user?.id ?? '';
  const { googleStatus, connections, loading, error, refresh } = useIntegrations();
  const [showConfig, setShowConfig] = useState(false);

  if (loading) {
    return (
      <div>
        <PageHeader title="Integrations" description="Connected services and providers" />
        <div className="page-body">
          <LoadingState title="Loading integrations" message="Checking connection statuses..." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Integrations" description="Manage connected services and providers">
        <span className="badge badge-teal"><ShieldCheck size={12} /> Approval-first</span>
        <button className="glass-btn btn-sm" onClick={() => setShowConfig(s => !s)}>
          <Key size={14} /> {showConfig ? 'Done' : 'Configure'}
        </button>
        <button className="glass-btn btn-sm" onClick={refresh}>Refresh</button>
      </PageHeader>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && (
          <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {showConfig ? (
          <ProviderConfigPanel />
        ) : (
          <>
            <GoogleWorkspacePanel userId={userId} status={googleStatus} onRefresh={refresh} />

            <Panel title="Other Providers" icon={Wifi} action={<span className="badge badge-purple">{providerOrder.length - 1} available</span>}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Additional providers managed through server-side configuration.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {providerOrder.filter(p => p !== 'google_workspace').map(providerId => {
                  const conn = connections.find(c => c.providerId === providerId);
                  const status: CanonicalStatus = conn?.status ?? 'disconnected';
                  return <ProviderCard key={providerId} providerId={providerId} status={status} />;
                })}
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
};
