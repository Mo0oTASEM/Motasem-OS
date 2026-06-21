import React, { createContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// === Types Definitions ===

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  status?: 'todo' | 'in_progress' | 'blocked' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  owner?: string;
  notes?: string;
}

export interface ProjectAsset {
  id: string;
  name: string;
  type: 'texture' | 'model' | 'audio' | 'video' | 'code' | 'link';
  path: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: 'game_dev' | 'motion_design' | 'freelance' | 'personal';
  status: 'backlog' | 'in_progress' | 'review' | 'completed';
  deadline: string;
  clientId?: string;
  tasks: ChecklistItem[];
  assets?: ProjectAsset[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  budget?: number;
  progress?: number;
  tags?: string[];
  notes?: string;
  deliverables?: string[];
  links?: { name: string; url: string }[];
  owner?: string;
  archived?: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  billingRate: number;
  currency: string;
  status: 'active' | 'inactive';
}

export interface FinanceEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: 'software_license' | 'hosting' | 'client_payment' | 'hardware' | 'personal' | 'tax' | 'other';
  clientId?: string;
}

export interface WikiNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: 'shaders' | 'motion_expressions' | 'game_design' | 'business' | 'ideas' | 'knowledge' | 'research' | 'voice_memos' | 'general';
  updatedAt: string;
}

export interface OSBaseEntity {
  id: string;
  userId: string;
  source: 'local' | 'supabase' | 'google_calendar' | 'google_tasks' | 'google_sheets' | 'google_drive' | 'google_docs' | 'gmail' | 'google_contacts' | 'telegram';
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  embeddingText?: string;
  embeddingVector?: number[];
  tags: string[];
  links: string[];
  aiSummary?: string;
  importanceScore: number;
}

export interface MemoryItem extends OSBaseEntity {
  type: 'idea' | 'note' | 'knowledge' | 'research' | 'voice_capture' | 'client_conversation' | 'journal' | 'decision' | 'project' | 'task';
  title: string;
  content: string;
  relatedEntityIds: string[];
}

export interface MemoryEdge extends OSBaseEntity {
  fromId: string;
  toId: string;
  relationship: 'supports' | 'blocks' | 'inspired_by' | 'related_to' | 'part_of' | 'evidence_for';
  strength: number;
}

export interface Goal extends OSBaseEntity {
  title: string;
  description: string;
  level: 'life' | 'annual' | 'quarterly' | 'monthly' | 'weekly';
  parentGoalId?: string;
  progress: number;
  status: 'active' | 'at_risk' | 'completed';
  targetDate: string;
  smartSpecific?: string;
  smartMeasurable?: string;
  smartAchievable?: string;
  smartRelevant?: string;
  smartTimeBound?: string;
  hardness?: number;
  activities?: {
    id: string;
    title: string;
    completed?: boolean;
    successMetric?: string;
    target?: number;
    current?: number;
  }[];
}

export interface CalendarEvent extends OSBaseEntity {
  title: string;
  start: string;
  end: string;
  attendees: string[];
  meetingUrl?: string;
  clientId?: string;
}

export interface PlannerTask extends OSBaseEntity {
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string;
  goalId: string;
  estimatedMinutes: number;
}

export interface JournalEntry extends OSBaseEntity {
  date: string;
  wins: string;
  lessons: string;
  mistakes: string;
  ideas: string;
}

export interface HealthEntry extends OSBaseEntity {
  date: string;
  sleepHours: number;
  energy: number;
  workout: string;
  nutrition: string;
  weight?: number;
}

export interface Opportunity extends OSBaseEntity {
  title: string;
  type: 'freelance' | 'business' | 'game' | 'product';
  description: string;
  revenuePotential: number;
  difficulty: number;
  timeRequired: number;
  risk: number;
}

export interface TimeBlock extends OSBaseEntity {
  title: string;
  start: string;
  end: string;
  category: 'deep_work' | 'admin' | 'meetings' | 'learning' | 'health' | 'creative';
  focusQuality: number;
}

export interface AgentRun extends OSBaseEntity {
  agent: 'chief_of_staff' | 'business_strategist' | 'project_manager' | 'crm_manager' | 'finance_analyst' | 'game_studio_advisor' | 'motion_graphics_advisor' | 'life_strategist';
  prompt: string;
  output: string;
  confidence: number;
  sourceReferences: string[];
}

export interface SyncState extends OSBaseEntity {
  service: 'calendar' | 'tasks' | 'sheets' | 'drive' | 'docs' | 'gmail' | 'contacts' | 'telegram' | 'supabase' | 'gemini';
  status: 'connected' | 'needs_auth' | 'syncing' | 'error' | 'offline';
  lastSyncAt?: string;
  cursor?: string;
  error?: string;
}

export interface FocusSession {
  isActive: boolean;
  startTime?: string;
  pausedTime?: number;
  durationSeconds: number;
  type: 'pomodoro' | 'stopwatch';
  currentClientId?: string;
}

export interface AIConfig {
  userName: string;
  userRole: string;
  systemPrompt: string;
  openaiKey: string;
  anthropicKey: string;
}

export type DataStatus = 'loading' | 'available' | 'error' | 'empty' | 'setup_required';

export interface AppContextType {
  user: User | null;
  sessionReady: boolean;
  dataStatus: DataStatus;
  setupRequired: boolean;
  projects: Project[];
  clients: Client[];
  finances: FinanceEntry[];
  notes: WikiNote[];
  memoryItems: MemoryItem[];
  memoryEdges: MemoryEdge[];
  goals: Goal[];
  calendarEvents: CalendarEvent[];
  plannerTasks: PlannerTask[];
  journalEntries: JournalEntry[];
  healthEntries: HealthEntry[];
  opportunities: Opportunity[];
  timeBlocks: TimeBlock[];
  agentRuns: AgentRun[];
  syncStates: SyncState[];
  focusSession: FocusSession;
  aiConfig: AIConfig;

  addProject: (p: Omit<Project, 'id'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  addClient: (c: Omit<Client, 'id'>) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  addFinance: (f: Omit<FinanceEntry, 'id'>) => void;
  updateFinance: (id: string, updates: Partial<FinanceEntry>) => void;
  deleteFinance: (id: string) => void;

  addNote: (n: Omit<WikiNote, 'id' | 'updatedAt'>) => void;
  updateNote: (id: string, updates: Partial<WikiNote>) => void;
  deleteNote: (id: string) => void;

  addMemoryItem: (m: Omit<MemoryItem, keyof OSBaseEntity> & Partial<OSBaseEntity>) => void;
  updateMemoryItem: (id: string, updates: Partial<MemoryItem>) => void;
  addGoal: (g: Omit<Goal, keyof OSBaseEntity> & Partial<OSBaseEntity>) => void;
  updateGoalItem: (id: string, updates: Partial<Goal>) => void;
  addPlannerTask: (t: Omit<PlannerTask, keyof OSBaseEntity> & Partial<OSBaseEntity>) => void;
  updatePlannerTask: (id: string, updates: Partial<PlannerTask>) => void;
  addJournalEntry: (j: Omit<JournalEntry, keyof OSBaseEntity> & Partial<OSBaseEntity>) => void;
  addOpportunity: (o: Omit<Opportunity, keyof OSBaseEntity> & Partial<OSBaseEntity>) => void;
  addAgentRun: (a: Omit<AgentRun, keyof OSBaseEntity> & Partial<OSBaseEntity>) => void;

  updateFocusSession: (updates: Partial<FocusSession>) => void;
  updateAIConfig: (updates: Partial<AIConfig>) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextType | undefined>(undefined);

const emptyAIConfig: AIConfig = {
  userName: '',
  userRole: '',
  systemPrompt: '',
  openaiKey: '',
  anthropicKey: ''
};

const defaultFocusSession: FocusSession = {
  isActive: false,
  durationSeconds: 0,
  type: 'stopwatch'
};

const sanitizeAIConfig = (config: AIConfig): AIConfig => ({
  ...config,
  openaiKey: '',
  anthropicKey: ''
});

const hydrateBase = (idPrefix: string, userId: string, partial?: Partial<OSBaseEntity>) => {
  const id = partial?.id || `${idPrefix}-${Date.now()}`;
  const now = new Date().toISOString();
  return {
    id,
    userId,
    source: 'local' as const,
    createdAt: partial?.createdAt || now,
    updatedAt: now,
    tags: partial?.tags || [],
    links: [],
    importanceScore: partial?.importanceScore || 60,
    ...partial,
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const hasSupabase = !!supabase;
  const [user, setUser] = useState<User | null>(() => {
    if (import.meta.env.DEV) {
      const saved = localStorage.getItem('nova_dev_user_bypass');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [sessionReady, setSessionReady] = useState(() => {
    if (import.meta.env.DEV && localStorage.getItem('nova_dev_user_bypass')) {
      return true;
    }
    return !hasSupabase;
  });
  const [dataStatus, setDataStatus] = useState<DataStatus>(() => {
    if (import.meta.env.DEV && localStorage.getItem('nova_dev_user_bypass')) {
      return 'available';
    }
    return !hasSupabase ? 'setup_required' : 'loading';
  });
  const [setupRequired] = useState(() => {
    if (import.meta.env.DEV && localStorage.getItem('nova_dev_user_bypass')) {
      return false;
    }
    return !hasSupabase;
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [finances, setFinances] = useState<FinanceEntry[]>([]);
  const [notes, setNotes] = useState<WikiNote[]>([]);
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [memoryEdges, setMemoryEdges] = useState<MemoryEdge[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [plannerTasks, setPlannerTasks] = useState<PlannerTask[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [healthEntries, setHealthEntries] = useState<HealthEntry[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [syncStates, setSyncStates] = useState<SyncState[]>([]);
  const [focusSession, setFocusSession] = useState<FocusSession>(defaultFocusSession);
  const [aiConfig, setAiConfig] = useState<AIConfig>(emptyAIConfig);

  const batchInProgress = useRef(false);
  const pendingWrites = useRef<Array<() => Promise<void>>>([]);

  // ── Auth session ──

  useEffect(() => {
    if (!supabase) return;
    if (import.meta.env.DEV && localStorage.getItem('nova_dev_user_bypass')) {
      setTimeout(() => setSessionReady(true), 0);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSessionReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (import.meta.env.DEV && localStorage.getItem('nova_dev_user_bypass')) return;
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // ── Load all collections from Supabase when user is available ──

  useEffect(() => {
    if (!supabase || !user) return;
    let cancelled = false;

    const loadCollections = async () => {
      try {
        const { data, error } = await supabase
          .from('nova_user_docs')
          .select('collection_name, doc_id, payload')
          .eq('user_id', user.id);

        if (cancelled) return;

        if (error) {
          console.error('Failed to load data from Supabase:', error);
          if (!cancelled) setDataStatus('error');
          return;
        }

        if (!data || data.length === 0) {
          if (!cancelled) setDataStatus('empty');
          return;
        }

        const grouped: Record<string, unknown[]> = {};
        for (const row of data) {
          if (!grouped[row.collection_name]) {
            grouped[row.collection_name] = [];
          }
          grouped[row.collection_name].push({ ...row.payload, id: row.doc_id });
        }

        if (cancelled) return;

        const setters: Record<string, (items: unknown[]) => void> = {
          projects: setProjects as (items: unknown[]) => void,
          clients: setClients as (items: unknown[]) => void,
          finances: setFinances as (items: unknown[]) => void,
          notes: setNotes as (items: unknown[]) => void,
          memoryItems: setMemoryItems as (items: unknown[]) => void,
          memoryEdges: setMemoryEdges as (items: unknown[]) => void,
          goals: setGoals as (items: unknown[]) => void,
          calendarEvents: setCalendarEvents as (items: unknown[]) => void,
          plannerTasks: setPlannerTasks as (items: unknown[]) => void,
          journalEntries: setJournalEntries as (items: unknown[]) => void,
          healthEntries: setHealthEntries as (items: unknown[]) => void,
          opportunities: setOpportunities as (items: unknown[]) => void,
          timeBlocks: setTimeBlocks as (items: unknown[]) => void,
          agentRuns: setAgentRuns as (items: unknown[]) => void,
          syncStates: setSyncStates as (items: unknown[]) => void,
        };

        for (const [name, setter] of Object.entries(setters)) {
          if (grouped[name]) {
            setter(grouped[name]);
          }
        }

        if (grouped.focusSession) {
          setFocusSession(grouped.focusSession[0] as FocusSession);
        }
        if (grouped.aiConfig) {
          setAiConfig(sanitizeAIConfig(grouped.aiConfig[0] as AIConfig));
        }

        if (!cancelled) setDataStatus('available');
      } catch (err) {
        console.error('Failed to load data from Supabase:', err);
        if (!cancelled) setDataStatus('error');
      }
    };

    loadCollections();
    return () => { cancelled = true; };
  }, [supabase, user]);

  // ── Batch write helper ──

  const queueWrite = useCallback((collectionName: string, docId: string, payload: unknown) => {
    if (!supabase || !user) return;

    pendingWrites.current.push(async () => {
      try {
        await supabase.from('nova_user_docs').upsert({
          user_id: user.id,
          collection_name: collectionName,
          doc_id: docId,
          payload,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error(`Failed to save to Supabase: ${collectionName}/${docId}`, err);
      }
    });

    if (!batchInProgress.current) {
      batchInProgress.current = true;
      queueMicrotask(async () => {
        const batch = pendingWrites.current.splice(0);
        batchInProgress.current = false;
        await Promise.allSettled(batch.map(fn => fn()));
      });
    }
  }, [supabase, user]);

  // ── Actions ──

  const addProject = useCallback((p: Omit<Project, 'id'>) => {
    const newProject: Project = { ...p, id: `p-${Date.now()}` };
    setProjects(prev => [newProject, ...prev]);
    queueWrite('projects', newProject.id, newProject);
  }, [queueWrite]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => {
      const nextList = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      const target = nextList.find(p => p.id === id);
      if (target) queueWrite('projects', id, target);
      return nextList;
    });
  }, [queueWrite]);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (supabase && user) {
      supabase.from('nova_user_docs').delete()
        .eq('user_id', user.id).eq('collection_name', 'projects').eq('doc_id', id)
        .then();
    }
  }, [supabase, user]);

  const addClient = useCallback((c: Omit<Client, 'id'>) => {
    const newClient: Client = { ...c, id: `c-${Date.now()}` };
    setClients(prev => [newClient, ...prev]);
    queueWrite('clients', newClient.id, newClient);
  }, [queueWrite]);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients(prev => {
      const nextList = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      const target = nextList.find(c => c.id === id);
      if (target) queueWrite('clients', id, target);
      return nextList;
    });
  }, [queueWrite]);

  const deleteClient = useCallback((id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    if (supabase && user) {
      supabase.from('nova_user_docs').delete()
        .eq('user_id', user.id).eq('collection_name', 'clients').eq('doc_id', id)
        .then();
    }
  }, [supabase, user]);

  const addFinance = useCallback((f: Omit<FinanceEntry, 'id'>) => {
    const newEntry: FinanceEntry = { ...f, id: `f-${Date.now()}` };
    setFinances(prev => [newEntry, ...prev]);
    queueWrite('finances', newEntry.id, newEntry);
  }, [queueWrite]);

  const updateFinance = useCallback((id: string, updates: Partial<FinanceEntry>) => {
    setFinances(prev => {
      const nextList = prev.map(f => f.id === id ? { ...f, ...updates } : f);
      const target = nextList.find(f => f.id === id);
      if (target) queueWrite('finances', id, target);
      return nextList;
    });
  }, [queueWrite]);

  const deleteFinance = useCallback((id: string) => {
    setFinances(prev => prev.filter(f => f.id !== id));
    if (supabase && user) {
      supabase.from('nova_user_docs').delete()
        .eq('user_id', user.id).eq('collection_name', 'finances').eq('doc_id', id)
        .then();
    }
  }, [supabase, user]);

  const addNote = useCallback((n: Omit<WikiNote, 'id' | 'updatedAt'>) => {
    const newNote: WikiNote = { ...n, id: `n-${Date.now()}`, updatedAt: new Date().toISOString() };
    setNotes(prev => [newNote, ...prev]);
    queueWrite('notes', newNote.id, newNote);
  }, [queueWrite]);

  const updateNote = useCallback((id: string, updates: Partial<WikiNote>) => {
    setNotes(prev => {
      const nextList = prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n);
      const target = nextList.find(n => n.id === id);
      if (target) queueWrite('notes', id, target);
      return nextList;
    });
  }, [queueWrite]);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (supabase && user) {
      supabase.from('nova_user_docs').delete()
        .eq('user_id', user.id).eq('collection_name', 'notes').eq('doc_id', id)
        .then();
    }
  }, [supabase, user]);

  const addMemoryItem = useCallback((m: Omit<MemoryItem, keyof OSBaseEntity> & Partial<OSBaseEntity>) => {
    const base = hydrateBase('mem', user!.id, m);
    const item = { ...base, ...m } as MemoryItem;
    setMemoryItems(prev => [item, ...prev]);
    queueWrite('memoryItems', item.id, item);
  }, [queueWrite, user]);

  const updateMemoryItem = useCallback((id: string, updates: Partial<MemoryItem>) => {
    setMemoryItems(prev => {
      const nextList = prev.map(item => item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item);
      const target = nextList.find(item => item.id === id);
      if (target) queueWrite('memoryItems', id, target);
      return nextList;
    });
  }, [queueWrite]);

  const addGoal = useCallback((g: Omit<Goal, keyof OSBaseEntity> & Partial<OSBaseEntity>) => {
    const base = hydrateBase('goal', user!.id, g);
    const goal = { ...base, ...g } as Goal;
    setGoals(prev => [goal, ...prev]);
    queueWrite('goals', goal.id, goal);
  }, [queueWrite, user]);

  const updateGoalItem = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals(prev => {
      const nextList = prev.map(goal => goal.id === id ? { ...goal, ...updates, updatedAt: new Date().toISOString() } : goal);
      const target = nextList.find(goal => goal.id === id);
      if (target) {
        queueWrite('goals', id, target);
        window.dispatchEvent(new CustomEvent('planner-goal-updated', {
          detail: { id, updates, goal: target }
        }));
      }
      return nextList;
    });
  }, [queueWrite]);

  const addPlannerTask = useCallback((t: Omit<PlannerTask, keyof OSBaseEntity> & Partial<OSBaseEntity>) => {
    const base = hydrateBase('task', user!.id, t);
    const task = { ...base, ...t } as PlannerTask;
    setPlannerTasks(prev => [task, ...prev]);
    queueWrite('plannerTasks', task.id, task);
  }, [queueWrite, user]);

  const updatePlannerTask = useCallback((id: string, updates: Partial<PlannerTask>) => {
    setPlannerTasks(prev => {
      const nextList = prev.map(task => task.id === id ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task);
      const target = nextList.find(task => task.id === id);
      if (target) {
        queueWrite('plannerTasks', id, target);
        window.dispatchEvent(new CustomEvent('planner-task-updated', {
          detail: { id, updates, task: target }
        }));
      }
      return nextList;
    });
  }, [queueWrite]);

  const addJournalEntry = useCallback((j: Omit<JournalEntry, keyof OSBaseEntity> & Partial<OSBaseEntity>) => {
    const base = hydrateBase('journal', user!.id, j);
    const entry = { ...base, ...j } as JournalEntry;
    setJournalEntries(prev => [entry, ...prev]);
    queueWrite('journalEntries', entry.id, entry);
  }, [queueWrite, user]);

  const addOpportunity = useCallback((o: Omit<Opportunity, keyof OSBaseEntity> & Partial<OSBaseEntity>) => {
    const base = hydrateBase('opp', user!.id, o);
    const opp = { ...base, ...o } as Opportunity;
    setOpportunities(prev => [opp, ...prev]);
    queueWrite('opportunities', opp.id, opp);
  }, [queueWrite, user]);

  const addAgentRun = useCallback((a: Omit<AgentRun, keyof OSBaseEntity> & Partial<OSBaseEntity>) => {
    const base = hydrateBase('agent', user!.id, a);
    const run = { ...base, ...a } as AgentRun;
    setAgentRuns(prev => [run, ...prev]);
    queueWrite('agentRuns', run.id, run);
  }, [queueWrite, user]);

  const updateFocusSession = useCallback((updates: Partial<FocusSession>) => {
    setFocusSession(prev => {
      const next = { ...prev, ...updates };
      queueWrite('focusSession', 'focus', next);
      return next;
    });
  }, [queueWrite]);

  const updateAIConfig = useCallback((updates: Partial<AIConfig>) => {
    setAiConfig(prev => {
      const next = sanitizeAIConfig({ ...prev, ...updates });
      queueWrite('aiConfig', 'config', next);
      return next;
    });
  }, [queueWrite]);

  return (
    <AppContext.Provider value={{
      user, sessionReady, dataStatus, setupRequired,
      projects, clients, finances, notes,
      memoryItems, memoryEdges, goals, calendarEvents, plannerTasks, journalEntries,
      healthEntries, opportunities, timeBlocks, agentRuns, syncStates,
      focusSession, aiConfig,
      addProject, updateProject, deleteProject,
      addClient, updateClient, deleteClient,
      addFinance, updateFinance, deleteFinance,
      addNote, updateNote, deleteNote,
      addMemoryItem, updateMemoryItem,
      addGoal, updateGoalItem,
      addPlannerTask, updatePlannerTask,
      addJournalEntry, addOpportunity, addAgentRun,
      updateFocusSession, updateAIConfig
    }}>
      {children}
    </AppContext.Provider>
  );
};
