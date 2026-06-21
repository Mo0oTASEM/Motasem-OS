import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Gauge,
  Lightbulb,
  Plus,
  Save,
  Sparkles,
  Target,
  X,
  Zap
} from 'lucide-react';
import { PageHeader, Panel } from '../../components/system/Layout';
import { useApp } from '../../context/useApp';
import type { Goal, PlannerTask } from '../../context/AppContext';

type PlanHealth = 'On Progress' | 'Finished' | 'Not started';

type GoalActivity = NonNullable<Goal['activities']>[number];

type GoalDraft = {
  title: string;
  description: string;
  level: Goal['level'];
  targetDate: string;
  progress: number;
  smartSpecific: string;
  smartMeasurable: string;
  smartAchievable: string;
  smartRelevant: string;
  smartTimeBound: string;
  activities: GoalActivity[];
};

const today = new Date();
today.setHours(0, 0, 0, 0);

const quarterDeadline = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 3);
  return date.toISOString().split('T')[0];
};

const emptyActivity = (): GoalActivity => ({
  id: `act-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  title: 'New measurable activity',
  completed: false
});

const blankDraft = (): GoalDraft => ({
  title: '',
  description: '',
  level: 'quarterly',
  targetDate: quarterDeadline(),
  progress: 0,
  smartSpecific: '',
  smartMeasurable: '',
  smartAchievable: '',
  smartRelevant: '',
  smartTimeBound: '',
  activities: [emptyActivity()]
});

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const parseDate = (value: string) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? today : date;
};

const daysUntil = (date: string) => {
  const diff = parseDate(date).getTime() - today.getTime();
  return Math.ceil(diff / 86_400_000);
};

const formatDeadline = (date: string) => {
  const days = daysUntil(date);
  const label = parseDate(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (days < 0) return `${label} - ${Math.abs(days)}d overdue`;
  if (days === 0) return `${label} - today`;
  return `${label} - ${days}d left`;
};

const activityProgress = (activities: GoalActivity[] = []) => {
  if (!activities.length) return 0;
  const total = activities.reduce((sum, activity) => {
    if (typeof activity.completed === 'boolean') return sum + (activity.completed ? 100 : 0);
    const target = activity.target && activity.target > 0 ? activity.target : 1;
    return sum + clamp(((activity.current || 0) / target) * 100);
  }, 0);
  return Math.round(total / activities.length);
};

const goalLinkedTasks = (goal: Goal, tasks: PlannerTask[]) => tasks.filter(task => task.goalId === goal.id);

const taskProgress = (tasks: PlannerTask[]) => {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter(task => task.status === 'done').length / tasks.length) * 100);
};

const automaticProgress = (goal: Goal, tasks: PlannerTask[]) => {
  const activities = activityProgress(goal.activities);
  const linkedTasks = goalLinkedTasks(goal, tasks);
  if (goal.status === 'completed') return 100;
  if (goal.activities?.length && linkedTasks.length) return Math.round(activities * 0.65 + taskProgress(linkedTasks) * 0.35);
  if (goal.activities?.length) return activities;
  if (linkedTasks.length) return taskProgress(linkedTasks);
  return Math.round(goal.progress);
};

const goalHealth = (progress: number): PlanHealth => {
  if (progress >= 100) return 'Finished';
  if (progress > 0) return 'On Progress';
  return 'Not started';
};

const healthClass = (health: PlanHealth) => {
  if (health === 'Finished') return 'badge-teal';
  if (health === 'On Progress') return 'badge-cyan';
  return 'badge-purple';
};

const estimateHardness = (goal: Goal, linkedTasks: PlannerTask[]) => {
  const activityCount = goal.activities?.length || 0;
  const taskLoad = linkedTasks.length;
  const deadlinePressure = daysUntil(goal.targetDate) <= 30 ? 2 : daysUntil(goal.targetDate) <= 60 ? 1 : 0;
  const scopePressure = goal.level === 'life' || goal.level === 'annual' ? 2 : goal.level === 'quarterly' ? 1 : 0;
  const descriptionPressure = goal.description.length > 140 ? 1 : 0;
  return clamp(3 + Math.ceil(activityCount / 2) + Math.ceil(taskLoad / 3) + deadlinePressure + scopePressure + descriptionPressure, 1, 10);
};

const successProbability = (goal: Goal, progress: number, tasks: PlannerTask[]) => {
  const linkedTasks = goalLinkedTasks(goal, tasks);
  const hardness = estimateHardness(goal, linkedTasks);
  const completedRatio = linkedTasks.length ? linkedTasks.filter(task => task.status === 'done').length / linkedTasks.length : progress / 100;
  const activeRatio = linkedTasks.length ? linkedTasks.filter(task => task.status !== 'todo').length / linkedTasks.length : progress / 100;
  const days = daysUntil(goal.targetDate);
  const deadlineScore = days < 0 ? 12 : days <= 14 ? 55 : days <= 45 ? 78 : 88;
  const hardnessScore = clamp(105 - hardness * 8);

  return Math.round(clamp(
    progress * 0.4 +
    activeRatio * 100 * 0.18 +
    completedRatio * 100 * 0.2 +
    deadlineScore * 0.12 +
    hardnessScore * 0.1
  ));
};

const smartDefinition = (goal: Goal) => {
  const specific = goal.smartSpecific || goal.title;
  const measurable = goal.smartMeasurable || `${goal.activities?.filter(activity => activity.completed).length || 0}/${goal.activities?.length || 0} activities finished`;
  const achievable = goal.smartAchievable || 'Quarter-year scope with activity checkpoints';
  const relevant = goal.smartRelevant || goal.description;
  const timeBound = goal.smartTimeBound || `Deadline ${formatDeadline(goal.targetDate)}`;

  return `Specific: ${specific}. Measurable: ${measurable}. Achievable: ${achievable}. Relevant: ${relevant}. Time-Bound: ${timeBound}.`;
};

const draftFromGoal = (goal: Goal): GoalDraft => ({
  title: goal.title,
  description: goal.description,
  level: goal.level,
  targetDate: goal.targetDate,
  progress: goal.progress,
  smartSpecific: goal.smartSpecific || goal.title,
  smartMeasurable: goal.smartMeasurable || '',
  smartAchievable: goal.smartAchievable || '',
  smartRelevant: goal.smartRelevant || goal.description,
  smartTimeBound: goal.smartTimeBound || goal.targetDate,
  activities: goal.activities?.length ? goal.activities.map(activity => ({
    ...activity,
    completed: activity.completed ?? Boolean((activity.current || 0) >= (activity.target || 1))
  })) : [emptyActivity()]
});

export const MissionControl: React.FC = () => {
  const { goals, plannerTasks, addGoal, updateGoalItem, updatePlannerTask } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalGoalId, setModalGoalId] = useState<string | null>(null);
  const [draft, setDraft] = useState<GoalDraft>(blankDraft);

  const goalReports = useMemo(() => goals.map(goal => {
    const linkedTasks = goalLinkedTasks(goal, plannerTasks);
    const progress = automaticProgress(goal, plannerTasks);
    const health = goalHealth(progress);
    const probability = successProbability(goal, progress, plannerTasks);
    const hardness = estimateHardness(goal, linkedTasks);
    return {
      goal,
      linkedTasks,
      progress,
      health,
      hardness,
      probability,
      smart: smartDefinition(goal)
    };
  }).sort((a, b) => daysUntil(a.goal.targetDate) - daysUntil(b.goal.targetDate)), [goals, plannerTasks]);

  const topPriorities = useMemo(() => plannerTasks
    .filter(task => task.status !== 'done')
    .sort((a, b) => {
      const priorityScore = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityScore[b.priority] - priorityScore[a.priority] || daysUntil(a.dueDate) - daysUntil(b.dueDate);
    })
    .slice(0, 3), [plannerTasks]);

  const averageProgress = goalReports.length ? Math.round(goalReports.reduce((sum, report) => sum + report.progress, 0) / goalReports.length) : 0;
  const averageProbability = goalReports.length ? Math.round(goalReports.reduce((sum, report) => sum + report.probability, 0) / goalReports.length) : 0;
  const finishedGoals = goalReports.filter(report => report.health === 'Finished').length;
  const activeGoals = goalReports.filter(report => report.health === 'On Progress').length;

  const openCreateModal = () => {
    setIsModalOpen(true);
    setModalGoalId(null);
    setDraft(blankDraft());
  };

  const openEditModal = (goal: Goal) => {
    setIsModalOpen(true);
    setModalGoalId(goal.id);
    setDraft(draftFromGoal(goal));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalGoalId(null);
    setDraft(blankDraft());
  };

  const updateActivity = (id: string, updates: Partial<GoalActivity>) => {
    setDraft(current => ({
      ...current,
      activities: current.activities.map(activity => activity.id === id ? { ...activity, ...updates } : activity)
    }));
  };

  const removeActivity = (id: string) => {
    setDraft(current => ({
      ...current,
      activities: current.activities.length > 1 ? current.activities.filter(activity => activity.id !== id) : current.activities
    }));
  };

  const saveGoal = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanActivities = draft.activities.map(activity => ({
      ...activity,
      title: activity.title.trim() || 'Measured activity',
      completed: Boolean(activity.completed)
    }));

    const goalPayload = {
      title: draft.title.trim(),
      description: draft.description.trim() || draft.smartRelevant.trim() || 'Quarter-year plan goal.',
      level: draft.level,
      progress: activityProgress(cleanActivities),
      status: activityProgress(cleanActivities) >= 100 ? 'completed' as const : 'active' as const,
      targetDate: draft.targetDate,
      tags: [draft.level, 'plan-control'],
      importanceScore: 85,
      smartSpecific: draft.smartSpecific.trim() || draft.title.trim(),
      smartMeasurable: draft.smartMeasurable.trim(),
      smartAchievable: draft.smartAchievable.trim(),
      smartRelevant: draft.smartRelevant.trim() || draft.description.trim(),
      smartTimeBound: draft.smartTimeBound.trim() || draft.targetDate,
      activities: cleanActivities
    };

    if (!goalPayload.title) return;

    if (modalGoalId) {
      updateGoalItem(modalGoalId, goalPayload);
    } else {
      const id = `goal-${Date.now()}`;
      addGoal({ id, ...goalPayload });
    }

    closeModal();
  };

  return (
    <div>
      <PageHeader title="Plan Control" description="Quarter-year goal planning with SMART goals, activity checklists, and automatic estimates.">
        <button className="glass-btn btn-cyan" type="button" onClick={openCreateModal}>
          <Plus size={16} /> Add Goal
        </button>
      </PageHeader>

      <div className="page-body mission-control">
        <section className="mission-kpi-row">
          <article className="glass-panel mission-kpi">
            <Target size={19} />
            <small>Goals Progress</small>
            <strong>{averageProgress}%</strong>
            <span>Automatic average from activities</span>
          </article>
          <article className="glass-panel mission-kpi">
            <Gauge size={19} />
            <small>AI Success Probability</small>
            <strong>{averageProbability}%</strong>
            <span>Hardness, consistency, deadlines, and completions</span>
          </article>
          <article className="glass-panel mission-kpi">
            <Activity size={19} />
            <small>On Progress</small>
            <strong>{activeGoals}</strong>
            <span>Goals moving this quarter</span>
          </article>
          <article className="glass-panel mission-kpi">
            <CheckCircle2 size={19} />
            <small>Finished</small>
            <strong>{finishedGoals}</strong>
            <span>Completed goals</span>
          </article>
        </section>

        <div className="mission-grid">
          <Panel title="Top 3 Priorities" icon={Zap} className="mission-span-2">
            <div className="mission-priority-list">
              {topPriorities.length ? topPriorities.map((task, index) => (
                <button
                  key={task.id}
                  className="mission-priority"
                  type="button"
                  onClick={() => updatePlannerTask(task.id, { status: task.status === 'in_progress' ? 'done' : 'in_progress' })}
                >
                  <span className="mission-rank">{index + 1}</span>
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.priority} - due {formatDeadline(task.dueDate)}</small>
                  </span>
                  <CheckCircle2 size={16} />
                </button>
              )) : (
                <p className="os-muted">No open tasks yet. Manage tasks from Daily Planner.</p>
              )}
            </div>
          </Panel>

          <Panel title="Motasem AI Change Path" icon={Sparkles}>
            <div className="mission-recovery-list">
              <div>
                <strong>Fast edit prompt</strong>
                <span>Tell Motasem AI: update Plan Control goal, deadline, SMART fields, or activities.</span>
              </div>
              <div>
                <strong>Data rule</strong>
                <span>Every goal uses SMART fields, activity checkboxes, and progress derived from completion.</span>
              </div>
            </div>
          </Panel>

          <Panel title="Goals Progress Overview" icon={BarChart3} className="mission-span-3">
            <div className="mission-goals">
              {goalReports.map(report => (
                <article className="mission-goal-card" key={report.goal.id}>
                  <div className="mission-card-head">
                    <div>
                      <strong>{report.goal.title}</strong>
                      <small>{report.goal.level} - {formatDeadline(report.goal.targetDate)}</small>
                    </div>
                    <span className={`badge ${healthClass(report.health)}`}>{report.health}</span>
                  </div>

                  <div className="mission-progress-line">
                    <span><b>{report.progress}%</b> progress</span>
                    <span><b>{report.probability}%</b> success</span>
                  </div>
                  <div className="mini-progress"><i style={{ width: `${report.progress}%` }} /></div>

                  <div className="mission-smart">
                    <span>SMART Definition</span>
                    <p>{report.smart}</p>
                  </div>

                  <div className="mission-activities">
                    {(report.goal.activities || []).map(activity => (
                      <span key={activity.id}>
                        <ClipboardList size={12} />
                        {activity.completed ? 'Done' : 'Open'} - {activity.title}
                      </span>
                    ))}
                  </div>

                  <div className="mission-kpis">
                    <span>AI hardness {report.hardness}/10</span>
                    <span>{report.linkedTasks.filter(task => task.status === 'done').length}/{report.linkedTasks.length || 1} tasks done</span>
                    <span>{report.goal.activities?.length || 0} activities</span>
                  </div>

                  <div className="mission-actions">
                    <button className="glass-btn" type="button" onClick={() => openEditModal(report.goal)}>
                      <Edit3 size={15} /> Edit Goal
                    </button>
                    <span>Tasks are managed separately in Daily Planner.</span>
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Weekly Review & Insights" icon={Lightbulb} className="mission-span-3">
            <div className="mission-review-grid">
              <article>
                <small>Progress</small>
                <strong>{averageProgress}% quarter average</strong>
                <p>Activities now update progress from simple done/open status.</p>
              </article>
              <article>
                <small>Tasks</small>
                <strong>{plannerTasks.filter(task => task.status === 'done').length}/{plannerTasks.length || 1} closed</strong>
                <p>Close or advance linked tasks to improve execution consistency and success probability.</p>
              </article>
              <article>
                <small>Planning</small>
                <strong>{goalReports.filter(report => report.health === 'Not started').length} not started</strong>
                <p>For each untouched goal, define one small task and one measurable activity before the week ends.</p>
              </article>
            </div>
          </Panel>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel plan-modal">
            <form onSubmit={saveGoal}>
              <div className="plan-modal-head">
                <div>
                  <h2>{modalGoalId ? 'Edit Goal' : 'Add Quarter Goal'}</h2>
                  <p>Build the SMART goal and activity checklist in one place.</p>
                </div>
                <button className="glass-btn" type="button" onClick={closeModal}><X size={16} /></button>
              </div>

              <div className="plan-form-grid">
                <label>
                  Goal Name
                  <input className="glass-input" value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} required />
                </label>
                <label>
                  Deadline
                  <span className="plan-date-field">
                    <CalendarDays size={16} />
                    <input className="glass-input" type="date" value={draft.targetDate} onChange={event => setDraft({ ...draft, targetDate: event.target.value, smartTimeBound: event.target.value })} />
                  </span>
                </label>
                <label>
                  Plan Level
                  <select className="glass-input" value={draft.level} onChange={event => setDraft({ ...draft, level: event.target.value as Goal['level'] })}>
                    <option value="quarterly">Quarter Year Plan</option>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="annual">Annual</option>
                    <option value="life">Life Vision</option>
                  </select>
                </label>
              </div>

              <label className="plan-full-label">
                Why / Relevance
                <textarea className="glass-input" value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value, smartRelevant: event.target.value })} />
              </label>

              <div className="plan-form-grid">
                <label>
                  Specific
                  <input className="glass-input" value={draft.smartSpecific} onChange={event => setDraft({ ...draft, smartSpecific: event.target.value })} placeholder="What exactly will happen?" />
                </label>
                <label>
                  Measurable
                  <input className="glass-input" value={draft.smartMeasurable} onChange={event => setDraft({ ...draft, smartMeasurable: event.target.value })} placeholder="How will success be measured?" />
                </label>
                <label>
                  Achievable
                  <input className="glass-input" value={draft.smartAchievable} onChange={event => setDraft({ ...draft, smartAchievable: event.target.value })} placeholder="Why is this realistic?" />
                </label>
                <label>
                  Time-Bound
                  <input className="glass-input" value={draft.smartTimeBound} onChange={event => setDraft({ ...draft, smartTimeBound: event.target.value })} placeholder="Deadline or cadence" />
                </label>
              </div>

              <div className="plan-modal-section">
                <div className="mission-card-head">
                  <strong>Activities</strong>
                  <button className="glass-btn" type="button" onClick={() => setDraft(current => ({ ...current, activities: [...current.activities, emptyActivity()] }))}>
                    <Plus size={15} /> Add Activity
                  </button>
                </div>
                <div className="plan-activity-editor">
                  {draft.activities.map(activity => (
                    <div className="plan-activity-row plan-activity-row-simple" key={activity.id}>
                      <label className="plan-check">
                        <input
                          type="checkbox"
                          checked={Boolean(activity.completed)}
                          onChange={event => updateActivity(activity.id, { completed: event.target.checked })}
                        />
                        <span>{activity.completed ? 'Done' : 'Open'}</span>
                      </label>
                      <input className="glass-input" value={activity.title} onChange={event => updateActivity(activity.id, { title: event.target.value })} />
                      <button className="glass-btn" type="button" onClick={() => removeActivity(activity.id)}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="plan-modal-actions">
                <button className="glass-btn" type="button" onClick={closeModal}>Cancel</button>
                <button className="glass-btn btn-cyan" type="submit"><Save size={16} /> Save Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
