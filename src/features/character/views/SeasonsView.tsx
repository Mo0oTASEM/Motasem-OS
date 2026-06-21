import React, { useState } from 'react';
import { Calendar, Plus, Loader2 } from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import { EmptyState } from '../../../components/system/States';
import { SeasonCard } from '../components/SeasonCard';
import type { CharacterSeason } from '../types';

interface SeasonsViewProps {
  seasons: CharacterSeason[];
  onAddSeason: (season: Omit<CharacterSeason, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  saving?: boolean;
}

export const SeasonsView: React.FC<SeasonsViewProps> = ({ seasons, onAddSeason, saving }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '', identityFocus: '', targetTraitIds: [] as string[],
    targetHabitIds: [] as string[], targetLadderIds: [] as string[],
    startDate: new Date().toISOString().split('T')[0],
    endDate: null as string | null, status: 'planning' as 'planning' | 'active' | 'completed' | 'cancelled',
    openingXp: 0, earnedXp: 0, completionScore: null as number | null,
    finalReflection: '',
  });

  const activeSeason = seasons.find(s => s.status === 'active');
  const pastSeasons = seasons.filter(s => s.status === 'completed' || s.status === 'cancelled');
  const plannedSeasons = seasons.filter(s => s.status === 'planning');

  const handleCreate = async () => {
    await onAddSeason({ ...form });
    setShowCreate(false);
  };

  return (
    <div>
      {activeSeason && (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--accent-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} className="text-cyan" />
              <strong>Current Season: {activeSeason.title}</strong>
            </div>
            <span className="badge badge-cyan">Active</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            "{activeSeason.identityFocus}"
          </p>
        </div>
      )}

      <Panel title="Seasons" icon={Calendar} className="os-span-4">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <button className="glass-btn btn-cyan" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New Season
          </button>
        </div>

        {showCreate && (
          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>Plan a Season</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Season theme *</label>
                <input className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Status</label>
                <select className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as 'planning' | 'active' | 'completed' | 'cancelled' }))}>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Identity focus statement</label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '50px', padding: '0.35rem', fontSize: '0.72rem' }}
                  placeholder="Who will I become this season?"
                  value={form.identityFocus} onChange={e => setForm(p => ({ ...p, identityFocus: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Start date</label>
                <input type="date" className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>End date</label>
                <input type="date" className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                  value={form.endDate || ''} onChange={e => setForm(p => ({ ...p, endDate: e.target.value || null }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="glass-btn" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem' }}
                onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="glass-btn btn-cyan" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem' }}
                onClick={handleCreate} disabled={saving || !form.title}>
                {saving ? <Loader2 size={12} className="spin" /> : null} Create
              </button>
            </div>
          </div>
        )}

        {plannedSeasons.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PLANNED</h4>
            <div className="os-grid-2">
              {plannedSeasons.map(s => <SeasonCard key={s.id} season={s} />)}
            </div>
          </div>
        )}

        {pastSeasons.length > 0 && (
          <div>
            <h4 style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PAST SEASONS</h4>
            <div className="os-grid-2">
              {pastSeasons.map(s => <SeasonCard key={s.id} season={s} />)}
            </div>
          </div>
        )}

        {seasons.length === 0 && (
          <EmptyState title="No seasons" message="Plan your first character season." />
        )}
      </Panel>
    </div>
  );
};
