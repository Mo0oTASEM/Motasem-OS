import React, { useState } from 'react';
import { X, CalendarDays, Loader2 } from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import type { MonthlyPlan, Quarter } from '../types';

interface Props {
  workspaceId: string;
  userId: string;
  quarters: Quarter[];
  onCreated: (plan: MonthlyPlan) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const monthDates = (year: number, month: number) => {
  const end = new Date(year, month, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${year}-${pad(month)}-${pad(end.getDate())}`
  };
};

const now = new Date();

export const CreateMonthlyPlanModal: React.FC<Props> = ({
  workspaceId, userId, quarters, onCreated, onClose
}) => {
  const [year, setYear] = useState(now.getFullYear());
  const [monthNumber, setMonthNumber] = useState(now.getMonth() + 1);
  const [quarterId, setQuarterId] = useState(quarters[0]?.id ?? '');
  const [theme, setTheme] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const { startDate, endDate } = monthDates(year, monthNumber);
    try {
      const res = await cloudRunClient.plannerApi.createMonthlyPlan({
        workspaceId, userId,
        monthNumber, year, startDate, endDate,
        quarterId: quarterId || undefined,
        theme: theme.trim() || undefined,
        notes: notes.trim() || undefined
      });
      onCreated(res.monthlyPlan as unknown as MonthlyPlan);
    } catch (err) {
      setError((err as Error).message || 'Failed to create monthly plan.');
    } finally {
      setSaving(false);
    }
  };

  const { startDate, endDate } = monthDates(year, monthNumber);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel planner-modal" onClick={e => e.stopPropagation()}>
        <div className="planner-modal-head">
          <div>
            <h2>New Monthly Plan</h2>
            <p>Create a monthly plan and link it to a quarter.</p>
          </div>
          <button className="glass-btn" type="button" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div className="planner-form-grid">
            <label className="planner-form-label">
              Month
              <select className="glass-input" value={monthNumber} onChange={e => setMonthNumber(Number(e.target.value))}>
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </label>
            <label className="planner-form-label">
              Year
              <select className="glass-input" value={year} onChange={e => setYear(Number(e.target.value))}>
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>

          {quarters.length > 0 && (
            <label className="planner-form-label">
              Linked Quarter <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              <select className="glass-input" value={quarterId} onChange={e => setQuarterId(e.target.value)}>
                <option value="">No quarter link</option>
                {quarters.map(q => (
                  <option key={q.id} value={q.id}>Q{q.quarterNumber} {q.year} — {q.title}</option>
                ))}
              </select>
            </label>
          )}

          <label className="planner-form-label">
            Theme <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            <input
              className="glass-input"
              value={theme}
              onChange={e => setTheme(e.target.value)}
              placeholder="e.g., Ship & Stabilize"
            />
          </label>

          <label className="planner-form-label">
            Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            <textarea
              className="glass-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any context for this month…"
              style={{ minHeight: '60px', resize: 'vertical' }}
            />
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(0,240,255,0.04)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,240,255,0.1)' }}>
            <CalendarDays size={13} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{startDate} → {endDate}</span>
          </div>

          {error && <p style={{ color: 'var(--accent-magenta)', fontSize: '0.8rem' }}>{error}</p>}

          <div className="planner-modal-actions">
            <button type="button" className="glass-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="glass-btn btn-cyan" disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : null}
              {saving ? 'Creating…' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
