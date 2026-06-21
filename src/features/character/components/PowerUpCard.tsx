import React from 'react';
import { Zap, Clock, Star, Loader2 } from 'lucide-react';
import type { CharacterPowerUp } from '../types';

interface PowerUpCardProps {
  powerUp: CharacterPowerUp;
  onUse?: (id: string) => void;
  onDelete?: (id: string) => void;
  saving?: boolean;
  compact?: boolean;
}

export const PowerUpCard: React.FC<PowerUpCardProps> = ({ powerUp, onUse, onDelete, saving, compact }) => {
  if (compact) {
    return (
      <button
        className="glass-card"
        style={{ padding: '0.6rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none', fontSize: 'inherit', color: 'inherit' }}
        onClick={() => onUse?.(powerUp.id)}
        disabled={saving}
      >
        <Zap size={14} className="text-cyan" />
        <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 500 }}>{powerUp.title}</span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          <Clock size={10} /> {powerUp.durationMinutes}m
        </span>
      </button>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={16} className="text-cyan" />
          <strong style={{ fontSize: '0.85rem' }}>{powerUp.title}</strong>
        </div>
        {powerUp.isFavorite && <Star size={14} style={{ color: 'var(--accent-purple)' }} />}
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
        {powerUp.description}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          <Clock size={12} /> {powerUp.durationMinutes} min
        </span>
        <span>{powerUp.usageCount} uses</span>
        {powerUp.effectivenessRating > 0 && (
          <span>{powerUp.effectivenessRating}% effective</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.35rem' }}>
        {onUse && (
          <button
            className="glass-btn btn-cyan"
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            onClick={() => onUse(powerUp.id)}
            disabled={saving}
          >
            {saving ? <Loader2 size={12} className="spin" /> : <Zap size={12} />}
            Launch
          </button>
        )}
        {onDelete && (
          <button className="glass-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem' }}
            onClick={() => onDelete(powerUp.id)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
};
