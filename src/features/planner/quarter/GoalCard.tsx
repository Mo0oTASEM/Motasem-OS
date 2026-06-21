import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Edit2, Plus, Save, Trash2,
  Loader2, CheckCircle2, AlertTriangle, TrendingUp, Minus, Sparkles, X
} from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import type { QuarterlyGoalWithKeyResults, KeyResult, GoalStatus } from '../types';
import { CreateKeyResultModal } from '../modals/CreateKeyResultModal';

interface Props {
  goal: QuarterlyGoalWithKeyResults;
  workspaceId: string;
  userId: string;
  onGoalUpdated: () => void;
  onGoalDeleted: (id: string) => void;
}

const statusColors: Record<GoalStatus, string> = {
  draft: 'var(--text-muted)',
  active: 'var(--accent-cyan)',
  on_track: 'var(--accent-teal, #2dd4bf)',
  at_risk: 'var(--accent-orange, #f97316)',
  behind: 'var(--accent-magenta)',
  completed: 'var(--accent-teal, #2dd4bf)',
  cancelled: 'var(--text-muted)'
};

const statusLabels: Record<GoalStatus, string> = {
  draft: 'Draft', active: 'Active', on_track: 'On Track',
  at_risk: 'At Risk', behind: 'Behind', completed: 'Completed', cancelled: 'Cancelled'
};

const priorityColors: Record<string, string> = {
  critical: 'var(--accent-magenta)',
  high: 'var(--accent-orange, #f97316)',
  medium: 'var(--accent-cyan)',
  low: 'var(--text-muted)'
};

const formatKRProgress = (kr: KeyResult): string => {
  if (kr.progressType === 'boolean') return kr.currentValue ? 'Done' : 'Not done';
  if (kr.progressType === 'manual' || kr.progressType === 'percentage') return `${Math.round(kr.progressPercentage)}%`;
  if (kr.unit) return `${kr.currentValue ?? 0} / ${kr.targetValue ?? 100} ${kr.unit}`;
  return `${kr.currentValue ?? 0} / ${kr.targetValue ?? 100}`;
};

export const GoalCard: React.FC<Props> = ({ goal, workspaceId, userId, onGoalUpdated, onGoalDeleted }) => {
  const [expanded, setExpanded] = useState(false);
  const [showKRModal, setShowKRModal] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState(false);
  const [updatingKR, setUpdatingKR] = useState<string | null>(null);
  const [progressInputs, setProgressInputs] = useState<Record<string, string>>({});
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [editGoalTitle, setEditGoalTitle] = useState(goal.title);
  const [editGoalDesc, setEditGoalDesc] = useState(goal.description ?? '');
  const [editGoalCategory, setEditGoalCategory] = useState(goal.category ?? '');
  const [editGoalPriority, setEditGoalPriority] = useState<string>(goal.priority);
  const [editGoalConfidence, setEditGoalConfidence] = useState(String(goal.confidenceScore ?? ''));
  const [savingGoalEdit, setSavingGoalEdit] = useState(false);

  const handleFetchInsights = async () => {
    if (showInsights) {
      setShowInsights(false);
      return;
    }
    if (insights.length > 0) {
      setShowInsights(true);
      return;
    }
    setLoadingInsights(true);
    try {
      const res = await cloudRunClient.plannerApi.aiGoalInsights({
        workspaceId,
        goalId: goal.id
      });
      if (res.suggestions && res.suggestions.length > 0) {
        const suggestions = res.suggestions as unknown as Array<{ title: string; explanation: string }>;
        const tips = suggestions.map(s => `${s.title}: ${s.explanation}`);
        setInsights(tips);
      } else {
        setInsights(['No specific insights generated yet. Keep key results updated to get tailored tips.']);
      }
      setShowInsights(true);
    } catch (err) {
      alert((err as Error).message || 'Failed to fetch insights.');
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!confirm(`Delete goal "${goal.title}"? This cannot be undone.`)) return;
    setDeletingGoal(true);
    try {
      await cloudRunClient.plannerApi.deleteGoal(goal.id, workspaceId);
      onGoalDeleted(goal.id);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setDeletingGoal(false);
    }
  };

  const handleUpdateKRProgress = async (kr: KeyResult) => {
    const raw = progressInputs[kr.id];
    if (raw === undefined || raw === '') return;
    const val = parseFloat(raw);
    if (isNaN(val)) return;
    setUpdatingKR(kr.id);
    try {
      await cloudRunClient.plannerApi.updateKeyResultProgress(kr.id, {
        workspaceId, currentValue: val
      });
      setProgressInputs(prev => ({ ...prev, [kr.id]: '' }));
      onGoalUpdated();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUpdatingKR(null);
    }
  };

  const handleToggleBooleanKR = async (kr: KeyResult) => {
    setUpdatingKR(kr.id);
    try {
      await cloudRunClient.plannerApi.updateKeyResultProgress(kr.id, {
        workspaceId, currentValue: kr.currentValue ? 0 : 1
      });
      onGoalUpdated();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUpdatingKR(null);
    }
  };

  const handleDeleteKR = async (kr: KeyResult) => {
    if (!confirm(`Delete key result "${kr.title}"?`)) return;
    try {
      await cloudRunClient.plannerApi.deleteKeyResult(kr.id, workspaceId);
      onGoalUpdated();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleSaveGoalEdit = async () => {
    if (!editGoalTitle.trim()) return;
    setSavingGoalEdit(true);
    try {
      await cloudRunClient.plannerApi.updateGoal(goal.id, {
        workspaceId,
        title: editGoalTitle.trim(),
        description: editGoalDesc.trim() || undefined,
        category: editGoalCategory.trim() || undefined,
        priority: editGoalPriority,
        confidenceScore: editGoalConfidence ? Number(editGoalConfidence) : undefined
      });
      setEditingGoal(false);
      onGoalUpdated();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingGoalEdit(false);
    }
  };

  const handleStatusChange = async (status: GoalStatus) => {
    try {
      await cloudRunClient.plannerApi.updateGoal(goal.id, { workspaceId, status });
      onGoalUpdated();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const progress = goal.progressPercentage;
  const statusColor = statusColors[goal.status] || 'var(--text-muted)';

  return (
    <article className="planner-goal-card glass-panel">
      {/* Header */}
      <div className="planner-goal-card-head">
        <button
          className="planner-goal-expand-btn"
          onClick={() => setExpanded(prev => !prev)}
          type="button"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="planner-goal-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '0.95rem' }}>{goal.title}</strong>
            <span className="badge" style={{ background: `${statusColor}22`, color: statusColor, borderColor: `${statusColor}44`, fontSize: '0.65rem' }}>
              {statusLabels[goal.status]}
            </span>
            <span className="badge badge-purple" style={{ fontSize: '0.6rem', color: priorityColors[goal.priority] }}>
              {goal.priority}
            </span>
            {goal.category && (
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', borderRadius: '999px', padding: '1px 7px', border: '1px solid var(--panel-border)' }}>
                {goal.category}
              </span>
            )}
          </div>
          {goal.description && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.4 }}>{goal.description}</p>
          )}
        </div>

        {/* Progress */}
        <div className="planner-goal-progress-block">
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: progress >= 100 ? 'var(--accent-teal, #2dd4bf)' : progress > 50 ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
            {Math.round(progress)}%
          </span>
          <div className="planner-progress-bar">
            <div className="planner-progress-fill" style={{ width: `${Math.min(100, progress)}%`, background: progress >= 100 ? 'linear-gradient(90deg, var(--accent-teal, #2dd4bf), var(--accent-cyan))' : undefined }} />
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {goal.keyResults.length} KR{goal.keyResults.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0, alignItems: 'center' }}>
          <button
            className="glass-btn"
            style={{ padding: '0.3rem' }}
            onClick={() => { setEditingGoal(true); setEditGoalTitle(goal.title); setEditGoalDesc(goal.description ?? ''); setEditGoalCategory(goal.category ?? ''); setEditGoalPriority(goal.priority); setEditGoalConfidence(String(goal.confidenceScore ?? '')); }}
            title="Edit goal"
            type="button"
          >
            <Edit2 size={13} />
          </button>
          <button
            className={`glass-btn ${showInsights ? 'btn-purple' : ''}`}
            style={{ padding: '0.3rem' }}
            onClick={handleFetchInsights}
            disabled={loadingInsights}
            title="Get AI Insights"
            type="button"
          >
            {loadingInsights ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} style={{ color: 'var(--accent-purple, #a78bfa)' }} />}
          </button>
          <select
            className="glass-input"
            style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem', height: 'auto', width: 'auto', minWidth: 0 }}
            value={goal.status}
            onChange={e => handleStatusChange(e.target.value as GoalStatus)}
            title="Update goal status"
          >
            {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button
            className="glass-btn"
            style={{ padding: '0.3rem', color: 'var(--accent-magenta)' }}
            onClick={handleDeleteGoal}
            disabled={deletingGoal}
            title="Delete goal"
            type="button"
          >
            {deletingGoal ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
          </button>
        </div>
      </div>

      {/* Confidence */}
      {goal.confidenceScore !== undefined && (
        <div style={{ padding: '0 1.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={12} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Confidence: {goal.confidenceScore}%</span>
        </div>
      )}

      {/* Edit Goal Inline Form */}
      {editingGoal && (
        <div style={{ margin: '0 1.25rem 0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Edit Goal</span>
            <button className="glass-btn" onClick={() => setEditingGoal(false)} type="button" style={{ padding: '0.2rem' }}><X size={12} /></button>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Title</span>
            <input className="glass-input" value={editGoalTitle} onChange={e => setEditGoalTitle(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Description</span>
            <textarea className="glass-input" value={editGoalDesc} onChange={e => setEditGoalDesc(e.target.value)} rows={2} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Category</span>
              <input className="glass-input" value={editGoalCategory} onChange={e => setEditGoalCategory(e.target.value)} placeholder="e.g. Health, Work" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Priority</span>
              <select className="glass-input" value={editGoalPriority} onChange={e => setEditGoalPriority(e.target.value)} style={{ padding: '0.4rem 0.5rem' }}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Confidence %</span>
              <input className="glass-input" type="number" min={0} max={100} value={editGoalConfidence} onChange={e => setEditGoalConfidence(e.target.value)} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="glass-btn" onClick={() => setEditingGoal(false)} type="button" disabled={savingGoalEdit} style={{ fontSize: '0.75rem' }}>Cancel</button>
            <button className="glass-btn btn-cyan" onClick={handleSaveGoalEdit} disabled={savingGoalEdit || !editGoalTitle.trim()} type="button" style={{ fontSize: '0.75rem' }}>
              {savingGoalEdit ? <Loader2 size={12} className="spin" /> : <Save size={12} />}
              {savingGoalEdit ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* AI Insights block */}
      {showInsights && insights.length > 0 && (
        <div className="planner-goal-insights-block" style={{
          margin: '0rem 1.25rem 0.75rem',
          padding: '0.75rem',
          background: 'rgba(139, 92, 246, 0.06)',
          borderLeft: '3px solid var(--accent-purple, #8b5cf6)',
          borderRadius: 'var(--radius-sm, 6px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={13} style={{ color: 'var(--accent-purple, #c084fc)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-purple, #c084fc)' }}>AI Execution Insights</span>
          </div>
          {insights.map((insight, index) => (
            <p key={index} style={{ fontSize: '0.76rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
              {insight}
            </p>
          ))}
        </div>
      )}

      {/* Expanded: Key Results */}
      {expanded && (
        <div className="planner-goal-krs">
          <div className="planner-kr-list-head">
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Key Results</span>
            <button className="glass-btn" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} type="button" onClick={() => setShowKRModal(true)}>
              <Plus size={12} /> Add KR
            </button>
          </div>

          {goal.keyResults.length === 0 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
              No key results yet. Add measurable outcomes to track this goal.
            </p>
          )}

          {goal.keyResults.map(kr => {
            const krProgress = kr.progressPercentage;
            const isBool = kr.progressType === 'boolean';
            const isUpdating = updatingKR === kr.id;

            return (
              <div key={kr.id} className="planner-kr-row">
                <div className="planner-kr-meta">
                  {isBool ? (
                    <button
                      className={`planner-kr-check ${kr.currentValue ? 'checked' : ''}`}
                      onClick={() => handleToggleBooleanKR(kr)}
                      disabled={isUpdating}
                      type="button"
                      title={kr.currentValue ? 'Mark as not done' : 'Mark as done'}
                    >
                      {isUpdating ? <Loader2 size={13} className="spin" /> : <CheckCircle2 size={13} />}
                    </button>
                  ) : (
                    <div className="planner-kr-progress-mini">
                      <div style={{ width: `${Math.min(100, krProgress)}%` }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.83rem', fontWeight: 500 }}>{kr.title}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.1rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>
                        {formatKRProgress(kr)}
                      </span>
                      {kr.dueDate && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          · due {new Date(kr.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!isBool && kr.progressType !== 'manual' && (
                  <div className="planner-kr-update">
                    <input
                      className="glass-input"
                      type="number"
                      style={{ width: '80px', padding: '0.2rem 0.4rem', fontSize: '0.78rem' }}
                      placeholder={`${kr.currentValue ?? 0}`}
                      value={progressInputs[kr.id] ?? ''}
                      onChange={e => setProgressInputs(prev => ({ ...prev, [kr.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleUpdateKRProgress(kr)}
                    />
                    <button
                      className="glass-btn btn-cyan"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                      onClick={() => handleUpdateKRProgress(kr)}
                      disabled={isUpdating}
                      type="button"
                    >
                      {isUpdating ? <Loader2 size={11} className="spin" /> : 'Update'}
                    </button>
                  </div>
                )}

                {kr.progressType === 'manual' && (
                  <div className="planner-kr-update">
                    <input
                      className="glass-input"
                      type="number"
                      min="0"
                      max="100"
                      style={{ width: '70px', padding: '0.2rem 0.4rem', fontSize: '0.78rem' }}
                      placeholder="0-100"
                      value={progressInputs[kr.id] ?? ''}
                      onChange={e => setProgressInputs(prev => ({ ...prev, [kr.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleUpdateKRProgress(kr)}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>%</span>
                    <button
                      className="glass-btn btn-cyan"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                      onClick={() => handleUpdateKRProgress(kr)}
                      disabled={isUpdating}
                      type="button"
                    >
                      {isUpdating ? <Loader2 size={11} className="spin" /> : 'Set'}
                    </button>
                  </div>
                )}

                <button
                  className="glass-btn"
                  style={{ padding: '0.2rem', color: 'var(--text-muted)' }}
                  onClick={() => handleDeleteKR(kr)}
                  title="Delete key result"
                  type="button"
                >
                  <Minus size={12} />
                </button>
              </div>
            );
          })}

          {/* Success criteria & risks */}
          {(goal.successCriteria || goal.risks) && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {goal.successCriteria && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={13} style={{ color: 'var(--accent-teal, #2dd4bf)', marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.77rem', color: 'var(--text-secondary)' }}>{goal.successCriteria}</span>
                </div>
              )}
              {goal.risks && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <AlertTriangle size={13} style={{ color: 'var(--accent-orange, #f97316)', marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.77rem', color: 'var(--text-secondary)' }}>{goal.risks}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showKRModal && (
        <CreateKeyResultModal
          workspaceId={workspaceId}
          userId={userId}
          goalId={goal.id}
          onCreated={() => { setShowKRModal(false); onGoalUpdated(); }}
          onClose={() => setShowKRModal(false)}
        />
      )}
    </article>
  );
};
