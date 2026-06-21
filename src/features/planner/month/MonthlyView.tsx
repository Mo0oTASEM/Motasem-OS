import React, { useState } from 'react';
import {
  BarChart3, CalendarDays, CheckSquare, Edit2,
  FileText, Loader2, Plus, Save, TrendingUp, Trash2, X, Zap,
  AlertTriangle
} from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import type {
  MonthlyPlanWithOutcomes, MonthlyOutcome, PlanningReview,
  GoalStatus, QuarterlyGoal
} from '../types';
import { CreateOutcomeModal } from '../modals/CreateOutcomeModal';
import { MonthlyRitualStepper } from './MonthlyRitualStepper';
import { AiSuggestionsPanel } from '../AiSuggestionsPanel';

interface Props {
  plan: MonthlyPlanWithOutcomes;
  workspaceId: string;
  userId: string;
  linkedGoals?: QuarterlyGoal[];
  reviews: PlanningReview[];
  onPlanUpdated: () => void;
  onPlanDeleted?: (id: string) => void;
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const priorityColors: Record<string, string> = {
  critical: 'var(--accent-magenta)',
  high: 'var(--accent-orange, #f97316)',
  medium: 'var(--accent-cyan)',
  low: 'var(--text-muted)'
};

const statusColors: Record<GoalStatus, string> = {
  draft: 'var(--text-muted)',
  active: 'var(--accent-cyan)',
  on_track: 'var(--accent-teal, #2dd4bf)',
  at_risk: 'var(--accent-orange, #f97316)',
  behind: 'var(--accent-magenta)',
  completed: 'var(--accent-teal, #2dd4bf)',
  cancelled: 'var(--text-muted)'
};

export const MonthlyView: React.FC<Props> = ({
  plan, workspaceId, userId, linkedGoals = [], reviews, onPlanUpdated, onPlanDeleted
}) => {
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [showRitual, setShowRitual] = useState(plan.status === 'draft');
  const [activating, setActivating] = useState(false);
  const [generatingReview, setGeneratingReview] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState<string | null>(null);
  const [progressInputs, setProgressInputs] = useState<Record<string, string>>({});
  const [deletingOutcome, setDeletingOutcome] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [editingPlan, setEditingPlan] = useState(false);
  const [editTheme, setEditTheme] = useState(plan.theme ?? '');
  const [editNotes, setEditNotes] = useState(plan.notes ?? '');
  const [editPlannedCapacity, setEditPlannedCapacity] = useState(String(plan.plannedCapacityHours));
  const [editActualCapacity, setEditActualCapacity] = useState(String(plan.actualCapacityHours));
  const [editMonthNumber, setEditMonthNumber] = useState(plan.monthNumber);
  const [editYear, setEditYear] = useState(plan.year);
  const [editStartDate, setEditStartDate] = useState(plan.startDate);
  const [editEndDate, setEditEndDate] = useState(plan.endDate);
  const [savingPlanEdit, setSavingPlanEdit] = useState(false);
  const [archivingPlan, setArchivingPlan] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const outcomes = plan.outcomes ?? [];
  const avgProgress = outcomes.length
    ? Math.round(outcomes.reduce((sum, o) => sum + o.progressPercentage, 0) / outcomes.length)
    : 0;
  const completedCount = outcomes.filter(o => o.status === 'completed').length;
  const totalEffort = outcomes.reduce((sum, o) => sum + (o.plannedEffortHours || 0), 0);

  const handleActivate = async () => {
    setActivating(true);
    try {
      await cloudRunClient.plannerApi.activateMonthlyPlan(plan.id, workspaceId);
      setShowRitual(false);
      showToast('Monthly plan activated!');
      onPlanUpdated();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActivating(false);
    }
  };

  const handleGenerateReview = async () => {
    setGeneratingReview(true);
    try {
      await cloudRunClient.plannerApi.generateMonthlyReview(plan.id, workspaceId);
      showToast('Monthly review generated!');
      onPlanUpdated();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setGeneratingReview(false);
    }
  };

  const handleUpdateProgress = async (outcome: MonthlyOutcome) => {
    const raw = progressInputs[outcome.id];
    if (raw === undefined || raw === '') return;
    const val = Math.max(0, Math.min(100, parseFloat(raw)));
    if (isNaN(val)) return;
    setUpdatingProgress(outcome.id);
    try {
      await cloudRunClient.plannerApi.updateOutcomeProgress(outcome.id, { workspaceId, value: val });
      setProgressInputs(prev => ({ ...prev, [outcome.id]: '' }));
      onPlanUpdated();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUpdatingProgress(null);
    }
  };

  const handleStatusChange = async (outcome: MonthlyOutcome, status: GoalStatus) => {
    try {
      await cloudRunClient.plannerApi.updateOutcome(outcome.id, { workspaceId, status });
      onPlanUpdated();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDeleteOutcome = async (outcome: MonthlyOutcome) => {
    if (!confirm(`Delete outcome "${outcome.title}"?`)) return;
    setDeletingOutcome(outcome.id);
    try {
      await cloudRunClient.plannerApi.deleteOutcome(outcome.id, workspaceId);
      onPlanUpdated();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setDeletingOutcome(null);
    }
  };

  const handleSavePlanEdit = async () => {
    setSavingPlanEdit(true);
    try {
      await cloudRunClient.plannerApi.updateMonthlyPlan(plan.id, {
        workspaceId,
        theme: editTheme.trim() || undefined,
        notes: editNotes.trim() || undefined,
        plannedCapacityHours: Number(editPlannedCapacity) || 0,
        actualCapacityHours: Number(editActualCapacity) || 0,
        monthNumber: Number(editMonthNumber),
        year: Number(editYear),
        startDate: editStartDate,
        endDate: editEndDate
      });
      setEditingPlan(false);
      showToast('Monthly plan updated!');
      onPlanUpdated();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingPlanEdit(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!confirm(`Delete monthly plan for ${MONTH_NAMES[plan.monthNumber]} ${plan.year}? This action cannot be undone.`)) return;
    setArchivingPlan(true);
    try {
      if (onPlanDeleted) {
        onPlanDeleted(plan.id);
      } else {
        await cloudRunClient.plannerApi.deleteMonthlyPlan(plan.id, workspaceId);
        showToast('Monthly plan deleted.');
        onPlanUpdated();
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setArchivingPlan(false);
    }
  };

  const latestReview = reviews[0];

  return (
    <div className="planner-monthly-view">
      {toast && <div className="planner-toast"><CheckSquare size={14} /> {toast}</div>}

      {/* Header */}
      <div className="planner-quarter-header glass-panel">
        <div className="planner-quarter-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
              {MONTH_NAMES[plan.monthNumber]} {plan.year}
            </h2>
            <span className={`badge ${plan.status === 'active' ? 'badge-cyan' : ''}`} style={{ fontSize: '0.65rem' }}>
              {plan.status}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <CalendarDays size={12} /> {plan.startDate} → {plan.endDate}
            </span>
            {plan.theme && (
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-purple)', fontStyle: 'italic' }}>
                "{plan.theme}"
              </span>
            )}
          </div>
        </div>

        <div className="planner-quarter-header-right">
          {(plan.status === 'draft' || plan.status === 'active') && (
            <button className="glass-btn" type="button" onClick={() => {
              setEditingPlan(true);
              setEditTheme(plan.theme ?? '');
              setEditNotes(plan.notes ?? '');
              setEditPlannedCapacity(String(plan.plannedCapacityHours));
              setEditActualCapacity(String(plan.actualCapacityHours));
              setEditMonthNumber(plan.monthNumber);
              setEditYear(plan.year);
              setEditStartDate(plan.startDate);
              setEditEndDate(plan.endDate);
            }} title="Edit monthly plan">
              <Edit2 size={14} />
            </button>
          )}
          {plan.status === 'draft' && (
            <button
              className="glass-btn btn-cyan"
              type="button"
              onClick={() => setShowRitual(true)}
              disabled={activating}
            >
              {activating ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
              {showRitual ? 'Planning Ritual Active' : 'Start Ritual'}
            </button>
          )}
          {plan.status === 'draft' && !showRitual && (
            <button className="glass-btn" type="button" onClick={handleActivate} disabled={activating}>
              {activating ? <Loader2 size={14} className="spin" /> : <CheckSquare size={14} />}
              Activate
            </button>
          )}
          {plan.status === 'active' && (
            <button className="glass-btn" type="button" onClick={handleGenerateReview} disabled={generatingReview}>
              {generatingReview ? <Loader2 size={14} className="spin" /> : <FileText size={14} />}
              {generatingReview ? 'Generating…' : 'Generate Review'}
            </button>
          )}
          <button className="glass-btn" type="button" onClick={handleDeletePlan} disabled={archivingPlan} title="Delete monthly plan" style={{ color: 'var(--accent-magenta)' }}>
            {archivingPlan ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>

      {/* Edit Monthly Plan Panel */}
      {editingPlan && (
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Edit Monthly Plan</strong>
            <button className="glass-btn" onClick={() => setEditingPlan(false)} type="button" style={{ padding: '0.3rem' }}><X size={14} /></button>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Theme</span>
            <input className="glass-input" value={editTheme} onChange={e => setEditTheme(e.target.value)} placeholder="e.g. Launch Month" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Notes</span>
            <textarea className="glass-input" value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Month Number (1-12)</span>
              <input className="glass-input" type="number" min={1} max={12} value={editMonthNumber} onChange={e => setEditMonthNumber(Number(e.target.value))} />
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Planned Capacity (hours)</span>
              <input className="glass-input" type="number" min={0} value={editPlannedCapacity} onChange={e => setEditPlannedCapacity(e.target.value)} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Actual Capacity (hours)</span>
              <input className="glass-input" type="number" min={0} value={editActualCapacity} onChange={e => setEditActualCapacity(e.target.value)} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="glass-btn" onClick={() => setEditingPlan(false)} type="button" disabled={savingPlanEdit}>Cancel</button>
            <button className="glass-btn btn-cyan" onClick={handleSavePlanEdit} disabled={savingPlanEdit} type="button">
              {savingPlanEdit ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
              {savingPlanEdit ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Ritual Stepper — only in draft mode */}
      {showRitual && plan.status === 'draft' && (
        <MonthlyRitualStepper
          plan={plan}
          onComplete={handleActivate}
        />
      )}

      {/* KPI row */}
      <div className="planner-kpi-row">
        <div className="planner-kpi glass-panel">
          <TrendingUp size={18} className="text-cyan" />
          <small>Avg Progress</small>
          <strong>{avgProgress}%</strong>
          <span>{outcomes.length} outcomes</span>
        </div>
        <div className="planner-kpi glass-panel">
          <CheckSquare size={18} />
          <small>Completed</small>
          <strong>{completedCount}/{outcomes.length}</strong>
          <span>outcomes done</span>
        </div>
        <div className="planner-kpi glass-panel">
          <BarChart3 size={18} style={{ color: 'var(--accent-purple)' }} />
          <small>Effort</small>
          <strong>{totalEffort}h</strong>
          <span>planned effort</span>
        </div>
        {/* Capacity Chart */}
        <div className="planner-kpi glass-panel">
          <div style={{ width: '100%' }}>
            <small>Capacity</small>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
              <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  borderRadius: '999px',
                  width: plan.plannedCapacityHours > 0
                    ? `${Math.min(100, (plan.actualCapacityHours / plan.plannedCapacityHours) * 100)}%`
                    : '0%',
                  background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))'
                }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {plan.actualCapacityHours}/{plan.plannedCapacityHours}h
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Outcomes Section */}
      <div className="planner-section">
        <div className="planner-section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare size={16} className="text-cyan" />
            <h3>Monthly Outcomes</h3>
            <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>{outcomes.length}</span>
          </div>
          <button className="glass-btn btn-cyan" type="button" onClick={() => setShowOutcomeModal(true)}>
            <Plus size={14} /> Add Outcome
          </button>
        </div>

        {outcomes.length === 0 ? (
          <div className="planner-empty-state">
            <CheckSquare size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
            <strong>No outcomes yet</strong>
            <p>Define 3-5 concrete outcomes to make this month count.</p>
            <button className="glass-btn btn-cyan" type="button" onClick={() => setShowOutcomeModal(true)}>
              <Plus size={14} /> Add First Outcome
            </button>
          </div>
        ) : (
          <div className="planner-outcomes-list">
            {outcomes.sort((a, b) => {
              const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
              return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
            }).map(outcome => {
              const isUpdating = updatingProgress === outcome.id;
              const isDeleting = deletingOutcome === outcome.id;
              const linkedGoal = linkedGoals.find(g => g.id === outcome.quarterlyGoalId);

              return (
                <div key={outcome.id} className="planner-outcome-row glass-panel">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                    {/* Priority dot */}
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: priorityColors[outcome.priority],
                      flexShrink: 0, marginTop: '6px'
                    }} />

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.9rem' }}>{outcome.title}</strong>
                        <span style={{
                          fontSize: '0.63rem', color: statusColors[outcome.status] ?? 'var(--text-muted)',
                          background: `${statusColors[outcome.status] ?? 'transparent'}18`,
                          borderRadius: '999px', padding: '1px 7px',
                          border: `1px solid ${statusColors[outcome.status] ?? 'transparent'}44`
                        }}>
                          {outcome.status}
                        </span>
                        {linkedGoal && (
                          <span style={{ fontSize: '0.63rem', color: 'var(--accent-purple)', background: 'rgba(139,92,246,0.1)', borderRadius: '999px', padding: '1px 7px' }}>
                            ↗ {linkedGoal.title.slice(0, 25)}{linkedGoal.title.length > 25 ? '…' : ''}
                          </span>
                        )}
                      </div>

                      {outcome.desiredOutcome && (
                        <p style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                          {outcome.desiredOutcome}
                        </p>
                      )}

                      {/* Progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, outcome.progressPercentage)}%`,
                            background: outcome.progressPercentage >= 100
                              ? 'linear-gradient(90deg, var(--accent-teal, #2dd4bf), var(--accent-cyan))'
                              : 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
                            borderRadius: '999px',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {Math.round(outcome.progressPercentage)}%
                        </span>
                      </div>

                      {(outcome.metricOrDeliverable || outcome.plannedEffortHours > 0) && (
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                          {outcome.metricOrDeliverable && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              📏 {outcome.metricOrDeliverable}
                            </span>
                          )}
                          {outcome.plannedEffortHours > 0 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              ⏱ {outcome.plannedEffortHours}h planned
                            </span>
                          )}
                        </div>
                      )}

                      {outcome.risks && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.35rem' }}>
                          <AlertTriangle size={11} style={{ color: 'var(--accent-orange, #f97316)' }} />
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{outcome.risks}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-start', flexShrink: 0 }}>
                    <input
                      className="glass-input"
                      type="number"
                      min="0" max="100"
                      style={{ width: '65px', padding: '0.22rem 0.4rem', fontSize: '0.75rem' }}
                      placeholder="%"
                      value={progressInputs[outcome.id] ?? ''}
                      onChange={e => setProgressInputs(prev => ({ ...prev, [outcome.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleUpdateProgress(outcome)}
                    />
                    <button
                      className="glass-btn btn-cyan"
                      style={{ padding: '0.22rem 0.5rem', fontSize: '0.72rem' }}
                      onClick={() => handleUpdateProgress(outcome)}
                      disabled={isUpdating}
                      type="button"
                    >
                      {isUpdating ? <Loader2 size={11} className="spin" /> : 'Set'}
                    </button>
                    <select
                      className="glass-input"
                      style={{ padding: '0.22rem 0.35rem', fontSize: '0.7rem', height: 'auto', width: 'auto' }}
                      value={outcome.status}
                      onChange={e => handleStatusChange(outcome, e.target.value as GoalStatus)}
                    >
                      {['draft', 'active', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      className="glass-btn"
                      style={{ padding: '0.22rem', color: 'var(--accent-magenta)' }}
                      onClick={() => handleDeleteOutcome(outcome)}
                      disabled={isDeleting}
                      type="button"
                    >
                      {isDeleting ? <Loader2 size={12} className="spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Panel */}
      {plan.status === 'active' && latestReview && (
        <div className="glass-panel planner-section">
          <div className="planner-section-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} className="text-cyan" />
              <h3>Monthly Review</h3>
            </div>
          </div>
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
        </div>
      )}

      {/* AI Planning Assistant Panel — only shown for active/draft monthly plans */}
      {(plan.status === 'active' || plan.status === 'draft') && (
        <div className="planner-section">
          <AiSuggestionsPanel
            workspaceId={workspaceId}
            quarterId={plan.quarterId || undefined}
            monthlyPlanId={plan.id}
            onApplyChange={async (change) => {
              if (change.operation === 'update_priority' && change.entityId && change.proposedValue) {
                if (change.entityType === 'quarterly_goal') {
                  await cloudRunClient.plannerApi.updateGoal(change.entityId, {
                    workspaceId,
                    priority: change.proposedValue as string
                  });
                }
                onPlanUpdated();
              }
            }}
          />
        </div>
      )}

      {showOutcomeModal && (
        <CreateOutcomeModal
          workspaceId={workspaceId}
          userId={userId}
          monthlyPlanId={plan.id}
          linkedGoals={linkedGoals}
          onCreated={() => { setShowOutcomeModal(false); onPlanUpdated(); }}
          onClose={() => setShowOutcomeModal(false)}
        />
      )}
    </div>
  );
};
