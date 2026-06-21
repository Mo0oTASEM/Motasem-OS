import React from 'react';
import { X, Star, TrendingUp, Target, Lightbulb, FileText, Activity } from 'lucide-react';
import type { CharacterTrait } from '../types';
import { TRAIT_DESCRIPTIONS } from '../types';

interface TraitDetailModalProps {
  trait: CharacterTrait | null;
  habits: { id: string; title: string; linkedTraitId: string | null }[];
  quests: { id: string; title: string; linkedTraitIds: string[]; status: string }[];
  reflections: { id: string; whatLearned: string; linkedEntityType: string | null; linkedEntityId: string | null }[];
  ladders: { id: string; title: string; linkedTraitId: string | null; status: string }[];
  onClose: () => void;
  onEditTrait?: (id: string) => void;
}

export const TraitDetailModal: React.FC<TraitDetailModalProps> = ({
  trait, habits, quests, reflections, ladders, onClose, onEditTrait,
}) => {
  if (!trait) return null;

  const relatedHabits = habits.filter(h => h.linkedTraitId === trait.id);
  const relatedQuests = quests.filter(q => q.linkedTraitIds.includes(trait.id));
  const relatedReflections = reflections.filter(r =>
    r.linkedEntityType === 'trait' && r.linkedEntityId === trait.id,
  );
  const relatedLadders = ladders.filter(l => l.linkedTraitId === trait.id);
  const xpToNext = 100 - (trait.lifetimeXp % 100);
  const meaning = TRAIT_DESCRIPTIONS[trait.name] || trait.description;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '560px', maxHeight: '80vh', overflowY: 'auto', padding: '1.5rem' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Star size={24} className="text-cyan" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{trait.name}</h3>
              {onEditTrait && (
                <button className="glass-btn" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                  onClick={() => onEditTrait(trait.id)}>
                  <FileText size={10} /> Edit
                </button>
              )}
            </div>
          </div>
          <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontStyle: 'italic' }}>
          {meaning}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Level</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{trait.currentRank}</div>
          </div>
          <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Lifetime XP</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{trait.lifetimeXp}</div>
          </div>
          <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Score</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{trait.currentScore}</div>
          </div>
          <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Target</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{trait.targetScore}</div>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            <span>Progress to next level</span>
            <span>{xpToNext} XP remaining</span>
          </div>
          <div className="progress-bar" style={{ height: '6px' }}>
            <div className="progress-fill" style={{ width: `${((trait.lifetimeXp % 100) / 100) * 100}%` }} />
          </div>
        </div>

        {relatedHabits.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Activity size={12} /> Related Habits
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {relatedHabits.map(h => (
                <div key={h.id} className="glass-card" style={{ padding: '0.4rem 0.6rem', fontSize: '0.72rem' }}>
                  {h.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {relatedQuests.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Target size={12} /> Related Quests
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {relatedQuests.map(q => (
                <div key={q.id} className="glass-card" style={{ padding: '0.4rem 0.6rem', fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{q.title}</span>
                  <span style={{ color: q.status === 'completed' ? 'var(--accent-teal)' : 'var(--text-muted)' }}>{q.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {relatedLadders.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <TrendingUp size={12} /> Exposure Ladders
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {relatedLadders.map(l => (
                <div key={l.id} className="glass-card" style={{ padding: '0.4rem 0.6rem', fontSize: '0.72rem' }}>
                  {l.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {relatedReflections.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Lightbulb size={12} /> Evidence of Growth
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {relatedReflections.slice(0, 3).map(r => (
                <div key={r.id} className="glass-card" style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {r.whatLearned.slice(0, 120)}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: 'rgba(37, 99, 235, 0.08)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            <Lightbulb size={14} className="text-cyan" /> Suggested Next Action
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Identify one small action today that exercises {trait.name}. Even 2 minutes counts. Consistency builds the identity.
          </p>
        </div>
      </div>
    </div>
  );
};
