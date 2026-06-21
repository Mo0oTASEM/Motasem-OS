import React, { useEffect, useState, useCallback } from 'react';
import { CalendarDays, Edit2, Loader2, Plus, Sparkles, Check, Play, Save, Trash2, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import type { WeeklyPlan, WeeklyObjective, MonthlyPlan, MonthlyOutcome, Task } from '../types';
import { PlannerEmptyState, PlannerErrorState, PlannerLoadingState, PlannerSectionCard, PlannerTaskCard } from './PlannerPrimitives';
import { isDateKeyBetween, parseDateKey, taskDateKey, toLocalDateKey } from '../utils/date';

interface WeeklyPlanningViewProps {
  workspaceId: string;
  userId: string;
}

export const WeeklyPlanningView: React.FC<WeeklyPlanningViewProps> = ({ workspaceId, userId }) => {
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<WeeklyPlan | null>(null);
  const [objectives, setObjectives] = useState<WeeklyObjective[]>([]);
  const [outcomes, setOutcomes] = useState<MonthlyOutcome[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ritual stepper
  const [ritualActive, setRitualActive] = useState(false);
  const [ritualStep, setRitualStep] = useState(1); // 1: Capacity, 2: Objectives, 3: Review & Activate

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlan, setNewPlan] = useState({
    year: new Date().getFullYear(),
    weekNumber: 1,
    startDate: '',
    endDate: '',
    totalAvailableHours: 40,
    fixedCommitmentHours: 10,
    deepWorkHours: 15,
    bufferHours: 5,
    notes: ''
  });

  // Objective form state
  const [showObjForm, setShowObjForm] = useState(false);
  const [newObj, setNewObj] = useState({
    title: '',
    description: '',
    monthlyOutcomeId: '',
    priority: 'medium',
    estimatedEffortHours: 2,
    dueDate: '',
    status: 'draft'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Undo memory
  const [lastDeletedObjective, setLastDeletedObjective] = useState<WeeklyObjective | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);
  const [editObjTitle, setEditObjTitle] = useState('');
  const [editObjDesc, setEditObjDesc] = useState('');
  const [editObjPriority, setEditObjPriority] = useState('medium');
  const [editObjEffort, setEditObjEffort] = useState('2');
  const [savingObjEdit, setSavingObjEdit] = useState(false);

  const handleSelectPlan = useCallback(async (plan: WeeklyPlan) => {
    setSelectedPlan(plan);
    try {
      setError(null);
      const res = await cloudRunClient.plannerApi.listWeeklyObjectives(workspaceId, plan.id);
      setObjectives((res.objectives || []) as unknown as WeeklyObjective[]);
      const taskRes = await cloudRunClient.plannerApi.listTasks(workspaceId);
      setTasks((taskRes.tasks || []) as unknown as Task[]);
    } catch (e) {
      setError((e as Error).message || 'Weekly planner data could not load.');
    }
  }, [workspaceId]);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await cloudRunClient.plannerApi.listWeeklyPlans(workspaceId);
      const plansList = (res.weeklyPlans || []) as unknown as WeeklyPlan[];
      setPlans(plansList);
      
      // Auto-select active plan or first plan
      const active = plansList.find((p) => p.status === 'active') || plansList[0];
      if (active) {
        handleSelectPlan(active);
      }

      // Load monthly outcomes to link objectives
      const monthsRes = await cloudRunClient.plannerApi.listMonthlyPlans(workspaceId);
      const monthsList = (monthsRes.monthlyPlans || []) as unknown as MonthlyPlan[];
      const activeMonth = monthsList.find((m) => m.status === 'active') || monthsList[0];
      if (activeMonth) {
        const outRes = await cloudRunClient.plannerApi.listOutcomes(activeMonth.id as string, workspaceId);
        setOutcomes((outRes.monthlyOutcomes || []) as unknown as MonthlyOutcome[]);
      }
    } catch (e) {
      setError((e as Error).message || 'Weekly plans could not load.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, handleSelectPlan]);

  useEffect(() => {
    let active = true;
    const trigger = async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (active) {
        loadPlans();
      }
    };
    trigger();
    return () => { active = false; };
  }, [workspaceId, loadPlans]);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await cloudRunClient.plannerApi.createWeeklyPlan({
        ...newPlan,
        workspaceId,
        userId,
        status: 'draft'
      });
      const createdPlan = res.weeklyPlan as unknown as WeeklyPlan;
      setShowCreateModal(false);
      triggerToast('Weekly plan created successfully!');
      loadPlans();
      handleSelectPlan(createdPlan);
      // Start the ritual stepper automatically
      setRitualActive(true);
      setRitualStep(1);
    } catch {
      // Silently handled — errors shown via triggerToast
    }
  };

  const handleUpdateCapacity = async () => {
    if (!selectedPlan) return;
    try {
      const updated = await cloudRunClient.plannerApi.updateWeeklyPlan(selectedPlan.id, {
        workspaceId,
        totalAvailableHours: selectedPlan.totalAvailableHours,
        fixedCommitmentHours: selectedPlan.fixedCommitmentHours,
        deepWorkHours: selectedPlan.deepWorkHours,
        bufferHours: selectedPlan.bufferHours,
        notes: selectedPlan.notes
      });
      setSelectedPlan(updated.weeklyPlan as unknown as WeeklyPlan);
      triggerToast('Capacity configuration updated.');
      setRitualStep(2);
    } catch {
      // Silently handled
    }
  };

  const handleAddObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setFormError(null);
    if (!newObj.title.trim()) {
      setFormError('Objective Title is required.');
      return;
    }

    try {
      const res = await cloudRunClient.plannerApi.createWeeklyObjective({
        ...newObj,
        weeklyPlanId: selectedPlan.id,
        workspaceId,
        ownerId: userId
      });
      const createdObj = res.weeklyObjective as unknown as WeeklyObjective;
      setObjectives(prev => [...prev, createdObj]);
      setShowObjForm(false);
      setNewObj({
        title: '',
        description: '',
        monthlyOutcomeId: '',
        priority: 'medium',
        estimatedEffortHours: 2,
        dueDate: '',
        status: 'draft'
      });
      triggerToast('Weekly objective added.');
    } catch (err) {
      setFormError((err as Error).message || 'Failed to create objective.');
    }
  };

  const handleDeleteObjective = async (id: string) => {
    const toDelete = objectives.find(o => o.id === id);
    if (!toDelete) return;

    try {
      await cloudRunClient.plannerApi.deleteWeeklyObjective(id, workspaceId);
      setObjectives(prev => prev.filter(o => o.id !== id));
      setLastDeletedObjective(toDelete);
      setShowUndoToast(true);
      setTimeout(() => setShowUndoToast(false), 5000);
      triggerToast('Objective deleted.');
    } catch {
      // Silently handled
    }
  };

  const handleUndoDelete = async () => {
    if (!lastDeletedObjective) return;
    try {
      const res = await cloudRunClient.plannerApi.createWeeklyObjective({
        ...lastDeletedObjective,
        workspaceId,
        ownerId: userId
      });
      const createdObj = res.weeklyObjective as unknown as WeeklyObjective;
      setObjectives(prev => [...prev, createdObj]);
      setShowUndoToast(false);
      setLastDeletedObjective(null);
      triggerToast('Restored deleted objective.');
    } catch {
      // Silently handled
    }
  };

  const handleSaveObjEdit = async (id: string) => {
    if (!editObjTitle.trim()) return;
    setSavingObjEdit(true);
    try {
      await cloudRunClient.plannerApi.updateWeeklyObjective(id, {
        workspaceId,
        title: editObjTitle.trim(),
        description: editObjDesc.trim() || undefined,
        priority: editObjPriority,
        estimatedEffortHours: Number(editObjEffort) || 0
      });
      setEditingObjectiveId(null);
      loadPlans();
    } catch {
      triggerToast('Failed to update objective.');
    } finally {
      setSavingObjEdit(false);
    }
  };

  const handleActivatePlan = async () => {
    if (!selectedPlan) return;
    try {
      const res = await cloudRunClient.plannerApi.activateWeeklyPlan(selectedPlan.id, workspaceId);
      setSelectedPlan(res.weeklyPlan as unknown as WeeklyPlan);
      setRitualActive(false);
      triggerToast('Weekly plan is now ACTIVE! Let\'s go!');
      loadPlans();
    } catch {
      // Silently handled
    }
  };

  const handleDeleteWeeklyPlan = async () => {
    if (!selectedPlan) return;
    if (!confirm(`Delete Week ${selectedPlan.weekNumber} plan (${selectedPlan.startDate} to ${selectedPlan.endDate})? This cannot be undone.`)) return;
    try {
      await cloudRunClient.plannerApi.deleteWeeklyPlan(selectedPlan.id, workspaceId);
      setPlans(prev => prev.filter(p => p.id !== selectedPlan.id));
      setSelectedPlan(null);
      triggerToast('Weekly plan deleted.');
    } catch {
      triggerToast('Failed to delete weekly plan.');
    }
  };

  // Auto-generate week date ranges based on year and week number
  const handleWeekNumChange = (weekNum: number) => {
    const d = new Date(newPlan.year, 0, 1 + (weekNum - 1) * 7);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(d.setDate(diff + 6));
    
    setNewPlan(prev => ({
      ...prev,
      weekNumber: weekNum,
      startDate: toLocalDateKey(monday),
      endDate: toLocalDateKey(sunday)
    }));
  };

  const selectedWeekTasks = selectedPlan
    ? tasks.filter(task => {
        const dateKey = taskDateKey(task);
        return dateKey && isDateKeyBetween(dateKey, selectedPlan.startDate, selectedPlan.endDate);
      })
    : [];

  const weekDays = selectedPlan
    ? Array.from({ length: 7 }, (_, index) => {
        const date = parseDateKey(selectedPlan.startDate);
        date.setDate(date.getDate() + index);
        const key = toLocalDateKey(date);
        return {
          key,
          label: date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
          tasks: selectedWeekTasks.filter(task => taskDateKey(task) === key)
        };
      })
    : [];

  if (loading) {
    return <PlannerLoadingState message="Loading weekly planner..." />;
  }

  if (error && !selectedPlan) {
    return (
      <PlannerErrorState
        message={error}
        action={<button className="glass-btn btn-cyan" type="button" onClick={loadPlans}>Retry</button>}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
      {error && (
        <div className="planner-state planner-state-error" role="alert" style={{ minHeight: 'auto', alignItems: 'flex-start', textAlign: 'left' }}>
          <strong>Weekly planner action failed</strong>
          <span>{error}</span>
        </div>
      )}
      
      {/* Toast Notifier */}
      {successToast && (
        <div className="glass-panel" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(45, 212, 191, 0.15)',
          borderLeft: '4px solid var(--accent-teal, #2dd4bf)',
          padding: '0.75rem 1.25rem',
          zIndex: 1000,
          animation: 'fade-in 0.2s ease'
        }}>
          <span style={{ fontSize: '0.85rem', color: '#fff' }}>{successToast}</span>
        </div>
      )}

      {/* Undo Toast */}
      {showUndoToast && (
        <div className="glass-panel" style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'rgba(244, 63, 94, 0.15)',
          borderLeft: '4px solid var(--accent-magenta, #f43f5e)',
          padding: '0.75rem 1.25rem',
          zIndex: 1000,
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.85rem', color: '#fff' }}>Objective deleted.</span>
          <button
            onClick={handleUndoDelete}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-cyan)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Undo
          </button>
        </div>
      )}

      {/* Header bar controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Select Week:</span>
          <select
            className="glass-input"
            style={{ padding: '0.4rem 1rem', width: '220px' }}
            value={selectedPlan?.id || ''}
            onChange={(e) => {
              const matched = plans.find(p => p.id === e.target.value);
              if (matched) handleSelectPlan(matched);
            }}
          >
            <option value="" disabled>-- Choose a Weekly Plan --</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>
                Week {p.weekNumber} ({p.year}) - {p.status.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="glass-btn btn-cyan" onClick={() => {
            const currentWeek = Math.ceil(((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
            handleWeekNumChange(currentWeek);
            setShowCreateModal(true);
          }}>
            <Plus size={14} style={{ marginRight: '4px' }} /> Plan a New Week
          </button>
          {selectedPlan && !ritualActive && (
            <button className="glass-btn" onClick={() => {
              setRitualActive(true);
              setRitualStep(1);
            }}>
              <Play size={14} style={{ marginRight: '4px' }} /> Start Weekly Ritual
            </button>
          )}
        </div>
      </div>

      {ritualActive && selectedPlan ? (
        /* ── Weekly Planning Ritual Stepper ── */
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} className="text-cyan" />
              Weekly Planning Ritual: Week {selectedPlan.weekNumber}
            </h3>
            <button className="glass-btn text-muted" onClick={() => setRitualActive(false)}>Cancel Ritual</button>
          </div>

          {/* Steps Indicator */}
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: ritualStep === 1 ? 1 : 0.5 }}>
              <span className="badge badge-cyan" style={{ borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Capacity Configuration</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: ritualStep === 2 ? 1 : 0.5 }}>
              <span className="badge badge-purple" style={{ borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Weekly Objectives</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: ritualStep === 3 ? 1 : 0.5 }}>
              <span className="badge badge-teal" style={{ borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Activate Plan</span>
            </div>
          </div>

          {/* Stepper Content */}
          {ritualStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Configure your week's working capacity. Estimate the hours you can dedicate to tasks, meetings, deep work, and buffer.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Available Hours</label>
                  <input
                    type="number"
                    className="glass-input"
                    value={selectedPlan.totalAvailableHours || 0}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, totalAvailableHours: Number(e.target.value) })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fixed Commitments (h)</label>
                  <input
                    type="number"
                    className="glass-input"
                    value={selectedPlan.fixedCommitmentHours || 0}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, fixedCommitmentHours: Number(e.target.value) })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Core Deep Work Target (h)</label>
                  <input
                    type="number"
                    className="glass-input"
                    value={selectedPlan.deepWorkHours || 0}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, deepWorkHours: Number(e.target.value) })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Buffer / Admin Hours</label>
                  <input
                    type="number"
                    className="glass-input"
                    value={selectedPlan.bufferHours || 0}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, bufferHours: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Planning Notes</label>
                <textarea
                  className="glass-input"
                  style={{ minHeight: '60px' }}
                  value={selectedPlan.notes || ''}
                  onChange={(e) => setSelectedPlan({ ...selectedPlan, notes: e.target.value })}
                  placeholder="Focus theme, personal commitments, or key notes for the week..."
                />
              </div>

              <button className="glass-btn btn-cyan" style={{ alignSelf: 'flex-end' }} onClick={handleUpdateCapacity}>
                Save & Continue to Objectives <ArrowRight size={14} style={{ marginLeft: '4px' }} />
              </button>
            </div>
          )}

          {ritualStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Define the core objectives for this week. Link them to active Monthly Outcomes to maintain alignment.
                </p>
                <button className="glass-btn btn-cyan" onClick={() => setShowObjForm(true)}>
                  <Plus size={14} style={{ marginRight: '4px' }} /> Add Objective
                </button>
              </div>

              {/* Objectives List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {objectives.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '2rem 0', textAlign: 'center', border: '1px dashed var(--panel-border)' }}>
                    No objectives defined yet. Click "Add Objective" to start.
                  </div>
                ) : (
                  objectives.map(obj => (
                    <div key={obj.id} className="glass-panel" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>{obj.title}</h4>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Priority: {obj.priority.toUpperCase()} | Estimate: {obj.estimatedEffortHours}h
                        </span>
                      </div>
                      <button className="icon-btn-danger" onClick={() => handleDeleteObjective(obj.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <button className="glass-btn" onClick={() => setRitualStep(1)}>
                  <ArrowLeft size={14} style={{ marginRight: '4px' }} /> Back to Capacity
                </button>
                <button className="glass-btn btn-cyan" onClick={() => setRitualStep(3)} disabled={objectives.length === 0}>
                  Review & Activate <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                </button>
              </div>
            </div>
          )}

          {ritualStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Review your weekly configuration and objectives. Activating this plan will make it your active dashboard.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                {/* Left: Capacity */}
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', margin: '0 0 0.75rem 0' }}>Week Settings</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total Available:</span> <span>{selectedPlan.totalAvailableHours}h</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Commitments:</span> <span>{selectedPlan.fixedCommitmentHours}h</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Deep Work:</span> <span>{selectedPlan.deepWorkHours}h</span>
                    </div>
                  </div>
                </div>

                {/* Right: Objectives */}
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-purple)', margin: '0 0 0.75rem 0' }}>Objectives</h4>
                  <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {objectives.map(o => (
                      <li key={o.id}>{o.title}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <button className="glass-btn" onClick={() => setRitualStep(2)}>
                  <ArrowLeft size={14} style={{ marginRight: '4px' }} /> Back to Objectives
                </button>
                <button className="glass-btn btn-cyan" onClick={handleActivatePlan}>
                  <Check size={14} style={{ marginRight: '4px' }} /> Activate Weekly Plan
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Standard Weekly Plan View ── */
        selectedPlan && (
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
                  Week {selectedPlan.weekNumber} Plan ({selectedPlan.year})
                </h3>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {selectedPlan.startDate} to {selectedPlan.endDate} | STATUS: {selectedPlan.status.toUpperCase()}
                </span>
              </div>
              {selectedPlan.status === 'draft' && (
                <button className="glass-btn btn-cyan" onClick={() => setRitualActive(true)}>
                  <Play size={14} style={{ marginRight: '4px' }} /> Continue Ritual
                </button>
              )}
              <button className="glass-btn" onClick={handleDeleteWeeklyPlan} type="button" title="Delete weekly plan" style={{ color: 'var(--accent-magenta)' }}>
                <Trash2 size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              
              {/* Capacity Panel */}
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 1rem 0', color: 'var(--accent-cyan)' }}>Capacity Distribution</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Available Working Hours:</span> <span>{selectedPlan.totalAvailableHours}h</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Fixed Commitments / Meetings:</span> <span>{selectedPlan.fixedCommitmentHours}h</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Protected Deep Work hours:</span> <span>{selectedPlan.deepWorkHours}h</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Buffer & Admin targets:</span> <span>{selectedPlan.bufferHours}h</span>
                  </div>
                </div>
              </div>

              {/* Objectives List */}
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, color: 'var(--accent-purple)' }}>Weekly Objectives</h4>
                  <button className="text-cyan-btn" onClick={() => setShowObjForm(true)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.75rem', cursor: 'pointer' }}>
                    + Add
                  </button>
                </div>
                {objectives.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>No objectives defined for this week.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {objectives.map(o => (
                      editingObjectiveId === o.id ? (
                        <div key={o.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)' }}>
                          <input className="glass-input" value={editObjTitle} onChange={e => setEditObjTitle(e.target.value)} placeholder="Objective title" style={{ fontSize: '0.8rem' }} />
                          <input className="glass-input" value={editObjDesc} onChange={e => setEditObjDesc(e.target.value)} placeholder="Description (optional)" style={{ fontSize: '0.8rem' }} />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select className="glass-input" value={editObjPriority} onChange={e => setEditObjPriority(e.target.value)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem', flex: 1 }}>
                              <option value="critical">Critical</option>
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                            <input className="glass-input" type="number" min={0} value={editObjEffort} onChange={e => setEditObjEffort(e.target.value)} placeholder="hrs" style={{ width: '60px', fontSize: '0.75rem' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                            <button className="glass-btn" onClick={() => setEditingObjectiveId(null)} type="button" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>Cancel</button>
                            <button className="glass-btn btn-cyan" onClick={() => handleSaveObjEdit(o.id)} disabled={savingObjEdit || !editObjTitle.trim()} type="button" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                              {savingObjEdit ? <Loader2 size={10} className="spin" /> : <Save size={10} />} Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                          <span style={{ flex: 1 }}>{o.title}</span>
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{o.progressPercentage}%</span>
                            <button className="glass-btn" onClick={() => { setEditingObjectiveId(o.id); setEditObjTitle(o.title); setEditObjDesc(o.description ?? ''); setEditObjPriority(o.priority); setEditObjEffort(String(o.estimatedEffortHours ?? '')); }} type="button" style={{ padding: '0.2rem', border: 'none' }} title="Edit objective">
                              <Edit2 size={11} />
                            </button>
                            <button className="icon-btn-danger" onClick={() => handleDeleteObjective(o.id)}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>

            </div>

            <PlannerSectionCard title="Tasks by Day" icon={CalendarDays}>
              {selectedWeekTasks.length === 0 ? (
                <PlannerEmptyState title="No tasks scheduled this week" message="Tasks with a scheduled time or deadline in this week will appear here." />
              ) : (
                <div className="planner-week-day-grid">
                  {weekDays.map(day => (
                    <section key={day.key} className="planner-week-day-column">
                      <h4>{day.label}</h4>
                      {day.tasks.length === 0 ? (
                        <span className="planner-week-day-empty">No tasks</span>
                      ) : (
                        day.tasks.map(task => (
                          <PlannerTaskCard
                            key={task.id}
                            title={task.title}
                            status={task.status}
                            priority={task.priority}
                            completed={task.status === 'completed'}
                            meta={task.estimatedDurationMinutes ? `${task.estimatedDurationMinutes} min` : task.taskType}
                          />
                        ))
                      )}
                    </section>
                  ))}
                </div>
              )}
            </PlannerSectionCard>
          </div>
        )
      )}

      {/* Create Weekly Plan Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ padding: '2rem', width: '400px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Create Weekly Plan</h3>
            <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Year</label>
                  <input
                    type="number"
                    className="glass-input"
                    value={newPlan.year}
                    onChange={(e) => setNewPlan({ ...newPlan, year: Number(e.target.value) })}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Week Number (1-53)</label>
                  <input
                    type="number"
                    className="glass-input"
                    value={newPlan.weekNumber}
                    min={1}
                    max={53}
                    onChange={(e) => handleWeekNumChange(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Start Date</label>
                  <input
                    type="date"
                    className="glass-input"
                    value={newPlan.startDate}
                    onChange={(e) => setNewPlan({ ...newPlan, startDate: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>End Date</label>
                  <input
                    type="date"
                    className="glass-input"
                    value={newPlan.endDate}
                    onChange={(e) => setNewPlan({ ...newPlan, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="glass-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="glass-btn btn-cyan">Create Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Objective Modal */}
      {showObjForm && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ padding: '2rem', width: '400px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Add Weekly Objective</h3>
            {formError && (
              <div style={{ color: 'var(--accent-magenta)', fontSize: '0.8rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={14} /> {formError}
              </div>
            )}
            <form onSubmit={handleAddObjective} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Objective Title</label>
                <input
                  type="text"
                  className="glass-input"
                  value={newObj.title}
                  onChange={(e) => setNewObj({ ...newObj, title: e.target.value })}
                  placeholder="e.g. Complete core CRM landing page"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Link to Monthly Outcome</label>
                <select
                  className="glass-input"
                  value={newObj.monthlyOutcomeId}
                  onChange={(e) => setNewObj({ ...newObj, monthlyOutcomeId: e.target.value })}
                >
                  <option value="">-- None (Operational / Self-contained) --</option>
                  {outcomes.map(o => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Priority</label>
                  <select
                    className="glass-input"
                    value={newObj.priority}
                    onChange={(e) => setNewObj({ ...newObj, priority: e.target.value })}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Estimated Effort (hours)</label>
                  <input
                    type="number"
                    className="glass-input"
                    value={newObj.estimatedEffortHours}
                    onChange={(e) => setNewObj({ ...newObj, estimatedEffortHours: Number(e.target.value) })}
                    min={1}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="glass-btn" onClick={() => setShowObjForm(false)}>Cancel</button>
                <button type="submit" className="glass-btn btn-cyan">Add Objective</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
