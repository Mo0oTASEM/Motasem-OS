import React, { useState } from 'react';
import { Sparkles, X, Loader2, Check, Edit3, Save, Trash2 } from 'lucide-react';
import type { GeneratedQuest, QuestGenerationRequest } from '../services/characterCoachTypes';
import type { CharacterTrait } from '../types';
import type { CoachResult } from '../services/characterCoachClient';

interface QuestGeneratorProps {
  traits: CharacterTrait[];
  onGenerate: (req: QuestGenerationRequest) => Promise<CoachResult<{ quest: GeneratedQuest; disclaimer?: string }>>;
  onApprove: (quest: GeneratedQuest) => void;
  onSaveDraft: (quest: GeneratedQuest) => void;
  onClose: () => void;
}

export const QuestGenerator: React.FC<QuestGeneratorProps> = ({ traits, onGenerate, onApprove, onSaveDraft, onClose }) => {
  const [traitName, setTraitName] = useState(traits[0]?.name ?? '');
  const [traitId, setTraitId] = useState(traits[0]?.id ?? '');
  const [availableMinutes, setAvailableMinutes] = useState(15);
  const [preferredDifficulty, setPreferredDifficulty] = useState(5);
  const [currentConfidence, setCurrentConfidence] = useState(5);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ quest: GeneratedQuest; disclaimer?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [edited, setEdited] = useState<GeneratedQuest | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await onGenerate({
      traitName, traitId: traitId || undefined,
      availableMinutes, preferredDifficulty, currentConfidence,
      context: context || undefined,
      locationType: 'other',
      privacyPreference: 'private',
    });
    if (res.ok && res.data) {
      setResult(res.data);
      setEdited(res.data.quest);
    } else {
      setError(res.error ?? 'Generation failed');
    }
    setLoading(false);
  };

  if (result && edited) {
    const display = editMode ? edited : result.quest;
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: '560px', padding: '1.25rem', maxHeight: '80vh', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} className="text-cyan" />
              <strong>AI-Generated Quest</strong>
            </div>
            <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          {result.disclaimer && (
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
              {result.disclaimer}
            </div>
          )}

          {!editMode ? (
            <>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>{display.title}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{display.purpose}</p>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                <span>Difficulty: {display.difficulty}/10</span>
                <span>Discomfort: {display.discomfort}/10</span>
                <span>XP: {display.rewardXp}</span>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ fontSize: '0.72rem' }}>Steps:</strong>
                <ol style={{ fontSize: '0.72rem', margin: '0.25rem 0', paddingLeft: '1.25rem', color: 'var(--text-secondary)' }}>
                  {display.steps.map((step, i) => (
                    <li key={i} style={{ marginBottom: '0.2rem' }}>{step}</li>
                  ))}
                </ol>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <strong>Success:</strong> {display.successDefinition}
              </div>
              {display.safetyOrRespectNotes && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-warning)', marginBottom: '0.5rem' }}>
                  <strong>Safety:</strong> {display.safetyOrRespectNotes}
                </div>
              )}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <strong>Reflection:</strong> {display.reflectionQuestion}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                <div><strong>Easier:</strong> {display.easierFallback}</div>
                <div><strong>Harder:</strong> {display.harderNext}</div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                <strong>Why it matters:</strong> {display.whyItMatters}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input className="glass-input" style={{ padding: '0.4rem', fontSize: '0.78rem' }}
                value={edited.title} onChange={e => setEdited(p => p ? { ...p, title: e.target.value } : null)} placeholder="Title" />
              <textarea className="glass-input" style={{ padding: '0.4rem', fontSize: '0.72rem', minHeight: '50px' }}
                value={edited.purpose} onChange={e => setEdited(p => p ? { ...p, purpose: e.target.value } : null)} placeholder="Purpose" />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input type="number" min="1" max="10" className="glass-input" style={{ padding: '0.4rem', fontSize: '0.72rem', width: '100px' }}
                  value={edited.difficulty} onChange={e => setEdited(p => p ? { ...p, difficulty: Number(e.target.value) } : null)} placeholder="Difficulty" />
                <input type="number" className="glass-input" style={{ padding: '0.4rem', fontSize: '0.72rem', width: '100px' }}
                  value={edited.rewardXp} onChange={e => setEdited(p => p ? { ...p, rewardXp: Number(e.target.value) } : null)} placeholder="XP" />
              </div>
              <textarea className="glass-input" style={{ padding: '0.4rem', fontSize: '0.72rem', minHeight: '30px' }}
                value={edited.successDefinition} onChange={e => setEdited(p => p ? { ...p, successDefinition: e.target.value } : null)} placeholder="Success definition" />
              <textarea className="glass-input" style={{ padding: '0.4rem', fontSize: '0.72rem', minHeight: '50px' }}
                value={edited.whyItMatters} onChange={e => setEdited(p => p ? { ...p, whyItMatters: e.target.value } : null)} placeholder="Why it matters" />
              <div>
                <strong style={{ fontSize: '0.68rem' }}>Steps (one per line):</strong>
                <textarea className="glass-input" style={{ width: '100%', padding: '0.4rem', fontSize: '0.72rem', minHeight: '60px' }}
                  value={edited.steps.join('\n')}
                  onChange={e => setEdited(p => p ? { ...p, steps: e.target.value.split('\n').filter(Boolean) } : null)} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button className="glass-btn" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem' }}
              onClick={() => setEditMode(!editMode)}>
              <Edit3 size={12} /> {editMode ? 'Preview' : 'Edit'}
            </button>
            <button className="glass-btn" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem' }}
              onClick={() => { onSaveDraft(edited!); onClose(); }}>
              <Save size={12} /> Save Draft
            </button>
            <button className="glass-btn btn-cyan" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem' }}
              onClick={() => { onApprove(edited!); onClose(); }}>
              <Check size={12} /> Approve & Create
            </button>
            <button className="glass-btn" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem', color: 'var(--text-danger)' }}
              onClick={onClose}>
              <Trash2 size={12} /> Reject
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px', padding: '1.25rem' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} className="text-cyan" />
            <strong>AI Quest Generator</strong>
          </div>
          <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div>
            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Trait</label>
            <select className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
              value={traitId} onChange={e => {
                const t = traits.find(tr => tr.id === e.target.value);
                setTraitId(e.target.value);
                setTraitName(t?.name ?? '');
              }}>
              {traits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Available Minutes</label>
            <input type="number" min="1" max="480" className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
              value={availableMinutes} onChange={e => setAvailableMinutes(Number(e.target.value))} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Preferred Difficulty (1-10)</label>
              <input type="number" min="1" max="10" className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                value={preferredDifficulty} onChange={e => setPreferredDifficulty(Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Current Confidence (1-10)</label>
              <input type="number" min="1" max="10" className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
                value={currentConfidence} onChange={e => setCurrentConfidence(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Context (optional)</label>
            <textarea className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem', minHeight: '50px' }}
              value={context} onChange={e => setContext(e.target.value)} placeholder="Any additional context for the AI..." />
          </div>
        </div>

        {error && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-danger)', marginTop: '0.75rem' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="glass-btn" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem' }} onClick={onClose}>Cancel</button>
          <button className="glass-btn btn-cyan" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem' }}
            onClick={handleGenerate} disabled={loading || !traitName}>
            {loading ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} Generate
          </button>
        </div>
      </div>
    </div>
  );
};
