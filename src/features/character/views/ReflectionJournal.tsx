import React, { useState } from 'react';
import { BookOpen, Search, Loader2, Lock, Brain, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import { EmptyState } from '../../../components/system/States';
import type { CharacterReflection } from '../types';
import type { ReflectionAnalysisRequest, ReflectionAnalysisResponse } from '../services/characterCoachTypes';
import type { CoachResult } from '../services/characterCoachClient';

interface ReflectionJournalProps {
  reflections: CharacterReflection[];
  onAddReflection: (reflection: Omit<CharacterReflection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateReflection: (id: string, updates: Partial<CharacterReflection>) => Promise<void>;
  onDeleteReflection: (id: string) => Promise<void>;
  saving?: boolean;
  onAnalyzeReflection?: (req: ReflectionAnalysisRequest) => Promise<CoachResult<ReflectionAnalysisResponse>>;
  brainContext: string;
}

export const ReflectionJournal: React.FC<ReflectionJournalProps> = ({
  reflections,
  onAddReflection,
  onUpdateReflection,
  onDeleteReflection,
  saving,
  onAnalyzeReflection,
  brainContext,
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [form, setForm] = useState({
    preActionFear: '',
    postActionResult: '',
    whatHappened: '',
    whatLearned: '',
    emotionalIntensityBefore: 5,
    emotionalIntensityAfter: 5,
    nextStep: '',
    privacySetting: 'private' as 'private' | 'shared' | 'public',
    aiSummaryStatus: 'pending' as 'pending' | 'completed' | 'failed',
    linkedEntityType: null as string | null,
    linkedEntityId: null as string | null,
  });

  const [analysisConsent, setAnalysisConsent] = useState<{
    reflectionId: string;
    preActionFear: string;
    whatHappened: string;
    whatLearned: string;
    intensityBefore: number;
    intensityAfter: number;
  } | null>(null);

  const [analysisResults, setAnalysisResults] = useState<Record<string, ReflectionAnalysisResponse>>({});
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const filtered = reflections.filter(r =>
    r.whatLearned?.toLowerCase().includes(search.toLowerCase()) ||
    r.whatHappened?.toLowerCase().includes(search.toLowerCase()) ||
    r.preActionFear?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    await onAddReflection(form);
    setShowCreate(false);
    resetForm();
  };

  const handleStartEdit = (r: CharacterReflection) => {
    setForm({
      preActionFear: r.preActionFear || '',
      postActionResult: r.postActionResult || '',
      whatHappened: r.whatHappened || '',
      whatLearned: r.whatLearned || '',
      emotionalIntensityBefore: r.emotionalIntensityBefore,
      emotionalIntensityAfter: r.emotionalIntensityAfter,
      nextStep: r.nextStep || '',
      privacySetting: r.privacySetting,
      aiSummaryStatus: r.aiSummaryStatus,
      linkedEntityType: r.linkedEntityType,
      linkedEntityId: r.linkedEntityId,
    });
    setEditingId(r.id);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    await onUpdateReflection(editingId, form);
    setEditingId(null);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this reflection permanently?')) {
      await onDeleteReflection(id);
    }
  };

  const resetForm = () => {
    setForm({
      preActionFear: '',
      postActionResult: '',
      whatHappened: '',
      whatLearned: '',
      emotionalIntensityBefore: 5,
      emotionalIntensityAfter: 5,
      nextStep: '',
      privacySetting: 'private',
      aiSummaryStatus: 'pending',
      linkedEntityType: null,
      linkedEntityId: null,
    });
  };

  const handleAnalyze = async () => {
    if (!analysisConsent || !onAnalyzeReflection) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    const res = await onAnalyzeReflection({
      reflectionText: {
        preActionFear: analysisConsent.preActionFear || undefined,
        whatHappened: analysisConsent.whatHappened,
        whatLearned: analysisConsent.whatLearned || undefined,
        emotionalIntensityBefore: analysisConsent.intensityBefore,
        emotionalIntensityAfter: analysisConsent.intensityAfter,
      },
      consentGiven: true,
      characterContext: brainContext || undefined,
    });
    if (res.ok && res.data) {
      setAnalysisResults(prev => ({ ...prev, [analysisConsent.reflectionId]: res.data! }));
    } else {
      setAnalysisError(res.error ?? 'Analysis failed');
    }
    setAnalysisLoading(false);
    setAnalysisConsent(null);
  };

  return (
    <div>
      <Panel title="Reflection Journal" icon={BookOpen} className="os-span-4">
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Capture and review what you learned from experiences, fears, and hurdles. 
          Use reflections to build self-awareness and track identity alignment.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              className="glass-input" 
              style={{ width: '100%', padding: '0.45rem 0.45rem 0.45rem 2rem', fontSize: '0.78rem' }}
              placeholder="Search reflections..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <button 
            className="glass-btn btn-cyan" 
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={() => { resetForm(); setShowCreate(true); setEditingId(null); }}
          >
            <BookOpen size={14} /> New Reflection
          </button>
        </div>

        {/* ── AI Analysis Consent modal ── */}
        {analysisConsent && (
          <div className="modal-overlay" onClick={() => setAnalysisConsent(null)}>
            <div className="modal-content" style={{ maxWidth: '480px', padding: '1.25rem' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Brain size={18} className="text-cyan" />
                <strong>Request AI Reflection Analysis</strong>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                The AI Coach will analyze this reflection to detect cognitive biases, identify triggers, and suggest adjustments. 
                Your text will be sent to the AI provider. You can delete the analysis at any time.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="glass-btn" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem' }} onClick={() => setAnalysisConsent(null)}>
                  Cancel
                </button>
                <button className="glass-btn btn-cyan" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }} onClick={handleAnalyze} disabled={analysisLoading}>
                  {analysisLoading && <Loader2 size={12} className="spin" />}
                  I Consent & Analyze
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Create / Edit Form panel ── */}
        {(showCreate || editingId) && (
          <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--accent-purple)' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--accent-purple)' }}>
              {editingId ? 'Edit Reflection' : 'Write a New Reflection'}
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label className="field-label" style={{ fontSize: '0.65rem' }}>What was I avoiding or feeling resistance toward?</label>
                <textarea 
                  className="glass-input" 
                  style={{ width: '100%', minHeight: '50px', padding: '0.45rem', fontSize: '0.78rem' }}
                  value={form.preActionFear} 
                  onChange={e => setForm(p => ({ ...p, preActionFear: e.target.value }))} 
                  placeholder="e.g. Making cold calls, starting the tough project..."
                />
              </div>

              <div>
                <label className="field-label" style={{ fontSize: '0.65rem' }}>What did I think would happen? (Prediction)</label>
                <textarea 
                  className="glass-input" 
                  style={{ width: '100%', minHeight: '50px', padding: '0.45rem', fontSize: '0.78rem' }}
                  value={form.postActionResult} 
                  onChange={e => setForm(p => ({ ...p, postActionResult: e.target.value }))}
                  placeholder="e.g. They will reject me, it will fail..."
                />
              </div>

              <div>
                <label className="field-label" style={{ fontSize: '0.65rem' }}>What actually happened? (Reality) *</label>
                <textarea 
                  className="glass-input" 
                  style={{ width: '100%', minHeight: '50px', padding: '0.45rem', fontSize: '0.78rem' }}
                  value={form.whatHappened} 
                  onChange={e => setForm(p => ({ ...p, whatHappened: e.target.value }))}
                  placeholder="e.g. I did it, it took 5 minutes, they were polite..."
                />
              </div>

              <div>
                <label className="field-label" style={{ fontSize: '0.65rem' }}>What did I learn from this? *</label>
                <textarea 
                  className="glass-input" 
                  style={{ width: '100%', minHeight: '50px', padding: '0.45rem', fontSize: '0.78rem' }}
                  value={form.whatLearned} 
                  onChange={e => setForm(p => ({ ...p, whatLearned: e.target.value }))}
                  placeholder="e.g. Fear is usually worse than reality. I can handle discomfort."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label" style={{ fontSize: '0.65rem' }}>Fear Before (1-10): {form.emotionalIntensityBefore}</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    style={{ width: '100%' }}
                    value={form.emotionalIntensityBefore}
                    onChange={e => setForm(p => ({ ...p, emotionalIntensityBefore: Number(e.target.value) }))} 
                  />
                </div>
                <div>
                  <label className="field-label" style={{ fontSize: '0.65rem' }}>Fear After (1-10): {form.emotionalIntensityAfter}</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    style={{ width: '100%' }}
                    value={form.emotionalIntensityAfter}
                    onChange={e => setForm(p => ({ ...p, emotionalIntensityAfter: Number(e.target.value) }))} 
                  />
                </div>
                <div>
                  <label className="field-label" style={{ fontSize: '0.65rem' }}>Privacy</label>
                  <select 
                    className="glass-input" 
                    style={{ width: '100%', padding: '0.4rem', fontSize: '0.72rem', background: 'var(--panel-bg)' }}
                    value={form.privacySetting} 
                    onChange={e => setForm(p => ({ ...p, privacySetting: e.target.value as 'private' | 'shared' | 'public' }))}
                  >
                    <option value="private">Private</option>
                    <option value="shared">Coach Shared</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="field-label" style={{ fontSize: '0.65rem' }}>Next Step (Actionable adjustment)</label>
                <input 
                  className="glass-input" 
                  style={{ width: '100%', padding: '0.45rem', fontSize: '0.78rem' }}
                  value={form.nextStep} 
                  onChange={e => setForm(p => ({ ...p, nextStep: e.target.value }))}
                  placeholder="e.g. Schedule next call block tomorrow at 9 AM"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'flex-end', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
              <button 
                className="glass-btn" 
                onClick={() => { setShowCreate(false); setEditingId(null); }}
              >
                Cancel
              </button>
              <button 
                className="glass-btn btn-cyan" 
                onClick={editingId ? handleUpdate : handleCreate} 
                disabled={saving || !form.whatHappened || !form.whatLearned}
              >
                {saving && <Loader2 size={12} className="spin" />}
                {editingId ? 'Save Changes' : 'Save Reflection'}
              </button>
            </div>
          </div>
        )}

        {analysisError && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-danger)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <AlertTriangle size={12} /> {analysisError}
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState title="No reflections found" message="Write a reflection to track your cognitive gains." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(r => {
              const analysis = analysisResults[r.id];
              const isAnalyzing = analysisLoading && analysisConsent?.reflectionId === r.id;
              
              return (
                <div 
                  key={r.id} 
                  className="glass-card" 
                  style={{ 
                    padding: '1rem', 
                    borderLeft: '3px solid var(--accent-purple)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      {r.privacySetting === 'private' && <Lock size={10} className="text-muted" />}
                      <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)', fontSize: '0.6rem' }}>
                        Fear: {r.emotionalIntensityBefore} &rarr; {r.emotionalIntensityAfter}
                      </span>
                      {analysis && <span className="badge badge-cyan" style={{ fontSize: '0.55rem' }}>AI Analyzed</span>}
                    </div>
                  </div>

                  {r.preActionFear && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <strong style={{ color: 'var(--accent-purple)' }}>Avoiding:</strong> {r.preActionFear}
                    </div>
                  )}

                  <div style={{ fontSize: '0.78rem' }}>
                    <strong style={{ color: 'var(--accent-teal)' }}>Learned:</strong> {r.whatLearned}
                  </div>

                  {r.whatHappened && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      <strong>Happened:</strong> {r.whatHappened}
                    </div>
                  )}

                  {r.nextStep && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)' }}>
                      <strong style={{ color: 'var(--accent-cyan)' }}>Next Action:</strong> {r.nextStep}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.5rem' }}>
                    {onAnalyzeReflection && !analysis && (
                      <button 
                        className="glass-btn btn-cyan" 
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        onClick={() => setAnalysisConsent({
                          reflectionId: r.id,
                          preActionFear: r.preActionFear ?? '',
                          whatHappened: r.whatHappened ?? '',
                          whatLearned: r.whatLearned ?? '',
                          intensityBefore: r.emotionalIntensityBefore,
                          intensityAfter: r.emotionalIntensityAfter,
                        })} 
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? <Loader2 size={10} className="spin" /> : <Brain size={10} />}
                        AI Analyze
                      </button>
                    )}
                    
                    <button 
                      className="glass-btn" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: 'auto' }}
                      onClick={() => handleStartEdit(r)}
                    >
                      <Edit2 size={10} /> Edit
                    </button>
                    
                    <button 
                      className="glass-btn" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-danger)' }}
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 size={10} /> Delete
                    </button>
                  </div>

                  {analysis && (
                    <div className="glass-panel" style={{ padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.72rem', border: '1px dashed var(--accent-cyan)' }}>
                      <h5 style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Brain size={12} /> AI Analysis Results
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <p style={{ margin: 0 }}><strong>Cognitive Pattern:</strong> {analysis.cognitiveDistortion || 'None detected'}</p>
                        <p style={{ margin: 0 }}><strong>Pattern:</strong> {analysis.avoidancePattern}</p>
                        <p style={{ margin: 0 }}><strong>Suggested Action:</strong> {analysis.suggestedNextBehavior}</p>
                        {analysis.suggestedIfThenRule && (
                          <p style={{ margin: 0 }}>
                            <strong>If-Then suggestion:</strong> IF "{analysis.suggestedIfThenRule.trigger}", THEN "{analysis.suggestedIfThenRule.action}"
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
};
