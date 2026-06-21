import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Download,
  FileJson,
  Flame,
  Goal,
  LineChart,
  RefreshCw,
  Sparkles,
  Timer,
  TrendingUp
} from 'lucide-react';
import { PageHeader } from '../../components/system/Layout';
import { useApp } from '../../context/useApp';
import { readStoredValue } from '../../lib/uiPersistence';
import { cloudRunClient } from '../../lib/api/cloudRunClient';
import { crmSeedLeads } from '../work/crm/seed';
import { contentSeedItems } from '../work/content/seed';
import { jobSeedOpportunities } from '../work/jobs/seed';
import { outreachSeedDrafts } from '../work/outreach/seed';
import type { Lead } from '../work/crm/types';
import type { ContentItem } from '../work/content/types';
import type { JobOpportunity } from '../work/jobs/types';
import type { OutreachEmailDraft } from '../work/outreach/types';

type ReportMode =
  | 'weekly'
  | 'crm'
  | 'sources'
  | 'projects'
  | 'finance'
  | 'goals'
  | 'time'
  | 'ai';

type ChartRow = Record<string, string | number>;

const colors = ['#22d3ee', '#a855f7', '#14b8a6', '#f59e0b', '#f43f5e', '#60a5fa', '#34d399'];

const currency = (value: number) => `$${Math.round(value).toLocaleString()}`;

const percent = (value: number) => `${Math.round(value)}%`;

const groupCount = <T,>(items: T[], keyFn: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    const key = keyFn(item) || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

const rowsFromCounts = (counts: Record<string, number>, nameKey = 'name') =>
  Object.entries(counts).map(([name, value]) => ({ [nameKey]: name, value }));

const downloadText = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const toCsv = (rows: ChartRow[]) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.map(csvEscape).join(','),
    ...rows.map(row => headers.map(header => csvEscape(row[header])).join(','))
  ].join('\n');
};

const readWorkData = <T,>(key: string, fallback: T[]) => readStoredValue<T[]>(key, fallback);

const MetricCard: React.FC<{
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  tone?: string;
}> = ({ label, value, note, icon, tone = '#22d3ee' }) => (
  <article className="glass-panel" style={{ borderRadius: 'var(--radius-md)', padding: '1rem', minHeight: 132 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>{label}</span>
      <span style={{ color: tone }}>{icon}</span>
    </div>
    <strong style={{ display: 'block', fontSize: '1.75rem', marginTop: '0.5rem' }}>{value}</strong>
    <p className="os-readable" style={{ margin: '0.3rem 0 0', fontSize: '0.78rem' }}>{note}</p>
  </article>
);

const ReportPanel: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, icon, children, action }) => (
  <section className="glass-panel os-section" style={{ minHeight: 300 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
      <div className="os-section-title">{icon}{title}</div>
      {action}
    </div>
    {children}
  </section>
);

export const Reports: React.FC = () => {
  const {
    projects,
    finances,
    goals,
    plannerTasks,
    timeBlocks
  } = useApp();
  const [activeReport, setActiveReport] = useState<ReportMode>('weekly');
  const [aiReportKind, setAiReportKind] = useState<'daily briefing' | 'weekly review' | 'bottlenecks' | 'next best actions'>('weekly review');
  const [aiReport, setAiReport] = useState('');
  const [aiStatus, setAiStatus] = useState('Deterministic summaries are ready. AI generation is optional.');
  const [exportStatus, setExportStatus] = useState('');

  const workData = useMemo(() => ({
    leads: readWorkData<Lead>('nova_work_crm_leads_v1', crmSeedLeads),
    content: readWorkData<ContentItem>('nova_work_content_items_v1', contentSeedItems),
    jobs: readWorkData<JobOpportunity>('nova_work_job_radar_opportunities_v1', jobSeedOpportunities),
    outreachDrafts: readWorkData<OutreachEmailDraft>('nova_work_outreach_drafts_v1', outreachSeedDrafts)
  }), []);

  const reportData = useMemo(() => {
    const income = finances.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expenses = Math.abs(finances.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0));
    const net = income - expenses;
    const projectStatus = rowsFromCounts(groupCount(projects.filter(project => !project.archived), item => item.status), 'status');
    const taskRows = projects.map(project => {
      const total = project.tasks.length;
      const done = project.tasks.filter(task => task.completed || task.status === 'done').length;
      return { name: project.title.slice(0, 22), complete: done, open: Math.max(0, total - done), percent: total ? Math.round((done / total) * 100) : 0 };
    });
    const crmPipeline = rowsFromCounts(groupCount(workData.leads, lead => lead.stage || lead.status), 'stage');
    const leadSources = Object.entries(groupCount(workData.leads, lead => lead.platform))
      .map(([source, leads]) => ({
        source,
        leads,
        qualified: workData.leads.filter(lead => lead.platform === source && lead.aiScore >= 75).length
      }));
    const revenueTrend = finances
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .reduce<Array<{ date: string; income: number; expense: number; net: number }>>((rows, item) => {
        const label = item.date.slice(5);
        const row = rows.find(entry => entry.date === label) || { date: label, income: 0, expense: 0, net: 0 };
        if (!rows.includes(row)) rows.push(row);
        if (item.type === 'income') row.income += item.amount;
        else row.expense += Math.abs(item.amount);
        row.net = row.income - row.expense;
        return rows;
      }, []);
    const goalProgress = goals.map(goal => ({
      name: goal.title.slice(0, 26),
      progress: Math.round(goal.progress || 0),
      probability: Math.min(98, Math.round((goal.progress || 0) * 0.72 + (goal.status === 'completed' ? 25 : goal.status === 'at_risk' ? 4 : 14)))
    }));
    const contentOutput = Object.entries(groupCount(workData.content, item => item.platform))
      .map(([platform, output]) => ({
        platform,
        output,
        published: workData.content.filter(item => item.platform === platform && item.status === 'Published').length
      }));
    const financeByCategory = rowsFromCounts(groupCount(finances, item => item.category), 'category')
      .map(row => ({
        ...row,
        amount: Math.abs(finances.filter(item => item.category === row.category).reduce((sum, item) => sum + item.amount, 0))
      }));
    const focusRows = timeBlocks.map(block => {
      const minutes = Math.max(0, (new Date(block.end).getTime() - new Date(block.start).getTime()) / 60000);
      return { category: block.category.replace('_', ' '), minutes: Math.round(minutes), quality: block.focusQuality };
    });
    const activeProjects = projects.filter(project => project.status === 'in_progress' && !project.archived);
    const overdueTasks = plannerTasks.filter(task => task.status !== 'done' && new Date(task.dueDate) < new Date());
    const openTasks = plannerTasks.filter(task => task.status !== 'done').length + projects.flatMap(project => project.tasks).filter(task => !task.completed && task.status !== 'done').length;
    const completedTasks = plannerTasks.filter(task => task.status === 'done').length + projects.flatMap(project => project.tasks).filter(task => task.completed || task.status === 'done').length;

    return {
      income,
      expenses,
      net,
      projectStatus,
      taskRows,
      crmPipeline,
      leadSources,
      revenueTrend,
      goalProgress,
      contentOutput,
      financeByCategory,
      focusRows,
      activeProjects,
      overdueTasks,
      openTasks,
      completedTasks,
      hotLeads: workData.leads.filter(lead => lead.temperature === 'Hot' || lead.status === 'Hot'),
      proposals: workData.outreachDrafts.filter(draft => draft.purpose === 'portfolio_showcase' || draft.purpose === 'cold_outreach' || draft.subject.toLowerCase().includes('proposal')),
      highFitJobs: workData.jobs.filter(job => job.matchScore >= 80)
    };
  }, [finances, goals, plannerTasks, projects, timeBlocks, workData]);

  const deterministicReport = useMemo(() => {
    const taskCompletion = reportData.completedTasks + reportData.openTasks
      ? (reportData.completedTasks / (reportData.completedTasks + reportData.openTasks)) * 100
      : 0;
    const bestLeadSource = [...reportData.leadSources].sort((a, b) => b.qualified - a.qualified)[0];
    const weakestProject = [...reportData.taskRows].sort((a, b) => a.percent - b.percent)[0];
    const focusMinutes = reportData.focusRows.reduce((sum, row) => sum + row.minutes, 0);

    return [
      `Weekly business report: ${currency(reportData.income)} income, ${currency(reportData.expenses)} expenses, ${currency(reportData.net)} net.`,
      `CRM pipeline report: ${workData.leads.length} leads, ${reportData.hotLeads.length} hot, ${reportData.proposals.length} proposal/outreach drafts.`,
      `Lead source report: ${bestLeadSource ? `${bestLeadSource.source} is producing the strongest qualified signal (${bestLeadSource.qualified}/${bestLeadSource.leads}).` : 'No lead source data yet.'}`,
      `Project delivery report: ${reportData.activeProjects.length} active projects; ${weakestProject ? `${weakestProject.name} needs attention at ${weakestProject.percent}% task completion.` : 'No open project tasks.'}`,
      `Finance monthly report: ${reportData.net >= 0 ? 'Positive' : 'Negative'} cash position of ${currency(reportData.net)}.`,
      `Goal progress report: average goal progress is ${percent(goals.reduce((sum, goal) => sum + goal.progress, 0) / Math.max(1, goals.length))}.`,
      `Time/focus report: ${Math.round(focusMinutes)} minutes logged, ${percent(taskCompletion)} task completion, and ${reportData.overdueTasks.length} overdue planner tasks.`,
      `Next best action: protect a focus block for the weakest delivery area, then follow up with hot leads before creating more content.`
    ];
  }, [goals, reportData, workData.leads.length]);

  const snapshot = useMemo(() => ({
    generatedAt: new Date().toISOString(),
    metrics: {
      revenue: reportData.income,
      expenses: reportData.expenses,
      net: reportData.net,
      leads: workData.leads.length,
      hotLeads: reportData.hotLeads.length,
      activeProjects: reportData.activeProjects.length,
      openTasks: reportData.openTasks,
      overdueTasks: reportData.overdueTasks.length,
      goals: goals.length,
      contentItems: workData.content.length,
      highFitJobs: reportData.highFitJobs.length
    },
    deterministicReport,
    charts: {
      revenueTrend: reportData.revenueTrend,
      crmPipeline: reportData.crmPipeline,
      projectStatus: reportData.projectStatus,
      taskCompletion: reportData.taskRows,
      goalProgress: reportData.goalProgress,
      contentOutput: reportData.contentOutput
    }
  }), [deterministicReport, goals.length, reportData, workData.content.length, workData.leads.length]);

  const exportRows = useMemo<ChartRow[]>(() => [
    ...deterministicReport.map((line, index) => ({ section: 'summary', metric: `line_${index + 1}`, value: line })),
    ...Object.entries(snapshot.metrics).map(([metric, value]) => ({ section: 'metrics', metric, value: Number(value) }))
  ], [deterministicReport, snapshot.metrics]);

  const handleExportJson = () => {
    downloadText(`nova-report-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(snapshot, null, 2), 'application/json');
    setExportStatus('JSON report exported.');
  };

  const handleExportCsv = () => {
    downloadText(`nova-report-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(exportRows), 'text/csv');
    setExportStatus('CSV report exported.');
  };


  const generateAiReport = async () => {
    setAiStatus(`Generating ${aiReportKind} through /ai/command...`);
    try {
      const result = await cloudRunClient.aiCommand({
        message: `Generate a concise ${aiReportKind} for Motasem OS using this report snapshot. Focus on business, productivity, CRM, finance, projects, goals, and next actions.\n\n${JSON.stringify(snapshot).slice(0, 8000)}`,
        currentView: 'reports',
        contextHints: { reportKind: aiReportKind, snapshot },
        dryRun: true
      });
      setAiReport(result.response || deterministicReport.join('\n'));
      setAiStatus(result.errors?.length ? `AI returned with warnings: ${result.errors.join(', ')}` : 'AI report generated.');
    } catch (error) {
      setAiReport(deterministicReport.join('\n'));
      setAiStatus(`AI unavailable. Showing deterministic report: ${(error as Error).message}`);
    }
  };

  const modeButtons: Array<{ id: ReportMode; label: string; icon: React.ReactNode }> = [
    { id: 'weekly', label: 'Weekly Business', icon: <BriefcaseBusiness size={14} /> },
    { id: 'crm', label: 'CRM Pipeline', icon: <BarChart3 size={14} /> },
    { id: 'sources', label: 'Lead Sources', icon: <TrendingUp size={14} /> },
    { id: 'projects', label: 'Projects', icon: <CheckCircle2 size={14} /> },
    { id: 'finance', label: 'Finance', icon: <LineChart size={14} /> },
    { id: 'goals', label: 'Goals', icon: <Goal size={14} /> },
    { id: 'time', label: 'Time/Focus', icon: <Timer size={14} /> },
    { id: 'ai', label: 'AI Generator', icon: <Sparkles size={14} /> }
  ];

  return (
    <div>
      <PageHeader title="Reports" description="Business, CRM, finance, delivery, goals, content, and focus reporting for the solo-founder OS.">
        <button className="glass-btn" onClick={handleExportJson}><FileJson size={15} /> JSON</button>
        <button className="glass-btn" onClick={handleExportCsv}><Download size={15} /> CSV</button>
      </PageHeader>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <section className="glass-panel os-section">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.7rem' }}>
            {modeButtons.map(button => (
              <button
                key={button.id}
                className={`glass-btn ${activeReport === button.id ? 'btn-cyan' : ''}`}
                onClick={() => setActiveReport(button.id)}
                style={{ justifyContent: 'center' }}
              >
                {button.icon} {button.label}
              </button>
            ))}
          </div>
          {exportStatus && <p className="os-readable" style={{ margin: '0.8rem 0 0' }}>{exportStatus}</p>}
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
          <MetricCard label="Monthly revenue" value={currency(reportData.income)} note={`${currency(reportData.net)} net after tracked expenses`} icon={<TrendingUp size={18} />} />
          <MetricCard label="CRM pipeline" value={`${workData.leads.length}`} note={`${reportData.hotLeads.length} hot leads, ${reportData.proposals.length} proposal drafts`} icon={<BriefcaseBusiness size={18} />} tone="#a855f7" />
          <MetricCard label="Project delivery" value={`${reportData.activeProjects.length}`} note={`${reportData.overdueTasks.length} overdue planner tasks`} icon={<CheckCircle2 size={18} />} tone="#14b8a6" />
          <MetricCard label="Content output" value={`${workData.content.length}`} note={`${workData.content.filter(item => item.status === 'Published').length} published, ${workData.content.filter(item => item.status === 'Scheduled').length} scheduled`} icon={<CalendarDays size={18} />} tone="#f59e0b" />
          <MetricCard label="Goal progress" value={percent(goals.reduce((sum, goal) => sum + goal.progress, 0) / Math.max(1, goals.length))} note={`${goals.filter(goal => goal.status === 'at_risk').length} at-risk goals`} icon={<Goal size={18} />} tone="#60a5fa" />
          <MetricCard label="High-fit jobs" value={`${reportData.highFitJobs.length}`} note="Tracked in Job Radar with match score >= 80" icon={<Flame size={18} />} tone="#f43f5e" />
        </div>

        {activeReport === 'weekly' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(280px, 0.75fr)', gap: '1rem' }}>
            <ReportPanel title="Revenue Trend" icon={<LineChart size={16} />}>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <AreaChart data={reportData.revenueTrend}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="income" stroke="#22d3ee" fill="#22d3ee33" />
                    <Area type="monotone" dataKey="expense" stroke="#f43f5e" fill="#f43f5e22" />
                    <Area type="monotone" dataKey="net" stroke="#14b8a6" fill="#14b8a622" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ReportPanel>
            <ReportPanel title="Weekly Business Report" icon={<BriefcaseBusiness size={16} />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {deterministicReport.map(line => (
                  <p key={line} className="os-readable" style={{ margin: 0 }}>{line}</p>
                ))}
              </div>
            </ReportPanel>
          </div>
        )}

        {activeReport === 'crm' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
            <ReportPanel title="Lead Pipeline" icon={<BarChart3 size={16} />}>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={reportData.crmPipeline}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="stage" stroke="var(--text-muted)" />
                    <YAxis allowDecimals={false} stroke="var(--text-muted)" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#a855f7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ReportPanel>
            <ReportPanel title="Pipeline Notes" icon={<Sparkles size={16} />}>
              {reportData.hotLeads.slice(0, 5).map(lead => (
                <article key={lead.id} className="signal-row">
                  <span>{lead.name}<small style={{ display: 'block', color: 'var(--text-muted)' }}>{lead.nextBestAction}</small></span>
                  <span className="badge badge-magenta">{lead.aiScore}</span>
                </article>
              ))}
            </ReportPanel>
          </div>
        )}

        {activeReport === 'sources' && (
          <ReportPanel title="Lead Source Quality" icon={<TrendingUp size={16} />}>
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <BarChart data={reportData.leadSources}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="source" stroke="var(--text-muted)" />
                  <YAxis allowDecimals={false} stroke="var(--text-muted)" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="leads" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="qualified" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ReportPanel>
        )}

        {activeReport === 'projects' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.8fr) minmax(0, 1.2fr)', gap: '1rem' }}>
            <ReportPanel title="Project Status Distribution" icon={<BriefcaseBusiness size={16} />}>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={reportData.projectStatus} dataKey="value" nameKey="status" outerRadius={92} label>
                      {reportData.projectStatus.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ReportPanel>
            <ReportPanel title="Task Completion By Project" icon={<CheckCircle2 size={16} />}>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={reportData.taskRows}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" />
                    <YAxis allowDecimals={false} stroke="var(--text-muted)" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="complete" stackId="a" fill="#14b8a6" />
                    <Bar dataKey="open" stackId="a" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ReportPanel>
          </div>
        )}

        {activeReport === 'finance' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
            <ReportPanel title="Finance Monthly Report" icon={<LineChart size={16} />}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                <MetricCard label="Income" value={currency(reportData.income)} note="Tracked client payments" icon={<TrendingUp size={16} />} />
                <MetricCard label="Expenses" value={currency(reportData.expenses)} note="Tracked spend" icon={<Download size={16} />} tone="#f43f5e" />
                <MetricCard label="Net" value={currency(reportData.net)} note="Income minus expenses" icon={<CheckCircle2 size={16} />} tone="#14b8a6" />
              </div>
              <p className="os-readable">AI financial advice: keep software and hardware burn under 15% of monthly income, then reserve a fixed percentage for tax and runway before upgrading tools.</p>
            </ReportPanel>
            <ReportPanel title="Spend / Income Categories" icon={<BarChart3 size={16} />}>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={reportData.financeByCategory}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="category" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ReportPanel>
          </div>
        )}

        {activeReport === 'goals' && (
          <ReportPanel title="Goal Progress + Success Probability" icon={<Goal size={16} />}>
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <BarChart data={reportData.goalProgress}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" />
                  <YAxis domain={[0, 100]} stroke="var(--text-muted)" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="progress" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="probability" fill="#a855f7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ReportPanel>
        )}

        {activeReport === 'time' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
            <ReportPanel title="Time / Focus Report" icon={<Timer size={16} />}>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={reportData.focusRows}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="category" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="minutes" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="quality" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ReportPanel>
            <ReportPanel title="Content Output" icon={<CalendarDays size={16} />}>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={reportData.contentOutput}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="platform" stroke="var(--text-muted)" />
                    <YAxis allowDecimals={false} stroke="var(--text-muted)" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="output" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="published" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ReportPanel>
          </div>
        )}

        {activeReport === 'ai' && (
          <ReportPanel
            title="AI Report Generator"
            icon={<Sparkles size={16} />}
            action={<button className="glass-btn btn-cyan" onClick={generateAiReport}><RefreshCw size={15} /> Generate</button>}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Report type</label>
                <select className="glass-input" value={aiReportKind} onChange={event => setAiReportKind(event.target.value as typeof aiReportKind)} style={{ background: '#0a0814' }}>
                  <option value="daily briefing">Daily briefing</option>
                  <option value="weekly review">Weekly review</option>
                  <option value="bottlenecks">Bottlenecks</option>
                  <option value="next best actions">Next best actions</option>
                </select>
                <p className="os-readable">{aiStatus}</p>
              </div>
              <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', padding: '1rem', minHeight: 260 }}>
                <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {aiReport || deterministicReport.join('\n')}
                </div>
              </div>
            </div>
          </ReportPanel>
        )}
      </div>
    </div>
  );
};
