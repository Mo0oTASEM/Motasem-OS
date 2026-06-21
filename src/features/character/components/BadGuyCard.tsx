import React from 'react';
import { Skull, Shield, AlertTriangle, TrendingUp, Plus } from 'lucide-react';
import type { CharacterBadGuy } from '../types';

interface BadGuyCardProps {
  badGuy: CharacterBadGuy;
  onResist?: (id: string) => void;
  onGiveIn?: (id: string) => void;
  onDelete?: (id: string) => void;
  saving?: boolean;
}

export const BadGuyCard: React.FC<BadGuyCardProps> = ({ badGuy, onResist, onGiveIn, onDelete, saving }) => {
  const resistPct = badGuy.occurrenceCount > 0
    ? Math.round((badGuy.defeatedCount / badGuy.occurrenceCount) * 100)
    : 0;

  return (
    <div className="glass-card" style={{ padding: '1rem', borderLeft: `3px solid ${resistPct >= 50 ? 'var(--accent-teal)' : 'var(--accent-magenta)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Skull size={16} className="text-magenta" />
          <strong style={{ fontSize: '0.85rem' }}>{badGuy.title}</strong>
        </div>
        <span className="badge" style={{
          background: resistPct >= 50 ? 'var(--status-success-bg)' : 'var(--status-error-bg)',
          color: resistPct >= 50 ? 'var(--status-success)' : 'var(--status-error)',
          fontSize: '0.6rem',
        }}>
          {badGuy.defeatedCount}/{badGuy.occurrenceCount} resisted
        </span>
      </div>

      {badGuy.triggerDescription && (
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
          <AlertTriangle size={11} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
          {badGuy.triggerDescription}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
        {badGuy.warningSigns && (
          <span>Warning: {badGuy.warningSigns}</span>
        )}
        {badGuy.occurrenceCount > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <TrendingUp size={12} /> {resistPct}% resisted
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {onResist && (
          <button
            className="glass-btn btn-cyan"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            onClick={() => onResist(badGuy.id)}
            disabled={saving}
          >
            <Shield size={12} /> Resist
          </button>
        )}
        {onGiveIn && (
          <button
            className="glass-btn"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            onClick={() => onGiveIn(badGuy.id)}
            disabled={saving}
          >
            <Plus size={12} /> Encountered
          </button>
        )}
        {onDelete && (
          <button className="glass-btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
            onClick={() => onDelete(badGuy.id)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
};
