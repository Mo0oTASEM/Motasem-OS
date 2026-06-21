import type {
  CanonicalCollectionName,
  CanonicalRecordByCollection,
  CrmLeadRecord,
  FinanceTransactionRecord,
  GoalRecord,
  MemoryItemRecord,
  PlannerTaskRecord,
  ProjectRecord
} from './models.js';
import { repositoryFactory } from './repositoryFactory.js';
import type { CreateInput } from './repositoryTypes.js';

type LocalStorageMigrationPayload = {
  projects?: Array<Record<string, unknown>>;
  goals?: Array<Record<string, unknown>>;
  plannerTasks?: Array<Record<string, unknown>>;
  crmLeads?: Array<Record<string, unknown>>;
  financeTransactions?: Array<Record<string, unknown>>;
  finances?: Array<Record<string, unknown>>;
  memoryItems?: Array<Record<string, unknown>>;
};

const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const asNumber = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asArray = (value: unknown) => Array.isArray(value) ? value : [];

const base = (userId: string, item: Record<string, unknown>) => ({
  id: asString(item.id) || undefined,
  userId,
  createdAt: asString(item.createdAt) || new Date().toISOString(),
  source: 'localStorage' as const,
  syncStatus: 'pending' as const,
  externalIds: typeof item.externalIds === 'object' && item.externalIds ? item.externalIds as Record<string, string> : {}
});

const projectFromLocal = (userId: string, item: Record<string, unknown>): CreateInput<ProjectRecord> => ({
  ...base(userId, item),
  title: asString(item.title, 'Untitled project'),
  description: asString(item.description),
  category: asString(item.category),
  status: asString(item.status),
  deadline: asString(item.deadline),
  clientId: asString(item.clientId) || undefined
});

const goalFromLocal = (userId: string, item: Record<string, unknown>): CreateInput<GoalRecord> => ({
  ...base(userId, item),
  title: asString(item.title, 'Untitled goal'),
  description: asString(item.description),
  level: asString(item.level),
  parentGoalId: asString(item.parentGoalId) || undefined,
  progress: asNumber(item.progress),
  status: asString(item.status),
  targetDate: asString(item.targetDate),
  smart: {
    specific: asString(item.smartSpecific) || undefined,
    measurable: asString(item.smartMeasurable) || undefined,
    achievable: asString(item.smartAchievable) || undefined,
    relevant: asString(item.smartRelevant) || undefined,
    timeBound: asString(item.smartTimeBound) || undefined
  },
  activities: asArray(item.activities) as Array<Record<string, unknown>>
});

const plannerTaskFromLocal = (userId: string, item: Record<string, unknown>): CreateInput<PlannerTaskRecord> => ({
  ...base(userId, item),
  title: asString(item.title, 'Untitled task'),
  status: asString(item.status),
  priority: asString(item.priority),
  dueDate: asString(item.dueDate),
  goalId: asString(item.goalId),
  estimatedMinutes: asNumber(item.estimatedMinutes)
});

const crmLeadFromLocal = (userId: string, item: Record<string, unknown>): CreateInput<CrmLeadRecord> => ({
  ...base(userId, item),
  name: asString(item.name, 'Unnamed lead'),
  company: asString(item.company),
  socialProfile: asString(item.platform),
  email: asString(item.email),
  phone: asString(item.phoneOrHandle),
  status: asString(item.status),
  serviceInterest: asString(item.serviceInterest),
  budget: asString(item.budgetRange),
  score: asNumber(item.aiScore),
  nextAction: asString(item.nextBestAction),
  followUpDate: asString(item.nextFollowUpAt),
  notes: asString(item.notes)
});

const financeFromLocal = (userId: string, item: Record<string, unknown>): CreateInput<FinanceTransactionRecord> => ({
  ...base(userId, item),
  date: asString(item.date, new Date().toISOString().slice(0, 10)),
  amount: asNumber(item.amount),
  currency: asString(item.currency, 'USD'),
  type: asString(item.type),
  category: asString(item.category),
  description: asString(item.description),
  clientId: asString(item.clientId) || undefined,
  merchant: asString(item.merchant)
});

const memoryFromLocal = (userId: string, item: Record<string, unknown>): CreateInput<MemoryItemRecord> => ({
  ...base(userId, item),
  type: asString(item.type, 'note'),
  title: asString(item.title, 'Untitled memory'),
  content: asString(item.content),
  tags: asArray(item.tags).map(String),
  links: asArray(item.links).map(String),
  relatedEntityIds: asArray(item.relatedEntityIds).map(String),
  aiSummary: asString(item.aiSummary),
  importanceScore: asNumber(item.importanceScore, 60)
});

const write = async <K extends CanonicalCollectionName>(
  userId: string,
  collectionName: K,
  records: Array<CreateInput<CanonicalRecordByCollection[K]>>
) => {
  const repository = repositoryFactory.forUserCollection(userId, collectionName);
  return repository.batchWrite(records);
};

export const importLocalStoragePayload = async (userId: string, payload: LocalStorageMigrationPayload) => {
  const projects = await write(userId, 'projects', (payload.projects || []).map(item => projectFromLocal(userId, item)));
  const goals = await write(userId, 'goals', (payload.goals || []).map(item => goalFromLocal(userId, item)));
  const plannerTasks = await write(userId, 'planner_tasks', (payload.plannerTasks || []).map(item => plannerTaskFromLocal(userId, item)));
  const crmLeads = await write(userId, 'crm_leads', (payload.crmLeads || []).map(item => crmLeadFromLocal(userId, item)));
  const financeTransactions = await write(
    userId,
    'finance_transactions',
    (payload.financeTransactions || payload.finances || []).map(item => financeFromLocal(userId, item))
  );
  const memoryItems = await write(userId, 'memory_items', (payload.memoryItems || []).map(item => memoryFromLocal(userId, item)));

  return {
    imported: {
      projects: projects.length,
      goals: goals.length,
      plannerTasks: plannerTasks.length,
      crmLeads: crmLeads.length,
      financeTransactions: financeTransactions.length,
      memoryItems: memoryItems.length
    }
  };
};
