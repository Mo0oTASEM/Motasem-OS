import React, { useState } from 'react';
import { Rocket, Target, Swords, ChevronRight, ChevronLeft, Loader2, Check, Sparkles } from 'lucide-react';
import { DEFAULT_TRAIT_NAMES } from '../types';

interface OnboardingFlowProps {
  onComplete: () => void;
  loading?: boolean;
}

const STEPS = [
  {
    title: 'Welcome',
    icon: Rocket,
    description: 'Your character development engine helps you build identity-based discipline, courage, and emotional mastery. We will set up starter traits, habits, and tools — you can customize everything afterward.',
  },
  {
    title: 'Choose Focus',
    icon: Target,
    description: 'Select 3-5 traits to focus on. These represent the core areas of growth you want to develop.',
  },
  {
    title: 'Identify Challenges',
    icon: Swords,
    description: 'What kinds of challenges do you want to take on? You can create specific exposure ladders later.',
  },
  {
    title: 'Review & Launch',
    icon: Sparkles,
    description: 'Review your selections and launch your character system. You can always adjust later.',
  },
];

const CHALLENGE_OPTIONS = [
  'Start Conversations',
  'Handle Rejection',
  'Public Speaking',
  'Set Boundaries',
  'Sell & Negotiate',
  'Lead Meetings',
  'Share Vulnerably',
  'Take Physical Risks',
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, loading }) => {
  const [step, setStep] = useState(0);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);

  const toggleTrait = (name: string) => {
    setSelectedTraits(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : prev.length < 6 ? [...prev, name] : prev,
    );
  };

  const toggleChallenge = (name: string) => {
    setSelectedChallenges(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name],
    );
  };

  const canAdvance = () => {
    if (step === 1) return selectedTraits.length >= 3;
    return true;
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '560px', margin: '0 auto', padding: '2rem' }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            width: i <= step ? '28px' : '8px', height: '8px', borderRadius: '4px',
            background: i <= step ? 'var(--accent-cyan)' : 'var(--text-muted)',
            opacity: i <= step ? 1 : 0.4, transition: 'all 0.3s',
          }} />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {React.createElement(STEPS[step].icon, { size: 36, style: { color: 'var(--accent-cyan)' } })}
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{STEPS[step].title}</h3>
        <p className="os-readable" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', maxWidth: '420px' }}>
          {STEPS[step].description}
        </p>
      </div>

      {/* Step content */}
      {step === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          {DEFAULT_TRAIT_NAMES.map(name => (
            <button key={name} style={{
              padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', border: '1px solid',
              borderColor: selectedTraits.includes(name) ? 'var(--accent-cyan)' : 'var(--panel-border)',
              background: selectedTraits.includes(name) ? 'rgba(6,182,212,0.12)' : 'transparent',
              color: selectedTraits.includes(name) ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
            }}
              onClick={() => toggleTrait(name)}>
              <div style={{ fontWeight: 600 }}>{name}</div>
              <div style={{ fontSize: '0.6rem', marginTop: '0.15rem', opacity: 0.7 }}>
                {selectedTraits.includes(name) ? 'Selected' : 'Click to add'}
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          {CHALLENGE_OPTIONS.map(name => (
            <button key={name} style={{
              padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', border: '1px solid',
              borderColor: selectedChallenges.includes(name) ? 'var(--accent-purple)' : 'var(--panel-border)',
              background: selectedChallenges.includes(name) ? 'rgba(168,85,247,0.12)' : 'transparent',
              color: selectedChallenges.includes(name) ? 'var(--accent-purple)' : 'var(--text-secondary)',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
            }}
              onClick={() => toggleChallenge(name)}>
              <div style={{ fontWeight: 600 }}>{name}</div>
              <div style={{ fontSize: '0.6rem', marginTop: '0.15rem', opacity: 0.7 }}>
                {selectedChallenges.includes(name) ? 'Selected' : 'Click to add'}
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 3 && (
        <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
          <div className="glass-card" style={{ padding: '0.85rem', marginBottom: '0.75rem' }}>
            <strong style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)' }}>Traits ({selectedTraits.length})</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.35rem' }}>
              {selectedTraits.map(t => (
                <span key={t} className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{t}</span>
              ))}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '0.85rem', marginBottom: '0.75rem' }}>
            <strong style={{ fontSize: '0.82rem', color: 'var(--accent-purple)' }}>Challenge Areas ({selectedChallenges.length})</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.35rem' }}>
              {selectedChallenges.map(t => (
                <span key={t} className="badge badge-purple" style={{ fontSize: '0.65rem' }}>{t}</span>
              ))}
            </div>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Ready to initialize. This will create your profile, starter traits, habits, power-ups, and exposure ladder templates.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
        <button className="glass-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft size={16} /> Back
        </button>

        {step < STEPS.length - 1 ? (
          <button className="glass-btn btn-cyan" style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button className="glass-btn btn-cyan" style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={onComplete} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
            {loading ? 'Setting up...' : 'Launch My Character System'}
          </button>
        )}
      </div>
    </div>
  );
};
