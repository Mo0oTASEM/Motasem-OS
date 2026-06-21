import React from 'react';
import { Target, Sword, Eye, Swords, Stethoscope, BookOpen, HelpCircle, Zap, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import type { CharacterQuest, QuestType } from '../types';
import { DifficultyBadge, DiscomfortBadge } from './DifficultyBadge';

interface QuestCardProps {
  quest: CharacterQuest;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRetry?: (id: string) => void;
  saving?: boolean;
}

type IconComponent = React.FC<{ size?: number; style?: React.CSSProperties; className?: string }>;

const QUEST_VISUALS: Record<QuestType, { icon: IconComponent; color: string; label: string }> = {
  standard: { icon: Target, color: 'var(--accent-cyan)', label: 'Quest' },
  courage: { icon: Sword, color: 'var(--accent-purple)', label: 'Courage Quest' },
  exposure: { icon: Eye, color: 'var(--accent-teal)', label: 'Exposure Quest' },
  boss_fight: { icon: Swords, color: 'var(--accent-magenta)', label: 'Boss Fight' },
  recovery: { icon: Stethoscope, color: 'var(--accent-cyan)', label: 'Recovery' },
  reflection: { icon: BookOpen, color: 'var(--accent-purple)', label: 'Reflection' },
  ai_suggested: { icon: HelpCircle, color: 'var(--accent-cyan)', label: 'AI Suggested' },
};

export const QuestCard: React.FC<QuestCardProps> = ({ quest, onComplete, onDelete, onRetry, saving }) => {
  const visual = QUEST_VISUALS[quest.questType] || QUEST_VISUALS.standard;
  const Icon = visual.icon;
  const isCompleted = quest.status === 'completed';
  const isLocked = quest.status === 'locked';

  return (
    <div className="glass-card" style={{
      padding: '1rem',
      borderLeft: `3px solid ${visual.color}`,
      opacity: isLocked ? 0.5 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
          <Icon size={16} style={{ color: visual.color, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{quest.title}</div>
            <span style={{ fontSize: '0.6rem', color: visual.color }}>{visual.label}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
          <DifficultyBadge difficulty={quest.difficulty} />
          {quest.estimatedDiscomfort > 0 && <DiscomfortBadge difficulty={quest.estimatedDiscomfort} />}
        </div>
      </div>

      {quest.description && (
        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
          {quest.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
        {quest.rewardXp > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <Zap size={12} /> +{quest.rewardXp} XP
          </span>
        )}
        {quest.targetDate && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <Calendar size={12} /> {new Date(quest.targetDate).toLocaleDateString()}
          </span>
        )}
        {quest.retryCount > 0 && <span>{quest.retryCount} attempt(s)</span>}
        {quest.linkedTraitIds.length > 0 && (
          <span>Traits: {quest.linkedTraitIds.length}</span>
        )}
      </div>

      <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {!isCompleted && !isLocked && onComplete && (
          <button
            className="glass-btn btn-cyan"
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            onClick={() => onComplete(quest.id)}
            disabled={saving}
          >
            {saving ? <Loader2 size={12} className="spin" /> : <CheckCircle2 size={12} />}
            Complete
          </button>
        )}
        {isCompleted && onRetry && (
          <button className="glass-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem' }}
            onClick={() => onRetry(quest.id)}>
            Retry
          </button>
        )}
        {onDelete && (
          <button className="glass-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem' }}
            onClick={() => onDelete(quest.id)}>
            Delete
          </button>
        )}
        {quest.status === 'completed' && quest.completedAt && (
          <span style={{ fontSize: '0.6rem', color: 'var(--accent-teal)', marginLeft: 'auto', alignSelf: 'center' }}>
            {new Date(quest.completedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
};
