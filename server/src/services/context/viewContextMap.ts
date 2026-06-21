import type { CanonicalCollectionName } from '../database/models.js';

export interface ViewContextDefinition {
  view: string;
  collections: CanonicalCollectionName[];
  description: string;
}

const viewMap: Record<string, ViewContextDefinition> = {
  dashboard: {
    view: 'dashboard',
    collections: ['goals', 'planner_tasks', 'projects', 'crm_leads', 'integration_statuses', 'approvals'],
    description: 'Executive overview across goals, work, tasks, projects, and integration readiness.'
  },
  copilot: {
    view: 'copilot',
    collections: ['goals', 'planner_tasks', 'projects', 'crm_leads', 'memory_items', 'approvals'],
    description: 'Motasem AI chat and command shell.'
  },
  projects: {
    view: 'projects',
    collections: ['projects', 'project_tasks', 'goals'],
    description: 'Project hub, kanban state, checklists, and project assets.'
  },
  crm: {
    view: 'crm',
    collections: ['crm_leads', 'crm_contacts', 'crm_activities', 'approvals', 'goals'],
    description: 'Work Command Center CRM, outreach, leads, and automation logs.'
  },
  finances: {
    view: 'finances',
    collections: ['finance_transactions', 'goals', 'approvals'],
    description: 'Finance ledger, budget, transaction review, and cash visibility.'
  },
  wiki: {
    view: 'wiki',
    collections: ['memory_items', 'projects', 'goals'],
    description: 'Second Brain notes, memory, and retrieval.'
  },
  mission: {
    view: 'mission',
    collections: ['goals', 'planner_tasks', 'projects', 'approvals'],
    description: 'Plan Control goal execution and progress tracking.'
  },
  planner: {
    view: 'planner',
    collections: ['planner_tasks', 'goals', 'projects'],
    description: 'Daily planning, tasks, meetings, and prioritization.'
  },
  journal: {
    view: 'journal',
    collections: ['memory_items', 'goals', 'planner_tasks'],
    description: 'Journal reflections and review inputs.'
  },
  health: {
    view: 'health',
    collections: ['goals', 'planner_tasks'],
    description: 'Health and energy overview.'
  },
  opportunities: {
    view: 'opportunities',
    collections: ['goals', 'projects', 'crm_leads', 'memory_items'],
    description: 'Opportunity scoring for freelance, business, game, and product ideas.'
  },
  time: {
    view: 'time',
    collections: ['planner_tasks', 'projects', 'goals'],
    description: 'Time analysis and focus allocation.'
  },
  strategist: {
    view: 'strategist',
    collections: ['goals', 'projects', 'planner_tasks', 'crm_leads', 'finance_transactions', 'memory_items'],
    description: 'Strategic advice across business, life, bottlenecks, and choices.'
  },
  integrations: {
    view: 'integrations',
    collections: ['integration_statuses', 'approvals', 'ai_action_logs'],
    description: 'Integration configuration, safety settings, and backend readiness.'
  },
  focus: {
    view: 'focus',
    collections: ['projects', 'finance_transactions', 'planner_tasks'],
    description: 'Focus sessions, stopwatch billing, and Pomodoro work.'
  }
};

const keywordCollections: Array<{ terms: string[]; collections: CanonicalCollectionName[] }> = [
  { terms: ['goal', 'mission', 'smart'], collections: ['goals'] },
  { terms: ['task', 'todo', 'plan', 'planner', 'remind'], collections: ['planner_tasks', 'goals'] },
  { terms: ['project', 'asset', 'kanban', 'milestone'], collections: ['projects', 'project_tasks'] },
  { terms: ['lead', 'client', 'crm', 'outreach', 'proposal'], collections: ['crm_leads', 'crm_contacts', 'crm_activities'] },
  { terms: ['finance', 'budget', 'expense', 'income', 'transaction', 'cash'], collections: ['finance_transactions'] },
  { terms: ['memory', 'note', 'wiki', 'remember', 'brain'], collections: ['memory_items'] },
  { terms: ['approval', 'send', 'publish', 'delete', 'bulk'], collections: ['approvals', 'ai_action_logs'] },
  { terms: ['integration', 'google', 'supabase', 'gemini', 'telegram', 'hermes'], collections: ['integration_statuses'] }
];

export const resolveViewContext = (currentView: string, message: string): ViewContextDefinition => {
  const normalizedView = currentView.replace(/^#\/?/, '').trim().toLowerCase() || 'copilot';
  const base = viewMap[normalizedView] || viewMap.copilot;
  const normalizedMessage = message.toLowerCase();
  const collections = new Set<CanonicalCollectionName>(base.collections);

  keywordCollections.forEach(rule => {
    if (rule.terms.some(term => normalizedMessage.includes(term))) {
      rule.collections.forEach(collection => collections.add(collection));
    }
  });

  collections.add('approvals');

  return {
    ...base,
    view: normalizedView,
    collections: [...collections]
  };
};
