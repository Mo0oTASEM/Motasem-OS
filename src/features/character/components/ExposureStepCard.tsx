import React from 'react';
import { Footprints, CheckCircle2, Lock, Play, Repeat, ChevronRight, Loader2 } from 'lucide-react';
import type { ExposureStep } from '../types';
import { DifficultyBadge } from './DifficultyBadge';

interface ExposureStepCardProps {
  step: ExposureStep;
  stepIndex: number;
  onAttempt?: (stepId: string) => void;
  onLogResult?: (stepId: string, succeeded: boolean) => void;
  onRepeat?: (stepId: string) => void;
  saving?: boolean;
}

export const ExposureStepCard: React.FC<ExposureStepCardProps> = ({
  step, stepIndex, onAttempt, onLogResult, onRepeat, saving,
}) => {
  const isLocked = step.status === 'locked';
  const isCompleted = step.status === 'completed';
  const isAvailable = step.status === 'available' || step.status === 'in_progress';

  if (isLocked) {
    return (
      <div className="glass-card" style={{ padding: '0.85rem', opacity: 0.4, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Lock size={16} className="text-muted" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Step {stepIndex + 1}</div>
          <div style={{ fontSize: '0.82rem' }}>{step.title}</div>
        </div>
        <DifficultyBadge difficulty={step.difficulty} />
      </div>
    );
  }

  const repsDone = step.successfulRepetitions;
  const repsTarget = step.repetitionTarget;
  const progress = repsTarget > 0 ? Math.min(100, Math.round((repsDone / repsTarget) * 100)) : 0;

  return (
    <div className="glass-card" style={{
      padding: '0.85rem',
      borderLeft: `3px solid ${isCompleted ? 'var(--accent-teal)' : 'var(--accent-cyan)'}`,
      opacity: isCompleted ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ flexShrink: 0, marginTop: '0.1rem' }}>
          {isCompleted ? (
            <CheckCircle2 size={18} className="text-teal" />
          ) : (
            <Footprints size={18} className="text-cyan" />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
            <div>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Step {stepIndex + 1}</span>
              <strong style={{ fontSize: '0.82rem', marginLeft: '0.35rem' }}>{step.title}</strong>
            </div>
            <DifficultyBadge difficulty={step.difficulty} />
          </div>

          {step.instructions && (
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', lineHeight: 1.4 }}>
              {step.instructions}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            <span>Reps: {repsDone}/{repsTarget}</span>
            <span>Discomfort: {step.discomfortEstimate}/10</span>
            {step.reflectionRequired && <span>Reflection required</span>}
            {step.proofRequired && <span>Proof required</span>}
          </div>

          <div className="progress-bar" style={{ height: '4px', marginBottom: '0.5rem' }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {isAvailable && onAttempt && (
              <button className="glass-btn btn-cyan"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                onClick={() => onAttempt(step.id)} disabled={saving}>
                {saving ? <Loader2 size={12} className="spin" /> : <Play size={12} />}
                Attempt
              </button>
            )}
            {isAvailable && onLogResult && (
              <>
                <button className="glass-btn"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
                  onClick={() => onLogResult(step.id, true)} disabled={saving}>
                  <CheckCircle2 size={12} /> Log Success
                </button>
                <button className="glass-btn"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
                  onClick={() => onLogResult(step.id, false)} disabled={saving}>
                  <Repeat size={12} /> Try Again
                </button>
              </>
            )}
            {isCompleted && onRepeat && (
              <button className="glass-btn"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                onClick={() => onRepeat(step.id)}>
                <Repeat size={12} /> Repeat
              </button>
            )}
          </div>
        </div>
        {!isCompleted && stepIndex < 10 && (
          <ChevronRight size={14} className="text-muted" style={{ flexShrink: 0 }} />
        )}
      </div>
    </div>
  );
};
