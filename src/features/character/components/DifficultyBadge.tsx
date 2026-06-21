import React from 'react';

interface DifficultyBadgeProps {
  difficulty: number;
  max?: number;
}

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({ difficulty, max = 10 }) => {
  const pct = difficulty / max;
  const color = pct >= 0.8 ? 'var(--accent-magenta)'
    : pct >= 0.5 ? 'var(--accent-purple)'
    : pct >= 0.3 ? 'var(--accent-cyan)'
    : 'var(--text-muted)';

  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 600, color,
      border: `1px solid ${color}30`,
      borderRadius: '4px', padding: '0.1rem 0.4rem',
      background: `${color}10`,
    }}>
      {difficulty}/{max}
    </span>
  );
};

export const DiscomfortBadge: React.FC<DifficultyBadgeProps> = ({ difficulty, max = 10 }) => {
  const pct = difficulty / max;
  const color = pct >= 0.7 ? 'var(--accent-magenta)'
    : pct >= 0.4 ? 'var(--accent-purple)'
    : 'var(--text-muted)';

  return (
    <span style={{
      fontSize: '0.6rem', color,
      border: `1px solid ${color}30`,
      borderRadius: '4px', padding: '0.05rem 0.35rem',
      background: `${color}10`,
    }}>
      {difficulty}/10
    </span>
  );
};
