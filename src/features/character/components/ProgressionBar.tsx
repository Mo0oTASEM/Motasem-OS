import React from 'react';
import { Zap, Flame, Gamepad2 } from 'lucide-react';

interface ProgressionBarProps {
  level: number;
  levelTitle: string;
  totalXp: number;
  xpToNextLevel: number;
  currentStreak: number;
  maxStreak: number;
}

export const ProgressionBar: React.FC<ProgressionBarProps> = ({ level, levelTitle, totalXp, xpToNextLevel, currentStreak, maxStreak }) => {
  const xpProgress = xpToNextLevel > 0 && xpToNextLevel < Infinity
    ? Math.min(100, Math.round((totalXp / (totalXp + xpToNextLevel)) * 100))
    : 0;

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
      <div className="os-grid-4" style={{ gap: '1rem' }}>
        <div className="glass-card metric-card">
          <Gamepad2 size={18} />
          <span>Level {level}</span>
          <small>{levelTitle}</small>
        </div>
        <div className="glass-card metric-card">
          <Zap size={18} />
          <span>{totalXp} XP</span>
          <small>{xpToNextLevel === Infinity ? 'Max level' : `${xpToNextLevel} to next`}</small>
        </div>
        <div className="glass-card metric-card">
          <Flame size={18} />
          <span>{currentStreak} day{currentStreak !== 1 ? 's' : ''}</span>
          <small>Best: {maxStreak}</small>
        </div>
        <div className="glass-card metric-card" style={{ gridColumn: 'span 1' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Progress</div>
          {xpToNextLevel < Infinity && (
            <div className="progress-bar" style={{ marginTop: '0.5rem', width: '100%' }}>
              <div className="progress-fill" style={{ width: `${xpProgress}%` }} />
            </div>
          )}
          {xpToNextLevel === Infinity && <small style={{ color: 'var(--accent-cyan)' }}>Transcended</small>}
        </div>
      </div>
    </div>
  );
};
