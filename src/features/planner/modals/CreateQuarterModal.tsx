import React, { useState } from 'react';
import { X, CalendarDays, Loader2 } from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import type { Quarter } from '../types';

interface Props {
  workspaceId: string;
  userId: string;
  onCreated: (quarter: Quarter) => void;
  onClose: () => void;
}

const currentYear = new Date().getFullYear();
const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

const quarterDates = (year: number, q: number) => {
  const starts = [
    `${year}-01-01`, `${year}-04-01`,
    `${year}-07-01`, `${year}-10-01`
  ];
  const ends = [
    `${year}-03-31`, `${year}-06-30`,
    `${year}-09-30`, `${year}-12-31`
  ];
  return { startDate: starts[q - 1], endDate: ends[q - 1] };
};

export const CreateQuarterModal: React.FC<Props> = ({ workspaceId, userId, onCreated, onClose }) => {
  const [year, setYear] = useState(currentYear);
  const [quarterNumber, setQuarterNumber] = useState(currentQuarter);
  const [title, setTitle] = useState(`Q${currentQuarter} ${currentYear}`);
  const [theme, setTheme] = useState('');
  const [strategicVision, setStrategicVision] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleYearQuarterChange = (y: number, q: number) => {
    setYear(y);
    setQuarterNumber(q);
    setTitle(`Q${q} ${y}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    const { startDate, endDate } = quarterDates(year, quarterNumber);
    try {
      const res = await cloudRunClient.plannerApi.createQuarter({
        workspaceId, userId, title: title.trim(),
        quarterNumber, year, startDate, endDate,
        theme: theme.trim() || undefined,
        strategicVision: strategicVision.trim() || undefined
      });
      onCreated(res.quarter as unknown as Quarter);
    } catch (err) {
      setError((err as Error).message || 'Failed to create quarter.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel planner-modal" onClick={e => e.stopPropagation()}>
        <div className="planner-modal-head">
          <div>
            <h2>New Quarter</h2>
            <p>Set up your quarterly planning cycle with theme and vision.</p>
          </div>
          <button className="glass-btn" type="button" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="planner-form-grid">
            <label className="planner-form-label">
              Year
              <select className="glass-input" value={year} onChange={e => handleYearQuarterChange(Number(e.target.value), quarterNumber)}>
                {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="planner-form-label">
              Quarter
              <select className="glass-input" value={quarterNumber} onChange={e => handleYearQuarterChange(year, Number(e.target.value))}>
                {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
              </select>
            </label>
          </div>

          <label className="planner-form-label">
            Title
            <input
              className="glass-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Q3 2025 — Launch & Scale"
              required
            />
          </label>

          <label className="planner-form-label">
            Theme <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            <input
              className="glass-input"
              value={theme}
              onChange={e => setTheme(e.target.value)}
              placeholder="e.g., Foundation & Momentum"
            />
          </label>

          <label className="planner-form-label">
            Strategic Vision <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            <textarea
              className="glass-input"
              value={strategicVision}
              onChange={e => setStrategicVision(e.target.value)}
              placeholder="Where do you want to be by the end of this quarter?"
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
          </label>

          <div style={{ background: 'rgba(0,240,255,0.04)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', border: '1px solid rgba(0,240,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarDays size={14} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {quarterDates(year, quarterNumber).startDate} → {quarterDates(year, quarterNumber).endDate}
            </span>
          </div>

          {error && <p style={{ color: 'var(--accent-magenta)', fontSize: '0.8rem' }}>{error}</p>}

          <div className="planner-modal-actions">
            <button type="button" className="glass-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="glass-btn btn-cyan" disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : null}
              {saving ? 'Creating…' : 'Create Quarter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
