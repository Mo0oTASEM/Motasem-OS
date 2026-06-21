import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import type { MonthlyOutcome, PriorityLevel, QuarterlyGoal } from '../types';

interface Props {
  workspaceId: string;
  userId: string;
  monthlyPlanId: string;
  linkedGoals?: QuarterlyGoal[];
  onCreated: (outcome: MonthlyOutcome) => void;
  onClose: () => void;
}

const PRIORITIES: PriorityLevel[] = ['critical', 'high', 'medium', 'low'];

export const CreateOutcomeModal: React.FC<Props> = ({
  workspaceId, userId, monthlyPlanId, linkedGoals = [], onCreated, onClose
}) => {
  const [title, setTitle] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [metricOrDeliverable, setMetricOrDeliverable] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [quarterlyGoalId, setQuarterlyGoalId] = useState('');
  const [plannedEffortHours, setPlannedEffortHours] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [risks, setRisks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await cloudRunClient.plannerApi.createOutcome({
        workspaceId, monthlyPlanId, ownerId: userId,
        title: title.trim(),
        desiredOutcome: desiredOutcome.trim() || undefined,
        metricOrDeliverable: metricOrDeliverable.trim() || undefined,
        priority,
        quarterlyGoalId: quarterlyGoalId || undefined,
        plannedEffortHours: plannedEffortHours ? parseFloat(plannedEffortHours) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        risks: risks.trim() || undefined
      });
      onCreated(res.monthlyOutcome as unknown as MonthlyOutcome);
    } catch (err) {
      setError((err as Error).message || 'Failed to create outcome.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel planner-modal" onClick={e => e.stopPropagation()}>
        <div className="planner-modal-head">
          <div>
            <h2>Add Monthly Outcome</h2>
            <p>Define a concrete outcome to achieve this month.</p>
          </div>
          <button className="glass-btn" type="button" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <label className="planner-form-label">
            Outcome Title <span style={{ color: 'var(--accent-magenta)' }}>*</span>
            <input
              className="glass-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Complete user research for v2 features"
              maxLength={200}
              required
            />
          </label>

          <label className="planner-form-label">
            Desired Outcome
            <textarea
              className="glass-input"
              value={desiredOutcome}
              onChange={e => setDesiredOutcome(e.target.value)}
              placeholder="What will the world look like when this is done?"
              style={{ minHeight: '60px', resize: 'vertical' }}
              maxLength={500}
            />
          </label>

          <label className="planner-form-label">
            Metric or Deliverable
            <input
              className="glass-input"
              value={metricOrDeliverable}
              onChange={e => setMetricOrDeliverable(e.target.value)}
              placeholder="How will you measure success? (e.g., 10 user interviews)"
            />
          </label>

          <div className="planner-form-grid">
            <label className="planner-form-label">
              Priority
              <select className="glass-input" value={priority} onChange={e => setPriority(e.target.value as PriorityLevel)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </label>
            <label className="planner-form-label">
              Effort Hours <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(est.)</span>
              <input
                className="glass-input"
                type="number"
                min="0"
                step="0.5"
                value={plannedEffortHours}
                onChange={e => setPlannedEffortHours(e.target.value)}
                placeholder="e.g., 20"
              />
            </label>
          </div>

          {linkedGoals.length > 0 && (
            <label className="planner-form-label">
              Link to Quarterly Goal <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              <select className="glass-input" value={quarterlyGoalId} onChange={e => setQuarterlyGoalId(e.target.value)}>
                <option value="">No goal link</option>
                {linkedGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </label>
          )}

          <div className="planner-form-grid">
            <label className="planner-form-label">
              Start Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              <input className="glass-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </label>
            <label className="planner-form-label">
              End Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              <input className="glass-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </label>
          </div>

          <label className="planner-form-label">
            Risks <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            <input className="glass-input" value={risks} onChange={e => setRisks(e.target.value)} placeholder="What could block this outcome?" />
          </label>

          {error && <p style={{ color: 'var(--accent-magenta)', fontSize: '0.8rem' }}>{error}</p>}

          <div className="planner-modal-actions">
            <button type="button" className="glass-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="glass-btn btn-cyan" disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : null}
              {saving ? 'Adding…' : 'Add Outcome'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
