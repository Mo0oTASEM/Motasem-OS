import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import type { QuarterlyGoal, PriorityLevel } from '../types';

interface Props {
  workspaceId: string;
  userId: string;
  quarterId?: string;
  goalCount: number;
  onCreated: (goal: QuarterlyGoal) => void;
  onClose: () => void;
}

const PRIORITIES: { value: PriorityLevel; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'var(--accent-magenta)' },
  { value: 'high', label: 'High', color: 'var(--accent-orange, #f97316)' },
  { value: 'medium', label: 'Medium', color: 'var(--accent-cyan)' },
  { value: 'low', label: 'Low', color: 'var(--text-muted)' }
];

const CATEGORIES = [
  'Revenue', 'Product', 'Growth', 'Operations',
  'Learning', 'Health', 'Relationships', 'Personal', 'Other'
];

export const CreateGoalModal: React.FC<Props> = ({
  workspaceId, userId, quarterId, goalCount, onCreated, onClose
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('high');
  const [expectedImpact, setExpectedImpact] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [risks, setRisks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const maxReached = goalCount >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || maxReached) return;
    setSaving(true);
    setError('');
    try {
      const res = await cloudRunClient.plannerApi.createGoal({
        workspaceId, ownerId: userId, quarterId,
        title: title.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        priority,
        expectedImpact: expectedImpact.trim() || undefined,
        successCriteria: successCriteria.trim() || undefined,
        risks: risks.trim() || undefined
      });
      onCreated(res.goal as unknown as QuarterlyGoal);
    } catch (err) {
      setError((err as Error).message || 'Failed to create goal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel planner-modal" onClick={e => e.stopPropagation()}>
        <div className="planner-modal-head">
          <div>
            <h2>Add Quarterly Goal</h2>
            <p>Define a clear, outcome-oriented goal for this quarter. ({goalCount}/5 goals)</p>
          </div>
          <button className="glass-btn" type="button" onClick={onClose}><X size={16} /></button>
        </div>

        {maxReached && (
          <div className="planner-alert planner-alert--error">
            This quarter already has 5 goals. Complete or remove a goal before adding a new one.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <label className="planner-form-label">
            Goal Title <span style={{ color: 'var(--accent-magenta)' }}>*</span>
            <input
              className="glass-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Ship MVP of the iOS app"
              maxLength={200}
              required
              disabled={maxReached}
            />
          </label>

          <div className="planner-form-grid">
            <label className="planner-form-label">
              Category
              <select className="glass-input" value={category} onChange={e => setCategory(e.target.value)} disabled={maxReached}>
                <option value="">Select category…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="planner-form-label">
              Priority
              <select
                className="glass-input"
                value={priority}
                onChange={e => setPriority(e.target.value as PriorityLevel)}
                disabled={maxReached}
              >
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
          </div>

          <label className="planner-form-label">
            Why it matters
            <textarea
              className="glass-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Why is this goal critical this quarter?"
              style={{ minHeight: '64px', resize: 'vertical' }}
              disabled={maxReached}
            />
          </label>

          <label className="planner-form-label">
            Expected Impact
            <input
              className="glass-input"
              value={expectedImpact}
              onChange={e => setExpectedImpact(e.target.value)}
              placeholder="What will change when this is done?"
              disabled={maxReached}
            />
          </label>

          <label className="planner-form-label">
            Success Criteria
            <input
              className="glass-input"
              value={successCriteria}
              onChange={e => setSuccessCriteria(e.target.value)}
              placeholder="How will you know this goal is done?"
              disabled={maxReached}
            />
          </label>

          <label className="planner-form-label">
            Risks <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            <input
              className="glass-input"
              value={risks}
              onChange={e => setRisks(e.target.value)}
              placeholder="What could block this goal?"
              disabled={maxReached}
            />
          </label>

          {error && <p style={{ color: 'var(--accent-magenta)', fontSize: '0.8rem' }}>{error}</p>}

          <div className="planner-modal-actions">
            <button type="button" className="glass-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="glass-btn btn-cyan" disabled={saving || maxReached}>
              {saving ? <Loader2 size={15} className="spin" /> : null}
              {saving ? 'Adding…' : 'Add Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
