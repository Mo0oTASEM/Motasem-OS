import React from 'react';
import { Gamepad2, Bot, Plus, Zap, RefreshCw } from 'lucide-react';
import type { CharacterProfile } from '../types';

interface CharacterHeaderProps {
  profile: CharacterProfile | null;
  level: number;
  levelTitle: string;
  totalXp: number;
  saving?: boolean;
  onOpenCoach: () => void;
  onLogWin: () => void;
  onLogStruggle: () => void;
  onRefresh: () => void;
}

export const CharacterHeader: React.FC<CharacterHeaderProps> = ({
  profile, level, levelTitle, totalXp, saving, onOpenCoach, onLogWin, onLogStruggle, onRefresh,
}) => {
  return (
    <PageHeader
      title="Character Development Engine"
      description="Build identity-based discipline, courage, and emotional mastery."
      icon={Gamepad2}
    >
      {saving && <span className="badge badge-teal" style={{ animation: 'pulse-cyan 1.5s infinite' }}>Saving...</span>}
      <span className="badge badge-cyan">Lv.{level} {levelTitle}</span>
      <span className="badge badge-teal">{totalXp} XP</span>
      {profile?.recoveryMode && <span className="badge badge-warning">Recovery Mode</span>}
      {profile?.activeSeasonId && <span className="badge badge-purple">Season Active</span>}
      <button className="glass-btn btn-cyan" onClick={onOpenCoach} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <Bot size={14} /> Coach
      </button>
      <button className="glass-btn" onClick={onLogWin} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <Plus size={14} /> Log Win
      </button>
      <button className="glass-btn" onClick={onLogStruggle} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <Zap size={14} /> Log Struggle
      </button>
      <button className="glass-btn" onClick={onRefresh}>
        <RefreshCw size={14} />
      </button>
    </PageHeader>
  );
};

function PageHeader(props: { title: string; description: string; icon: React.FC<{ size?: number; className?: string }>; children?: React.ReactNode }) {
  const { title, description, icon: Icon, children } = props;
  return (
    <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Icon size={24} className="text-cyan" />
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{title}</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{description}</p>
        </div>
      </div>
      {children && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {children}
        </div>
      )}
    </header>
  );
}
