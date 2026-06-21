import React, { useState } from 'react';
import { 
  User, Plus, Search, Trash2, Edit2, ArrowUp, ArrowDown, 
  X, Compass
} from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import type { CharacterIdentityRule, CharacterConnection, CharacterProfile } from '../types';
import { CharacterConnections } from '../components/CharacterConnections';

interface IdentityRulesViewProps {
  rules: CharacterIdentityRule[];
  connections: CharacterConnection[];
  onAddConnection: (conn: Omit<CharacterConnection, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  onDeleteConnection: (id: string) => Promise<void>;
  onAddRule: (rule: Omit<CharacterIdentityRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateRule: (id: string, updates: Partial<CharacterIdentityRule>) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  saving?: boolean;
  profile: CharacterProfile | null;
  onUpdateProfile: (updates: Partial<CharacterProfile>) => Promise<void>;
}

export const IdentityRulesView: React.FC<IdentityRulesViewProps> = ({
  rules, connections, onAddConnection, onDeleteConnection, onAddRule, onUpdateRule, onDeleteRule, saving,
  profile, onUpdateProfile
}) => {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Identity statement editor
  const [isEditingStatement, setIsEditingStatement] = useState(false);
  const [statementText, setStatementText] = useState(profile?.identityStatement || '');

  const [form, setForm] = useState({
    title: '', description: '', ruleStatement: '', category: 'Rule',
    priority: 'medium', activeStatus: true, displayOrder: 0,
  });

  const categories = ['Value', 'Personal Standard', 'Rule', 'Behavior to Build', 'Behavior to Avoid'];

  const filteredRules = rules.filter(r => 
    r.title.toLowerCase().includes(search.toLowerCase()) || 
    r.ruleStatement.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.displayOrder - b.displayOrder);

  const handleSaveStatement = async () => {
    await onUpdateProfile({ identityStatement: statementText });
    setIsEditingStatement(false);
  };

  const handleCreate = async () => {
    await onAddRule({ ...form, displayOrder: rules.length });
    setShowCreate(false);
    resetForm();
  };

  const handleUpdate = async (id: string) => {
    await onUpdateRule(id, { ...form });
    setEditingId(null);
    resetForm();
  };

  const startEdit = (r: CharacterIdentityRule) => {
    setForm({
      title: r.title, description: r.description || '', ruleStatement: r.ruleStatement,
      category: r.category || 'Rule', priority: r.priority || 'medium', activeStatus: r.activeStatus,
      displayOrder: r.displayOrder || 0,
    });
    setEditingId(r.id);
    setShowCreate(true);
  };

  const resetForm = () => {
    setForm({
      title: '', description: '', ruleStatement: '', category: 'Rule',
      priority: 'medium', activeStatus: true, displayOrder: 0,
    });
  };

  const moveRule = async (index: number, direction: 'up' | 'down', groupRules: CharacterIdentityRule[]) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= groupRules.length) return;

    const currentRule = groupRules[index];
    const targetRule = groupRules[targetIndex];

    await Promise.all([
      onUpdateRule(currentRule.id, { displayOrder: targetRule.displayOrder }),
      onUpdateRule(targetRule.id, { displayOrder: currentRule.displayOrder }),
    ]);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this identity element permanently?")) {
      await onDeleteRule(id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── Identity Statement Card ── */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-purple)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Compass size={16} className="text-purple" />
            <strong style={{ fontSize: '0.9rem' }}>Core Identity Statement</strong>
          </div>
          {!isEditingStatement ? (
            <button className="glass-btn btn-cyan" style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem' }} onClick={() => { setStatementText(profile?.identityStatement || ''); setIsEditingStatement(true); }}>
              Edit
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button className="glass-btn btn-cyan" style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem' }} onClick={handleSaveStatement} disabled={saving}>
                Save
              </button>
              <button className="glass-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem' }} onClick={() => setIsEditingStatement(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {isEditingStatement ? (
          <textarea
            className="glass-input"
            style={{ width: '100%', minHeight: '60px', padding: '0.5rem', fontSize: '0.85rem', fontStyle: 'italic' }}
            value={statementText}
            onChange={e => setStatementText(e.target.value)}
            placeholder="Define who you are becoming..."
          />
        ) : (
          <p style={{ fontSize: '1rem', fontStyle: 'italic', margin: 0, color: 'var(--text-primary)' }}>
            {profile?.identityStatement ? `“${profile.identityStatement}”` : "No core identity statement defined. Click Edit to establish your central mantra."}
          </p>
        )}
      </div>

      {/* ── Search & Filter header ── */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '150px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="glass-input" style={{ width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.8rem', fontSize: '0.72rem' }}
            placeholder="Search identity values & rules..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="glass-btn btn-cyan" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          onClick={() => { resetForm(); setShowCreate(true); setEditingId(null); }}>
          <Plus size={14} /> Add Element
        </button>
      </div>

      {/* ── Category Blocks ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {categories.map(cat => {
          const catRules = filteredRules.filter(r => (r.category || 'Rule') === cat);
          return (
            <div key={cat} style={{ borderLeft: '3px solid var(--accent-purple)', borderRadius: '8px', overflow: 'hidden' }}>
              <Panel title={`${cat}s`} icon={User} className="os-span-4">
                {catRules.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                    No elements under {cat}s defined yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {catRules.map((rule, idx) => (
                      <div key={rule.id} className="glass-card" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        
                        {/* Reorder Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <button className="glass-btn" style={{ padding: '0.15rem' }} disabled={idx === 0} onClick={() => moveRule(idx, 'up', catRules)}>
                            <ArrowUp size={10} />
                          </button>
                          <button className="glass-btn" style={{ padding: '0.15rem' }} disabled={idx === catRules.length - 1} onClick={() => moveRule(idx, 'down', catRules)}>
                            <ArrowDown size={10} />
                          </button>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.82rem' }}>{rule.title}</strong>
                            <span className={`badge ${
                              rule.priority === 'high' ? 'badge-danger' : 'badge-cyan'
                            }`} style={{ fontSize: '0.55rem' }}>
                              {rule.priority}
                            </span>
                            {!rule.activeStatus && <span className="badge badge-neutral" style={{ fontSize: '0.55rem' }}>Paused</span>}
                          </div>
                          <p style={{ fontSize: '0.82rem', fontStyle: 'italic', margin: '0.2rem 0', color: 'var(--text-primary)' }}>
                            &ldquo;{rule.ruleStatement}&rdquo;
                          </p>
                          {rule.description && (
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>{rule.description}</p>
                          )}

                          <CharacterConnections
                            sourceEntityType="identity_rule"
                            sourceEntityId={rule.id}
                            connections={connections}
                            onAddConnection={onAddConnection}
                            onDeleteConnection={onDeleteConnection}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => startEdit(rule)}>
                            <Edit2 size={11} />
                          </button>
                          <button className="glass-btn" style={{ padding: '0.25rem', color: 'var(--text-danger)' }} onClick={() => handleDelete(rule.id)}>
                            <Trash2 size={11} />
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          );
        })}
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} className="text-purple" />
                <h3 style={{ margin: 0 }}>{editingId ? 'Edit Identity Element' : 'Create Identity Element'}</h3>
              </div>
              <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={() => setShowCreate(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="field-label">Element Title *</label>
                <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Integrity Focus" />
              </div>
              <div>
                <label className="field-label">Identity Category *</label>
                <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Rule / Mantra Statement *</label>
                <input type="text" className="glass-input" style={{ width: '100%', padding: '0.45rem' }} value={form.ruleStatement} onChange={e => setForm(p => ({ ...p, ruleStatement: e.target.value }))} placeholder="e.g. I am a person who acts with honesty." />
              </div>
              <div>
                <label className="field-label">Description / Narrative Context</label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '50px', padding: '0.45rem' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label">Priority</label>
                  <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Status</label>
                  <select className="glass-input" style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)' }} value={form.activeStatus ? 'true' : 'false'} onChange={e => setForm(p => ({ ...p, activeStatus: e.target.value === 'true' }))}>
                    <option value="true">Active</option>
                    <option value="false">Paused</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
              <button className="glass-btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="glass-btn btn-cyan" onClick={() => editingId ? handleUpdate(editingId) : handleCreate()} disabled={saving || !form.title || !form.ruleStatement}>
                {editingId ? 'Save Changes' : 'Create Element'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
