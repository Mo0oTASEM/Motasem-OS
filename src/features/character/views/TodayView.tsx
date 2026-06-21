import React, { useState } from 'react';
import { CheckCircle2, Target, Shield, BookOpen, X, Loader2, Lightbulb, Bot, RefreshCw } from 'lucide-react';
import { Panel } from '../../../components/system/Layout';
import { EmptyState } from '../../../components/system/States';
import { CompletionButton } from '../components/CompletionButton';
import type { CharacterHabit, CharacterQuest, CharacterIfThenRule } from '../types';
import type { AdaptiveSuggestionResponse } from '../services/characterCoachTypes';
import type { CoachResult } from '../services/characterCoachClient';

interface TodayViewProps {
  habits: CharacterHabit[];
  quests: CharacterQuest[];
  ifThenRules: CharacterIfThenRule[];
  onCompleteHabit: (id: string) => Promise<void>;
  onCompleteQuest: (id: string) => Promise<void>;
  onTriggerRule: (id: string, followed: boolean) => Promise<void>;
  onAddReflection: (reflection: {
    preActionFear: string; postActionResult: string; whatHappened: string;
    whatLearned: string; emotionalIntensityBefore: number;
    emotionalIntensityAfter: number; nextStep: string;
    privacySetting: 'private' | 'shared' | 'public';
    aiSummaryStatus: 'pending' | 'completed' | 'failed';
    linkedEntityType: string | null;
    linkedEntityId: string | null;
  }) => Promise<void>;
  saving?: boolean;
  onGenerateAdaptiveSuggestion?: () => Promise<CoachResult<AdaptiveSuggestionResponse>>;
}

export const TodayView: React.FC<TodayViewProps> = ({
  habits, quests, ifThenRules,
  onCompleteHabit, onCompleteQuest, onTriggerRule, onAddReflection, saving,
  onGenerateAdaptiveSuggestion,
}) => {
  const [showReflection, setShowReflection] = useState(false);
  const [reflection, setReflection] = useState({
    preActionFear: '', whatHappened: '', whatLearned: '',
    emotionalIntensityBefore: 5, emotionalIntensityAfter: 5,
    nextStep: '', postActionResult: '',
  });
  const [suggestion, setSuggestion] = useState<AdaptiveSuggestionResponse | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const todayHabits = habits.filter(h => h.isActive).slice(0, 3);
  const activeQuests = quests.filter(q => q.status === 'active' || q.status === 'completed');
  const courageQuest = activeQuests.find(q => q.questType === 'courage' || q.questType === 'exposure');
  const doNotBreakRule = ifThenRules.find(r => r.isActive);
  const needsReflection = habits.some(h => h.lastCompletedDate === new Date().toISOString().split('T')[0]) ||
    quests.some(q => q.completedAt?.startsWith(new Date().toISOString().split('T')[0]));

  const habitCompletions = habits.filter(h =>
    h.lastCompletedDate === new Date().toISOString().split('T')[0],
  ).length;

  const handleSubmitReflection = async () => {
    await onAddReflection({
      ...reflection,
      privacySetting: 'private',
      aiSummaryStatus: 'pending',
      linkedEntityType: null,
      linkedEntityId: null,
    });
    setShowReflection(false);
    setReflection({ preActionFear: '', whatHappened: '', whatLearned: '', emotionalIntensityBefore: 5, emotionalIntensityAfter: 5, nextStep: '', postActionResult: '' });
  };

  const handleAdaptiveSuggestion = async () => {
    if (!onGenerateAdaptiveSuggestion) return;
    setSuggestionLoading(true);
    setSuggestionError(null);
    const res = await onGenerateAdaptiveSuggestion();
    if (res.ok && res.data) {
      setSuggestion(res.data);
    } else {
      setSuggestionError(res.error ?? 'Failed to generate suggestion');
    }
    setSuggestionLoading(false);
  };

  const suggestionIcon = {
    increase_difficulty: '🚀',
    repeat_current_step: '🔄',
    split_task: '✂️',
    change_cue: '🔔',
    change_environment: '🌍',
    add_proof: '📋',
    add_accountability: '👥',
    pause_temporarily: '⏸️',
    enter_recovery_mode: '🛌',
  } as Record<string, string>;

  return (
    <div>
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem' }}>Today's Character Mission</h3>
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {habitCompletions > 0
            ? `${habitCompletions} habit${habitCompletions > 1 ? 's' : ''} completed today. Keep going!`
            : 'Complete your daily essentials below.'}
        </p>
      </div>

      <div className="os-grid-2" style={{ marginBottom: '1.5rem' }}>
        <Panel title="Essential Habits" icon={CheckCircle2} className="os-span-1">
          {todayHabits.length === 0 ? (
            <EmptyState title="No habits yet" message="Create habits to see them here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {todayHabits.map(h => {
                const done = h.lastCompletedDate === new Date().toISOString().split('T')[0];
                return (
                  <div key={h.id} className="glass-card" style={{
                    padding: '0.75rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    opacity: done ? 0.6 : 1,
                  }}>
                    <CompletionButton
                      onComplete={() => onCompleteHabit(h.id)}
                      isCompleted={done}
                      size="sm"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{h.title}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {h.frequency} &middot; +{h.baseXp} XP
                      </div>
                    </div>
                    {h.currentStreak > 0 && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--accent-magenta)' }}>
                        &nbsp;{h.currentStreak}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Courage Quest" icon={Target} className="os-span-1">
          {!courageQuest ? (
            <EmptyState title="No active quest" message="Create a courage or exposure quest." />
          ) : (
            <div className="glass-card" style={{ padding: '1rem', borderLeft: '3px solid var(--accent-purple)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>{courageQuest.title}</div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                {courageQuest.description}
              </p>
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                {courageQuest.status !== 'completed' ? (
                  <CompletionButton
                    onComplete={() => onCompleteQuest(courageQuest.id)}
                    size="sm"
                    label="Complete Quest"
                  />
                ) : (
                  <span className="badge badge-success">Completed</span>
                )}
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+{courageQuest.rewardXp} XP</span>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="os-grid-2" style={{ marginBottom: '1.5rem' }}>
        {doNotBreakRule && (
          <Panel title="Do Not Break" icon={Shield} className="os-span-1">
            <div className="glass-card" style={{
              padding: '0.85rem',
              borderLeft: '3px solid var(--accent-magenta)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>IF</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{doNotBreakRule.triggerCondition}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>THEN</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{doNotBreakRule.responseAction}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button className="glass-btn btn-cyan" style={{ padding: '0.3rem 0.5rem', fontSize: '0.6rem' }}
                  onClick={() => onTriggerRule(doNotBreakRule.id, true)} disabled={saving}>
                  <CheckCircle2 size={12} /> Followed
                </button>
                <button className="glass-btn" style={{ padding: '0.3rem 0.5rem', fontSize: '0.6rem' }}
                  onClick={() => onTriggerRule(doNotBreakRule.id, false)} disabled={saving}>
                  <X size={12} /> Missed
                </button>
              </div>
            </div>
          </Panel>
        )}

        <Panel title="Coach Suggestion" icon={Bot} className="os-span-1">
          {!suggestion ? (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Get an AI suggestion to adapt your challenge level.
              </p>
              <button className="glass-btn btn-cyan" style={{ padding: '0.35rem 0.6rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: '0 auto' }}
                onClick={handleAdaptiveSuggestion} disabled={suggestionLoading || !onGenerateAdaptiveSuggestion}>
                {suggestionLoading ? <Loader2 size={12} className="spin" /> : <Lightbulb size={12} />}
                Get Suggestion
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                  {suggestionIcon[suggestion.suggestionType] || '💡'} {suggestion.title}
                </span>
                <button className="glass-btn" style={{ padding: '0.2rem' }}
                  onClick={() => setSuggestion(null)}><X size={12} /></button>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                {suggestion.description}
              </p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                <strong>Why:</strong> {suggestion.reason}
              </p>
              {suggestion.estimatedImpact && (
                <p style={{ fontSize: '0.68rem', color: 'var(--accent-teal)' }}>
                  <strong>Impact:</strong> {suggestion.estimatedImpact}
                </p>
              )}
              <button className="glass-btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                onClick={handleAdaptiveSuggestion} disabled={suggestionLoading}>
                <RefreshCw size={10} /> Regenerate
              </button>
            </div>
          )}
          {suggestionError && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-danger)', marginTop: '0.35rem' }}>{suggestionError}</div>
          )}
        </Panel>
      </div>

      <Panel title="Reflection" icon={BookOpen} className="os-span-4">
        {!showReflection ? (
          <div style={{ textAlign: 'center', padding: '0.75rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              {needsReflection
                ? 'You completed actions today. Take a moment to reflect.'
                : 'Reflection is available anytime you complete an action.'}
            </p>
            <button className="glass-btn btn-cyan" style={{ padding: '0.5rem 1rem', fontSize: '0.78rem' }}
              onClick={() => setShowReflection(true)}>
              <BookOpen size={14} /> Reflect Now
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  What am I avoiding?
                </label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '60px', padding: '0.4rem', fontSize: '0.72rem' }}
                  value={reflection.preActionFear}
                  onChange={e => setReflection(prev => ({ ...prev, preActionFear: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  What actually happened?
                </label>
                <textarea className="glass-input" style={{ width: '100%', minHeight: '60px', padding: '0.4rem', fontSize: '0.72rem' }}
                  value={reflection.whatHappened}
                  onChange={e => setReflection(prev => ({ ...prev, whatHappened: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                What did I learn?
              </label>
              <textarea className="glass-input" style={{ width: '100%', minHeight: '60px', padding: '0.4rem', fontSize: '0.72rem' }}
                value={reflection.whatLearned}
                onChange={e => setReflection(prev => ({ ...prev, whatLearned: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Fear before (1-10): {reflection.emotionalIntensityBefore}
                </label>
                <input type="range" min="1" max="10"
                  value={reflection.emotionalIntensityBefore}
                  onChange={e => setReflection(prev => ({ ...prev, emotionalIntensityBefore: Number(e.target.value) }))}
                  style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Fear after (1-10): {reflection.emotionalIntensityAfter}
                </label>
                <input type="range" min="1" max="10"
                  value={reflection.emotionalIntensityAfter}
                  onChange={e => setReflection(prev => ({ ...prev, emotionalIntensityAfter: Number(e.target.value) }))}
                  style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Next step
              </label>
              <input className="glass-input" style={{ width: '100%', padding: '0.4rem', fontSize: '0.72rem' }}
                value={reflection.nextStep}
                onChange={e => setReflection(prev => ({ ...prev, nextStep: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="glass-btn" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem' }}
                onClick={() => setShowReflection(false)}>
                Cancel
              </button>
              <button className="glass-btn btn-cyan" style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                onClick={handleSubmitReflection} disabled={saving}>
                {saving ? <Loader2 size={14} className="spin" /> : <Lightbulb size={14} />}
                Submit Reflection
              </button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
};
