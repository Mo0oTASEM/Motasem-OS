import React from 'react';
import { Calendar, Target, TrendingUp } from 'lucide-react';
import type { CharacterSeason } from '../types';

interface SeasonCardProps {
  season: CharacterSeason;
  onSelect?: (id: string) => void;
}

export const SeasonCard: React.FC<SeasonCardProps> = ({ season, onSelect }) => {
  const statusColor = season.status === 'completed' ? 'var(--accent-teal)'
    : season.status === 'active' ? 'var(--accent-cyan)'
    : season.status === 'planning' ? 'var(--accent-purple)'
    : 'var(--text-muted)';

  const progress = season.earnedXp > 0 && season.openingXp > 0
    ? Math.min(100, Math.round(((season.earnedXp) / (season.openingXp + season.earnedXp)) * 100))
    : 0;

  return (
    <div className="glass-card" style={{ padding: '1rem', cursor: onSelect ? 'pointer' : undefined, borderLeft: `3px solid ${statusColor}` }}
      onClick={() => onSelect?.(season.id)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Target size={16} style={{ color: statusColor }} />
          <strong style={{ fontSize: '0.85rem' }}>{season.title}</strong>
        </div>
        <span className="badge" style={{ background: `${statusColor}20`, color: statusColor, fontSize: '0.6rem' }}>
          {season.status}
        </span>
      </div>

      {season.identityFocus && (
        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
          "{season.identityFocus}"
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          <Calendar size={12} /> {new Date(season.startDate).toLocaleDateString()}
          {season.endDate && ` — ${new Date(season.endDate).toLocaleDateString()}`}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          <TrendingUp size={12} /> +{season.earnedXp} XP earned
        </span>
        <span>{season.targetTraitIds.length} traits</span>
        <span>{season.targetHabitIds.length} habits</span>
      </div>

      {season.status !== 'planning' && (
        <div className="progress-bar" style={{ height: '4px' }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
      {season.completionScore !== null && (
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Completion score: {season.completionScore}/100
        </div>
      )}
    </div>
  );
};
