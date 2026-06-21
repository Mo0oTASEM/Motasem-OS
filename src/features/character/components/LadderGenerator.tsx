import React, { useState } from 'react';
import { Layers, X, Loader2, Check, Edit3, Save, Trash2 } from 'lucide-react';
import type { GeneratedLadder, LadderGenerationRequest } from '../services/characterCoachTypes';
import type { CharacterTrait } from '../types';
import type { CoachResult } from '../services/characterCoachClient';

interface LadderGeneratorProps {
  traits: CharacterTrait[];
  onGenerate: (req: LadderGenerationRequest) => Promise<CoachResult<{ ladder: GeneratedLadder; disclaimer?: string }>>;
  onApprove: (ladder: GeneratedLadder) => void;
  onSaveDraft: (ladder: GeneratedLadder) => void;
  onClose: () => void;
}

export const LadderGenerator: React.FC<LadderGeneratorProps> = ({ traits, onGenerate, onApprove, onSaveDraft, onClose }) => {
  const [desiredEndBehavior, setDesiredEndBehavior] = useState('');
  const [linkedTraitId, setLinkedTraitId] = useState(traits[0]?.id ?? '');
  const [linkedTraitName, setLinkedTraitName] = useState(traits[0]?.name ?? '');
  const [currentConfidence, setCurrentConfidence] = useState(5);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ladder: GeneratedLadder; disclaimer?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [edited, setEdited] = useState<GeneratedLadder | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await onGenerate({
      desiredEndBehavior, linkedTraitName, linkedTraitId: linkedTraitId || undefined,
      currentConfidence, context: context || undefined,
    });
    if (res.ok && res.data) {
      setResult(res.data);
      setEdited(res.data.ladder);
    } else {
      setError(res.error ?? 'Generation failed');
    }
    setLoading(false);
  };

  if (result && edited) {
    const display = editMode ? edited : result.ladder;
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: '560px', padding: '1.25rem', maxHeight: '80vh', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} className="text-cyan" />
              <strong>AI-Generated Ladder</strong>
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
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem' }}>{display.title}</h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{display.description}</p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                <strong>End goal:</strong> {display.desiredEndBehavior}
              </p>
              {display.safetyNotes && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-warning)', marginBottom: '0.75rem' }}>
                  <strong>Safety:</strong> {display.safetyNotes}
                </div>
              )}
              <strong style={{ fontSize: '0.72rem' }}>Steps ({display.steps.length}):</strong>
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {display.steps.map((step, i) => (
                  <div key={i} className="glass-panel" style={{ padding: '0.5rem 0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.72rem' }}>Step {i + 1}: {step.title}</strong>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                        Diff: {step.difficulty}/10 &middot; Reps: {step.repetitionTarget}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: '0.15rem 0' }}>{step.instructions}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input className="glass-input" style={{ padding: '0.4rem', fontSize: '0.78rem' }}
                value={edited.title} onChange={e => setEdited(p => p ? { ...p, title: e.target.value } : null)} placeholder="Title" />
              <textarea className="glass-input" style={{ padding: '0.4rem', fontSize: '0.72rem', minHeight: '40px' }}
                value={edited.description} onChange={e => setEdited(p => p ? { ...p, description: e.target.value } : null)} placeholder="Description" />
              {edited.steps.map((step, i) => (
                <div key={i} className="glass-panel" style={{ padding: '0.5rem' }}>
                  <strong style={{ fontSize: '0.65rem' }}>Step {i + 1}</strong>
                  <input className="glass-input" style={{ width: '100%', padding: '0.25rem', fontSize: '0.68rem', marginTop: '0.2rem' }}
                    value={step.title} onChange={e => {
                      const next = [...edited.steps];
                      next[i] = { ...next[i], title: e.target.value };
                      setEdited({ ...edited, steps: next });
                    }} placeholder="Title" />
                  <textarea className="glass-input" style={{ width: '100%', padding: '0.25rem', fontSize: '0.68rem', minHeight: '30px', marginTop: '0.2rem' }}
                    value={step.instructions} onChange={e => {
                      const next = [...edited.steps];
                      next[i] = { ...next[i], instructions: e.target.value };
                      setEdited({ ...edited, steps: next });
                    }} placeholder="Instructions" />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <input type="number" min="1" max="10" className="glass-input" style={{ padding: '0.25rem', fontSize: '0.6rem', width: '60px' }}
                      value={step.difficulty} onChange={e => {
                        const next = [...edited.steps];
                        next[i] = { ...next[i], difficulty: Number(e.target.value) };
                        setEdited({ ...edited, steps: next });
                      }} />
                    <input type="number" min="1" max="50" className="glass-input" style={{ padding: '0.25rem', fontSize: '0.6rem', width: '60px' }}
                      value={step.repetitionTarget} onChange={e => {
                        const next = [...edited.steps];
                        next[i] = { ...next[i], repetitionTarget: Number(e.target.value) };
                        setEdited({ ...edited, steps: next });
                      }} />
                  </div>
                </div>
              ))}
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
            <Layers size={18} className="text-cyan" />
            <strong>AI Ladder Generator</strong>
          </div>
          <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div>
            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Desired End Behavior *</label>
            <textarea className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem', minHeight: '50px' }}
              value={desiredEndBehavior} onChange={e => setDesiredEndBehavior(e.target.value)}
              placeholder="e.g. Hold a 5-minute conversation with a stranger" />
          </div>
          <div>
            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Linked Trait</label>
            <select className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
              value={linkedTraitId} onChange={e => {
                const t = traits.find(tr => tr.id === e.target.value);
                setLinkedTraitId(e.target.value);
                setLinkedTraitName(t?.name ?? '');
              }}>
              {traits.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Current Confidence (1-10)</label>
            <input type="number" min="1" max="10" className="glass-input" style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem' }}
              value={currentConfidence} onChange={e => setCurrentConfidence(Number(e.target.value))} />
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
            onClick={handleGenerate} disabled={loading || !desiredEndBehavior}>
            {loading ? <Loader2 size={12} className="spin" /> : <Layers size={12} />} Generate
          </button>
        </div>
      </div>
    </div>
  );
};
