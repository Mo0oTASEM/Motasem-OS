import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Columns3,
  Copy,
  Edit3,
  ExternalLink,
  Filter,
  FolderKanban,
  Goal as GoalIcon,
  LayoutList,
  Link2,
  ListChecks,
  Plus,
  Save,
  Search,
  Sparkles,
  Table2,
  Trash2,
  X
} from 'lucide-react';
import { PageHeader } from './system/Layout';
import { useApp } from '../context/useApp';
import type { ChecklistItem, Goal, Project } from '../context/AppContext';
import { cloudRunClient } from '../lib/api/cloudRunClient';
import { usePersistentState } from '../lib/uiPersistence';

type ViewMode = 'board' | 'table' | 'timeline' | 'detail';
type ProjectStatus = Project['status'];
type ProjectPriority = NonNullable<Project['priority']>;
type TaskStatus = NonNullable<ChecklistItem['status']>;

interface ProjectTemplate {
  id: string;
  name: string;
  category: Project['category'];
  priority: ProjectPriority;
  budget: number;
  owner: string;
  description: string;
  tags: string[];
  tasks: string[];
  deliverables: string[];
  links: Array<{ name: string; url: string }>;
  notes: string;
}

interface ProjectDraft {
  title: string;
  description: string;
  category: Project['category'];
  status: ProjectStatus;
  priority: ProjectPriority;
  deadline: string;
  clientId: string;
  budget: number;
  progress: number;
  tags: string;
  owner: string;
  notes: string;
  deliverables: string;
  links: string;
  templateId: string;
}

interface AiSuggestion {
  title: string;
  reason: string;
  impact: string;
  action: 'task' | 'project' | 'crm';
}

const statusColumns: Array<{ id: ProjectStatus; label: string; hint: string }> = [
  { id: 'backlog', label: 'Backlog', hint: 'Scoped, queued, or waiting' },
  { id: 'in_progress', label: 'In Progress', hint: 'Active execution' },
  { id: 'review', label: 'Review', hint: 'QA, client review, polish' },
  { id: 'completed', label: 'Completed', hint: 'Shipped or archived proof' }
];

const priorityConfig: Record<ProjectPriority, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: '#94a3b8', bg: 'rgba(148,163,184,0.13)' },
  medium: { label: 'Medium', color: 'var(--accent-cyan)', bg: 'rgba(34,211,238,0.12)' },
  high: { label: 'High', color: '#f59e0b', bg: 'rgba(245,158,11,0.14)' },
  urgent: { label: 'Urgent', color: 'var(--accent-magenta)', bg: 'rgba(244,63,94,0.15)' }
};

const taskStatuses: Array<{ id: TaskStatus; label: string }> = [
  { id: 'todo', label: 'Todo' },
  { id: 'in_progress', label: 'Doing' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' }
];

const categoryLabels: Record<Project['category'], string> = {
  game_dev: 'Game Dev',
  motion_design: 'Motion Design',
  freelance: 'Client Work',
  personal: 'Personal'
};

const goalLevels: Goal['level'][] = ['life', 'annual', 'quarterly', 'monthly', 'weekly'];
const goalStatuses: Goal['status'][] = ['active', 'at_risk', 'completed'];

const templates: ProjectTemplate[] = [
  {
    id: 'motion_design',
    name: 'Motion Design Client Project',
    category: 'motion_design',
    priority: 'high',
    budget: 3800,
    owner: 'Lead Motion Designer',
    description: 'Client motion package covering creative direction, storyboards, animation, review rounds, final masters, and cutdowns.',
    tags: ['motion', 'client', 'animation'],
    tasks: ['Creative brief and references', 'Storyboard approval', 'Animation blocking', 'Render polish', 'Client review', 'Master exports'],
    deliverables: ['Master video', 'Social cutdowns', 'Review deck', 'Delivery notes'],
    links: [{ name: 'Reference board', url: 'https://figma.com/file/reference-board' }],
    notes: 'Use structured references and links only. Store source files outside Motasem OS.'
  },
  {
    id: 'game_dev',
    name: 'Game Development Prototype',
    category: 'game_dev',
    priority: 'medium',
    budget: 5500,
    owner: 'Gameplay Developer',
    description: 'Prototype sprint for a playable mechanic, build validation, controls, camera, feedback, and a release-ready demo loop.',
    tags: ['unity', 'prototype', 'gameplay'],
    tasks: ['Mechanic spec', 'Greybox scene', 'Core controller', 'Enemy or obstacle loop', 'HUD feedback', 'Build and test'],
    deliverables: ['Playable build', 'Prototype notes', 'Short demo capture'],
    links: [{ name: 'Repo', url: 'https://github.com/' }],
    notes: 'Keep design decisions, blockers, and playtest notes here.'
  },
  {
    id: 'product_launch',
    name: 'Product Launch',
    category: 'freelance',
    priority: 'urgent',
    budget: 7200,
    owner: 'Launch Operator',
    description: 'Launch plan for landing page, offer, payment flow, analytics, email copy, and launch-day execution.',
    tags: ['launch', 'product', 'marketing'],
    tasks: ['Offer positioning', 'Landing page copy', 'Checkout flow', 'Analytics events', 'Launch email', 'Post-launch report'],
    deliverables: ['Landing URL', 'Launch checklist', 'Email copy', 'Metrics report'],
    links: [{ name: 'Launch dashboard', url: '#/dashboard' }],
    notes: 'Track assumptions, risks, and conversion proof.'
  },
  {
    id: 'portfolio_case_study',
    name: 'Portfolio Case Study',
    category: 'personal',
    priority: 'medium',
    budget: 800,
    owner: 'Creative Director',
    description: 'Turn a finished project into a case study with outcome narrative, process, stills, motion clips, and publish checklist.',
    tags: ['portfolio', 'proof', 'case-study'],
    tasks: ['Outcome story', 'Process outline', 'Still selection', 'Short reel', 'Website draft', 'Publish and share'],
    deliverables: ['Case study page', 'Social teaser', 'Before/after proof'],
    links: [{ name: 'Portfolio CMS', url: 'https://behance.net/' }],
    notes: 'Focus on business outcome and creative reasoning.'
  },
  {
    id: 'social_campaign',
    name: 'Social Media Content Campaign',
    category: 'personal',
    priority: 'medium',
    budget: 500,
    owner: 'Content Producer',
    description: 'Multi-post campaign for reels, carousels, captions, hooks, scheduling, and performance review.',
    tags: ['content', 'social', 'campaign'],
    tasks: ['Topic map', 'Hook drafts', 'Record assets', 'Edit posts', 'Schedule posts', 'Review metrics'],
    deliverables: ['Content calendar', 'Caption set', 'Rendered posts', 'Performance notes'],
    links: [{ name: 'Planner sheet', url: '#/planner' }],
    notes: 'Treat every post as a business asset with a clear CTA.'
  },
  {
    id: 'crm_build',
    name: 'CRM/Business System Build',
    category: 'freelance',
    priority: 'high',
    budget: 4500,
    owner: 'Systems Builder',
    description: 'Business system build covering lead model, workflows, Google sync, reports, and operator handoff.',
    tags: ['crm', 'automation', 'systems'],
    tasks: ['Pipeline schema', 'Lead import', 'Follow-up rules', 'Reporting view', 'Sync test', 'Operator guide'],
    deliverables: ['CRM workspace', 'Sync checklist', 'Workflow documentation'],
    links: [{ name: 'CRM spreadsheet', url: '#/crm' }],
    notes: 'Keep approval-gated external actions out of this project record.'
  }
];

const todayIso = () => new Date().toISOString().slice(0, 10);

const futureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const emptyDraft = (): ProjectDraft => ({
  title: '',
  description: '',
  category: 'freelance',
  status: 'backlog',
  priority: 'medium',
  deadline: futureDate(14),
  clientId: '',
  budget: 0,
  progress: 0,
  tags: '',
  owner: '',
  notes: '',
  deliverables: '',
  links: '',
  templateId: 'blank'
});

const taskFromText = (text: string, project: Partial<Project>, index = 0): ChecklistItem => ({
  id: `task-${Date.now()}-${index}-${Math.round(Math.random() * 1000)}`,
  text,
  completed: false,
  status: 'todo',
  priority: project.priority || 'medium',
  dueDate: project.deadline || futureDate(7),
  owner: project.owner || '',
  notes: ''
});

const normalizeTask = (task: ChecklistItem, project?: Project): ChecklistItem => ({
  ...task,
  status: task.status || (task.completed ? 'done' : 'todo'),
  priority: task.priority || project?.priority || 'medium',
  dueDate: task.dueDate || project?.deadline || '',
  owner: task.owner || project?.owner || '',
  notes: task.notes || ''
});

const splitLines = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean);

const parseLinks = (value: string) =>
  splitLines(value).map(line => {
    const [name, ...urlParts] = line.split('|');
    const url = urlParts.join('|').trim();
    return { name: (name || url || 'Reference').trim(), url: url || name.trim() };
  });

const linksToText = (links?: Array<{ name: string; url: string }>) =>
  (links || []).map(link => `${link.name} | ${link.url}`).join('\n');

const projectProgress = (project: Project) => {
  if (typeof project.progress === 'number') return Math.max(0, Math.min(100, project.progress));
  if (!project.tasks.length) return 0;
  return Math.round((project.tasks.filter(task => task.completed).length / project.tasks.length) * 100);
};

const isOverdue = (project: Project) => {
  if (!project.deadline || project.status === 'completed') return false;
  return new Date(project.deadline).getTime() < new Date(todayIso()).getTime();
};

const daysUntil = (date: string) => {
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.ceil((new Date(date).getTime() - new Date(todayIso()).getTime()) / oneDay);
};

const money = (amount?: number) => `$${Math.round(amount || 0).toLocaleString()}`;

const selectStyle: React.CSSProperties = { background: '#0b1020', color: 'var(--text-primary)' };

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--text-secondary)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0
};

const smallMuted: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.5 };

export const ProjectManager: React.FC = () => {
  const {
    projects,
    clients,
    goals,
    addProject,
    updateProject,
    deleteProject,
    updateGoalItem
  } = useApp();

  const [viewMode, setViewMode] = usePersistentState<ViewMode>('nova_projects_view_v2', 'board');
  const [search, setSearch] = usePersistentState('nova_projects_search_v2', '', 'session');
  const [statusFilter, setStatusFilter] = usePersistentState<ProjectStatus | 'all'>('nova_projects_status_v2', 'all');
  const [priorityFilter, setPriorityFilter] = usePersistentState<ProjectPriority | 'all'>('nova_projects_priority_v2', 'all');
  const [clientFilter, setClientFilter] = usePersistentState('nova_projects_client_v2', 'all');
  const [categoryFilter, setCategoryFilter] = usePersistentState<Project['category'] | 'all'>('nova_projects_category_v2', 'all');
  const [dueFilter, setDueFilter] = usePersistentState<'all' | 'overdue' | 'week' | 'month'>('nova_projects_due_v2', 'all');
  const [showArchived, setShowArchived] = usePersistentState('nova_projects_archived_v2', false);
  const [selectedProjectId, setSelectedProjectId] = usePersistentState<string | null>('nova_projects_selected_v2', null, 'session');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [taskEditor, setTaskEditor] = useState<{ projectId: string; task: ChecklistItem | null } | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const clientName = useCallback(
    (clientId?: string) => clients.find(client => client.id === clientId)?.company || 'Internal',
    [clients]
  );

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects
      .filter(project => (showArchived ? project.archived : !project.archived))
      .filter(project => (statusFilter === 'all' ? true : project.status === statusFilter))
      .filter(project => (priorityFilter === 'all' ? true : (project.priority || 'medium') === priorityFilter))
      .filter(project => (clientFilter === 'all' ? true : (project.clientId || '') === clientFilter))
      .filter(project => (categoryFilter === 'all' ? true : project.category === categoryFilter))
      .filter(project => {
        if (dueFilter === 'all') return true;
        const days = daysUntil(project.deadline);
        if (dueFilter === 'overdue') return isOverdue(project);
        if (dueFilter === 'week') return days >= 0 && days <= 7;
        return days >= 0 && days <= 30;
      })
      .filter(project => {
        if (!query) return true;
        const haystack = [
          project.title,
          project.description,
          project.owner,
          clientName(project.clientId),
          categoryLabels[project.category],
          ...(project.tags || []),
          ...(project.deliverables || []),
          project.notes || '',
          ...project.tasks.map(task => `${task.text} ${task.owner || ''} ${task.notes || ''}`)
        ].join(' ').toLowerCase();
        return haystack.includes(query);
      });
  }, [projects, showArchived, statusFilter, priorityFilter, clientFilter, categoryFilter, dueFilter, search, clientName]);

  const selectedProject = useMemo(
    () => projects.find(project => project.id === selectedProjectId) || filteredProjects[0] || null,
    [projects, filteredProjects, selectedProjectId]
  );

  const metrics = useMemo(() => {
    const active = projects.filter(project => !project.archived && project.status !== 'completed');
    const overdueTasks = projects.flatMap(project => project.tasks.map(task => ({ project, task: normalizeTask(task, project) })))
      .filter(({ task }) => task.status !== 'done' && task.dueDate && new Date(task.dueDate).getTime() < new Date(todayIso()).getTime()).length;
    return {
      active: active.length,
      value: active.reduce((sum, project) => sum + (project.budget || 0), 0),
      overdue: projects.filter(isOverdue).length,
      overdueTasks,
      review: projects.filter(project => project.status === 'review').length
    };
  }, [projects]);

  const openCreate = (templateId = 'blank') => {
    const base = emptyDraft();
    const template = templates.find(item => item.id === templateId);
    if (template) {
      setDraft({
        ...base,
        templateId,
        title: template.name,
        description: template.description,
        category: template.category,
        priority: template.priority,
        budget: template.budget,
        owner: template.owner,
        tags: template.tags.join(', '),
        notes: template.notes,
        deliverables: template.deliverables.join('\n'),
        links: linksToText(template.links)
      });
    } else {
      setDraft(base);
    }
    setEditingProject(null);
    setEditorOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setDraft({
      title: project.title,
      description: project.description,
      category: project.category,
      status: project.status,
      priority: project.priority || 'medium',
      deadline: project.deadline,
      clientId: project.clientId || '',
      budget: project.budget || 0,
      progress: projectProgress(project),
      tags: (project.tags || []).join(', '),
      owner: project.owner || '',
      notes: project.notes || '',
      deliverables: (project.deliverables || []).join('\n'),
      links: linksToText(project.links),
      templateId: 'blank'
    });
    setEditorOpen(true);
  };

  const saveProject = () => {
    const template = templates.find(item => item.id === draft.templateId);
    const tags = draft.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const projectPayload: Omit<Project, 'id'> = {
      title: draft.title.trim() || 'Untitled Project',
      description: draft.description.trim(),
      category: draft.category,
      status: draft.status,
      deadline: draft.deadline || futureDate(14),
      clientId: draft.clientId || undefined,
      tasks: editingProject
        ? editingProject.tasks.map(task => normalizeTask(task, editingProject))
        : (template?.tasks || ['Define scope', 'Create execution plan', 'Review and ship']).map((task, index) => taskFromText(task, {
          priority: draft.priority,
          deadline: draft.deadline,
          owner: draft.owner
        }, index)),
      priority: draft.priority,
      budget: Number(draft.budget) || 0,
      progress: Number(draft.progress) || 0,
      tags,
      notes: draft.notes,
      deliverables: splitLines(draft.deliverables),
      links: parseLinks(draft.links),
      owner: draft.owner,
      archived: editingProject?.archived || false
    };

    if (editingProject) {
      updateProject(editingProject.id, projectPayload);
      setSelectedProjectId(editingProject.id);
    } else {
      addProject(projectPayload);
    }
    setEditorOpen(false);
  };

  const duplicateProject = (project: Project) => {
    addProject({
      ...project,
      title: `${project.title} Copy`,
      status: 'backlog',
      tasks: project.tasks.map((task, index) => ({ ...normalizeTask(task, project), id: `task-copy-${Date.now()}-${index}`, completed: false, status: 'todo' })),
      archived: false
    });
  };

  const patchProject = (projectId: string, updates: Partial<Project>) => updateProject(projectId, updates);

  const patchTask = (projectId: string, taskId: string, updates: Partial<ChecklistItem>) => {
    const project = projects.find(item => item.id === projectId);
    if (!project) return;
    const tasks = project.tasks.map(task => {
      if (task.id !== taskId) return task;
      const next = { ...normalizeTask(task, project), ...updates };
      return { ...next, completed: next.status === 'done' || Boolean(next.completed) };
    });
    updateProject(projectId, { tasks });
  };

  const saveTask = (projectId: string, task: ChecklistItem) => {
    const project = projects.find(item => item.id === projectId);
    if (!project) return;
    const normalized = normalizeTask(task, project);
    if (task.id) {
      updateProject(projectId, { tasks: project.tasks.map(item => item.id === task.id ? normalized : item) });
    } else {
      updateProject(projectId, { tasks: [{ ...normalized, id: `task-${projectId}-${project.tasks.length + 1}` }, ...project.tasks] });
    }
    setTaskEditor(null);
  };

  const deleteTask = (projectId: string, taskId: string) => {
    const project = projects.find(item => item.id === projectId);
    if (!project) return;
    updateProject(projectId, { tasks: project.tasks.filter(task => task.id !== taskId) });
  };

  const updateDeliverable = (project: Project, index: number, value: string) => {
    const deliverables = [...(project.deliverables || [])];
    deliverables[index] = value;
    updateProject(project.id, { deliverables: deliverables.filter(Boolean) });
  };

  const addDeliverable = (project: Project) => updateProject(project.id, { deliverables: [...(project.deliverables || []), 'New deliverable'] });

  const updateLink = (project: Project, index: number, link: { name: string; url: string }) => {
    const links = [...(project.links || [])];
    links[index] = link;
    updateProject(project.id, { links });
  };

  const addLink = (project: Project) => updateProject(project.id, { links: [...(project.links || []), { name: 'Reference', url: 'https://' }] });

  const localSuggestions = (project: Project | null): AiSuggestion[] => {
    const target = project || filteredProjects.find(item => item.status !== 'completed') || projects[0] || null;
    return [
      {
        title: target ? `Create next execution task for ${target.title}` : 'Create a scoped starter project',
        reason: target ? 'The project needs one crisp next action to keep momentum visible.' : 'A blank workspace is easier to manage once the first milestone exists.',
        impact: 'High focus gain',
        action: 'task'
      },
      {
        title: 'Review overdue deadlines',
        reason: `${metrics.overdue} projects and ${metrics.overdueTasks} tasks are currently time-sensitive.`,
        impact: 'Risk reduction',
        action: 'project'
      },
      {
        title: 'Promote review work into client follow-up',
        reason: `${metrics.review} projects are in review and may need a client-facing next step.`,
        impact: 'Revenue protection',
        action: 'crm'
      },
      {
        title: 'Add deliverables to weak project records',
        reason: 'Projects with clear deliverables are easier to price, ship, and reuse as proof.',
        impact: 'Better handoff',
        action: 'project'
      },
      {
        title: 'Align active projects with quarterly goals',
        reason: 'Goal context makes prioritization less arbitrary when the board gets busy.',
        impact: 'Strategic clarity',
        action: 'project'
      }
    ];
  };

  const askAi = async () => {
    setAiLoading(true);
    const target = selectedProject || filteredProjects[0] || null;
    try {
      const result = await cloudRunClient.aiCommand({
        message: 'Review the current Project Hub and return concise project management suggestions. Do not execute actions.',
        currentView: 'projects',
        selectedEntityId: target?.id,
        dryRun: true,
        contextHints: {
          project: target ? {
            title: target.title,
            status: target.status,
            priority: target.priority,
            deadline: target.deadline,
            progress: projectProgress(target),
            deliverables: target.deliverables,
            openTasks: target.tasks.filter(task => !task.completed).slice(0, 8).map(task => task.text)
          } : null,
          board: {
            activeProjects: metrics.active,
            overdueProjects: metrics.overdue,
            overdueTasks: metrics.overdueTasks
          }
        }
      });
      setAiSuggestions([
        {
          title: 'AI project review',
          reason: result.response || 'Motasem AI returned a project review.',
          impact: `${Math.round((result.confidence || 0.7) * 100)}% confidence`,
          action: 'project'
        },
        ...localSuggestions(target).slice(0, 4)
      ]);
    } catch {
      setAiSuggestions(localSuggestions(target));
    } finally {
      setAiLoading(false);
    }
  };

  const executeSuggestion = (suggestion: AiSuggestion) => {
    const target = selectedProject || filteredProjects[0] || null;
    if (suggestion.action === 'crm') {
      window.history.pushState(null, '', '#/crm');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }
    if (suggestion.action === 'task' && target) {
      saveTask(target.id, {
        id: '',
        text: suggestion.title,
        completed: false,
        status: 'todo',
        priority: target.priority || 'medium',
        dueDate: target.deadline,
        owner: target.owner || '',
        notes: suggestion.reason
      });
      return;
    }
    if (target) {
      setSelectedProjectId(target.id);
      setViewMode('detail');
    }
  };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
      <PageHeader title="Serious project command board" description="Edit every project, task, deadline, owner, client, deliverable, reference, note, and goal alignment from one local-first workspace.">
        <button className="glass-btn" onClick={askAi} disabled={aiLoading}>
          <Sparkles size={16} /> {aiLoading ? 'Thinking...' : 'AI Suggestions'}
        </button>
        <button className="glass-btn btn-cyan" onClick={() => openCreate()}>
          <Plus size={16} /> New Project
        </button>
      </PageHeader>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-cyan)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
        <FolderKanban size={16} />
        Project Hub
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
        <MetricCard label="Active Projects" value={metrics.active} detail={`${metrics.review} waiting review`} icon={<Columns3 size={16} />} />
        <MetricCard label="Open Value" value={money(metrics.value)} detail="Non-archived, not completed" icon={<CheckCircle2 size={16} />} />
        <MetricCard label="Overdue Projects" value={metrics.overdue} detail={`${metrics.overdueTasks} overdue tasks`} icon={<AlertTriangle size={16} />} danger={metrics.overdue > 0} />
        <MetricCard label="Visible Records" value={filteredProjects.length} detail={showArchived ? 'Including archive' : 'Live workspace'} icon={<Filter size={16} />} />
      </section>

      <section className="glass-panel" style={{ padding: '0.85rem', display: 'grid', gridTemplateColumns: 'minmax(220px, 1.5fr) repeat(5, minmax(120px, 1fr))', gap: '0.6rem', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
          <input className="glass-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search projects, tasks, notes, tags..." style={{ width: '100%', paddingLeft: 34 }} />
        </div>
        <select className="glass-input" value={statusFilter} onChange={event => setStatusFilter(event.target.value as ProjectStatus | 'all')} style={selectStyle}>
          <option value="all">All statuses</option>
          {statusColumns.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}
        </select>
        <select className="glass-input" value={priorityFilter} onChange={event => setPriorityFilter(event.target.value as ProjectPriority | 'all')} style={selectStyle}>
          <option value="all">All priorities</option>
          {Object.keys(priorityConfig).map(priority => <option key={priority} value={priority}>{priorityConfig[priority as ProjectPriority].label}</option>)}
        </select>
        <select className="glass-input" value={clientFilter} onChange={event => setClientFilter(event.target.value)} style={selectStyle}>
          <option value="all">All clients</option>
          <option value="">Internal</option>
          {clients.map(client => <option key={client.id} value={client.id}>{client.company}</option>)}
        </select>
        <select className="glass-input" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value as Project['category'] | 'all')} style={selectStyle}>
          <option value="all">All categories</option>
          {Object.entries(categoryLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <select className="glass-input" value={dueFilter} onChange={event => setDueFilter(event.target.value as typeof dueFilter)} style={selectStyle}>
          <option value="all">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="week">Due this week</option>
          <option value="month">Due this month</option>
        </select>
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['board', 'table', 'timeline', 'detail'] as ViewMode[]).map(mode => (
              <button key={mode} className={`glass-btn ${viewMode === mode ? 'btn-cyan' : ''}`} onClick={() => setViewMode(mode)}>
                {mode === 'board' && <Columns3 size={15} />}
                {mode === 'table' && <Table2 size={15} />}
                {mode === 'timeline' && <CalendarDays size={15} />}
                {mode === 'detail' && <LayoutList size={15} />}
                {mode[0].toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <button className="glass-btn" onClick={() => setShowArchived(!showArchived)}>
            <Archive size={15} /> {showArchived ? 'Hide Archive' : 'Show Archive'}
          </button>
        </div>
      </section>

      <section style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: 2 }}>
        {templates.map(template => (
          <button key={template.id} className="glass-btn" onClick={() => openCreate(template.id)} style={{ minWidth: 220, justifyContent: 'flex-start' }}>
            <Plus size={14} />
            {template.name}
          </button>
        ))}
      </section>

      {aiSuggestions.length > 0 && (
        <section className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}><Sparkles size={17} /> AI Suggestions</h2>
            <button className="glass-btn" onClick={() => setAiSuggestions([])}><X size={14} /> Clear</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {aiSuggestions.map((suggestion, index) => (
              <div key={`${suggestion.title}-${index}`} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.85rem', background: 'rgba(255,255,255,0.025)' }}>
                <strong style={{ fontSize: '0.9rem' }}>{suggestion.title}</strong>
                <p style={{ ...smallMuted, margin: '0.45rem 0' }}>{suggestion.reason}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>{suggestion.impact}</span>
                  <button className="glass-btn btn-cyan" onClick={() => executeSuggestion(suggestion)}>
                    {suggestion.action === 'task' ? 'Create Task' : suggestion.action === 'crm' ? 'Open CRM' : 'Open Project'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {filteredProjects.length === 0 ? (
        <EmptyState onCreate={() => openCreate()} />
      ) : (
        <>
          {viewMode === 'board' && (
            <ProjectBoard
              projects={filteredProjects}
              clientName={clientName}
              onSelect={project => { setSelectedProjectId(project.id); setViewMode('detail'); }}
              onEdit={openEdit}
              onDuplicate={duplicateProject}
              onArchive={project => patchProject(project.id, { archived: !project.archived })}
              onDelete={setDeleteTarget}
              onStatusChange={(project, status) => patchProject(project.id, { status })}
            />
          )}
          {viewMode === 'table' && (
            <ProjectTable
              projects={filteredProjects}
              clientName={clientName}
              clients={clients}
              onSelect={project => { setSelectedProjectId(project.id); setViewMode('detail'); }}
              onEdit={openEdit}
              onPatch={patchProject}
              onDelete={setDeleteTarget}
            />
          )}
          {viewMode === 'timeline' && (
            <ProjectTimeline
              projects={filteredProjects}
              clientName={clientName}
              onSelect={project => { setSelectedProjectId(project.id); setViewMode('detail'); }}
              onPatch={patchProject}
            />
          )}
          {viewMode === 'detail' && selectedProject && (
            <ProjectDetail
              project={selectedProject}
              clientName={clientName}
              clients={clients}
              onPatch={patchProject}
              onEdit={openEdit}
              onDuplicate={duplicateProject}
              onDelete={setDeleteTarget}
              onEditTask={(task) => setTaskEditor({ projectId: selectedProject.id, task })}
              onNewTask={() => setTaskEditor({ projectId: selectedProject.id, task: null })}
              onPatchTask={patchTask}
              onDeleteTask={deleteTask}
              onAddDeliverable={addDeliverable}
              onUpdateDeliverable={updateDeliverable}
              onAddLink={addLink}
              onUpdateLink={updateLink}
            />
          )}
        </>
      )}

      <GoalAlignmentBoard goals={goals} updateGoalItem={updateGoalItem} />

      {editorOpen && (
        <ProjectEditorModal
          draft={draft}
          setDraft={setDraft}
          clients={clients}
          editingProject={editingProject}
          onClose={() => setEditorOpen(false)}
          onSave={saveProject}
        />
      )}

      {taskEditor && (
        <ProjectTaskEditor
          project={projects.find(project => project.id === taskEditor.projectId) || null}
          task={taskEditor.task}
          onClose={() => setTaskEditor(null)}
          onSave={saveTask}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          project={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteProject(deleteTarget.id);
            if (selectedProjectId === deleteTarget.id) setSelectedProjectId(null);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: React.ReactNode; detail: string; icon: React.ReactNode; danger?: boolean }> = ({ label, value, detail, icon, danger }) => (
  <div className="glass-panel" style={{ padding: '0.9rem', borderColor: danger ? 'rgba(244,63,94,0.28)' : undefined }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: danger ? 'var(--accent-magenta)' : 'var(--accent-cyan)' }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>{label}</span>
      {icon}
    </div>
    <div style={{ fontSize: '1.55rem', fontWeight: 900, marginTop: '0.35rem' }}>{value}</div>
    <div style={{ ...smallMuted, fontSize: '0.74rem' }}>{detail}</div>
  </div>
);

const EmptyState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <section className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
    <FolderKanban size={34} style={{ color: 'var(--accent-cyan)' }} />
    <h2 style={{ margin: '0.75rem 0 0.35rem' }}>No projects match this view</h2>
    <p style={{ ...smallMuted, margin: '0 auto 1rem', maxWidth: 520 }}>Clear filters or create a new structured project from a template.</p>
    <button className="glass-btn btn-cyan" onClick={onCreate}><Plus size={16} /> Create Project</button>
  </section>
);

const ProjectBoard: React.FC<{
  projects: Project[];
  clientName: (clientId?: string) => string;
  onSelect: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDuplicate: (project: Project) => void;
  onArchive: (project: Project) => void;
  onDelete: (project: Project) => void;
  onStatusChange: (project: Project, status: ProjectStatus) => void;
}> = ({ projects, clientName, onSelect, onEdit, onDuplicate, onArchive, onDelete, onStatusChange }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(250px, 1fr))', gap: '0.8rem', overflowX: 'auto' }}>
    {statusColumns.map(column => {
      const columnProjects = projects.filter(project => project.status === column.id);
      return (
        <section key={column.id} className="glass-panel" style={{ padding: '0.8rem', minWidth: 250 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '0.95rem' }}>{column.label}</h2>
              <p style={{ ...smallMuted, margin: 0, fontSize: '0.72rem' }}>{column.hint}</p>
            </div>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 900 }}>{columnProjects.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {columnProjects.length === 0 && <div style={{ ...smallMuted, border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 8, padding: '1rem' }}>Drop or move work here when ready.</div>}
            {columnProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                clientName={clientName(project.clientId)}
                onSelect={() => onSelect(project)}
                onEdit={() => onEdit(project)}
                onDuplicate={() => onDuplicate(project)}
                onArchive={() => onArchive(project)}
                onDelete={() => onDelete(project)}
                onStatusChange={status => onStatusChange(project, status)}
              />
            ))}
          </div>
        </section>
      );
    })}
  </div>
);

const ProjectCard: React.FC<{
  project: Project;
  clientName: string;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onStatusChange: (status: ProjectStatus) => void;
}> = ({ project, clientName, onSelect, onEdit, onDuplicate, onArchive, onDelete, onStatusChange }) => {
  const progress = projectProgress(project);
  const priority = project.priority || 'medium';
  const overdue = isOverdue(project);
  return (
    <article style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.035)', borderRadius: 8, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <button onClick={onSelect} style={{ background: 'transparent', border: 0, color: 'var(--text-primary)', fontWeight: 850, textAlign: 'left', padding: 0, cursor: 'pointer', lineHeight: 1.25 }}>
          {project.title}
        </button>
        <span style={{ fontSize: '0.68rem', color: priorityConfig[priority].color, background: priorityConfig[priority].bg, padding: '0.22rem 0.42rem', borderRadius: 999, alignSelf: 'flex-start' }}>
          {priorityConfig[priority].label}
        </span>
      </div>
      <p style={{ ...smallMuted, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{categoryLabels[project.category]}</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{clientName}</span>
        <span style={{ fontSize: '0.72rem', color: overdue ? 'var(--accent-magenta)' : 'var(--text-secondary)' }}>
          {project.deadline} {overdue ? 'overdue' : `${daysUntil(project.deadline)}d`}
        </span>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
          <span>{project.tasks.filter(task => task.completed).length}/{project.tasks.length} tasks</span>
          <span>{progress}%</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: overdue ? 'var(--accent-magenta)' : 'var(--accent-cyan)' }} />
        </div>
      </div>
      <select className="glass-input" value={project.status} onChange={event => onStatusChange(event.target.value as ProjectStatus)} style={{ ...selectStyle, height: 34 }}>
        {statusColumns.map(status => <option key={status.id} value={status.id}>Move to {status.label}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="glass-btn" onClick={onEdit}><Edit3 size={13} /> Edit</button>
        <button className="glass-btn" onClick={onDuplicate}><Copy size={13} /></button>
        <button className="glass-btn" onClick={onArchive}><Archive size={13} /></button>
        <button className="glass-btn" onClick={onDelete}><Trash2 size={13} /></button>
      </div>
    </article>
  );
};

const ProjectTable: React.FC<{
  projects: Project[];
  clientName: (clientId?: string) => string;
  clients: Array<{ id: string; company: string }>;
  onSelect: (project: Project) => void;
  onEdit: (project: Project) => void;
  onPatch: (id: string, updates: Partial<Project>) => void;
  onDelete: (project: Project) => void;
}> = ({ projects, clients, onSelect, onEdit, onPatch, onDelete }) => (
  <section className="glass-panel" style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
      <thead>
        <tr style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0 }}>
          {['Project', 'Client', 'Status', 'Priority', 'Deadline', 'Owner', 'Value', 'Progress', 'Actions'].map(head => (
            <th key={head} style={{ textAlign: 'left', padding: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{head}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {projects.map(project => (
          <tr key={project.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <td style={{ padding: '0.75rem' }}>
              <button onClick={() => onSelect(project)} style={{ background: 'transparent', border: 0, color: 'var(--text-primary)', fontWeight: 800, cursor: 'pointer', padding: 0 }}>{project.title}</button>
              <div style={{ ...smallMuted, fontSize: '0.72rem' }}>{categoryLabels[project.category]} · {project.tasks.length} tasks</div>
            </td>
            <td style={{ padding: '0.75rem' }}>
              <select className="glass-input" value={project.clientId || ''} onChange={event => onPatch(project.id, { clientId: event.target.value || undefined })} style={selectStyle}>
                <option value="">Internal</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.company}</option>)}
              </select>
            </td>
            <td style={{ padding: '0.75rem' }}>
              <select className="glass-input" value={project.status} onChange={event => onPatch(project.id, { status: event.target.value as ProjectStatus })} style={selectStyle}>
                {statusColumns.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}
              </select>
            </td>
            <td style={{ padding: '0.75rem' }}>
              <select className="glass-input" value={project.priority || 'medium'} onChange={event => onPatch(project.id, { priority: event.target.value as ProjectPriority })} style={selectStyle}>
                {Object.entries(priorityConfig).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
              </select>
            </td>
            <td style={{ padding: '0.75rem' }}><input className="glass-input" type="date" value={project.deadline} onChange={event => onPatch(project.id, { deadline: event.target.value })} /></td>
            <td style={{ padding: '0.75rem' }}><input className="glass-input" value={project.owner || ''} onChange={event => onPatch(project.id, { owner: event.target.value })} /></td>
            <td style={{ padding: '0.75rem' }}><input className="glass-input" type="number" value={project.budget || 0} onChange={event => onPatch(project.id, { budget: Number(event.target.value) || 0 })} /></td>
            <td style={{ padding: '0.75rem' }}><input className="glass-input" type="number" min={0} max={100} value={projectProgress(project)} onChange={event => onPatch(project.id, { progress: Number(event.target.value) || 0 })} /></td>
            <td style={{ padding: '0.75rem' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="glass-btn" onClick={() => onEdit(project)}><Edit3 size={13} /></button>
                <button className="glass-btn" onClick={() => onDelete(project)}><Trash2 size={13} /></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const ProjectTimeline: React.FC<{
  projects: Project[];
  clientName: (clientId?: string) => string;
  onSelect: (project: Project) => void;
  onPatch: (id: string, updates: Partial<Project>) => void;
}> = ({ projects, clientName, onSelect, onPatch }) => {
  const sorted = [...projects].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  return (
    <section className="glass-panel" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {sorted.map(project => {
          const days = daysUntil(project.deadline);
          const progress = projectProgress(project);
          const danger = isOverdue(project);
          return (
            <div key={project.id} style={{ display: 'grid', gridTemplateColumns: '150px minmax(220px, 1fr) 110px 130px', gap: '0.75rem', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.8rem' }}>
              <div style={{ color: danger ? 'var(--accent-magenta)' : 'var(--accent-cyan)', fontWeight: 900 }}>{danger ? `${Math.abs(days)}d late` : `${days}d left`}</div>
              <button onClick={() => onSelect(project)} style={{ textAlign: 'left', background: 'transparent', border: 0, color: 'var(--text-primary)', cursor: 'pointer', padding: 0 }}>
                <strong>{project.title}</strong>
                <div style={{ ...smallMuted, fontSize: '0.72rem' }}>{clientName(project.clientId)} · {project.owner || 'No owner'} · {project.deadline}</div>
                <div style={{ height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: danger ? 'var(--accent-magenta)' : 'var(--accent-cyan)' }} />
                </div>
              </button>
              <select className="glass-input" value={project.status} onChange={event => onPatch(project.id, { status: event.target.value as ProjectStatus })} style={selectStyle}>
                {statusColumns.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}
              </select>
              <input className="glass-input" type="date" value={project.deadline} onChange={event => onPatch(project.id, { deadline: event.target.value })} />
            </div>
          );
        })}
      </div>
    </section>
  );
};

const ProjectDetail: React.FC<{
  project: Project;
  clients: Array<{ id: string; company: string }>;
  clientName: (clientId?: string) => string;
  onPatch: (id: string, updates: Partial<Project>) => void;
  onEdit: (project: Project) => void;
  onDuplicate: (project: Project) => void;
  onDelete: (project: Project) => void;
  onEditTask: (task: ChecklistItem) => void;
  onNewTask: () => void;
  onPatchTask: (projectId: string, taskId: string, updates: Partial<ChecklistItem>) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
  onAddDeliverable: (project: Project) => void;
  onUpdateDeliverable: (project: Project, index: number, value: string) => void;
  onAddLink: (project: Project) => void;
  onUpdateLink: (project: Project, index: number, link: { name: string; url: string }) => void;
}> = ({ project, clients, onPatch, onEdit, onDuplicate, onDelete, onEditTask, onNewTask, onPatchTask, onDeleteTask, onAddDeliverable, onUpdateDeliverable, onAddLink, onUpdateLink }) => {
  const progress = projectProgress(project);
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 0.8fr)', gap: '1rem', alignItems: 'start' }}>
      <div className="glass-panel" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.45rem' }}>{project.title}</h2>
            <p style={{ ...smallMuted, margin: '0.35rem 0 0' }}>{project.description}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="glass-btn" onClick={() => onEdit(project)}><Edit3 size={15} /> Edit</button>
            <button className="glass-btn" onClick={() => onDuplicate(project)}><Copy size={15} /> Duplicate</button>
            <button className="glass-btn" onClick={() => onDelete(project)}><Trash2 size={15} /> Delete</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem', marginBottom: '1rem' }}>
          <QuickField label="Status">
            <select className="glass-input" value={project.status} onChange={event => onPatch(project.id, { status: event.target.value as ProjectStatus })} style={selectStyle}>
              {statusColumns.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}
            </select>
          </QuickField>
          <QuickField label="Priority">
            <select className="glass-input" value={project.priority || 'medium'} onChange={event => onPatch(project.id, { priority: event.target.value as ProjectPriority })} style={selectStyle}>
              {Object.entries(priorityConfig).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
            </select>
          </QuickField>
          <QuickField label="Client">
            <select className="glass-input" value={project.clientId || ''} onChange={event => onPatch(project.id, { clientId: event.target.value || undefined })} style={selectStyle}>
              <option value="">Internal</option>
              {clients.map(client => <option key={client.id} value={client.id}>{client.company}</option>)}
            </select>
          </QuickField>
          <QuickField label="Deadline">
            <input className="glass-input" type="date" value={project.deadline} onChange={event => onPatch(project.id, { deadline: event.target.value })} />
          </QuickField>
          <QuickField label="Budget / Value">
            <input className="glass-input" type="number" value={project.budget || 0} onChange={event => onPatch(project.id, { budget: Number(event.target.value) || 0 })} />
          </QuickField>
          <QuickField label="Owner / Role">
            <input className="glass-input" value={project.owner || ''} onChange={event => onPatch(project.id, { owner: event.target.value })} />
          </QuickField>
        </div>

        <div style={{ marginBottom: '1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: 6 }}>
            <span>Project progress</span>
            <span>{progress}%</span>
          </div>
          <input type="range" min={0} max={100} value={progress} onChange={event => onPatch(project.id, { progress: Number(event.target.value) })} style={{ width: '100%' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><ListChecks size={17} /> Tasks</h3>
          <button className="glass-btn btn-cyan" onClick={onNewTask}><Plus size={14} /> Task</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {project.tasks.length === 0 && <p style={smallMuted}>No tasks yet. Add the first project task to make this actionable.</p>}
          {project.tasks.map(rawTask => {
            const task = normalizeTask(rawTask, project);
            return (
              <div key={task.id} style={{ display: 'grid', gridTemplateColumns: '32px minmax(180px, 1fr) 120px 120px 120px 90px', gap: '0.5rem', alignItems: 'center', padding: '0.55rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
                <button className="glass-btn" onClick={() => onPatchTask(project.id, task.id, { status: task.status === 'done' ? 'todo' : 'done', completed: task.status !== 'done' })} style={{ width: 30, height: 30, padding: 0 }}>
                  {task.status === 'done' ? <CheckSquare size={14} /> : <CheckCircle2 size={14} />}
                </button>
                <button onClick={() => onEditTask(task)} style={{ background: 'transparent', border: 0, color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.status === 'done' ? 'line-through' : 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                  {task.text}
                  {task.notes && <div style={{ ...smallMuted, fontSize: '0.7rem' }}>{task.notes}</div>}
                </button>
                <select className="glass-input" value={task.status} onChange={event => onPatchTask(project.id, task.id, { status: event.target.value as TaskStatus, completed: event.target.value === 'done' })} style={selectStyle}>
                  {taskStatuses.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}
                </select>
                <select className="glass-input" value={task.priority || 'medium'} onChange={event => onPatchTask(project.id, task.id, { priority: event.target.value as ProjectPriority })} style={selectStyle}>
                  {Object.keys(priorityConfig).map(priority => <option key={priority} value={priority}>{priorityConfig[priority as ProjectPriority].label}</option>)}
                </select>
                <input className="glass-input" type="date" value={task.dueDate || ''} onChange={event => onPatchTask(project.id, task.id, { dueDate: event.target.value })} />
                <button className="glass-btn" onClick={() => onDeleteTask(project.id, task.id)}><Trash2 size={13} /></button>
              </div>
            );
          })}
        </div>
      </div>

      <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <ProjectNotesPanel project={project} onPatch={onPatch} />
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <SectionHeader title="Deliverables" icon={<CheckSquare size={16} />} action={<button className="glass-btn" onClick={() => onAddDeliverable(project)}><Plus size={13} /></button>} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {(project.deliverables || []).map((deliverable, index) => (
              <input key={`${deliverable}-${index}`} className="glass-input" value={deliverable} onChange={event => onUpdateDeliverable(project, index, event.target.value)} />
            ))}
            {(project.deliverables || []).length === 0 && <p style={smallMuted}>No deliverables defined.</p>}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <SectionHeader title="References & Links" icon={<Link2 size={16} />} action={<button className="glass-btn" onClick={() => onAddLink(project)}><Plus size={13} /></button>} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(project.links || []).map((link, index) => (
              <div key={`${link.name}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 34px', gap: 6 }}>
                <input className="glass-input" value={link.name} onChange={event => onUpdateLink(project, index, { ...link, name: event.target.value })} />
                <input className="glass-input" value={link.url} onChange={event => onUpdateLink(project, index, { ...link, url: event.target.value })} />
                <a className="glass-btn" href={link.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><ExternalLink size={13} /></a>
              </div>
            ))}
            {(project.links || []).length === 0 && <p style={smallMuted}>No references yet. Use links to external docs, boards, briefs, and published proof.</p>}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <SectionHeader title="Tags" icon={<Filter size={16} />} />
          <input className="glass-input" value={(project.tags || []).join(', ')} onChange={event => onPatch(project.id, { tags: event.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })} />
        </div>
      </aside>
    </section>
  );
};

const QuickField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={fieldStyle}>
    <span style={labelStyle}>{label}</span>
    {children}
  </label>
);

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode; action?: React.ReactNode }> = ({ title, icon, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: '0.65rem' }}>
    <h3 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>{icon}{title}</h3>
    {action}
  </div>
);

const ProjectNotesPanel: React.FC<{ project: Project; onPatch: (id: string, updates: Partial<Project>) => void }> = ({ project, onPatch }) => (
  <div className="glass-panel" style={{ padding: '1rem' }}>
    <SectionHeader title="Notes" icon={<LayoutList size={16} />} />
    <textarea
      className="glass-input"
      value={project.notes || ''}
      onChange={event => onPatch(project.id, { notes: event.target.value })}
      placeholder="Scope, blockers, decisions, references, meeting notes, acceptance criteria..."
      style={{ minHeight: 150, width: '100%', resize: 'vertical', lineHeight: 1.5 }}
    />
  </div>
);

const ProjectEditorModal: React.FC<{
  draft: ProjectDraft;
  setDraft: React.Dispatch<React.SetStateAction<ProjectDraft>>;
  clients: Array<{ id: string; company: string }>;
  editingProject: Project | null;
  onClose: () => void;
  onSave: () => void;
}> = ({ draft, setDraft, clients, editingProject, onClose, onSave }) => {
  const set = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => setDraft(prev => ({ ...prev, [key]: value }));
  const applyTemplate = (templateId: string) => {
    const template = templates.find(item => item.id === templateId);
    if (!template) {
      set('templateId', templateId);
      return;
    }
    setDraft(prev => ({
      ...prev,
      templateId,
      title: template.name,
      description: template.description,
      category: template.category,
      priority: template.priority,
      budget: template.budget,
      owner: template.owner,
      tags: template.tags.join(', '),
      notes: template.notes,
      deliverables: template.deliverables.join('\n'),
      links: linksToText(template.links)
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ width: 'min(860px, 94vw)', maxHeight: '90vh', overflowY: 'auto', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>{editingProject ? 'Edit Project' : 'Create Project'}</h2>
          <button className="glass-btn" onClick={onClose}><X size={15} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.8rem' }}>
          {!editingProject && (
            <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
              <span style={labelStyle}>Smart template</span>
              <select className="glass-input" value={draft.templateId} onChange={event => applyTemplate(event.target.value)} style={selectStyle}>
                <option value="blank">Blank Project</option>
                {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
            </label>
          )}
          <QuickField label="Title"><input className="glass-input" value={draft.title} onChange={event => set('title', event.target.value)} /></QuickField>
          <QuickField label="Owner / Role"><input className="glass-input" value={draft.owner} onChange={event => set('owner', event.target.value)} /></QuickField>
          <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <span style={labelStyle}>Description</span>
            <textarea className="glass-input" value={draft.description} onChange={event => set('description', event.target.value)} style={{ minHeight: 90 }} />
          </label>
          <QuickField label="Client">
            <select className="glass-input" value={draft.clientId} onChange={event => set('clientId', event.target.value)} style={selectStyle}>
              <option value="">Internal</option>
              {clients.map(client => <option key={client.id} value={client.id}>{client.company}</option>)}
            </select>
          </QuickField>
          <QuickField label="Category">
            <select className="glass-input" value={draft.category} onChange={event => set('category', event.target.value as Project['category'])} style={selectStyle}>
              {Object.entries(categoryLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </QuickField>
          <QuickField label="Status">
            <select className="glass-input" value={draft.status} onChange={event => set('status', event.target.value as ProjectStatus)} style={selectStyle}>
              {statusColumns.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}
            </select>
          </QuickField>
          <QuickField label="Priority">
            <select className="glass-input" value={draft.priority} onChange={event => set('priority', event.target.value as ProjectPriority)} style={selectStyle}>
              {Object.keys(priorityConfig).map(priority => <option key={priority} value={priority}>{priorityConfig[priority as ProjectPriority].label}</option>)}
            </select>
          </QuickField>
          <QuickField label="Deadline"><input className="glass-input" type="date" value={draft.deadline} onChange={event => set('deadline', event.target.value)} /></QuickField>
          <QuickField label="Budget / Value"><input className="glass-input" type="number" value={draft.budget} onChange={event => set('budget', Number(event.target.value) || 0)} /></QuickField>
          <QuickField label="Progress"><input className="glass-input" type="number" min={0} max={100} value={draft.progress} onChange={event => set('progress', Number(event.target.value) || 0)} /></QuickField>
          <QuickField label="Tags"><input className="glass-input" value={draft.tags} onChange={event => set('tags', event.target.value)} placeholder="crm, launch, client" /></QuickField>
          <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <span style={labelStyle}>Deliverables, one per line</span>
            <textarea className="glass-input" value={draft.deliverables} onChange={event => set('deliverables', event.target.value)} style={{ minHeight: 86 }} />
          </label>
          <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <span style={labelStyle}>References & links, one per line as Name | URL</span>
            <textarea className="glass-input" value={draft.links} onChange={event => set('links', event.target.value)} style={{ minHeight: 86 }} />
          </label>
          <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <span style={labelStyle}>Notes</span>
            <textarea className="glass-input" value={draft.notes} onChange={event => set('notes', event.target.value)} style={{ minHeight: 110 }} />
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '1rem' }}>
          <button className="glass-btn" onClick={onClose}>Cancel</button>
          <button className="glass-btn btn-cyan" onClick={onSave}><Save size={15} /> Save Project</button>
        </div>
      </div>
    </div>
  );
};

const ProjectTaskEditor: React.FC<{
  project: Project | null;
  task: ChecklistItem | null;
  onClose: () => void;
  onSave: (projectId: string, task: ChecklistItem) => void;
}> = ({ project, task, onClose, onSave }) => {
  const [draft, setDraft] = useState<ChecklistItem>(() => normalizeTask(task || {
    id: '',
    text: '',
    completed: false,
    status: 'todo',
    priority: project?.priority || 'medium',
    dueDate: project?.deadline || futureDate(7),
    owner: project?.owner || '',
    notes: ''
  }, project || undefined));

  if (!project) return null;
  const set = <K extends keyof ChecklistItem>(key: K, value: ChecklistItem[K]) => setDraft(prev => ({ ...prev, [key]: value }));

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ width: 'min(560px, 94vw)', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>{task ? 'Edit Task' : 'Create Task'}</h2>
          <button className="glass-btn" onClick={onClose}><X size={15} /></button>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <QuickField label="Task"><input className="glass-input" value={draft.text} onChange={event => set('text', event.target.value)} /></QuickField>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
            <QuickField label="Status">
              <select className="glass-input" value={draft.status || 'todo'} onChange={event => set('status', event.target.value as TaskStatus)} style={selectStyle}>
                {taskStatuses.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}
              </select>
            </QuickField>
            <QuickField label="Priority">
              <select className="glass-input" value={draft.priority || 'medium'} onChange={event => set('priority', event.target.value as ProjectPriority)} style={selectStyle}>
                {Object.keys(priorityConfig).map(priority => <option key={priority} value={priority}>{priorityConfig[priority as ProjectPriority].label}</option>)}
              </select>
            </QuickField>
            <QuickField label="Due date"><input className="glass-input" type="date" value={draft.dueDate || ''} onChange={event => set('dueDate', event.target.value)} /></QuickField>
            <QuickField label="Owner / Role"><input className="glass-input" value={draft.owner || ''} onChange={event => set('owner', event.target.value)} /></QuickField>
          </div>
          <QuickField label="Notes"><textarea className="glass-input" value={draft.notes || ''} onChange={event => set('notes', event.target.value)} style={{ minHeight: 90 }} /></QuickField>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '1rem' }}>
          <button className="glass-btn" onClick={onClose}>Cancel</button>
          <button className="glass-btn btn-cyan" onClick={() => onSave(project.id, { ...draft, completed: draft.status === 'done' })}><Save size={15} /> Save Task</button>
        </div>
      </div>
    </div>
  );
};

const GoalAlignmentBoard: React.FC<{
  goals: Goal[];
  updateGoalItem: (id: string, updates: Partial<Goal>) => void;
}> = ({ goals, updateGoalItem }) => (
  <section className="glass-panel" style={{ padding: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: '0.8rem' }}>
      <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><GoalIcon size={18} /> Goal Alignment</h2>
      <span style={{ ...smallMuted, fontSize: '0.74rem' }}>Edit goals and move them between levels or status lanes.</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
      {goals.map(goal => (
        <article key={goal.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.75rem', background: 'rgba(255,255,255,0.025)' }}>
          <input className="glass-input" value={goal.title} onChange={event => updateGoalItem(goal.id, { title: event.target.value })} style={{ fontWeight: 800, marginBottom: '0.45rem' }} />
          <textarea className="glass-input" value={goal.description} onChange={event => updateGoalItem(goal.id, { description: event.target.value })} style={{ minHeight: 70, marginBottom: '0.45rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', marginBottom: '0.45rem' }}>
            <select className="glass-input" value={goal.level} onChange={event => updateGoalItem(goal.id, { level: event.target.value as Goal['level'] })} style={selectStyle}>
              {goalLevels.map(level => <option key={level} value={level}>{level}</option>)}
            </select>
            <select className="glass-input" value={goal.status} onChange={event => updateGoalItem(goal.id, { status: event.target.value as Goal['status'] })} style={selectStyle}>
              {goalStatuses.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '0.45rem' }}>
            <input className="glass-input" type="date" value={goal.targetDate} onChange={event => updateGoalItem(goal.id, { targetDate: event.target.value })} />
            <input className="glass-input" type="number" min={0} max={100} value={goal.progress} onChange={event => updateGoalItem(goal.id, { progress: Number(event.target.value) || 0 })} />
          </div>
        </article>
      ))}
      {goals.length === 0 && <p style={smallMuted}>No goals available yet.</p>}
    </div>
  </section>
);

const ConfirmDeleteModal: React.FC<{ project: Project; onCancel: () => void; onConfirm: () => void }> = ({ project, onCancel, onConfirm }) => (
  <div className="modal-overlay">
    <div className="modal-content glass-panel" style={{ width: 'min(430px, 92vw)', padding: '1.4rem', borderColor: 'rgba(244,63,94,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-magenta)', marginBottom: '0.75rem' }}>
        <AlertTriangle size={20} />
        <h2 style={{ margin: 0 }}>Delete project?</h2>
      </div>
      <p style={{ ...smallMuted, marginBottom: '1.1rem' }}>This permanently deletes "{project.title}" and its structured tasks, notes, deliverables, links, and metadata from the local workspace.</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="glass-btn" onClick={onCancel}>Cancel</button>
        <button className="glass-btn btn-magenta" onClick={onConfirm}><Trash2 size={15} /> Delete</button>
      </div>
    </div>
  </div>
);
