import { useState, useEffect, useCallback } from 'react';
import { Save, Settings2, X, Key } from 'lucide-react';
import { LoadingState, ErrorState } from '../../../components/system/States';
import { integrationsApi } from '../services/integrationsApi';

interface ProviderConfig {
  id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  category: string;
  auth_type: string;
  is_system: boolean;
  config: Record<string, unknown>;
}

const SECRET_FIELDS = new Set([
  'client_secret', 'api_key', 'access_token', 'bot_token',
  'webhook_secret', 'verify_token',
]);

const FIELD_LABELS: Record<string, string> = {
  client_id: 'OAuth Client ID',
  client_secret: 'OAuth Client Secret',
  redirect_uri: 'OAuth Redirect URI',
  scopes: 'OAuth Scopes (one per line)',
  base_url: 'API Base URL',
  model: 'AI Model Name',
  api_key: 'API Key',
  bot_token: 'Telegram Bot Token (from @BotFather)',
  access_token: 'Access Token',
  webhook_secret: 'Webhook Secret (random string)',
  verify_token: 'Webhook Verify Token (random string)',
  phone_number_id: 'WhatsApp Business Phone Number ID',
  team_id: 'Vercel Team ID (optional)',
  allowed_chat_ids: 'Allowed Telegram Chat IDs (one per line)',
  allowed_senders: 'Allowed WhatsApp Senders (one per line)',
};

const FIELD_HELP: Record<string, string> = {
  client_id: 'From Google Cloud Console > APIs & Services > Credentials',
  client_secret: 'From Google Cloud Console > APIs & Services > Credentials',
  redirect_uri: `Must match the URI registered in Google Cloud Console`,
  bot_token: 'Create a bot via @BotFather on Telegram and copy the token',
  phone_number_id: 'From Meta Business Suite > WhatsApp > API Setup',
  access_token: 'From the provider\'s developer dashboard',
  verify_token: 'Any random string you choose — used for webhook verification',
  webhook_secret: 'Used to verify incoming webhook payloads',
  base_url: 'e.g. http://localhost:11434 or https://api.hermes.ai',
  model: 'e.g. hermes-3-llama-3.1-8b',
  api_key: 'Your API key for this provider',
};

interface ProviderConfigEditorProps {
  provider: ProviderConfig;
  onSave: (id: string, config: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

function ProviderConfigEditor({ provider, onSave, onClose }: ProviderConfigEditorProps) {
  const [config, setConfig] = useState<Record<string, unknown>>({ ...provider.config });
  const [showSecrets, setShowSecrets] = useState(false);
  const [saving, setSaving] = useState(false);

  const keys = Object.keys(provider.config).concat(
    Object.keys(config).filter(k => !(k in provider.config))
  );

  const handleChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleArrayChange = (key: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [key]: value.split('\n').map(s => s.trim()).filter(Boolean),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(provider.id, { ...config });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--bg-secondary, #1e293b)',
        borderRadius: 12, padding: 24, width: '90%', maxWidth: 560,
        maxHeight: '80vh', overflow: 'auto',
        border: '1px solid var(--border-color, #334155)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={18} />
            <h3 style={{ margin: 0, fontSize: 16 }}>{provider.name} Configuration</h3>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-secondary, #94a3b8)',
            cursor: 'pointer', padding: 4, display: 'flex',
          }}>
            <X size={18} />
          </button>
        </div>

        {provider.is_system && (
          <div style={{
            padding: '8px 12px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)',
            color: '#eab308', fontSize: 13,
          }}>
            This provider uses environment variables. Saving will switch to database configuration.
          </div>
        )}

        {keys.map(key => {
          const value = config[key];
          const isSecret = SECRET_FIELDS.has(key);
          const isArray = Array.isArray(value);
          const label = FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const help = FIELD_HELP[key];

          return (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{
                display: 'block', marginBottom: 4, fontSize: 12,
                color: 'var(--text-secondary, #94a3b8)',
              }}>{label}</label>
              {help && (
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, lineHeight: 1.4 }}>
                  {help}
                </div>
              )}
              {isArray ? (
                <textarea
                  defaultValue={(value as string[]).join('\n')}
                  onChange={e => handleArrayChange(key, e.target.value)}
                  style={inputStyle}
                  rows={3}
                  placeholder="One per line"
                />
              ) : isSecret ? (
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    defaultValue={typeof value === 'string' ? value : ''}
                    onChange={e => handleChange(key, e.target.value)}
                    style={inputStyle}
                    placeholder={value ? '(value hidden)' : `Enter ${label}`}
                  />
                </div>
              ) : (
                <input
                  type="text"
                  defaultValue={typeof value === 'string' ? value : ''}
                  onChange={e => handleChange(key, e.target.value)}
                  style={inputStyle}
                  placeholder={`Enter ${label}`}
                />
              )}
            </div>
          );
        })}

        {keys.length === 0 && (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
            No configuration fields for this provider.
          </p>
        )}

        {SECRET_FIELDS.size > 0 && (
          <label style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
            color: '#94a3b8', marginBottom: 16, cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={showSecrets}
              onChange={e => setShowSecrets(e.target.checked)}
            />
            <span>Show secret values</span>
          </label>
        )}

        <button onClick={handleSave} disabled={saving} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px',
          borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
          background: 'var(--accent, #3b82f6)', color: '#fff', fontSize: 14,
          opacity: saving ? 0.6 : 1, width: '100%', justifyContent: 'center',
        }}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color, #334155)',
  background: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f1f5f9)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

export default function ProviderConfigPanel() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [changed, setChanged] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await integrationsApi.listProviders();
      setProviders((res.providers ?? []) as unknown as ProviderConfig[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await integrationsApi.listProviders();
        if (!cancelled) {
          setProviders((res.providers ?? []) as unknown as ProviderConfig[]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load providers');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async (id: string, config: Record<string, unknown>) => {
    await integrationsApi.updateProvider(id, { config, is_system: false });
    setChanged(id);
    setEditing(null);
    setTimeout(() => setChanged(null), 2000);
    await fetchProviders();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchProviders} />;

  const grouped = providers.reduce<Record<string, ProviderConfig[]>>((acc, p) => {
    const category = p.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(p);
    return acc;
  }, {});

  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontSize: 15, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Key size={16} />
          Provider Configuration
        </h2>

        {Object.entries(grouped).map(([category, ps]) => (
          <div key={category} style={{ marginBottom: 20 }}>
            <h4 style={{
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em',
              color: '#64748b', margin: '0 0 8px',
            }}>{category}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ps.map(provider => (
                <div key={provider.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color, #334155)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{provider.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {provider.description}
                      {provider.is_system && ' (env)'}
                    </div>
                  </div>
                  <button onClick={() => setEditing(provider.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                    borderRadius: 6, border: '1px solid var(--border-color, #334155)',
                    background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                    fontSize: 12,
                  }}>
                    <Settings2 size={14} />
                    {changed === provider.id ? 'Saved!' : 'Configure'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      {editing && (
        <ProviderConfigEditor
          key={editing}
          provider={providers.find(p => p.id === editing)!}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
