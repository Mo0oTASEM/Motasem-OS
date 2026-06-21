import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Target, Calendar, AlertTriangle, CheckCircle2, Activity, Loader2 } from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip } from 'recharts';
import type { Quarter, QuarterlyGoal, QuarterWithRelations, MonthlyPlan, MonthlyPlanWithOutcomes, MonthlyOutcome, WeeklyPlan, WeeklyObjective, Task } from '../types';

interface AISuggestion {
  id?: string;
  type: string;
  suggestion: string;
  reason?: string;
  body?: string;
  title?: string;
}

interface PlannerOverviewProps {
  workspaceId: string;
  setCurrentView: (view: string) => void;
}

export const PlannerOverview: React.FC<PlannerOverviewProps> = ({
  workspaceId,
  setCurrentView
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States
  const [activeQuarter, setActiveQuarter] = useState<QuarterWithRelations | null>(null);
  const [currentMonth, setCurrentMonth] = useState<MonthlyPlanWithOutcomes | null>(null);
  const [activeWeek, setActiveWeek] = useState<WeeklyPlan | null>(null);
  const [weekObjectives, setWeekObjectives] = useState<WeeklyObjective[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [deadlines, setDeadlines] = useState<Task[]>([]);
  const [risks, setRisks] = useState<AISuggestion[]>([]);
  const [aiBrief, setAiBrief] = useState<string>('');
  const [now] = useState(() => new Date());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Quarters
      const quartersRes = await cloudRunClient.plannerApi.listQuarters(workspaceId);
      const quarters = (quartersRes.quarters || []) as unknown as Quarter[];
      const activeQ = quarters.find((q) => q.status === 'active') || quarters[0];
      if (activeQ) {
        const detailedQ = await cloudRunClient.plannerApi.getQuarter(activeQ.id as string, workspaceId);
        setActiveQuarter(detailedQ.quarter as unknown as QuarterWithRelations);
      }

      // 2. Months
      const monthsRes = await cloudRunClient.plannerApi.listMonthlyPlans(workspaceId);
      const months = (monthsRes.monthlyPlans || []) as unknown as MonthlyPlan[];
      const now = new Date();
      const currentM = months.find((m) => m.monthNumber === now.getMonth() + 1 && m.year === now.getFullYear()) || months.find((m) => m.status === 'active') || months[0];
      if (currentM) {
        const detailedM = await cloudRunClient.plannerApi.getMonthlyPlan(currentM.id as string, workspaceId);
        setCurrentMonth(detailedM.monthlyPlan as unknown as MonthlyPlanWithOutcomes);
      }

      // 3. Weekly Plans
      const weeklyRes = await cloudRunClient.plannerApi.listWeeklyPlans(workspaceId);
      const weeklyPlans = (weeklyRes.weeklyPlans || []) as unknown as WeeklyPlan[];
      const currentW = weeklyPlans.find((w) => w.status === 'active') || weeklyPlans[0];
      if (currentW) {
        setActiveWeek(currentW);
        const objRes = await cloudRunClient.plannerApi.listWeeklyObjectives(workspaceId, currentW.id as string);
        setWeekObjectives((objRes.objectives || []) as unknown as WeeklyObjective[]);
      }

      // 4. Tasks (Today's Big 3 & Deadlines)
      const todayStr = now.toISOString().split('T')[0];
      const tasksRes = await cloudRunClient.plannerApi.listTasks(workspaceId);
      const allTasks = (tasksRes.tasks || []) as unknown as Task[];

      // Today's Big 3 tasks
      const todayBig3 = allTasks.filter((t) => {
        if (!t.isBig3) return false;
        if (t.scheduledStart) return t.scheduledStart.split('T')[0] === todayStr;
        if (t.deadline) return t.deadline.split('T')[0] === todayStr;
        return true;
      });
      setTodayTasks(todayBig3);

      // Deadlines (next 7 days)
      const next7Days = new Date();
      next7Days.setDate(next7Days.getDate() + 7);
      const upcomingDeadlines = allTasks
        .filter((t) => t.deadline && new Date(t.deadline) >= now && new Date(t.deadline) <= next7Days && t.status !== 'completed' && t.status !== 'cancelled')
        .sort((a, b) => new Date(a.deadline as string).getTime() - new Date(b.deadline as string).getTime());
      setDeadlines(upcomingDeadlines.slice(0, 5));

      // 5. AI brief
      try {
        const briefRes = await cloudRunClient.plannerApi.getAiBrief(workspaceId);
        setAiBrief(briefRes.brief);
      } catch {
        setAiBrief('Protect your focus time today and focus on key deliverables. Complete your Big 3 to ensure alignment with active quarterly objectives.');
      }

      // 6. Risks
      if (activeQ) {
        try {
          const riskRes = await cloudRunClient.plannerApi.aiDetectRisks({ workspaceId, quarterId: activeQ.id as string });
          const rawSuggestions = (riskRes.suggestions || []) as unknown as AISuggestion[];
          setRisks(rawSuggestions.filter((s) => s.type === 'risk' || s.type === 'capacity_risk' || s.type === 'timeline_risk'));
        } catch {
          // ignore
        }
      }

    } catch (err) {
      setError((err as Error).message || 'Failed to load Planner Overview.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let active = true;
    const trigger = async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (active) {
        loadData();
      }
    };
    trigger();
    return () => { active = false; };
  }, [workspaceId, loadData]);

  // Calculations
  const daysRemaining = useMemo(() => {
    if (!activeQuarter) return 0;
    const end = new Date(activeQuarter.endDate);
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [activeQuarter, now]);

  const quarterProgress = useMemo(() => {
    if (!activeQuarter || !activeQuarter.goals || activeQuarter.goals.length === 0) return 0;
    const goalsList = activeQuarter.goals as unknown as QuarterlyGoal[];
    const total = goalsList.reduce((acc: number, g: QuarterlyGoal) => acc + (g.progressPercentage || 0), 0);
    return Math.round(total / goalsList.length);
  }, [activeQuarter]);

  const monthProgress = useMemo(() => {
    if (!currentMonth || !currentMonth.outcomes || currentMonth.outcomes.length === 0) return 0;
    const outcomesList = currentMonth.outcomes as unknown as MonthlyOutcome[];
    const total = outcomesList.reduce((acc: number, o: MonthlyOutcome) => acc + (o.progressPercentage || 0), 0);
    return Math.round(total / outcomesList.length);
  }, [currentMonth]);

  const weekProgress = useMemo(() => {
    if (weekObjectives.length === 0) return 0;
    const completed = weekObjectives.filter(o => o.status === 'completed' || o.progressPercentage === 100).length;
    return Math.round((completed / weekObjectives.length) * 100);
  }, [weekObjectives]);

  const goalAlignmentData = useMemo(() => {
    if (!activeWeek || !activeWeek.plannedTaskHours) {
      return [
        { name: 'Goal Aligned', value: 60, color: 'var(--accent-cyan)' },
        { name: 'Operational', value: 40, color: 'var(--accent-purple)' }
      ];
    }
    const goalHours = activeWeek.deepWorkHours || 0;
    const operationalHours = Math.max(0, activeWeek.plannedTaskHours - goalHours);
    return [
      { name: 'Goal Aligned', value: goalHours || 1, color: 'var(--accent-cyan)' },
      { name: 'Operational', value: operationalHours || 1, color: 'var(--accent-purple)' }
    ];
  }, [activeWeek]);

  // Sparkline data representing dummy quarterly goal progress trends over 4 weeks
  const progressTrendData = useMemo(() => {
    const base = quarterProgress;
    return [
      { week: 'W-3', progress: Math.max(0, base - 18) },
      { week: 'W-2', progress: Math.max(0, base - 12) },
      { week: 'W-1', progress: Math.max(0, base - 5) },
      { week: 'Current', progress: base }
    ];
  }, [quarterProgress]);

  const handleToggleTask = async (task: Task) => {
    try {
      const nextStatus = task.status === 'completed' ? 'in_progress' : 'completed';
      await cloudRunClient.plannerApi.updateTask(task.id, {
        workspaceId,
        status: nextStatus,
        completedAt: nextStatus === 'completed' ? new Date().toISOString() : null
      });
      // Show success toast or undo notifier
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <div className="glass-panel" style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="spin text-cyan" size={24} />
          <span style={{ marginLeft: '8px' }}>Assembling Overview data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="planner-splash" style={{ padding: '2rem' }}>
        <AlertTriangle size={32} style={{ color: 'var(--accent-magenta)' }} />
        <h3>Failed to Load Overview</h3>
        <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        <button className="glass-btn btn-cyan" onClick={loadData}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
      
      {/* AI Briefing Banner */}
      {aiBrief && (
        <div className="glass-panel" style={{
          padding: '1.25rem',
          borderLeft: '4px solid var(--accent-cyan)',
          background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.05), transparent)'
        }}>
          <h4 className="mono" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-cyan)', margin: '0 0 0.5rem 0' }}>
            AI Chief of Staff Planning Brief
          </h4>
          <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.5, color: 'var(--text-primary)' }}>
            "{aiBrief}"
          </p>
        </div>
      )}

      {/* Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        
        {/* Active Quarter Card */}
        <div className="glass-panel hover-card" style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => setCurrentView('planner-quarter')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={18} className="text-cyan" />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Active Quarter</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>{daysRemaining} days left</span>
          </div>

          {activeQuarter ? (
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.75rem 0' }}>{activeQuarter.title}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <div style={{ flexGrow: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${quarterProgress}%`, height: '100%', background: 'var(--accent-cyan)', borderRadius: '3px' }} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>{quarterProgress}%</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ width: '120px', height: '50px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressTrendData}>
                      <Tooltip content={() => null} />
                      <Line type="monotone" dataKey="progress" stroke="var(--accent-cyan)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Progress Trend</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Steady growth</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem 0' }}>
              No active quarter. Tap to create one.
            </div>
          )}
        </div>

        {/* Current Month Card */}
        <div className="glass-panel hover-card" style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => setCurrentView('planner-month')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} className="text-purple" />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Current Month</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-purple)' }}>{currentMonth ? `${currentMonth.outcomes?.length || 0} Outcomes` : ''}</span>
          </div>

          {currentMonth ? (
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.75rem 0' }}>
                {new Date(currentMonth.year, currentMonth.monthNumber - 1).toLocaleString('default', { month: 'long' })} {currentMonth.year}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <div style={{ flexGrow: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${monthProgress}%`, height: '100%', background: 'var(--accent-purple)', borderRadius: '3px' }} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-purple)' }}>{monthProgress}%</span>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem 0' }}>
              No active monthly plan. Tap to plan.
            </div>
          )}
        </div>

        {/* Capacity Snapshot Card */}
        <div className="glass-panel hover-card" style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => setCurrentView('planner-week')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} className="text-teal" />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Capacity Snapshot</span>
            </div>
          </div>
          {activeWeek ? (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '80px', height: '80px', flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={goalAlignmentData}
                      innerRadius={25}
                      outerRadius={35}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {goalAlignmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  {activeWeek.plannedTaskHours || 0}h Total Planned
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Deep Work: {activeWeek.deepWorkHours || 0}h
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Buffer Time: {activeWeek.bufferHours || 0}h
                </span>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem 0' }}>
              No active weekly schedule capacity.
            </div>
          )}
        </div>

      </div>

      {/* Dual Column list view */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        
        {/* Today's Big 3 */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Today's Big 3 Checklist</span>
            <button className="text-cyan-btn" onClick={() => setCurrentView('planner-today')} style={{ fontSize: '0.75rem', background: 'transparent', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}>
              Go to Today
            </button>
          </div>

          {todayTasks.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1.5rem 0', textAlign: 'center' }}>
              No Big 3 tasks defined for today. Get focused!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {todayTasks.map(task => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleToggleTask(task)}
                    style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <CheckCircle2 size={18} style={{ color: task.status === 'completed' ? 'var(--accent-teal, #2dd4bf)' : 'var(--text-muted)' }} />
                  </button>
                  <span style={{
                    fontSize: '0.85rem',
                    color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: task.status === 'completed' ? 'line-through' : 'none'
                  }}>{task.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* This Week's Objectives */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>This Week's Objectives</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{weekProgress}% Complete</span>
          </div>

          {weekObjectives.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1.5rem 0', textAlign: 'center' }}>
              No objectives created for this week.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {weekObjectives.map(obj => (
                <div key={obj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>{obj.title}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: obj.status === 'completed' ? 'var(--accent-teal, #2dd4bf)' : 'var(--text-muted)' }}>
                    {obj.status === 'completed' ? 'Completed' : `${obj.progressPercentage || 0}%`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Deadlines & Risks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        
        {/* Upcoming Deadlines */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 1rem 0', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            Upcoming Deadlines (Next 7 Days)
          </h4>
          {deadlines.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem 0' }}>
              No deadlines due in the next 7 days. Excellent!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {deadlines.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setCurrentView('planner-today')}>
                  <span style={{ fontSize: '0.8rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>{t.title}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-magenta)' }}>
                    {new Date(t.deadline as string).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Risks */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 1rem 0', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            Active AI Suggestion Risks
          </h4>
          {risks.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem 0' }}>
              No capacity or timeline risks detected.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {risks.map((risk, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <AlertTriangle size={14} style={{ color: 'var(--accent-amber, #f59e0b)', marginTop: '2px', flexShrink: 0 }} />
                  <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {risk.suggestion || risk.body || risk.title}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
