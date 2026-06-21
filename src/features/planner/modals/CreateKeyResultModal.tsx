import React, { useState } from 'react';
import { X, Loader2, Info } from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import type { KeyResult, ProgressType } from '../types';

interface Props {
  workspaceId: string;
  userId: string;
  goalId: string;
  onCreated: (kr: KeyResult) => void;
  onClose: () => void;
}

const PROGRESS_TYPES: { value: ProgressType; label: string; description: string }[] = [
  { value: 'numeric', label: 'Numeric', description: 'Track any number (e.g., 0 → 100 signups)' },
  { value: 'percentage', label: 'Percentage', description: 'Progress from 0% to 100%' },
  { value: 'boolean', label: 'Boolean', description: 'Done / Not done' },
  { value: 'milestone', label: 'Milestone', description: 'A series of checkpoints to complete' },
  { value: 'currency', label: 'Currency', description: 'Monetary target (e.g., $0 → $10,000)' },
  { value: 'manual', label: 'Manual', description: 'Update progress directly with a percentage' }
];

export const CreateKeyResultModal: React.FC<Props> = ({
  workspaceId, userId, goalId, onCreated, onClose
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [progressType, setProgressType] = useState<ProgressType>('numeric');
  const [startValue, setStartValue] = useState('0');
  const [targetValue, setTargetValue] = useState('100');
  const [unit, setUnit] = useState('');
  const [weight, setWeight] = useState('1');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const showValues = progressType !== 'boolean' && progressType !== 'manual';
  const isBooleanType = progressType === 'boolean';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const start = showValues ? parseFloat(startValue) || 0 : undefined;
    const target = showValues ? parseFloat(targetValue) || 100 : undefined;
    if (showValues && start !== undefined && target !== undefined && start === target) {
      setError('Start value and target value must be different.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await cloudRunClient.plannerApi.createKeyResult({
        workspaceId, quarterlyGoalId: goalId, ownerId: userId,
        title: title.trim(),
        description: description.trim() || undefined,
        progressType,
        startValue: start,
        targetValue: isBooleanType ? 1 : target,
        currentValue: isBooleanType ? 0 : start,
        unit: unit.trim() || undefined,
        weight: parseFloat(weight) || 1.0,
        dueDate: dueDate || undefined
      });
      onCreated(res.keyResult as unknown as KeyResult);
    } catch (err) {
      setError((err as Error).message || 'Failed to create key result.');
    } finally {
      setSaving(false);
    }
  };

  const selectedTypeInfo = PROGRESS_TYPES.find(t => t.value === progressType);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel planner-modal" onClick={e => e.stopPropagation()}>
        <div className="planner-modal-head">
          <div>
            <h2>Add Key Result</h2>
            <p>Define how you'll measure progress toward this goal.</p>
          </div>
          <button className="glass-btn" type="button" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <label className="planner-form-label">
            Key Result Title <span style={{ color: 'var(--accent-magenta)' }}>*</span>
            <input
              className="glass-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Reach 1,000 monthly active users"
              maxLength={200}
              required
            />
          </label>

          <label className="planner-form-label">
            Progress Type
            <select className="glass-input" value={progressType} onChange={e => setProgressType(e.target.value as ProgressType)}>
              {PROGRESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>

          {selectedTypeInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(0,240,255,0.04)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,240,255,0.1)' }}>
              <Info size={13} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedTypeInfo.description}</span>
            </div>
          )}

          {showValues && (
            <div className="planner-form-grid">
              <label className="planner-form-label">
                Start Value
                <input
                  className="glass-input"
                  type="number"
                  value={startValue}
                  onChange={e => setStartValue(e.target.value)}
                />
              </label>
              <label className="planner-form-label">
                Target Value <span style={{ color: 'var(--accent-magenta)' }}>*</span>
                <input
                  className="glass-input"
                  type="number"
                  value={targetValue}
                  onChange={e => setTargetValue(e.target.value)}
                  required
                />
              </label>
              <label className="planner-form-label">
                Unit <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                <input
                  className="glass-input"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="users, $, %, etc."
                />
              </label>
              <label className="planner-form-label">
                Weight
                <input
                  className="glass-input"
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                />
              </label>
            </div>
          )}

          <div className="planner-form-grid">
            <label className="planner-form-label">
              Due Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              <input className="glass-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </label>
          </div>

          <label className="planner-form-label">
            Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            <textarea
              className="glass-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Additional context about this key result…"
              style={{ minHeight: '56px', resize: 'vertical' }}
            />
          </label>

          {error && <p style={{ color: 'var(--accent-magenta)', fontSize: '0.8rem' }}>{error}</p>}

          <div className="planner-modal-actions">
            <button type="button" className="glass-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="glass-btn btn-cyan" disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : null}
              {saving ? 'Adding…' : 'Add Key Result'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
