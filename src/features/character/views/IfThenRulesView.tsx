import React, { useState } from 'react';
import { Brain, Plus, Search, Loader2 } from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import { EmptyState } from '../../../components/system/States';
import { IfThenRuleCard } from '../components/IfThenRuleCard';
import type { CharacterIfThenRule, CharacterTrait, CharacterBadGuy } from '../types';

interface IfThenRulesViewProps {
  ifThenRules: CharacterIfThenRule[];
  traits: CharacterTrait[];
  badGuys: CharacterBadGuy[];
  onAddRule: (rule: Omit<CharacterIfThenRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateRule: (id: string, updates: Partial<CharacterIfThenRule>) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onTriggerRule: (id: string, followed: boolean) => Promise<void>;
  saving?: boolean;
}

export const IfThenRulesView: React.FC<IfThenRulesViewProps> = ({
  ifThenRules, traits, badGuys, onAddRule, onUpdateRule, onDeleteRule, onTriggerRule, saving,
}) => {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    triggerCondition: '', responseAction: '', linkedTraitId: '',
    linkedBadGuyId: '', isActive: true,
  });

  const filtered = ifThenRules.filter(r =>
    r.triggerCondition.toLowerCase().includes(search.toLowerCase()) ||
    r.responseAction.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = async () => {
    await onAddRule({
      triggerCondition: form.triggerCondition,
      responseAction: form.responseAction,
      linkedTraitId: form.linkedTraitId || null,
      linkedBadGuyId: form.linkedBadGuyId || null,
      isActive: form.isActive,
      successCount: 0, failureCount: 0, effectivenessScore: 0,
    });
    setShowCreate(false);
    setForm({ triggerCondition: '', responseAction: '', linkedTraitId: '', linkedBadGuyId: '', isActive: true });
  };

  return (
    <div>
      <Panel title="If-Then Rules" icon={Brain} className="os-span-4">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="glass-input" style={{ width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.8rem', fontSize: '0.72rem' }}
              placeholder="Search rules..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="glass-btn btn-cyan" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Add Rule
          </button>
        </div>

        {showCreate && (
          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>Create If-Then Rule</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>IF (trigger) *</label>
                <input className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  placeholder="e.g. I feel the urge to procrastinate"
                  value={form.triggerCondition} onChange={e => setForm(p => ({ ...p, triggerCondition: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>THEN (response) *</label>
                <input className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  placeholder="e.g. I will take 3 deep breaths and start"
                  value={form.responseAction} onChange={e => setForm(p => ({ ...p, responseAction: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Link to Trait</label>
                <select className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  value={form.linkedTraitId} onChange={e => setForm(p => ({ ...p, linkedTraitId: e.target.value }))}>
                  <option value="">None</option>
                  {traits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Link to Bad Guy</label>
                <select className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  value={form.linkedBadGuyId} onChange={e => setForm(p => ({ ...p, linkedBadGuyId: e.target.value }))}>
                  <option value="">None</option>
                  {badGuys.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="glass-btn" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem' }}
                onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="glass-btn btn-cyan" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem' }}
                onClick={handleCreate} disabled={saving || !form.triggerCondition || !form.responseAction}>
                {saving ? <Loader2 size={12} className="spin" /> : null} Create
              </button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState title="No rules" message="If-then rules automate your response to triggers." />
        ) : (
          <div className="os-grid-2">
            {filtered.map(rule => (
              <IfThenRuleCard
                key={rule.id}
                rule={rule}
                onTrigger={onTriggerRule}
                onToggle={(id) => {
                  const r = ifThenRules.find(rr => rr.id === id);
                  if (r) onUpdateRule(id, { isActive: !r.isActive });
                }}
                onDelete={onDeleteRule}
                saving={saving}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};
