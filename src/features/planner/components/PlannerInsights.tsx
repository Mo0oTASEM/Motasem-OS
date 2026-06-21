import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { TrendingUp, Compass, Award, Calendar, Lightbulb, Loader2, AlertCircle, ChevronRight, Zap } from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import type { Quarter, QuarterlyGoal, KeyResult, MonthlyOutcome, WeeklyPlan, Task } from '../types';

interface PlannerInsightsProps {
  workspaceId: string;
  setCurrentView: (view: string) => void;
}

export const PlannerInsights: React.FC<PlannerInsightsProps> = ({ workspaceId, setCurrentView }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raw Database States
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [goals, setGoals] = useState<QuarterlyGoal[]>([]);
  const [krs, setKrs] = useState<KeyResult[]>([]);
  const [outcomes, setOutcomes] = useState<MonthlyOutcome[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [qRes, gRes, wRes, tRes] = await Promise.all([
        cloudRunClient.plannerApi.listQuarters(workspaceId),
        cloudRunClient.plannerApi.listGoals(workspaceId),
        cloudRunClient.plannerApi.listWeeklyPlans(workspaceId),
        cloudRunClient.plannerApi.listTasks(workspaceId)
      ]);

      setQuarters((qRes.quarters || []) as unknown as Quarter[]);
      setGoals((gRes.goals || []) as unknown as QuarterlyGoal[]);
      setWeeklyPlans((wRes.weeklyPlans || []) as unknown as WeeklyPlan[]);
      setTasks((tRes.tasks || []) as unknown as Task[]);

      // Load all key results for every goal
      const allKrs: KeyResult[] = [];
      for (const goal of gRes.goals || []) {
        try {
          const krRes = await cloudRunClient.plannerApi.listKeyResults(goal.id as string, workspaceId);
          if (krRes.keyResults) {
            allKrs.push(...(krRes.keyResults as unknown as KeyResult[]));
          }
        } catch { /* ignore individual goal KR fail */ }
      }
      setKrs(allKrs);

      // Load all outcomes for every month
      const allOutcomes: MonthlyOutcome[] = [];
      const mPlansRes = await cloudRunClient.plannerApi.listMonthlyPlans(workspaceId);
      for (const mPlan of mPlansRes.monthlyPlans || []) {
        try {
          const outRes = await cloudRunClient.plannerApi.listOutcomes(mPlan.id as string, workspaceId);
          if (outRes.monthlyOutcomes) {
            allOutcomes.push(...(outRes.monthlyOutcomes as unknown as MonthlyOutcome[]));
          }
        } catch { /* ignore outcome load fail */ }
      }
      setOutcomes(allOutcomes);

    } catch (err) {
      setError((err as Error).message || 'Failed to load Insights data.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let active = true;
    const trigger = async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (active) {
        loadAllData();
      }
    };
    trigger();
    return () => { active = false; };
  }, [workspaceId, loadAllData]);

  // 1. Goal Performance Calculations
  const goalPerformanceMetrics = useMemo(() => {
    // Quarter completion rates
    const qCompletionTrends = quarters.map(q => {
      const qGoals = goals.filter(g => g.quarterId === q.id);
      if (qGoals.length === 0) return { name: `Q${q.quarterNumber} ${q.year}`, rate: 0 };
      const completed = qGoals.filter(g => g.status === 'completed').length;
      return {
        name: `Q${q.quarterNumber} ${q.year}`,
        rate: Math.round((completed / qGoals.length) * 100)
      };
    }).reverse();

    // KR achievement rate (reaching 100%)
    const totalKrs = krs.length;
    const completedKrs = krs.filter(kr => (kr.progressPercentage || 0) >= 100).length;
    const krRate = totalKrs > 0 ? Math.round((completedKrs / totalKrs) * 100) : 0;

    // Monthly Outcomes completion rate
    const totalOutcomes = outcomes.length;
    const completedOutcomes = outcomes.filter(o => o.status === 'completed' || (o.progressPercentage || 0) >= 100).length;
    const outcomeRate = totalOutcomes > 0 ? Math.round((completedOutcomes / totalOutcomes) * 100) : 0;

    return { qCompletionTrends, krRate, outcomeRate };
  }, [quarters, goals, krs, outcomes]);

  // 2. Execution Performance Calculations
  const executionPerformanceMetrics = useMemo(() => {
    // Weekly task completion rate (completed / planned) for last 8 weeks
    const sortedWeeks = [...weeklyPlans]
      .sort((a, b) => b.year !== a.year ? b.year - a.year : b.weekNumber - a.weekNumber)
      .slice(0, 8)
      .reverse();

    const weeklyTrend = sortedWeeks.map(w => {
      // Find tasks scheduled/deadline in that week
      const weekTasks = tasks.filter((t) => {
        if (!t.deadline && !t.scheduledStart) return false;
        const d = new Date((t.deadline || t.scheduledStart) as string);
        // Quick estimate: if year matches and week number matches
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDays = (d.getTime() - startOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        return d.getFullYear() === w.year && weekNum === w.weekNumber;
      });

      if (weekTasks.length === 0) return { name: `W${w.weekNumber}`, rate: 0 };
      const completed = weekTasks.filter(t => t.status === 'completed').length;
      return {
        name: `W${w.weekNumber}`,
        rate: Math.round((completed / weekTasks.length) * 100)
      };
    });

    // Daily completion rate (Big 3 completed per day, last 30 days)
    const completedBig3 = tasks.filter(t => t.isBig3 && t.status === 'completed').length;
    const totalBig3 = tasks.filter(t => t.isBig3).length;
    const big3Rate = totalBig3 > 0 ? Math.round((completedBig3 / totalBig3) * 100) : 0;

    // Tasks postponed more than once
    // A task is postponed if it has a postponement indicator or count
    const postponedCount = tasks.filter(t => t.status === 'postponed' || (t.actualDurationMinutes && t.actualDurationMinutes > 0 && t.status !== 'completed')).length;

    return { weeklyTrend, big3Rate, postponedCount };
  }, [weeklyPlans, tasks]);

  // 3. Time Accuracy & Estimation Calculations
  const timeAccuracyMetrics = useMemo(() => {
    const tasksWithDurations = tasks.filter(t => t.status === 'completed' && t.estimatedDurationMinutes !== undefined && t.estimatedDurationMinutes > 0 && t.actualDurationMinutes !== undefined && t.actualDurationMinutes > 0);
    if (tasksWithDurations.length === 0) {
      return { averageAccuracy: 100, deviationMessage: 'Tasks take on average 0% longer than estimated.' };
    }
    const totalRatio = tasksWithDurations.reduce((acc, t) => acc + ((t.actualDurationMinutes as number) / (t.estimatedDurationMinutes as number)), 0);
    const avgRatio = totalRatio / tasksWithDurations.length;
    const percentDiff = Math.max(0, Math.round((avgRatio - 1) * 100));

    return {
      averageAccuracy: Math.round(avgRatio * 100),
      deviationMessage: `Your tasks take on average ${percentDiff}% longer than estimated.`
    };
  }, [tasks]);

  // 4. Alignment Metrics
  const alignmentMetrics = useMemo(() => {
    // Aligned vs Operational
    const goalAlignedTasks = tasks.filter(t => t.taskType === 'goal_aligned');
    const operationalTasks = tasks.filter(t => t.taskType === 'operational' || t.taskType === 'administrative');

    const goalAlignedHours = goalAlignedTasks.reduce((acc, t) => acc + ((t.actualDurationMinutes || t.estimatedDurationMinutes || 0) / 60), 0);
    const operationalHours = operationalTasks.reduce((acc, t) => acc + ((t.actualDurationMinutes || t.estimatedDurationMinutes || 0) / 60), 0);

    const alignmentPie = [
      { name: 'Goal Aligned', value: Math.round(goalAlignedHours) || 1, color: 'var(--accent-cyan)' },
      { name: 'Operational', value: Math.round(operationalHours) || 1, color: 'var(--accent-purple)' }
    ];

    // Aligned Time by Quarterly Goal
    const goalTimeData = goals.map(g => {
      const goalTasks = tasks.filter(t => t.quarterlyGoalId === g.id);
      const hours = goalTasks.reduce((acc, t) => acc + ((t.actualDurationMinutes || t.estimatedDurationMinutes || 0) / 60), 0);
      return {
        name: g.title.length > 20 ? g.title.substring(0, 20) + '...' : g.title,
        hours: Math.round(hours)
      };
    }).filter(d => d.hours > 0);

    return { alignmentPie, goalTimeData };
  }, [goals, tasks]);

  // 5. Deep Work Calculations
  const deepWorkMetrics = useMemo(() => {
    // average deep work hours per week
    const recentWeeks = [...weeklyPlans].slice(0, 8);
    const avgDeepWork = recentWeeks.length > 0
      ? Math.round(recentWeeks.reduce((acc, w) => acc + (w.deepWorkHours || 0), 0) / recentWeeks.length)
      : 0;

    // Most productive days: group task completion rate by day of week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const completionsByDay = Array(7).fill(0);
    const totalsByDay = Array(7).fill(0);

    // Most productive hours: average task completion rate by hour of day (0-23)
    const completionsByHour = Array(24).fill(0);
    const totalsByHour = Array(24).fill(0);

    tasks.forEach(t => {
      const dateStr = t.completedAt || t.createdAt;
      if (dateStr) {
        const date = new Date(dateStr);
        const dayIdx = date.getDay();
        totalsByDay[dayIdx]++;
        
        const hour = date.getHours();
        totalsByHour[hour]++;

        if (t.status === 'completed') {
          completionsByDay[dayIdx]++;
          completionsByHour[hour]++;
        }
      }
    });

    const dailyProductivity = dayNames.map((name, i) => ({
      name,
      rate: totalsByDay[i] > 0 ? Math.round((completionsByDay[i] / totalsByDay[i]) * 100) : 0
    }));

    const hourlyProductivity = Array.from({ length: 24 }, (_, i) => ({
      name: `${i}:00`,
      rate: totalsByHour[i] > 0 ? Math.round((completionsByHour[i] / totalsByHour[i]) * 100) : 0
    })).filter(h => totalsByHour[parseInt(h.name)] > 0);

    return { avgDeepWork, dailyProductivity, hourlyProductivity };
  }, [weeklyPlans, tasks]);

  // Dynamic Insight Cards
  const insightCards = useMemo(() => {
    interface InsightCard { text: string; actionView: string; actionLabel: string; }
    const cards: InsightCard[] = [];

    // Card 1: Goal Aligned Time percentage
    const goalAlignedTasks = tasks.filter(t => t.taskType === 'goal_aligned');
    const totalDuration = tasks.reduce((acc, t) => acc + (t.actualDurationMinutes || t.estimatedDurationMinutes || 0), 0);
    const goalAlignedDuration = goalAlignedTasks.reduce((acc, t) => acc + (t.actualDurationMinutes || t.estimatedDurationMinutes || 0), 0);
    const alignedPercent = totalDuration > 0 ? Math.round((goalAlignedDuration / totalDuration) * 100) : 0;
    if (alignedPercent < 50) {
      cards.push({
        text: `Only ${alignedPercent}% of your time this week supported your Quarterly Goals. Operational overhead is taking over.`,
        actionView: 'planner-week',
        actionLabel: 'Adjust Weekly Plan'
      });
    } else {
      cards.push({
        text: `Great focus! ${alignedPercent}% of your work time is goal-aligned. Keep protecting your core priorities.`,
        actionView: 'planner-week',
        actionLabel: 'Review Capacity'
      });
    }

    // Card 2: Time estimation inaccuracy
    const devText = timeAccuracyMetrics.deviationMessage;
    cards.push({
      text: devText,
      actionView: 'planner-today',
      actionLabel: 'Check Today\'s Tasks'
    });

    // Card 3: Monthly outcomes without work
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const activeOutcomes = outcomes.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
    const outcomeWithoutWork = activeOutcomes.find(o => {
      // Find if any task is linked to this outcome in the next 7 days
      const outcomeTasks = tasks.filter(t => t.monthlyOutcomeId === o.id);
      const hasUpcoming = outcomeTasks.some(t => {
        if (!t.scheduledStart && !t.deadline) return false;
        const d = new Date((t.scheduledStart || t.deadline) as string);
        return d >= new Date() && d <= next7Days;
      });
      return !hasUpcoming;
    });

    if (outcomeWithoutWork) {
      cards.push({
        text: `Outcome "${outcomeWithoutWork.title}" has no work scheduled in the next 7 days. Plan alignment is lagging.`,
        actionView: 'planner-month',
        actionLabel: 'Schedule Outcome Tasks'
      });
    }

    // Card 4: Low priority operational time sink
    const lowPriorityTasks = tasks.filter(t => t.priority === 'low' && t.taskType !== 'goal_aligned');
    const lowPriorityHours = Math.round(lowPriorityTasks.reduce((acc, t) => acc + ((t.actualDurationMinutes || t.estimatedDurationMinutes || 0) / 60), 0));
    
    // Check if any goal had 0 hours spent on it
    const stagnantGoal = goals.find(g => {
      const goalTasks = tasks.filter(t => t.quarterlyGoalId === g.id);
      const hours = goalTasks.reduce((acc, t) => acc + ((t.actualDurationMinutes || t.estimatedDurationMinutes || 0) / 60), 0);
      return hours === 0;
    });

    if (lowPriorityHours > 3 && stagnantGoal) {
      cards.push({
        text: `${lowPriorityHours} low-priority tasks consumed hours this week, during which your quarterly goal "${stagnantGoal.title}" had no progress.`,
        actionView: 'planner-quarter',
        actionLabel: 'Reprioritize Goals'
      });
    }

    return cards;
  }, [tasks, timeAccuracyMetrics, outcomes, goals]);

  if (loading) {
    return (
      <div className="planner-splash" style={{ padding: '2rem' }}>
        <Loader2 className="spin text-cyan" size={32} />
        <p>Analyzing database execution history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="planner-splash" style={{ padding: '2rem' }}>
        <AlertCircle size={32} style={{ color: 'var(--accent-magenta)' }} />
        <h3>Failed to Load Analytics</h3>
        <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        <button className="glass-btn btn-cyan" onClick={loadAllData}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
      
      {/* Top Cards for Insights */}
      <div>
        <h3 className="mono" style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-cyan)', margin: '0 0 1rem 0', letterSpacing: '0.05em' }}>
          Diagnostic Insights
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {insightCards.map((card, i) => (
            <div key={i} className="glass-panel" style={{
              padding: '1.15rem',
              borderLeft: '4px solid var(--accent-cyan)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <Lightbulb size={16} className="text-cyan" style={{ marginTop: '2px', flexShrink: 0 }} />
                <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                  {card.text}
                </p>
              </div>
              <button
                onClick={() => setCurrentView(card.actionView)}
                className="glass-btn"
                style={{
                  alignSelf: 'flex-start',
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.65rem',
                  borderColor: 'rgba(0, 240, 255, 0.2)',
                  color: 'var(--accent-cyan)'
                }}
              >
                Take Action <ChevronRight size={12} style={{ marginLeft: '4px' }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        
        {/* Goal Performance Chart */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            <Award className="text-cyan" size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Quarterly Goal Completion Trends</span>
          </div>
          {goalPerformanceMetrics.qCompletionTrends.length === 0 ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No historical quarterly data available.
            </div>
          ) : (
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={goalPerformanceMetrics.qCompletionTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} unit="%" />
                  <Tooltip contentStyle={{ background: 'rgba(10, 15, 30, 0.9)', borderColor: 'var(--panel-border)' }} />
                  <Bar dataKey="rate" name="Completion Rate" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Weekly Task Completion Trend */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            <TrendingUp className="text-purple" size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Weekly Task Completion Rate (Last 8 Weeks)</span>
          </div>
          {executionPerformanceMetrics.weeklyTrend.length === 0 ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No weekly data available.
            </div>
          ) : (
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={executionPerformanceMetrics.weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} unit="%" />
                  <Tooltip contentStyle={{ background: 'rgba(10, 15, 30, 0.9)', borderColor: 'var(--panel-border)' }} />
                  <Line type="monotone" dataKey="rate" name="Completion Rate" stroke="var(--accent-purple)" strokeWidth={2} dot={{ fill: 'var(--accent-purple)' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Goal Alignment breakdown */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            <Compass className="text-teal" size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Goal Alignment Time Allocation</span>
          </div>
          <div style={{ display: 'flex', height: '220px', alignItems: 'center' }}>
            <div style={{ width: '50%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={alignmentMetrics.alignmentPie}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {alignmentMetrics.alignmentPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
              {alignmentMetrics.alignmentPie.map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: entry.color }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {entry.name}: {entry.value}h
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Time by Quarterly Goal */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            <Zap className="text-cyan" size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Effort Hours per Quarterly Goal</span>
          </div>
          {alignmentMetrics.goalTimeData.length === 0 ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No goal efforts logged this quarter.
            </div>
          ) : (
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alignmentMetrics.goalTimeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={11} unit="h" />
                  <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={10} width={90} />
                  <Tooltip contentStyle={{ background: 'rgba(10, 15, 30, 0.9)', borderColor: 'var(--panel-border)' }} />
                  <Bar dataKey="hours" name="Hours spent" fill="var(--accent-cyan)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Deep Work & Productivity */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            <Award className="text-teal" size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Deep Work Allocation</span>
          </div>
          <div style={{ height: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
              {deepWorkMetrics.avgDeepWork}h
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Average Deep Work Hours Per Week (Last 8 Weeks)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              Set aside focus blocks to boost this number.
            </div>
          </div>
        </div>

        {/* Most Productive Days */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            <Calendar className="text-purple" size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Productivity by Day of Week</span>
          </div>
          {deepWorkMetrics.dailyProductivity.every(d => d.rate === 0) ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No completed tasks data.
            </div>
          ) : (
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deepWorkMetrics.dailyProductivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} unit="%" />
                  <Tooltip contentStyle={{ background: 'rgba(10, 15, 30, 0.9)', borderColor: 'var(--panel-border)' }} />
                  <Bar dataKey="rate" name="Completion Rate" fill="var(--accent-purple)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Most Productive Hours */}
        <div className="glass-panel" style={{ padding: '1.25rem', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
            <TrendingUp className="text-cyan" size={16} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Productivity by Hour of Day</span>
          </div>
          {deepWorkMetrics.hourlyProductivity.length === 0 ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No completed tasks data by hour.
            </div>
          ) : (
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deepWorkMetrics.hourlyProductivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} unit="%" />
                  <Tooltip contentStyle={{ background: 'rgba(10, 15, 30, 0.9)', borderColor: 'var(--panel-border)' }} />
                  <Bar dataKey="rate" name="Completion Rate" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
