import React, { useState } from 'react';
import { FileCheck, Plus, Search, Loader2 } from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import { EmptyState } from '../../../components/system/States';
import { ContractCard } from '../components/ContractCard';
import type { CharacterContract, StakeType } from '../types';

interface AccountabilityViewProps {
  contracts: CharacterContract[];
  onCompleteContract: (id: string) => Promise<void>;
  onFailContract: (id: string) => Promise<void>;
  onAddContract: (contract: Omit<CharacterContract, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'completedAt'>) => Promise<void>;
  onDeleteContract: (id: string) => Promise<void>;
  saving?: boolean;
}

export const AccountabilityView: React.FC<AccountabilityViewProps> = ({
  contracts, onCompleteContract, onFailContract, onAddContract, onDeleteContract, saving,
}) => {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '', goalDescription: '', measurableCommitment: '',
    reportingFrequency: 'weekly', startDate: new Date().toISOString().split('T')[0],
    endDate: null as string | null, proofRequirement: '',
    accountabilityPerson: '', crmContactId: null as string | null,
    stakeType: 'none' as StakeType, stakeDescription: '',
    consequence: '', graceRules: '', isActive: true, completionStatus: 'pending' as 'pending' | 'completed' | 'failed',
  });

  const filtered = contracts.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = async () => {
    await onAddContract(form);
    setShowCreate(false);
  };

  return (
    <div>
      <Panel title="Accountability Contracts" icon={FileCheck} className="os-span-4">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="glass-input" style={{ width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.8rem', fontSize: '0.72rem' }}
              placeholder="Search contracts..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="glass-btn btn-cyan" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New Contract
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div className="glass-card" style={{ padding: '0.5rem 0.75rem', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Active</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              {contracts.filter(c => c.isActive).length}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '0.5rem 0.75rem', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Completed</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
              {contracts.filter(c => c.completionStatus === 'completed').length}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '0.5rem 0.75rem', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Failed</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-magenta)' }}>
              {contracts.filter(c => c.completionStatus === 'failed').length}
            </div>
          </div>
        </div>

        {showCreate && (
          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>Create Accountability Contract</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Title *</label>
                <input className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Accountability person</label>
                <input className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  placeholder="Name or role"
                  value={form.accountabilityPerson} onChange={e => setForm(p => ({ ...p, accountabilityPerson: e.target.value }))} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Measurable commitment *</label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '50px', padding: '0.35rem', fontSize: '0.72rem' }}
                  placeholder="What exactly will you do? How will it be measured?"
                  value={form.measurableCommitment} onChange={e => setForm(p => ({ ...p, measurableCommitment: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Reporting frequency</label>
                <select className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  value={form.reportingFrequency} onChange={e => setForm(p => ({ ...p, reportingFrequency: e.target.value }))}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Stake type</label>
                <select className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  value={form.stakeType} onChange={e => setForm(p => ({ ...p, stakeType: e.target.value as StakeType }))}>
                  <option value="none">None</option>
                  <option value="social">Social</option>
                  <option value="personal">Personal</option>
                  <option value="financial">Financial</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="glass-btn" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem' }}
                onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="glass-btn btn-cyan" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem' }}
                onClick={handleCreate} disabled={saving || !form.title || !form.measurableCommitment}>
                {saving ? <Loader2 size={12} className="spin" /> : null} Create
              </button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState title="No contracts" message="Create accountability contracts." />
        ) : (
          <div className="os-grid-2">
            {filtered.map(contract => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onComplete={onCompleteContract}
                onFail={onFailContract}
                onDelete={onDeleteContract}
                saving={saving}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};
