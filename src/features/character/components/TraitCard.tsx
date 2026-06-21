import React from 'react';
import { Star } from 'lucide-react';
import type { CharacterTrait, TraitStatus } from '../types';

interface TraitCardProps {
  trait: CharacterTrait;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const STATUS_BADGE: Record<TraitStatus, string> = {
  active: 'badge-success',
  archived: 'badge-neutral',
  locked: 'badge-warning',
};

export const TraitCard: React.FC<TraitCardProps> = ({ trait, onSelect, onDelete }) => {
  const level = trait.currentRank;
  const xpInLevel = trait.lifetimeXp % 100;

  return (
    <div className="glass-card" style={{ padding: '1rem', cursor: onSelect ? 'pointer' : undefined }}
      onClick={() => onSelect?.(trait.id)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Star size={16} className="text-cyan" />
          <strong>{trait.name}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`badge ${level >= 7 ? 'badge-success' : level >= 4 ? 'badge-warning' : 'badge-neutral'}`}>
            Lv.{level}
          </span>
          {trait.status !== 'active' && (
            <span className={`badge ${STATUS_BADGE[trait.status]}`}>{trait.status}</span>
          )}
          {onDelete && (
            <button className="glass-btn" style={{ padding: '0.15rem 0.35rem', fontSize: '0.65rem' }}
              onClick={(e) => { e.stopPropagation(); onDelete(trait.id); }}>
              ✕
            </button>
          )}
        </div>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>{trait.description}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{trait.name}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{trait.lifetimeXp} XP</span>
      </div>
      {level < 10 && (
        <div className="progress-bar" style={{ marginTop: '0.5rem', height: '4px' }}>
          <div className="progress-fill" style={{ width: `${(xpInLevel / 100) * 100}%` }} />
        </div>
      )}
    </div>
  );
};
