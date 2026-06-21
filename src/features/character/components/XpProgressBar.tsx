import React from 'react';
import { Zap, Flame, Gamepad2, Trophy } from 'lucide-react';

interface XpProgressBarProps {
  level: number;
  levelTitle: string;
  totalXp: number;
  xpToNextLevel: number;
  currentStreak: number;
  maxStreak: number;
  compact?: boolean;
}

export const XpProgressBar: React.FC<XpProgressBarProps> = ({
  level, levelTitle, totalXp, xpToNextLevel, currentStreak, maxStreak, compact,
}) => {
  const xpProgress = xpToNextLevel > 0 && xpToNextLevel < Infinity
    ? Math.min(100, Math.round((totalXp / (totalXp + xpToNextLevel)) * 100))
    : 100;

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Gamepad2 size={14} className="text-cyan" />
          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Lv.{level}</span>
        </div>
        <div className="progress-bar" style={{ flex: 1, height: '6px' }}>
          <div className="progress-fill" style={{ width: `${xpProgress}%` }} />
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {totalXp} / {totalXp + xpToNextLevel} XP
        </span>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
          <Gamepad2 size={18} className="text-cyan" style={{ marginBottom: '0.25rem' }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Lv.{level}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{levelTitle}</div>
        </div>
        <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
          <Zap size={18} className="text-cyan" style={{ marginBottom: '0.25rem' }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{totalXp}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            {xpToNextLevel === Infinity ? 'Max level' : `${xpToNextLevel} XP to next`}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
          <Flame size={18} style={{ marginBottom: '0.25rem', color: 'var(--accent-magenta)' }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{currentStreak}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>day streak</div>
        </div>
        <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
          <Trophy size={18} style={{ marginBottom: '0.25rem', color: 'var(--accent-purple)' }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{maxStreak}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>best streak</div>
        </div>
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
          <span>Level Progress</span>
          <span>{xpProgress}%</span>
        </div>
        <div className="progress-bar" style={{ height: '8px' }}>
          <div className="progress-fill" style={{ width: `${xpProgress}%` }} />
        </div>
      </div>
    </div>
  );
};
