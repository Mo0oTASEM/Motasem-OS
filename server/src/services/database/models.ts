export type CanonicalCollectionName =
  | 'projects'
  | 'project_tasks'
  | 'goals'
  | 'planner_tasks'
  | 'crm_leads'
  | 'crm_contacts'
  | 'crm_activities'
  | 'crm_companies'
  | 'crm_deals'
  | 'crm_followups'
  | 'crm_notes'
  | 'finance_transactions'
  | 'memory_items'
  | 'integration_statuses'
  | 'approvals'
  | 'ai_action_logs';

export type CanonicalSource =
  | 'localStorage'
  | 'supabase'
  | 'google'
  | 'gmail'
  | 'google_contacts'
  | 'google_calendar'
  | 'telegram'
  | 'ai'
  | 'manual'
  | 'import';

export type CanonicalSyncStatus = 'local_only' | 'synced' | 'pending' | 'conflict' | 'error';

export interface CanonicalEntity {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  source: CanonicalSource;
  syncStatus: CanonicalSyncStatus;
  externalIds: Record<string, string>;
  deletedAt?: string | null;
}

export interface UserRecord {
  id: string;
  email?: string;
  displayName?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
  source: CanonicalSource;
  syncStatus: CanonicalSyncStatus;
  externalIds: Record<string, string>;
}

export interface ProjectRecord extends CanonicalEntity {
  title: string;
  description?: string;
  category?: string;
  status?: string;
  deadline?: string;
  clientId?: string;
  tags?: string[];
}

export interface ProjectTaskRecord extends CanonicalEntity {
  projectId: string;
  title: string;
  completed: boolean;
  order?: number;
}

export interface GoalRecord extends CanonicalEntity {
  title: string;
  description?: string;
  level?: string;
  parentGoalId?: string;
  progress?: number;
  status?: string;
  targetDate?: string;
  smart?: {
    specific?: string;
    measurable?: string;
    achievable?: string;
    relevant?: string;
    timeBound?: string;
  };
  activities?: Array<Record<string, unknown>>;
}

export interface PlannerTaskRecord extends CanonicalEntity {
  title: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  goalId?: string;
  estimatedMinutes?: number;
}

export interface CrmLeadRecord extends CanonicalEntity {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  socialProfile?: string;
  status?: string;
  stage?: 'new' | 'qualified' | 'contacted' | 'replied' | 'proposal' | 'negotiation' | 'won' | 'lost' | 'archived';
  serviceInterest?: string;
  budget?: string;
  priority?: string;
  score?: number;
  notes?: string;
  nextAction?: string;
  followUpDate?: string;
  googleContactResourceName?: string;
  sheetRowId?: string;
}

export interface CrmContactRecord extends CanonicalEntity {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  sourceLeadId?: string;
  notes?: string;
  googleContactResourceName?: string;
  sheetRowId?: string;
}

export interface CrmActivityRecord extends CanonicalEntity {
  leadId?: string;
  contactId?: string;
  type: string;
  summary: string;
  occurredAt: string;
  payload?: Record<string, unknown>;
}

export interface CrmCompanyRecord extends CanonicalEntity {
  name: string;
  website?: string;
  industry?: string;
  notes?: string;
  sheetRowId?: string;
}

export interface CrmDealRecord extends CanonicalEntity {
  title: string;
  leadId?: string;
  contactId?: string;
  companyId?: string;
  stage?: string;
  value?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string;
  notes?: string;
  sheetRowId?: string;
}

export interface CrmFollowUpRecord extends CanonicalEntity {
  leadId?: string;
  contactId?: string;
  title: string;
  dueDate: string;
  status?: 'open' | 'done' | 'snoozed';
  channel?: string;
  notes?: string;
  sheetRowId?: string;
}

export interface CrmNoteRecord extends CanonicalEntity {
  leadId?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  body: string;
  pinned?: boolean;
  sheetRowId?: string;
}

export interface FinanceTransactionRecord extends CanonicalEntity {
  date: string;
  amount: number;
  currency?: string;
  type?: string;
  category?: string;
  description?: string;
  clientId?: string;
  merchant?: string;
}

export interface MemoryItemRecord extends CanonicalEntity {
  type: string;
  title: string;
  content: string;
  tags?: string[];
  links?: string[];
  relatedEntityIds?: string[];
  aiSummary?: string;
  importanceScore?: number;
}

export interface IntegrationStatusRecord extends CanonicalEntity {
  service: string;
  status: string;
  message?: string;
  lastSyncAt?: string;
  cursor?: string;
  error?: string;
}

export interface ApprovalRecord extends CanonicalEntity {
  actionType: string;
  status: 'pending' | 'approved' | 'rejected' | 'edited' | 'editing' | 'cancelled' | 'executed' | 'failed';
  riskLevel: 'low' | 'medium' | 'high';
  targetType?: string;
  targetId?: string;
  reason?: string;
  payload: Record<string, unknown>;
  decidedAt?: string;
  executedAt?: string;
  failureReason?: string;
}

export interface AiActionLogRecord extends CanonicalEntity {
  conversationId?: string;
  intent?: string;
  tool?: string;
  status: 'proposed' | 'executed' | 'pending_approval' | 'rejected' | 'failed';
  riskLevel?: 'low' | 'medium' | 'high';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export type CanonicalRecordByCollection = {
  projects: ProjectRecord;
  project_tasks: ProjectTaskRecord;
  goals: GoalRecord;
  planner_tasks: PlannerTaskRecord;
  crm_leads: CrmLeadRecord;
  crm_contacts: CrmContactRecord;
  crm_activities: CrmActivityRecord;
  crm_companies: CrmCompanyRecord;
  crm_deals: CrmDealRecord;
  crm_followups: CrmFollowUpRecord;
  crm_notes: CrmNoteRecord;
  finance_transactions: FinanceTransactionRecord;
  memory_items: MemoryItemRecord;
  integration_statuses: IntegrationStatusRecord;
  approvals: ApprovalRecord;
  ai_action_logs: AiActionLogRecord;
};

export type CanonicalRecord = CanonicalRecordByCollection[CanonicalCollectionName];

export const canonicalCollectionNames: CanonicalCollectionName[] = [
  'projects',
  'project_tasks',
  'goals',
  'planner_tasks',
  'crm_leads',
  'crm_contacts',
  'crm_activities',
  'crm_companies',
  'crm_deals',
  'crm_followups',
  'crm_notes',
  'finance_transactions',
  'memory_items',
  'integration_statuses',
  'approvals',
  'ai_action_logs'
];
