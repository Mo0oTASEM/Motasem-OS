import React, { useState } from 'react';
import { Footprints, Plus, Search, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import { EmptyState } from '../../../components/system/States';
import { ExposureStepCard } from '../components/ExposureStepCard';
import { LadderGenerator } from '../components/LadderGenerator';
import type { ExposureLadder, ExposureStep, CharacterTrait } from '../types';
import type { LadderGenerationRequest, GeneratedLadder } from '../services/characterCoachTypes';
import type { CoachResult } from '../services/characterCoachClient';

interface ExposureLaddersViewProps {
  ladders: ExposureLadder[];
  traits: CharacterTrait[];
  onAddLadder: (ladder: Omit<ExposureLadder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDeleteLadder: (id: string) => Promise<void>;
  onCompleteStep?: (stepId: string) => Promise<void>;
  saving?: boolean;
  onGenerateLadder?: (req: LadderGenerationRequest) => Promise<CoachResult<{ ladder: GeneratedLadder; disclaimer?: string }>>;
}

const LADDER_TEMPLATES = [
  { title: 'Start Conversations', description: 'Build confidence in everyday social interactions', desiredEndBehavior: 'Comfortably initiate conversations with strangers' },
  { title: 'Sell Confidently', description: 'Overcome sales anxiety and pitch with conviction', desiredEndBehavior: 'Make sales calls and presentations without avoidance' },
  { title: 'Publish Content', description: 'Share your ideas publicly despite fear of judgment', desiredEndBehavior: 'Regularly publish content on your chosen platform' },
  { title: 'Speak in Groups', description: 'Express your thoughts in meetings and group settings', desiredEndBehavior: 'Speak up confidently in group discussions' },
  { title: 'Express Opinions', description: 'State your views honestly even when they differ', desiredEndBehavior: 'Share dissenting opinions respectfully' },
  { title: 'Handle Rejection', description: 'Build resilience to hearing no', desiredEndBehavior: 'Accept rejection as data, not personal failure' },
  { title: 'Ask for Help', description: 'Overcome the fear of burdening others', desiredEndBehavior: 'Ask for support when you need it' },
  { title: 'Set Boundaries', description: 'Protect your time and energy', desiredEndBehavior: 'Say no without guilt or over-explanation' },
];

export const ExposureLaddersView: React.FC<ExposureLaddersViewProps> = ({
  ladders, traits, onAddLadder, onDeleteLadder, onCompleteStep, saving, onGenerateLadder,
}) => {
  const [search, setSearch] = useState('');
  const [expandedLadder, setExpandedLadder] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  const filtered = ladders.filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreateFromTemplate = async (template: typeof LADDER_TEMPLATES[number]) => {
    const sampleSteps: Omit<ExposureStep, 'id' | 'ladderId' | 'createdAt' | 'updatedAt'>[] = [
      { stepOrder: 1, title: 'Mild exposure', instructions: 'Do the easiest version', difficulty: 2, discomfortEstimate: 3, repetitionTarget: 3, successfulRepetitions: 0, reflectionRequired: false, proofRequired: false, status: 'available' },
      { stepOrder: 2, title: 'Moderate exposure', instructions: 'Increase the challenge', difficulty: 4, discomfortEstimate: 5, repetitionTarget: 3, successfulRepetitions: 0, reflectionRequired: true, proofRequired: false, status: 'locked' },
      { stepOrder: 3, title: 'Strong exposure', instructions: 'Push your comfort zone', difficulty: 6, discomfortEstimate: 7, repetitionTarget: 3, successfulRepetitions: 0, reflectionRequired: true, proofRequired: true, status: 'locked' },
    ];
    await onAddLadder({
      title: template.title, description: template.description,
      linkedTraitId: null, desiredEndBehavior: template.desiredEndBehavior,
      status: 'active', currentStep: 0, completionPercentage: 0,
      difficultyPolicy: 'graduated', aiAdaptationEnabled: true,
      steps: sampleSteps.map(s => ({ ...s, id: crypto.randomUUID() ?? '', ladderId: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })),
    });
    setShowCreate(false);
  };

  return (
    <div>
      <Panel title="Exposure Ladders" icon={Footprints} className="os-span-4">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="glass-input" style={{ width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.8rem', fontSize: '0.72rem' }}
              placeholder="Search ladders..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="glass-btn" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onClick={() => setShowGenerator(true)} disabled={!onGenerateLadder}>
            <Sparkles size={14} /> AI Generate
          </button>
          <button className="glass-btn btn-cyan" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Add Ladder
          </button>
        </div>

        {showCreate && (
          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>Choose a Ladder Template</h4>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {LADDER_TEMPLATES.filter(t => !ladders.some(l => l.title === t.title)).map(t => (
                <button key={t.title} className="glass-btn" style={{ padding: '0.4rem 0.6rem', fontSize: '0.68rem', textAlign: 'left', maxWidth: '200px' }}
                  onClick={() => handleCreateFromTemplate(t)} disabled={saving}>
                  <strong style={{ display: 'block', fontSize: '0.72rem' }}>{t.title}</strong>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{t.description}</span>
                </button>
              ))}
            </div>
            <button className="glass-btn" style={{ marginTop: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
              onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        )}

        {showGenerator && onGenerateLadder && (
          <LadderGenerator
            traits={traits}
            onGenerate={onGenerateLadder}
            onApprove={(generated) => {
              onAddLadder({
                title: generated.title, description: generated.description,
                linkedTraitId: null, desiredEndBehavior: generated.desiredEndBehavior,
                status: 'active', currentStep: 0, completionPercentage: 0,
                difficultyPolicy: 'graduated', aiAdaptationEnabled: true,
                steps: generated.steps.map((s, i) => ({
                  id: crypto.randomUUID() ?? '',
                  ladderId: '', stepOrder: i + 1,
                  title: s.title, instructions: s.instructions,
                  difficulty: s.difficulty, discomfortEstimate: s.discomfortEstimate,
                  repetitionTarget: s.repetitionTarget,
                  successfulRepetitions: 0,
                  reflectionRequired: s.reflectionRequired, proofRequired: false,
                  status: i === 0 ? 'available' : 'locked',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })),
              });
            }}
            onSaveDraft={(generated) => {
              onAddLadder({
                title: generated.title, description: generated.description,
                linkedTraitId: null, desiredEndBehavior: generated.desiredEndBehavior,
                status: 'paused', currentStep: 0, completionPercentage: 0,
                difficultyPolicy: 'graduated', aiAdaptationEnabled: false,
                steps: generated.steps.map((s, i) => ({
                  id: crypto.randomUUID() ?? '',
                  ladderId: '', stepOrder: i + 1,
                  title: s.title, instructions: s.instructions,
                  difficulty: s.difficulty, discomfortEstimate: s.discomfortEstimate,
                  repetitionTarget: s.repetitionTarget,
                  successfulRepetitions: 0,
                  reflectionRequired: s.reflectionRequired, proofRequired: false,
                  status: i === 0 ? 'available' : 'locked',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })),
              });
            }}
            onClose={() => setShowGenerator(false)}
          />
        )}
        {filtered.length === 0 ? (
          <EmptyState title="No ladders" message="Create exposure ladders to build courage step by step." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map(ladder => {
              const isExpanded = expandedLadder === ladder.id;
              const completedSteps = ladder.steps.filter(s => s.status === 'completed').length;
              const totalSteps = ladder.steps.length;
              return (
                <div key={ladder.id} className="glass-panel" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Footprints size={18} className="text-cyan" />
                        <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{ladder.title}</h4>
                        <span className="badge badge-cyan" style={{ fontSize: '0.6rem' }}>{completedSteps}/{totalSteps}</span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>{ladder.description}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                        Progress: {ladder.completionPercentage}%
                      </span>
                      <button className="glass-btn" style={{ padding: '0.2rem' }}
                        onClick={() => setExpandedLadder(isExpanded ? null : ladder.id)}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button className="glass-btn" style={{ padding: '0.2rem 0.4rem', fontSize: '0.6rem' }}
                        onClick={() => onDeleteLadder(ladder.id)}>Del</button>
                    </div>
                  </div>
                  <div className="progress-bar" style={{ height: '4px', marginBottom: '0.5rem' }}>
                    <div className="progress-fill" style={{ width: `${ladder.completionPercentage}%` }} />
                  </div>
                  {ladder.desiredEndBehavior && (
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                      Goal: {ladder.desiredEndBehavior}
                    </p>
                  )}
                  {isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {ladder.steps
                        .slice()
                        .sort((a, b) => a.stepOrder - b.stepOrder)
                        .map((step, idx) => (
                          <ExposureStepCard
                            key={step.id}
                            step={step}
                            stepIndex={idx}
                            onAttempt={onCompleteStep}
                            onLogResult={(stepId, succeeded) => {
                              if (succeeded) onCompleteStep?.(stepId);
                            }}
                            saving={saving}
                          />
                        ))}
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
