import React from 'react';
import { Flame, CheckCircle2, XCircle } from 'lucide-react';
import type { CharacterHabit } from '../types';

interface HabitRowProps {
  habit: CharacterHabit;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  disabled?: boolean;
}

export const HabitRow: React.FC<HabitRowProps> = ({ habit, onComplete, onDelete, disabled }) => {
  const today = new Date().toISOString().split('T')[0];
  const isCompletedToday = habit.lastCompletedDate?.split('T')[0] === today;

  return (
    <div className="glass-card" style={{
      padding: '0.85rem 1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      opacity: disabled ? 0.5 : 1,
    }}>
      <button
        className="glass-btn"
        style={{
          padding: '0.4rem',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isCompletedToday ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
          borderColor: isCompletedToday ? 'var(--accent-cyan)' : 'var(--panel-border)',
        }}
        onClick={() => onComplete?.(habit.id)}
        disabled={isCompletedToday || disabled}
        title={isCompletedToday ? 'Completed today' : 'Mark complete'}
      >
        {isCompletedToday ? <CheckCircle2 size={16} className="text-cyan" /> : <Flame size={16} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
          <strong style={{ fontSize: '0.85rem' }}>{habit.title}</strong>
          {habit.currentStreak > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', color: 'var(--accent-orange)' }}>
              <Flame size={12} /> {habit.currentStreak}
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {habit.description}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{habit.frequency}</span>
        <span className="badge badge-cyan" style={{ fontSize: '0.6rem' }}>+{habit.baseXp} XP</span>
      </div>

      {onDelete && (
        <button className="glass-btn" style={{ padding: '0.15rem 0.35rem', fontSize: '0.65rem' }}
          onClick={() => onDelete(habit.id)}>
          <XCircle size={12} />
        </button>
      )}
    </div>
  );
};
