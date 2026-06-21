import React from 'react';
import { Flame } from 'lucide-react';

interface StreakDisplayProps {
  current: number;
  max: number;
  size?: 'sm' | 'md' | 'lg';
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ current, max, size = 'sm' }) => {
  const iconSize = size === 'lg' ? 24 : size === 'md' ? 18 : 14;
  const fontSize = size === 'lg' ? '1.1rem' : size === 'md' ? '0.85rem' : '0.72rem';
  const color = current >= 30 ? 'var(--accent-purple)'
    : current >= 14 ? 'var(--accent-cyan)'
    : current >= 7 ? 'var(--accent-teal)'
    : current >= 3 ? 'var(--text-primary)'
    : 'var(--text-muted)';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color, fontSize }}>
      <Flame size={iconSize} />
      <span style={{ fontWeight: 600 }}>{current}</span>
      {size !== 'sm' && (
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '0.15rem' }}>
          / {max} best
        </span>
      )}
    </span>
  );
};
