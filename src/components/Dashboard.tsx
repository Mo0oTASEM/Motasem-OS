import React from 'react';
import {
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  Sparkles,
  Target,
  TrendingUp,
  Layers,
  Users,
  CheckSquare,
  Square,
  Settings,
  Link2,
  Activity,
  Mail,
  MessageSquare,
  Brain,
  TrendingDown
} from 'lucide-react';
import { PageHeader } from './system/Layout';
import { useApp } from '../context/useApp';
import {
  generateAIBriefing,
  getMonthlyRevenue,
  getProjectProgress,
  buildIdealSchedule
} from '../lib/ai/intelligence';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

interface DashboardProps {
  setCurrentView: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setCurrentView }) => {
  const app = useApp();
  const todayStr = new Date().toISOString().split('T')[0];

  // Helper: calculate days remaining for deadlines
  const daysRemaining = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // 2. Data computations
  const briefing = generateAIBriefing(app);
  const todayTasks = app.plannerTasks.filter(task => task.dueDate <= todayStr);
  
  // Finance stats
  const monthlyRevenue = getMonthlyRevenue(app.finances);
  const actualExpenses = app.finances
    .filter(f => f.type === 'expense')
    .reduce((sum, f) => sum + Math.abs(f.amount), 0);
  const netEarnings = monthlyRevenue - actualExpenses;

  // Business Snapshot from context data
  const clientCount = app.clients.filter(c => c.status === 'active').length;
  const activeProjects = app.projects.filter(p => p.status === 'in_progress');
  const overdueTasksCount = app.plannerTasks.filter(t => t.status !== 'done' && t.dueDate < todayStr).length;
  const totalGoals = app.goals.length;
  const completedGoals = app.goals.filter(g => g.status === 'completed').length;

  // Project status distribution for Recharts PieChart
  const projectStatusData = [
    { name: 'Backlog', value: app.projects.filter(p => p.status === 'backlog').length, color: '#4b5563' },
    { name: 'In Progress', value: app.projects.filter(p => p.status === 'in_progress').length, color: '#3b82f6' },
    { name: 'Review', value: app.projects.filter(p => p.status === 'review').length, color: '#a855f7' },
    { name: 'Completed', value: app.projects.filter(p => p.status === 'completed').length, color: '#10b981' }
  ].filter(d => d.value > 0);

  // 3. AI Dynamic Suggestions (exactly 5 actionable tips)
  const overdueFollowUps = app.plannerTasks.filter(t => t.status !== 'done' && new Date(t.dueDate || 0) < new Date()).length;
  const suggestions = [
    {
      id: 'sug-1',
      title: overdueFollowUps > 0 ? `Follow up on ${overdueFollowUps} overdue task(s)` : 'Nurture top-performing opportunity channels',
      reason: overdueFollowUps > 0 ? 'Action required: Tasks waiting for response today.' : 'Opportunity pipeline is quiet.',
      impact: '+$3,200 potential',
      action: () => setCurrentView('crm'),
      label: 'Open CRM'
    },
    {
      id: 'sug-2',
      title: activeProjects.length > 0 ? `Polish ${activeProjects[0].title} milestones` : 'Start a freelance/personal sandbox project',
      reason: activeProjects.length > 0 
        ? `Due in ${daysRemaining(activeProjects[0].deadline)} days. Needs 3D render passes & shader adjustments.`
        : 'Optimize your portfolio space with fresh assets.',
      impact: 'Milestone Release',
      action: () => setCurrentView('projects'),
      label: 'Open Project Hub'
    },
    {
      id: 'sug-3',
      title: overdueTasksCount > 0 ? `Reschedule ${overdueTasksCount} overdue tasks` : 'Organize tomorrow\'s deep work blocks',
      reason: overdueTasksCount > 0 ? 'Maintain schedule integrity and reduce priority dilution.' : 'Maximize productivity by setting up task queues early.',
      impact: 'High productivity',
      action: () => setCurrentView('projects'),
      label: 'Open Project Hub'
    },
    {
      id: 'sug-4',
      title: actualExpenses > 800 ? 'Audit active cloud subscriptions' : 'Push system data backup to Supabase',
      reason: actualExpenses > 800 ? 'Licensing fees are exceeding average target budget bounds.' : 'Sync latest client history, goals, and metrics to Supabase database.',
      impact: actualExpenses > 800 ? 'Save $150/mo' : 'Data Integrity',
      action: () => setCurrentView(actualExpenses > 800 ? 'finances' : 'integrations'),
      label: actualExpenses > 800 ? 'Open Ledger' : 'Open Integrations'
    },
    {
      id: 'sug-5',
      title: 'Analyze revenue opportunity score',
      reason: app.opportunities.length > 0 
        ? `"${[...app.opportunities].sort((a,b) => b.revenuePotential - a.revenuePotential)[0]?.title}" has high revenue yield.` 
        : 'Generate a new service offer template.',
      impact: '+$5,000/mo potential',
      action: () => setCurrentView('crm'),
      label: 'Open Work'
    }
  ];

  // 4. Goals + Planner checklist interactive handler
  const handleToggleTask = (taskId: string, currentStatus: 'todo' | 'in_progress' | 'done') => {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    app.updatePlannerTask(taskId, { status: nextStatus });
  };

  // Success Probability Calculation
  const totalTasks = todayTasks.length;
  const completedTasks = todayTasks.filter(t => t.status === 'done').length;
  const taskRatio = totalTasks > 0 ? completedTasks / totalTasks : 1;
  const healthEnergy = app.healthEntries[0]?.energy || 7;
  const successProbability = Math.min(100, Math.max(20, Math.round((taskRatio * 45) + (healthEnergy * 5.5) + 10)));

  // Timeline / Focus blocks
  const timelineBlocks = buildIdealSchedule(app.plannerTasks, app.calendarEvents, app.healthEntries);

  // Business Snapshot — use real AppContext finance data
  const revenueChartData = monthlyRevenue > 0 ? [
    { name: 'Income', value: monthlyRevenue },
    { name: 'Expenses', value: actualExpenses },
    { name: 'Net', value: Math.max(0, netEarnings) }
  ] : [];

  // Finance trend chart data
  const financeTrendData = [...app.finances]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce<{ date: string; netBalance: number; Amount: number }[]>((acc, f) => {
      const prevBalance = acc.length > 0 ? acc[acc.length - 1].netBalance : 0;
      acc.push({
        date: new Date(f.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        netBalance: prevBalance + f.amount,
        Amount: f.amount
      });
      return acc;
    }, []);

  // Integrations Health from AppContext syncStates
  const syncMap = Object.fromEntries(
    app.syncStates.map(s => [s.service, s.status])
  );
  const integrationsHealth = [
    { name: 'Supabase', status: syncMap['supabase'] || 'needs_auth', icon: <SupabaseIcon /> },
    { name: 'Google OAuth', status: syncMap['google_oauth'] || 'idle', icon: <GoogleIcon /> },
    { name: 'Calendar', status: syncMap['calendar'] || 'needs_setup', icon: <CalendarClock size={16} /> },
    { name: 'Tasks', status: syncMap['tasks'] || 'needs_setup', icon: <CheckSquare size={16} /> },
    { name: 'Gmail', status: syncMap['gmail'] || 'needs_setup', icon: <Mail size={16} /> },
    { name: 'Contacts', status: syncMap['contacts'] || 'needs_setup', icon: <Users size={16} /> },
    { name: 'Telegram', status: syncMap['telegram'] || 'needs_setup', icon: <MessageSquare size={16} /> },
    { name: 'Hermes AI', status: syncMap['hermes'] || 'needs_setup', icon: <Brain size={16} /> }
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'connected':
      case 'online':
        return { label: 'Connected', color: 'var(--accent-teal)' };
      case 'syncing':
        return { label: 'Syncing', color: 'var(--accent-cyan)' };
      case 'needs_auth':
      case 'needs_setup':
        return { label: 'Needs Setup', color: '#f59e0b' };
      case 'error':
        return { label: 'Error', color: 'var(--accent-magenta)' };
      default:
        return { label: 'Offline', color: 'var(--text-muted)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: '3rem' }}>
      <PageHeader
        title="AI OS Command Center"
        description={`System control for ${app.aiConfig.userName || app.user?.email || 'User'} · ${app.aiConfig.userRole || 'Operator'}`}
        icon={Activity}
      >
        <span className="badge badge-cyan" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
          LOCAL_TIME: {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button className="glass-btn btn-cyan" onClick={() => setCurrentView('projects')}>
          Project Hub <ArrowRight size={14} />
        </button>
      </PageHeader>

      <div className="page-body dashboard-v2" style={{ marginTop: '0.5rem' }}>
        
        {/* ========================================================
            ROW 1: Morning Command Brief (Full Width)
           ======================================================== */}
        <section className="glass-panel os-section ai-briefing os-span-3" style={{ background: 'rgba(9, 9, 11, 0.4)', borderColor: 'rgba(255, 255, 255, 0.05)' }}>
          <div className="os-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
              <Sparkles size={16} className="text-cyan animate-pulse" /> Morning Command Brief
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginTop: '0.25rem' }}>
            
            <article style={{ borderLeft: '3px solid var(--accent-cyan)', paddingLeft: '0.75rem', background: 'transparent', border: 'none' }}>
              <strong style={{ color: 'var(--accent-cyan)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Focus Queue</strong>
              <p style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {briefing.focus}
              </p>
            </article>

            <article style={{ borderLeft: '3px solid var(--accent-magenta)', paddingLeft: '0.75rem', background: 'transparent', border: 'none' }}>
              <strong style={{ color: 'var(--accent-magenta)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Blockers & Risks</strong>
              <p style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {briefing.risk}
              </p>
            </article>

            <article className="timeline-widget" style={{ gridColumn: 'span 1', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
              <strong style={{ color: '#10b981', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                Suggested Focus Block
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {timelineBlocks.slice(0, 3).map((block, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                    <span className="mono" style={{ color: 'var(--accent-cyan)', width: '38px', flexShrink: 0 }}>{block.time}</span>
                    <span style={{ height: '4px', width: '4px', borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={block.title}>
                      {block.title}
                    </span>
                  </div>
                ))}
              </div>
            </article>

          </div>
        </section>

        {/* ========================================================
            ROW 2 COLUMN 1 & 2: Primary Content Stack
           ======================================================== */}
        <div className="os-span-2 os-stack" style={{ gap: '1.25rem' }}>
          
          {/* Business Snapshot */}
          <section className="glass-panel os-section">
            <div className="os-section-title"><CircleDollarSign size={16} className="text-cyan" /> Business Snapshot</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Monthly Revenue</span>
                <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-teal)' }}>${monthlyRevenue.toLocaleString()}</span>
                <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Actual payments received</span>
              </div>
              <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Net Earnings</span>
                <span style={{ fontSize: '1.45rem', fontWeight: 800, color: netEarnings >= 0 ? 'var(--accent-teal)' : 'var(--accent-magenta)' }}>${netEarnings.toLocaleString()}</span>
                <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Revenue minus expenses</span>
              </div>
              <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Active Clients</span>
                <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-purple)' }}>{clientCount}</span>
                <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>From client list</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.25rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Projects:</span>
                  <strong style={{ fontSize: '0.85rem' }}>{activeProjects.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Goals:</span>
                  <strong style={{ fontSize: '0.85rem' }}>{completedGoals}/{totalGoals} completed</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Overdue tasks:</span>
                  <strong style={{ fontSize: '0.85rem', color: overdueTasksCount > 0 ? 'var(--accent-magenta)' : 'var(--text-secondary)' }}>
                    {overdueTasksCount}
                  </strong>
                </div>
                <button className="glass-btn btn-cyan" style={{ width: '100%', fontSize: '0.8rem', height: '36px', marginTop: '0.5rem' }} onClick={() => setCurrentView('crm')}>
                  Open CRM Center
                </button>
              </div>

              {/* Recharts chart comparing Income vs Expenses */}
              <div style={{ height: '140px', width: '100%' }}>
                {revenueChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChartData} layout="vertical" margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                      <XAxis type="number" stroke="var(--text-muted)" fontSize={9} />
                      <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={9} width={85} />
                      <Tooltip 
                        contentStyle={{ background: 'rgba(15, 15, 17, 0.95)', borderColor: 'var(--panel-border)', borderRadius: 'var(--radius-sm)' }}
                        labelStyle={{ color: 'var(--text-primary)' }}
                      />
                      <Bar dataKey="value" fill="var(--accent-cyan)" radius={[0, 4, 4, 0]}>
                        {revenueChartData.map((_, index) => {
                          const colors = ['var(--accent-teal)', 'var(--accent-magenta)', 'var(--accent-cyan)'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    No transactions yet
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Projects Overview */}
          <section className="glass-panel os-section">
            <div className="os-section-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Layers size={16} className="text-cyan" /> Projects Overview</span>
              {overdueTasksCount > 0 && (
                <span className="badge badge-magenta" style={{ fontSize: '0.65rem' }}>
                  {overdueTasksCount} task(s) overdue
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>
              <div>
                <strong style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In-Progress Projects</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {activeProjects.length > 0 ? (
                    activeProjects.map(project => {
                      const daysLeft = daysRemaining(project.deadline);
                      const progress = getProjectProgress(project);
                      return (
                        <div key={project.id} className="project-tile" onClick={() => setCurrentView('projects')} style={{ padding: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '0.85rem' }}>{project.title}</strong>
                            <span className="mono" style={{ fontSize: '0.7rem', color: daysLeft <= 7 ? 'var(--accent-magenta)' : 'var(--text-muted)' }}>
                              {daysLeft > 0 ? `due in ${daysLeft}d` : 'overdue'}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            Category: {project.category.replace('_', ' ')}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                            <div className="mini-progress" style={{ flex: 1, margin: 0 }}>
                              <i style={{ width: `${progress}%` }} />
                            </div>
                            <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--accent-teal)' }}>{progress}%</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem', textAlign: 'center' }}>
                      No projects currently in progress.
                    </div>
                  )}
                </div>
                <button className="glass-btn btn-cyan" style={{ width: '100%', fontSize: '0.8rem', height: '36px', marginTop: '0.75rem' }} onClick={() => setCurrentView('projects')}>
                  Open Project Hub
                </button>
              </div>

              {/* Status Pie Chart */}
              <div>
                <strong style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                  Status Distribution
                </strong>
                <div style={{ height: '140px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {projectStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Custom Legend overlay */}
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', gap: '2px', left: '72%', top: '50%', transform: 'translateY(-50%)' }}>
                    {projectStatusData.map((entry, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: entry.color }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{entry.name} ({entry.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* AI Suggestions Panel */}
          <section className="glass-panel os-section">
            <div className="os-section-title"><Sparkles size={16} className="text-cyan" /> AI Suggestions & Recommendations</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {suggestions.map((sug) => (
                <div key={sug.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, marginRight: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{sug.title}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {sug.reason}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <span className="badge badge-cyan" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>{sug.impact}</span>
                    <button className="glass-btn btn-cyan" onClick={sug.action} style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', height: '28px' }}>
                      {sug.label}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* ========================================================
            ROW 2 COLUMN 3: Secondary Sidebar Stack
           ======================================================== */}
        <div className="os-span-1 os-stack" style={{ gap: '1.25rem' }}>
          
          {/* Goals + Planner */}
          <section className="glass-panel os-section">
            <div className="os-section-title"><Target size={16} className="text-cyan" /> Goals & Planner</div>
            
            {/* Success Probability ring */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'rgba(96,165,250,0.02)', border: '1px solid rgba(96,165,250,0.1)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
              <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
                <svg width="60" height="60" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="16" fill="none" stroke="var(--accent-cyan)" strokeWidth="3"
                          strokeDasharray="100" strokeDashoffset={100 - successProbability}
                          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} />
                </svg>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  {successProbability}%
                </div>
              </div>
              <div>
                <strong style={{ fontSize: '0.8rem', display: 'block' }}>Success Probability</strong>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                  Calculated from sleep, energy & task completion ratio.
                </span>
              </div>
            </div>

            {/* Top Goal */}
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Goal Focus</span>
              {app.goals.length > 0 ? (
                <div style={{ marginTop: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: 600 }}>
                    <span>{app.goals[0].title}</span>
                    <span style={{ color: 'var(--accent-teal)' }}>{app.goals[0].progress}%</span>
                  </div>
                  <div className="mini-progress" style={{ height: '4px', marginTop: '4px' }}>
                    <i style={{ width: `${app.goals[0].progress}%` }} />
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No active goals defined.</span>
              )}
            </div>

            {/* Today's checklist */}
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.45rem' }}>
                Today's Planner Queue ({todayTasks.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {todayTasks.length > 0 ? (
                  todayTasks.slice(0, 4).map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                      <button 
                        onClick={() => handleToggleTask(task.id, task.status)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        {task.status === 'done' ? (
                          <CheckSquare size={16} />
                        ) : (
                          <Square size={16} style={{ color: 'var(--text-secondary)' }} />
                        )}
                      </button>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)', 
                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'
                      }} title={task.title}>
                        {task.title}
                      </span>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All clear! No tasks due today.</span>
                )}
              </div>
            </div>
          </section>

          {/* CRM Snapshot */}
          <section className="glass-panel os-section">
            <div className="os-section-title"><Users size={16} className="text-cyan" /> CRM Snapshot</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>Opportunities</span>
                  <strong style={{ fontSize: '1.15rem', color: app.opportunities.length > 0 ? 'var(--accent-purple)' : 'var(--text-secondary)' }}>
                    {app.opportunities.length}
                  </strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>Clients</span>
                  <strong style={{ fontSize: '1.15rem', color: 'var(--accent-teal)' }}>{app.clients.length}</strong>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                  Opportunities
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {app.opportunities.length > 0 ? (
                    app.opportunities.slice(0, 5).map(opp => (
                      <div key={opp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{opp.title}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{opp.type} · ${opp.revenuePotential}</span>
                        </div>
                        <span className="badge badge-cyan" style={{ fontSize: '0.65rem', scale: '0.9' }}>
                          L{opp.difficulty}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>No opportunities yet.</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Supabase Sync Status:</span>
                <span style={{ color: getStatusConfig(syncMap['supabase'] || 'needs_auth').color, fontWeight: 700 }}>
                  {getStatusConfig(syncMap['supabase'] || 'needs_auth').label}
                </span>
              </div>
            </div>
          </section>

          {/* Finance Mini Panel */}
          <section className="glass-panel os-section">
            <div className="os-section-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CircleDollarSign size={16} className="text-cyan" /> Finance Mini Panel</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: netEarnings >= 0 ? 'var(--accent-teal)' : 'var(--accent-magenta)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                {netEarnings >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                ${netEarnings.toLocaleString()} net
              </span>
            </div>

            {/* Budget status */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Expenses vs Monthly Budget Limit</span>
                <span style={{ fontWeight: 600 }}>${actualExpenses} / $1,200</span>
              </div>
              <div className="mini-progress" style={{ height: '5px', marginTop: '4px' }}>
                <i style={{ 
                  width: `${Math.min(100, (actualExpenses / 1200) * 100)}%`,
                  background: actualExpenses > 1200 ? 'var(--accent-magenta)' : 'linear-gradient(90deg, var(--accent-cyan), var(--accent-teal))'
                }} />
              </div>
            </div>

            {/* Area Chart: Spending / Cash Flow Trend */}
            <div style={{ height: '75px', width: '100%', marginBottom: '0.75rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financeTrendData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="transparent" />
                  <YAxis stroke="transparent" />
                  <Tooltip
                    contentStyle={{ background: 'rgba(15, 15, 17, 0.95)', borderColor: 'var(--panel-border)', borderRadius: 'var(--radius-sm)' }}
                  />
                  <Area type="monotone" dataKey="netBalance" stroke="var(--accent-cyan)" fill="var(--accent-cyan-glow)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', lineHeight: '1.4' }}>
              <strong>AI Advice:</strong> {
                netEarnings > 1500
                  ? "Cash flow looks strong. High ROI reinvestment opportunities are available in integrations & tooling."
                  : netEarnings >= 0
                  ? "Positive net position. Keep expenses under control and clear the pending hot pipeline."
                  : "Caution: Burn rate is exceeding monthly revenue. Follow up on unpaid retainers first."
              }
            </p>
          </section>

          {/* Integrations Health */}
          <section className="glass-panel os-section">
            <div className="os-section-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Settings size={16} className="text-cyan" /> Integrations Health</span>
              <button 
                onClick={() => setCurrentView('integrations')}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: 0 }}
              >
                Manage <Link2 size={12} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {integrationsHealth.map((item, index) => {
                const config = getStatusConfig(item.status);
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', minWidth: 0 }}>
                    <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '0.72rem', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={item.name}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: '0.6rem', color: config.color, fontWeight: 600 }}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>

      </div>
    </div>
  );
};

// Simple vector SVG icon components to avoid missing imports
const SupabaseIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
);

const GoogleIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 1 0 10 10V12H12" />
  </svg>
);
