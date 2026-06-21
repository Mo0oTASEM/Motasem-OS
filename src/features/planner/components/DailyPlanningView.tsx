import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, Circle, Trash2, AlertCircle, Sparkles, Undo2 } from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import type { DailyPlan, Task, WeeklyObjective, WeeklyPlan, TaskStatus } from '../types';
import { PlannerErrorState, PlannerLoadingState } from './PlannerPrimitives';
import { toLocalDateKey } from '../utils/date';

interface DailyPlanningViewProps {
  workspaceId: string;
  userId: string;
  setCurrentView: (view: string) => void;
}

export const DailyPlanningView: React.FC<DailyPlanningViewProps> = ({ workspaceId, userId, setCurrentView }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [objectives, setObjectives] = useState<WeeklyObjective[]>([]);

  // Shutdown Ritual state
  const [showShutdown, setShowShutdown] = useState(false);
  const [shutdownForm, setShutdownForm] = useState({
    dailyWin: '',
    blockers: '',
    notes: ''
  });
  const [shutdownError, setShutdownError] = useState<string | null>(null);

  // Task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    taskType: 'goal_aligned',
    priority: 'medium',
    weeklyObjectiveId: '',
    estimatedDurationMinutes: 30,
    isBig3: false,
    deadline: ''
  });

  // Undo Toast state
  const [undoAction, setUndoAction] = useState<{
    type: 'completion' | 'deletion';
    data: { id: string; originalStatus?: string; task?: Task };
  } | null>(null);
  const [showUndo, setShowUndo] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadTodayPlan = useCallback(async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      setLoading(true);
      setError(null);
      const todayStr = toLocalDateKey(new Date());
      
      // Get today's plan
      const planRes = await cloudRunClient.plannerApi.getDailyPlanByDate(todayStr, workspaceId);
      let plan = planRes.dailyPlan as unknown as DailyPlan;
      
      // Find active week for linking
      const weeklyRes = await cloudRunClient.plannerApi.listWeeklyPlans(workspaceId);
      const plans = (weeklyRes.weeklyPlans || []) as unknown as WeeklyPlan[];
      const activeW = plans.find((w) => w.status === 'active') || plans[0];

      if (activeW) {
        const objRes = await cloudRunClient.plannerApi.listWeeklyObjectives(workspaceId, activeW.id as string);
        setObjectives((objRes.objectives || []) as unknown as WeeklyObjective[]);
      }

      // If no plan, auto-provision
      if (!plan && activeW) {
        const createRes = await cloudRunClient.plannerApi.createDailyPlan({
          workspaceId,
          userId,
          weeklyPlanId: activeW.id as string,
          planDate: todayStr,
          status: 'draft'
        });
        plan = createRes.dailyPlan as unknown as DailyPlan;
      }
      
      setDailyPlan(plan);

      // Load tasks
      if (plan) {
        const tasksRes = await cloudRunClient.plannerApi.listTasks(workspaceId, { dailyPlanId: plan.id });
        setTasks((tasksRes.tasks || []) as unknown as Task[]);
      }
    } catch (e) {
      setError((e as Error).message || 'Daily planner data could not load.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, userId]);

  useEffect(() => {
    let active = true;
    const trigger = async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (active) {
        loadTodayPlan();
      }
    };
    trigger();
    return () => { active = false; };
  }, [workspaceId, loadTodayPlan]);

  const handleToggleTask = async (task: Task) => {
    const originalStatus = task.status;
    const nextStatus = originalStatus === 'completed' ? 'in_progress' : 'completed';

    try {
      await cloudRunClient.plannerApi.updateTask(task.id, {
        workspaceId,
        status: nextStatus,
        completedAt: nextStatus === 'completed' ? new Date().toISOString() : null
      });

      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );

      // Store undo data
      setUndoAction({
        type: 'completion',
        data: { id: task.id, originalStatus }
      });
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 5000);

      triggerToast(nextStatus === 'completed' ? 'Task marked as completed.' : 'Task re-opened.');
    } catch (e) {
      setError((e as Error).message || 'Task status could not be updated.');
    }
  };

  const handleUndo = async () => {
    if (!undoAction) return;

    try {
      if (undoAction.type === 'completion') {
        const { id, originalStatus } = undoAction.data;
        await cloudRunClient.plannerApi.updateTask(id, {
          workspaceId,
          status: originalStatus,
          completedAt: originalStatus === 'completed' ? new Date().toISOString() : null
        });
        setTasks(prev =>
          prev.map(t => (t.id === id ? { ...t, status: originalStatus as TaskStatus } : t))
        );
        triggerToast('Action undone.');
      } else if (undoAction.type === 'deletion' && undoAction.data.task) {
        const deletedTask = undoAction.data.task;
        const res = await cloudRunClient.plannerApi.createTask({
          title: deletedTask.title,
          description: deletedTask.description,
          taskType: deletedTask.taskType,
          priority: deletedTask.priority,
          estimatedDurationMinutes: deletedTask.estimatedDurationMinutes,
          deadline: deletedTask.deadline,
          scheduledStart: deletedTask.scheduledStart,
          scheduledEnd: deletedTask.scheduledEnd,
          isBig3: deletedTask.isBig3,
          dailyPlanId: deletedTask.dailyPlanId,
          weeklyObjectiveId: deletedTask.weeklyObjectiveId,
          monthlyOutcomeId: deletedTask.monthlyOutcomeId,
          quarterlyGoalId: deletedTask.quarterlyGoalId,
          workspaceId
        });
        setTasks(prev => [...prev, res.task as unknown as Task]);
        triggerToast('Deleted task restored.');
      }
    } catch (e) {
      setError((e as Error).message || 'Undo failed.');
    } finally {
      setShowUndo(false);
      setUndoAction(null);
    }
  };

  const handleDeleteTask = async (id: string) => {
    const toDelete = tasks.find(t => t.id === id);
    if (!toDelete) return;

    try {
      await cloudRunClient.plannerApi.deleteTask(id, workspaceId);
      setTasks(prev => prev.filter(t => t.id !== id));
      
      setUndoAction({
        type: 'deletion',
        data: { id: toDelete.id, task: toDelete }
      });
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 5000);

      triggerToast('Task deleted.');
    } catch (e) {
      setError((e as Error).message || 'Task could not be deleted.');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const res = await cloudRunClient.plannerApi.createTask({
        ...newTask,
        dailyPlanId: dailyPlan?.id || '',
        workspaceId,
        ownerId: userId,
        status: 'inbox'
      });
      setTasks(prev => [...prev, res.task as unknown as Task]);
      setShowTaskForm(false);
      setNewTask({
        title: '',
        description: '',
        taskType: 'goal_aligned',
        priority: 'medium',
        weeklyObjectiveId: '',
        estimatedDurationMinutes: 30,
        isBig3: false,
        deadline: ''
      });
      triggerToast('New task scheduled.');
    } catch (err) {
      setError((err as Error).message || 'Task could not be created.');
    }
  };

  const handleShutdown = async (e: React.FormEvent) => {
    e.preventDefault();
    setShutdownError(null);
    if (!shutdownForm.dailyWin.trim()) {
      setShutdownError('Daily Win is required for shutdown ritual.');
      return;
    }

    try {
      const res = await cloudRunClient.plannerApi.shutdownDailyPlan(dailyPlan?.id || '', {
        workspaceId,
        ...shutdownForm
      });
      setDailyPlan(res.dailyPlan as unknown as DailyPlan);
      setShowShutdown(false);
      triggerToast('Shutdown ritual complete! Have a great evening!');
    } catch (err) {
      setShutdownError((err as Error).message || 'Failed to complete shutdown ritual.');
    }
  };

  // Group tasks by scheduled hour or display checklist
  const big3Tasks = tasks.filter(t => t.isBig3);
  const otherTasks = tasks.filter(t => !t.isBig3);

  // Capacity indicators
  const totalPlannedHours = tasks.reduce((acc, t) => acc + ((t.estimatedDurationMinutes || 0) / 60), 0);

  if (loading) {
    return <PlannerLoadingState message="Loading your schedule for today..." />;
  }

  if (error && !dailyPlan) {
    return (
      <PlannerErrorState
        message={error}
        action={<button className="glass-btn btn-cyan" type="button" onClick={loadTodayPlan}>Retry</button>}
      />
    );
  }

  if (!dailyPlan) {
    return (
      <div className="planner-splash" style={{ padding: '2rem' }}>
        <AlertCircle size={32} style={{ color: 'var(--accent-magenta)' }} />
        <h3>No active schedule</h3>
        <p style={{ color: 'var(--text-muted)' }}>You must create and activate a Weekly Plan before designing daily schedules.</p>
        <button className="glass-btn btn-cyan" onClick={() => setCurrentView('planner-week')}>Go to Weekly Planner</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
      
      {/* Toast Notifier */}
      {error && (
        <div className="planner-state planner-state-error" role="alert" style={{ minHeight: 'auto', alignItems: 'flex-start', textAlign: 'left' }}>
          <strong>Planner action failed</strong>
          <span>{error}</span>
        </div>
      )}

      {/* Toast Notifier */}
      {toastMessage && (
        <div className="glass-panel" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(45, 212, 191, 0.15)',
          borderLeft: '4px solid var(--accent-teal, #2dd4bf)',
          padding: '0.75rem 1.25rem',
          zIndex: 1000
        }}>
          <span style={{ fontSize: '0.85rem' }}>{toastMessage}</span>
        </div>
      )}

      {/* Undo Banner */}
      {showUndo && undoAction && (
        <div className="glass-panel" style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.85)',
          borderLeft: '4px solid var(--accent-cyan)',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <span style={{ fontSize: '0.85rem', color: '#fff' }}>Action complete.</span>
          <button
            onClick={handleUndo}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Undo2 size={12} /> Undo
          </button>
        </div>
      )}

      {/* Header bar controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
            Today's Planner: {new Date(dailyPlan.planDate).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Total scheduled tasks: {tasks.length} | Planned load: {totalPlannedHours.toFixed(1)}h
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="glass-btn btn-cyan" onClick={() => setShowTaskForm(true)}>
            Schedule Task
          </button>
          {dailyPlan.status !== 'completed' && (
            <button className="glass-btn" style={{ borderColor: 'var(--accent-purple)' }} onClick={() => setShowShutdown(true)}>
              Daily Shutdown Ritual
            </button>
          )}
        </div>
      </div>

      {dailyPlan.status === 'completed' && (
        <div className="glass-panel" style={{
          padding: '1.25rem',
          borderLeft: '4px solid var(--accent-teal, #2dd4bf)',
          background: 'linear-gradient(90deg, rgba(45, 212, 191, 0.05), transparent)'
        }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-teal, #2dd4bf)', margin: '0 0 0.5rem 0' }}>
            Daily Shutdown Ritual Completed
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
            <p style={{ margin: 0 }}><strong>Today's Win:</strong> "{dailyPlan.dailyWin}"</p>
            {dailyPlan.blockers && <p style={{ margin: 0 }}><strong>Blockers encountered:</strong> "{dailyPlan.blockers}"</p>}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Left Column: Big 3 checklist */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 1.25rem 0', color: 'var(--accent-cyan)', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            Today's Big 3 Priorities
          </h4>
          
          {big3Tasks.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '2rem 0', textAlign: 'center' }}>
              No Big 3 tasks defined for today. Select "Schedule Task" and check "Mark as Big 3 Priority".
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {big3Tasks.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button onClick={() => handleToggleTask(t)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}>
                      {t.status === 'completed' ? (
                        <CheckCircle2 size={20} className="text-teal" style={{ color: 'var(--accent-teal, #2dd4bf)' }} />
                      ) : (
                        <Circle size={20} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </button>
                    <span style={{
                      fontSize: '0.9rem',
                      textDecoration: t.status === 'completed' ? 'line-through' : 'none',
                      color: t.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)'
                    }}>{t.title}</span>
                  </div>
                  <button className="icon-btn-danger" onClick={() => handleDeleteTask(t.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Other tasks & Time logs */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 1.25rem 0', color: 'var(--accent-purple)', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            Additional Tasks Scheduled
          </h4>

          {otherTasks.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '2rem 0', textAlign: 'center' }}>
              No other tasks scheduled for today.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {otherTasks.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button onClick={() => handleToggleTask(t)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}>
                      {t.status === 'completed' ? (
                        <CheckCircle2 size={18} className="text-teal" style={{ color: 'var(--accent-teal, #2dd4bf)' }} />
                      ) : (
                        <Circle size={18} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{
                        fontSize: '0.85rem',
                        textDecoration: t.status === 'completed' ? 'line-through' : 'none',
                        color: t.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)'
                      }}>{t.title}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {t.estimatedDurationMinutes} min | {t.taskType.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <button className="icon-btn-danger" onClick={() => handleDeleteTask(t.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Task Creation Modal */}
      {showTaskForm && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ padding: '2rem', width: '400px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Schedule New Task</h3>
            <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Task Title</label>
                <input
                  type="text"
                  className="glass-input"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title..."
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Link to Weekly Objective</label>
                <select
                  className="glass-input"
                  value={newTask.weeklyObjectiveId}
                  onChange={(e) => setNewTask({ ...newTask, weeklyObjectiveId: e.target.value })}
                >
                  <option value="">-- None (General Operational) --</option>
                  {objectives.map(o => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Task Type</label>
                  <select
                    className="glass-input"
                    value={newTask.taskType}
                    onChange={(e) => setNewTask({ ...newTask, taskType: e.target.value })}
                  >
                    <option value="goal_aligned">Goal Aligned</option>
                    <option value="operational">Operational</option>
                    <option value="administrative">Administrative</option>
                    <option value="meeting">Meeting</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Estimate (minutes)</label>
                  <input
                    type="number"
                    className="glass-input"
                    value={newTask.estimatedDurationMinutes}
                    onChange={(e) => setNewTask({ ...newTask, estimatedDurationMinutes: Number(e.target.value) })}
                    min={5}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={newTask.isBig3}
                  onChange={(e) => setNewTask({ ...newTask, isBig3: e.target.checked })}
                  style={{ accentColor: 'var(--accent-cyan)', width: '15px', height: '15px' }}
                />
                <span>Mark as Big 3 Priority for today</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="glass-btn" onClick={() => setShowTaskForm(false)}>Cancel</button>
                <button type="submit" className="glass-btn btn-cyan">Schedule Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shutdown Ritual Modal */}
      {showShutdown && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ padding: '2rem', width: '420px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Sparkles size={18} className="text-cyan" />
              Daily Shutdown Ritual
            </h3>
            {shutdownError && (
              <div style={{ color: 'var(--accent-magenta)', fontSize: '0.8rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={14} /> {shutdownError}
              </div>
            )}
            <form onSubmit={handleShutdown} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Today's Biggest Win</label>
                <input
                  type="text"
                  className="glass-input"
                  value={shutdownForm.dailyWin}
                  onChange={(e) => setShutdownForm({ ...shutdownForm, dailyWin: e.target.value })}
                  placeholder="What was the highlight or biggest achievement today?"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Blockers / Friction encountered</label>
                <textarea
                  className="glass-input"
                  style={{ minHeight: '60px' }}
                  value={shutdownForm.blockers}
                  onChange={(e) => setShutdownForm({ ...shutdownForm, blockers: e.target.value })}
                  placeholder="Any bottlenecks or items to postpone?"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Closing Notes / Reflection</label>
                <textarea
                  className="glass-input"
                  style={{ minHeight: '60px' }}
                  value={shutdownForm.notes}
                  onChange={(e) => setShutdownForm({ ...shutdownForm, notes: e.target.value })}
                  placeholder="Reflection notes or tomorrow plan notes..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="glass-btn" onClick={() => setShowShutdown(false)}>Cancel</button>
                <button type="submit" className="glass-btn btn-cyan">Complete Shutdown</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
