import React, { useState } from 'react';
import { Zap, Search } from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import { EmptyState } from '../../../components/system/States';
import { PowerUpCard } from '../components/PowerUpCard';
import type { CharacterPowerUp } from '../types';



interface PowerUpsViewProps {
  powerUps: CharacterPowerUp[];
  onUsePowerUp: (id: string) => Promise<void>;
  onDeletePowerUp: (id: string) => Promise<void>;
  saving?: boolean;
}

export const PowerUpsView: React.FC<PowerUpsViewProps> = ({
  powerUps, onUsePowerUp, onDeletePowerUp, saving,
}) => {
  const [search, setSearch] = useState('');

  const filtered = powerUps.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <Panel title="Power-Ups" icon={Zap} className="os-span-4">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="glass-input" style={{ width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.8rem', fontSize: '0.72rem' }}
              placeholder="Search power-ups..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <div className="glass-card" style={{ padding: '0.5rem 0.75rem', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Total power-ups</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{powerUps.length}</div>
          </div>
          <div className="glass-card" style={{ padding: '0.5rem 0.75rem', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Total uses</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {powerUps.reduce((s, p) => s + p.usageCount, 0)}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '0.5rem 0.75rem', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Avg effectiveness</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {(() => {
                const rated = powerUps.filter(p => p.effectivenessRating > 0);
                return rated.length > 0 ? `${Math.round(rated.reduce((s, p) => s + p.effectivenessRating, 0) / rated.length)}%` : '—';
              })()}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No power-ups" message="Quick tools to reset and refocus." />
        ) : (
          <div className="os-grid-2">
            {filtered.map(powerUp => (
              <PowerUpCard
                key={powerUp.id}
                powerUp={powerUp}
                onUse={onUsePowerUp}
                onDelete={onDeletePowerUp}
                saving={saving}
              />
            ))}
          </div>
        )}

        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.5rem' }}>Quick Launch</h4>
          <div className="os-grid-4">
            {filtered.slice(0, 8).map(powerUp => (
              <button key={powerUp.id} className="glass-card" style={{
                padding: '0.75rem', textAlign: 'center', cursor: 'pointer',
                border: 'none', fontSize: 'inherit', color: 'inherit',
                transition: 'var(--transition-normal)',
              }}
                onClick={() => onUsePowerUp(powerUp.id)} disabled={saving}>
                <Zap size={20} className="text-cyan" style={{ marginBottom: '0.35rem' }} />
                <div style={{ fontSize: '0.68rem', fontWeight: 500 }}>{powerUp.title}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{powerUp.durationMinutes} min</div>
              </button>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
};
