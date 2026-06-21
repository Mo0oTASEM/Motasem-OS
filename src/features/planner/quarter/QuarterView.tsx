import React, { useState } from 'react';
import {
  Archive, AlertTriangle, CalendarDays, CheckSquare, Copy,
  Edit2, FileText, Loader2, Plus, Save, Star, Target, Trash2, X, Zap
} from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import type { QuarterWithRelations, PlanningReview, PlanningStatus } from '../types';
import { GoalCard } from './GoalCard';
import { CreateGoalModal } from '../modals/CreateGoalModal';
import { AiSuggestionsPanel } from '../AiSuggestionsPanel';

interface Props {
  quarter: QuarterWithRelations;
  workspaceId: string;
  userId: string;
  reviews: PlanningReview[];
  onQuarterUpdated: () => void;
  onQuarterDeleted?: (id: string) => void;
}

const statusConfig: Record<PlanningStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)' },
  active: { label: 'Active', color: 'var(--accent-cyan)', bg: 'rgba(0,240,255,0.08)' },
  completed: { label: 'Completed', color: 'var(--accent-teal, #2dd4bf)', bg: 'rgba(45,212,191,0.08)' },
  archived: { label: 'Archived', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.03)' },
  cancelled: { label: 'Cancelled', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.03)' }
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const QuarterView: React.FC<Props> = ({ quarter, workspaceId, userId, reviews, onQuarterUpdated, onQuarterDeleted }) => {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [activating, setActivating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [generatingRetro, setGeneratingRetro] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(quarter.title);
  const [editTheme, setEditTheme] = useState(quarter.theme ?? '');
  const [editVision, setEditVision] = useState(quarter.strategicVision ?? '');
  const [editYear, setEditYear] = useState(quarter.year);
  const [editQuarterNumber, setEditQuarterNumber] = useState(quarter.quarterNumber);
  const [editStartDate, setEditStartDate] = useState(quarter.startDate);
  const [editEndDate, setEditEndDate] = useState(quarter.endDate);
  const [savingEdit, setSavingEdit] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const goals = quarter.goals;
  const avgProgress = goals.length
    ? Math.round(goals.reduce((sum, g) => sum + g.progressPercentage, 0) / goals.length)
    : 0;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const atRiskGoals = goals.filter(g => g.status === 'at_risk').length;
  const status = statusConfig[quarter.status] ?? statusConfig.draft;

  const startMo = new Date(quarter.startDate).getMonth();
  const endMo = new Date(quarter.endDate).getMonth();
  const months = Array.from({ length: endMo - startMo + 1 }, (_, i) => MONTH_NAMES[startMo + i]);

  const handleActivate = async () => {
    setActivating(true);
    setValidationErrors([]);
    try {
      await cloudRunClient.plannerApi.activateQuarter(quarter.id, workspaceId);
      showToast('Quarter activated!');
      onQuarterUpdated();
    } catch (err: unknown) {
      const e = err as { details?: string[]; message?: string };
      if (e.details) {
        setValidationErrors(e.details);
      } else {
        setValidationErrors([(e.message ?? 'Activation failed.')]);
      }
    } finally {
      setActivating(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm('Mark this quarter as completed? A retrospective review will be generated.')) return;
    setCompleting(true);
    try {
      await cloudRunClient.plannerApi.completeQuarter(quarter.id, workspaceId);
      showToast('Quarter completed! Review generated.');
      onQuarterUpdated();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setCompleting(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Archive this quarter?')) return;
    setArchiving(true);
    try {
      await cloudRunClient.plannerApi.archiveQuarter(quarter.id, workspaceId);
      showToast('Quarter archived.');
      onQuarterUpdated();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setArchiving(false);
    }
  };

  const handleGenerateRetro = async () => {
    setGeneratingRetro(true);
    try {
      await cloudRunClient.plannerApi.generateRetrospective(quarter.id, workspaceId);
      showToast('Retrospective generated!');
      onQuarterUpdated();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setGeneratingRetro(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setSavingEdit(true);
    try {
      await cloudRunClient.plannerApi.updateQuarter(quarter.id, {
        workspaceId,
        title: editTitle.trim(),
        theme: editTheme.trim() || undefined,
        strategicVision: editVision.trim() || undefined,
        year: Number(editYear),
        quarterNumber: Number(editQuarterNumber),
        startDate: editStartDate,
        endDate: editEndDate
      });
      setEditing(false);
      showToast('Quarter updated!');
      onQuarterUpdated();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete quarter "${quarter.title}"? This action cannot be undone.`)) return;
    setArchiving(true);
    try {
      if (onQuarterDeleted) {
        onQuarterDeleted(quarter.id);
      } else {
        await cloudRunClient.plannerApi.deleteQuarter(quarter.id, workspaceId);
        showToast('Quarter deleted.');
        onQuarterUpdated();
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setArchiving(false);
    }
  };

  const latestReview = reviews[0];

  return (
    <div className="planner-quarter-view">
      {/* Toast */}
      {toast && (
        <div className="planner-toast">
          <CheckSquare size={14} /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="planner-quarter-header glass-panel">
        <div className="planner-quarter-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{quarter.title}</h2>
            <span className="badge" style={{ background: status.bg, color: status.color, border: `1px solid ${status.color}44` }}>
              {status.label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <CalendarDays size={12} /> {quarter.startDate} → {quarter.endDate}
            </span>
            {quarter.theme && (
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-purple)', fontStyle: 'italic' }}>
                "{quarter.theme}"
              </span>
            )}
          </div>
          {quarter.strategicVision && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.5, maxWidth: '600px' }}>
              {quarter.strategicVision}
            </p>
          )}
        </div>

        <div className="planner-quarter-header-right">
          {(quarter.status === 'draft' || quarter.status === 'active') && (
            <button className="glass-btn" onClick={() => {
              setEditing(true);
              setEditTitle(quarter.title);
              setEditTheme(quarter.theme ?? '');
              setEditVision(quarter.strategicVision ?? '');
              setEditYear(quarter.year);
              setEditQuarterNumber(quarter.quarterNumber);
              setEditStartDate(quarter.startDate);
              setEditEndDate(quarter.endDate);
            }} type="button" title="Edit quarter">
              <Edit2 size={14} />
            </button>
          )}
          {quarter.status === 'draft' && (
            <button className="glass-btn" onClick={handleActivate} disabled={activating} type="button">
              {activating ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
              {activating ? 'Validating…' : 'Activate Quarter'}
            </button>
          )}
          {quarter.status === 'active' && (
            <button className="glass-btn" onClick={handleComplete} disabled={completing} type="button">
              {completing ? <Loader2 size={14} className="spin" /> : <CheckSquare size={14} />}
              {completing ? 'Completing…' : 'Complete Quarter'}
            </button>
          )}
          {quarter.status === 'completed' && (
            <button className="glass-btn" onClick={handleGenerateRetro} disabled={generatingRetro} type="button">
              {generatingRetro ? <Loader2 size={14} className="spin" /> : <FileText size={14} />}
              {generatingRetro ? 'Generating…' : 'Generate Retro'}
            </button>
          )}
          {(quarter.status === 'active' || quarter.status === 'completed') && (
            <button className="glass-btn" onClick={handleArchive} disabled={archiving} type="button" title="Archive quarter">
              {archiving ? <Loader2 size={14} className="spin" /> : <Archive size={14} />}
            </button>
          )}
          <button className="glass-btn" onClick={handleDelete} disabled={archiving} type="button" title="Delete quarter" style={{ color: 'var(--accent-magenta)' }}>
            {archiving ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>

      {/* Edit Quarter Panel */}
      {editing && (
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Edit Quarter</strong>
            <button className="glass-btn" onClick={() => setEditing(false)} type="button" style={{ padding: '0.3rem' }}><X size={14} /></button>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Title</span>
            <input className="glass-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Theme</span>
            <input className="glass-input" value={editTheme} onChange={e => setEditTheme(e.target.value)} placeholder="e.g. Velocity & Focus" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Strategic Vision</span>
            <textarea className="glass-input" value={editVision} onChange={e => setEditVision(e.target.value)} placeholder="What does success look like this quarter?" rows={3} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Quarter Number</span>
              <input className="glass-input" type="number" min={1} max={4} value={editQuarterNumber} onChange={e => setEditQuarterNumber(Number(e.target.value))} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Year</span>
              <input className="glass-input" type="number" min={2020} max={2030} value={editYear} onChange={e => setEditYear(Number(e.target.value))} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Start Date (YYYY-MM-DD)</span>
              <input className="glass-input" type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>End Date (YYYY-MM-DD)</span>
              <input className="glass-input" type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="glass-btn" onClick={() => setEditing(false)} type="button" disabled={savingEdit}>Cancel</button>
            <button className="glass-btn btn-cyan" onClick={handleSaveEdit} disabled={savingEdit || !editTitle.trim()} type="button">
              {savingEdit ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
              {savingEdit ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="planner-alert planner-alert--error">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={15} />
            <strong>Quarter cannot be activated — resolve these issues first:</strong>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {validationErrors.map((e, i) => <li key={i} style={{ fontSize: '0.82rem' }}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* KPI Cards */}
      <div className="planner-kpi-row">
        <div className="planner-kpi glass-panel">
          <Target size={18} className="text-cyan" />
          <small>Overall Progress</small>
          <strong>{avgProgress}%</strong>
          <span>across {goals.length} goal{goals.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="planner-kpi glass-panel">
          <CheckSquare size={18} />
          <small>Completed</small>
          <strong>{completedGoals}/{goals.length}</strong>
          <span>goals finished</span>
        </div>
        <div className="planner-kpi glass-panel">
          <AlertTriangle size={18} style={{ color: atRiskGoals > 0 ? 'var(--accent-orange, #f97316)' : 'var(--text-muted)' }} />
          <small>At Risk</small>
          <strong style={{ color: atRiskGoals > 0 ? 'var(--accent-orange, #f97316)' : undefined }}>{atRiskGoals}</strong>
          <span>needs attention</span>
        </div>
        <div className="planner-kpi glass-panel">
          <Star size={18} style={{ color: 'var(--accent-purple)' }} />
          <small>Roadmap</small>
          <strong style={{ fontSize: '0.9rem' }}>{months.join(' · ')}</strong>
          <span>Q{quarter.quarterNumber} {quarter.year}</span>
        </div>
      </div>

      {/* Goals Section */}
      <div className="planner-section">
        <div className="planner-section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={16} className="text-cyan" />
            <h3>Quarterly Goals</h3>
            <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>{goals.length}/5</span>
          </div>
          <button
            className="glass-btn btn-cyan"
            type="button"
            onClick={() => setShowGoalModal(true)}
            disabled={goals.length >= 5}
          >
            <Plus size={14} /> Add Goal
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="planner-empty-state">
            <Target size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
            <strong>No goals yet</strong>
            <p>Add up to 5 goals to define what success looks like this quarter.</p>
            <button className="glass-btn btn-cyan" type="button" onClick={() => setShowGoalModal(true)}>
              <Plus size={14} /> Add Your First Goal
            </button>
          </div>
        ) : (
          <div className="planner-goals-list">
            {goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                workspaceId={workspaceId}
                userId={userId}
                onGoalUpdated={onQuarterUpdated}
                onGoalDeleted={() => onQuarterUpdated()}
              />
            ))}
          </div>
        )}
      </div>

      {/* Roadmap Timeline */}
      <div className="glass-panel planner-section">
        <div className="planner-section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Copy size={16} className="text-cyan" />
            <h3>Quarter Roadmap</h3>
          </div>
        </div>
        <div className="planner-roadmap">
          {months.map((mo, i) => (
            <div key={i} className="planner-roadmap-col">
              <div className="planner-roadmap-month-label">{mo}</div>
              <div className="planner-roadmap-track">
                {goals.map((g, gi) => {
                  const goalProgress = g.progressPercentage;
                  return (
                    <div key={g.id} className="planner-roadmap-bar-row">
                      <div
                        className="planner-roadmap-bar"
                        style={{
                          background: `hsl(${180 + gi * 40}, 70%, 55%)`,
                          opacity: i === 0 ? 1 : i === 1 ? 0.75 : 0.5,
                          width: `${Math.min(100, goalProgress)}%`
                        }}
                        title={`${g.title} — ${Math.round(goalProgress)}%`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {goals.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
            Add goals to see the roadmap timeline.
          </p>
        )}
      </div>

      {/* AI Planning Assistant Panel — only shown for active/draft quarters */}
      {(quarter.status === 'active' || quarter.status === 'draft') && (
        <div className="planner-section">
          <AiSuggestionsPanel
            workspaceId={workspaceId}
            quarterId={quarter.id}
            onApplyChange={async (change) => {
              if (change.operation === 'update_priority' && change.entityId && change.proposedValue) {
                await cloudRunClient.plannerApi.updateGoal(change.entityId, {
                  workspaceId,
                  priority: change.proposedValue as string
                });
                onQuarterUpdated();
              }
            }}
          />
        </div>
      )}

      {/* Review Panel — visible when completed */}
      {quarter.status === 'completed' && (
        <div className="glass-panel planner-section">
          <div className="planner-section-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} className="text-cyan" />
              <h3>Quarter Review</h3>
            </div>
          </div>
          {latestReview ? (
            <div className="planner-review-grid">
              {latestReview.wins && (
                <div className="planner-review-section">
                  <small>Wins</small>
                  <pre>{latestReview.wins}</pre>
                </div>
              )}
              {latestReview.missedItems && (
                <div className="planner-review-section">
                  <small>Missed</small>
                  <pre>{latestReview.missedItems}</pre>
                </div>
              )}
              {latestReview.lessons && (
                <div className="planner-review-section">
                  <small>Lessons</small>
                  <pre>{latestReview.lessons}</pre>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              No review generated yet. Click "Generate Retro" to create one.
            </p>
          )}
        </div>
      )}

      {showGoalModal && (
        <CreateGoalModal
          workspaceId={workspaceId}
          userId={userId}
          quarterId={quarter.id}
          goalCount={goals.length}
          onCreated={() => { setShowGoalModal(false); onQuarterUpdated(); }}
          onClose={() => setShowGoalModal(false)}
        />
      )}
    </div>
  );
};
