import React, { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import type { MonthlyPlanWithOutcomes } from '../types';

interface Props {
  plan: MonthlyPlanWithOutcomes;
  onComplete: () => void;
}

const STEPS = [
  {
    id: 'review',
    title: 'Review Last Month',
    description: 'What went well? What didn\'t? What\'s carrying over?',
    prompt: 'Reflect on outcomes from last month before planning forward.'
  },
  {
    id: 'goals',
    title: 'Connect to Quarterly Goals',
    description: 'Check your Q-goals and decide what this month should move.',
    prompt: 'Identify which quarterly goals need momentum this month.'
  },
  {
    id: 'outcomes',
    title: 'Define Monthly Outcomes',
    description: 'What are the 3-5 concrete outcomes for this month?',
    prompt: 'Write each outcome as a result, not a task.'
  },
  {
    id: 'capacity',
    title: 'Capacity Check',
    description: 'How many hours do you realistically have this month?',
    prompt: 'Account for holidays, meetings, and personal commitments.'
  },
  {
    id: 'risks',
    title: 'Identify Risks',
    description: 'What could derail this month? How will you handle it?',
    prompt: 'Name the top 1-3 threats and your response.'
  },
  {
    id: 'commit',
    title: 'Commit & Activate',
    description: 'Review your plan and lock it in.',
    prompt: 'Once activated, your plan becomes your contract for this month.'
  }
];

export const MonthlyRitualStepper: React.FC<Props> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepNotes, setStepNotes] = useState<Record<string, string>>({});

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  return (
    <div className="planner-ritual-stepper glass-panel">
      <div className="planner-ritual-header">
        <h3>Monthly Planning Ritual</h3>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Step {currentStep + 1} of {STEPS.length}</span>
      </div>

      {/* Steps track */}
      <div className="planner-stepper-track">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            className={`planner-step-dot ${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}`}
            onClick={() => setCurrentStep(i)}
            title={s.title}
            type="button"
          >
            {i < currentStep ? <Check size={10} /> : <span>{i + 1}</span>}
          </button>
        ))}
      </div>

      {/* Active Step Content */}
      <div className="planner-ritual-step-content">
        <h4>{step.title}</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          {step.description}
        </p>
        <div style={{ background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.1)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
          💡 {step.prompt}
        </div>
        <textarea
          className="glass-input"
          value={stepNotes[step.id] ?? ''}
          onChange={e => setStepNotes(prev => ({ ...prev, [step.id]: e.target.value }))}
          placeholder={`Your notes for "${step.title}"…`}
          style={{ minHeight: '100px', resize: 'vertical', width: '100%' }}
        />
      </div>

      <div className="planner-ritual-actions">
        {currentStep > 0 && (
          <button className="glass-btn" type="button" onClick={handleBack}>Back</button>
        )}
        <button
          className={`glass-btn ${isLast ? 'btn-cyan' : ''}`}
          type="button"
          onClick={handleNext}
          style={{ marginLeft: 'auto' }}
        >
          {isLast ? 'Activate Plan' : 'Next'}
          {!isLast && <ArrowRight size={14} />}
          {isLast && <Check size={14} />}
        </button>
      </div>
    </div>
  );
};
