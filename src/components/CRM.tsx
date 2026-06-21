import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  DollarSign,
  ExternalLink,
  FileText,
  FolderOpen,
  KanbanSquare,
  Mail,
  MessageSquareText,
  Paperclip,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { usePersistentState } from '../lib/uiPersistence';
import { PageHeader } from './system/Layout';
import { cloudRunClient } from '../lib/api/cloudRunClient';

type CrmTabId =
  | 'dashboard'
  | 'contacts'
  | 'leads'
  | 'clients'
  | 'pipeline'
  | 'tasks'
  | 'emails'
  | 'calendar'
  | 'files'
  | 'reports'
  | 'advisor';

type DealStage = 'New Lead' | 'Contacted' | 'Meeting Booked' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost';
type ModalAction = 'contact' | 'lead' | 'deal' | 'task' | 'note' | 'email' | 'meeting' | 'file';

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  tags: string[];
  source: string;
  notes: string;
  lastInteraction: string;
  relationshipStatus: 'Cold' | 'Warm' | 'Active' | 'VIP' | 'Past';
  isClient: boolean;
};

type Lead = {
  id: string;
  name: string;
  company: string;
  source: string;
  service: string;
  budget: number;
  priority: 'Low' | 'Medium' | 'High';
  aiScore: number;
  status: 'New' | 'Qualified' | 'Contacted' | 'Stuck' | 'Converted' | 'Lost';
  nextAction: string;
  contactId?: string;
};

type Deal = {
  id: string;
  title: string;
  contactId: string;
  value: number;
  stage: DealStage;
  probability: number;
  expectedClose: string;
  nextAction: string;
};

type CrmTask = {
  id: string;
  title: string;
  contactId?: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'Done';
  source: 'Manual' | 'Email' | 'Meeting' | 'AI';
};

type EmailRecord = {
  id: string;
  contactId: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  aiSummary: string;
  followUpNeeded: boolean;
};

type MeetingRecord = {
  id: string;
  contactId: string;
  title: string;
  date: string;
  type: 'Call' | 'Meeting' | 'Deadline' | 'Follow-up';
  status: 'Scheduled' | 'Done';
};

type FileRecord = {
  id: string;
  contactId: string;
  name: string;
  type: 'Proposal' | 'Brief' | 'Contract' | 'Design' | 'Invoice' | 'Project File';
  url: string;
  updatedAt: string;
};

type CrmNote = {
  id: string;
  contactId?: string;
  text: string;
  date: string;
};

type CrmStore = {
  contacts: Contact[];
  leads: Lead[];
  deals: Deal[];
  tasks: CrmTask[];
  emails: EmailRecord[];
  meetings: MeetingRecord[];
  files: FileRecord[];
  notes: CrmNote[];
  activityLog: Array<Record<string, unknown>>;
  sequences: Array<Record<string, unknown>>;
  templates: Array<Record<string, unknown>>;
  aiLog: Array<Record<string, unknown>>;
};

type MeetingBrief = {
  who?: string;
  last_interaction?: string;
  what_they_care_about?: string;
  talking_points?: string[];
  open_items?: string[];
  suggested_next_step?: string;
};

type DealHealth = {
  momentum?: 'improving' | 'stalled' | 'declining';
  win_probability?: number;
  risk_flags?: string[];
  recommendation?: string;
  reasoning?: string;
};

type InboxTriage = {
  intent?: 'reply_needed' | 'fyi' | 'action_required' | 'urgent';
  commitments?: string[];
  suggested_task?: { title?: string; type?: string; due?: string } | null;
  buying_signal?: boolean;
  buying_signal_note?: string | null;
};

type ContactEnrichment = {
  inferred_company_type?: string;
  inferred_seniority?: 'junior' | 'mid' | 'senior' | 'executive';
  suggested_tags?: string[];
  one_liner?: string;
};

type ModalDraft = {
  name: string;
  email: string;
  phone: string;
  company: string;
  tags: string;
  source: string;
  notes: string;
  service: string;
  budget: string;
  priority: 'Low' | 'Medium' | 'High';
  title: string;
  contactId: string;
  value: string;
  stage: DealStage;
  dueDate: string;
  subject: string;
  description: string;
  fileType: FileRecord['type'];
  url: string;
};

const CRM_STORAGE_KEY = 'nova_crm_database_v1';
const CRM_ACTIVE_TAB_KEY = 'nova_crm_active_tab_v1';
const SPREADSHEET_ID = '1bJ9k4ZLSRVAzfZsVx8NhMnyyAS4Fp5XmFrcPFzmTCW8';
const SHEET_BASE_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`;
const dealStages: DealStage[] = ['New Lead', 'Contacted', 'Meeting Booked', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
const todayIso = () => new Date().toISOString().split('T')[0];
const tomorrowIso = () => new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
const money = (value: number) => `JOD ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const pct = (value: number) => `${Math.round(value)}%`;
const splitTags = (value: string) => value.split(',').map(tag => tag.trim()).filter(Boolean);

const tabs: { id: CrmTabId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'leads', label: 'Leads', icon: Target },
  { id: 'clients', label: 'Clients', icon: BriefcaseBusiness },
  { id: 'pipeline', label: 'Deals Pipeline', icon: KanbanSquare },
  { id: 'tasks', label: 'Tasks & Follow-ups', icon: CheckCircle2 },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'calendar', label: 'Calendar', icon: CalendarClock },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'reports', label: 'Reports', icon: Archive },
  { id: 'advisor', label: 'AI CRM Advisor', icon: Bot }
];

const seedStore: CrmStore = {
  contacts: [
    {
      id: 'contact-ahmad',
      name: 'Ahmad Naser',
      email: 'ahmad@amana.studio',
      phone: '+962 79 555 1122',
      company: 'Amana Studio',
      tags: ['motion graphics', 'retainer'],
      source: 'Instagram',
      notes: 'Needs social launch package and kinetic logo loops.',
      lastInteraction: '2026-06-08',
      relationshipStatus: 'Warm',
      isClient: false
    },
    {
      id: 'contact-lina',
      name: 'Lina Haddad',
      email: 'lina@rezbook.com',
      phone: '+962 78 220 4433',
      company: 'RezBook',
      tags: ['client', 'saas', 'brand motion'],
      source: 'Referral',
      notes: 'Active client for SaaS product videos and UI motion.',
      lastInteraction: '2026-06-07',
      relationshipStatus: 'Active',
      isClient: true
    },
    {
      id: 'contact-omar',
      name: 'Omar Khaled',
      email: 'omar@northpixel.co',
      phone: '+962 77 448 9911',
      company: 'North Pixel',
      tags: ['agency', 'proposal'],
      source: 'Behance',
      notes: 'Asked for a studio reel and pricing tiers.',
      lastInteraction: '2026-06-04',
      relationshipStatus: 'Warm',
      isClient: false
    }
  ],
  leads: [
    { id: 'lead-amana', name: 'Ahmad Naser', company: 'Amana Studio', source: 'Instagram DM', service: 'Motion graphics launch package', budget: 850, priority: 'High', aiScore: 91, status: 'Qualified', nextAction: 'Send three-tier proposal', contactId: 'contact-ahmad' },
    { id: 'lead-north', name: 'Omar Khaled', company: 'North Pixel', source: 'Behance', service: '3D logo animation', budget: 620, priority: 'Medium', aiScore: 77, status: 'Contacted', nextAction: 'Book discovery call', contactId: 'contact-omar' },
    { id: 'lead-water', name: 'Shahed Water', company: 'Shahed Water', source: 'WhatsApp', service: 'Short-form product reels', budget: 450, priority: 'Medium', aiScore: 69, status: 'New', nextAction: 'Qualify budget and timeline' }
  ],
  deals: [
    { id: 'deal-rezbook', title: 'RezBook product motion pack', contactId: 'contact-lina', value: 1400, stage: 'Proposal Sent', probability: 74, expectedClose: '2026-06-18', nextAction: 'Follow up on proposal feedback' },
    { id: 'deal-amana', title: 'Amana social launch kit', contactId: 'contact-ahmad', value: 850, stage: 'Meeting Booked', probability: 62, expectedClose: '2026-06-20', nextAction: 'Prepare call agenda and reference reel' },
    { id: 'deal-north', title: 'North Pixel logo animation', contactId: 'contact-omar', value: 620, stage: 'Contacted', probability: 45, expectedClose: '2026-06-25', nextAction: 'Send calendar link' }
  ],
  tasks: [
    { id: 'task-rezbook', title: 'Follow up with Lina on RezBook proposal', contactId: 'contact-lina', dueDate: '2026-06-09', priority: 'High', status: 'Open', source: 'AI' },
    { id: 'task-amana', title: 'Prepare Amana discovery call questions', contactId: 'contact-ahmad', dueDate: '2026-06-10', priority: 'High', status: 'Open', source: 'Meeting' },
    { id: 'task-north', title: 'Send Omar studio reel and rate card', contactId: 'contact-omar', dueDate: '2026-06-08', priority: 'Medium', status: 'Open', source: 'Email' }
  ],
  emails: [
    { id: 'email-lina', contactId: 'contact-lina', subject: 'Re: Product motion pack', snippet: 'Can you send the revised timeline and final price today?', date: '2026-06-08', unread: true, aiSummary: 'Client is asking for final timeline and price. Follow-up needed today.', followUpNeeded: true },
    { id: 'email-ahmad', contactId: 'contact-ahmad', subject: 'Brand launch animation', snippet: 'We want motion that feels premium for Instagram and launch stories.', date: '2026-06-07', unread: false, aiSummary: 'High-intent launch request with clear platform and style direction.', followUpNeeded: true },
    { id: 'email-omar', contactId: 'contact-omar', subject: 'Logo animation pricing', snippet: 'Please share packages and examples for a 3D reveal.', date: '2026-06-04', unread: false, aiSummary: 'Needs packages, samples, and likely discovery call.', followUpNeeded: true }
  ],
  meetings: [
    { id: 'meeting-amana', contactId: 'contact-ahmad', title: 'Amana discovery call', date: '2026-06-10', type: 'Call', status: 'Scheduled' },
    { id: 'meeting-rezbook', contactId: 'contact-lina', title: 'RezBook proposal review', date: '2026-06-12', type: 'Meeting', status: 'Scheduled' }
  ],
  files: [
    { id: 'file-rezbook-proposal', contactId: 'contact-lina', name: 'RezBook_Motion_Proposal.pdf', type: 'Proposal', url: SHEET_BASE_URL, updatedAt: '2026-06-07' },
    { id: 'file-amana-brief', contactId: 'contact-ahmad', name: 'Amana_Brand_Launch_Brief.docx', type: 'Brief', url: SHEET_BASE_URL, updatedAt: '2026-06-08' }
  ],
  notes: [
    { id: 'note-ahmad', contactId: 'contact-ahmad', text: 'Prefers bold kinetic typography, black/gold palette, and fast delivery.', date: '2026-06-08' },
    { id: 'note-rezbook', contactId: 'contact-lina', text: 'Potential monthly retainer if the launch pack performs well.', date: '2026-06-07' }
  ],
  activityLog: [],
  sequences: [],
  templates: [],
  aiLog: []
};

const emptyDraft = (contacts: Contact[]): ModalDraft => ({
  name: '',
  email: '',
  phone: '',
  company: '',
  tags: '',
  source: 'Manual',
  notes: '',
  service: 'Motion graphics',
  budget: '',
  priority: 'Medium',
  title: '',
  contactId: contacts[0]?.id || '',
  value: '',
  stage: 'New Lead',
  dueDate: todayIso(),
  subject: '',
  description: '',
  fileType: 'Proposal',
  url: ''
});

const getContact = (store: CrmStore, id?: string) => store.contacts.find(contact => contact.id === id);
const daysPastDue = (date: string) => {
  const today = new Date(todayIso()).getTime();
  const due = new Date(date).getTime();
  return Math.floor((today - due) / 86_400_000);
};

const StatusBadge = ({ value }: { value: string }) => {
  const tone = ['Won', 'Active', 'VIP', 'Done', 'Connected', 'Qualified'].includes(value)
    ? 'badge-teal'
    : ['High', 'Overdue', 'Stuck', 'Lost'].includes(value)
      ? 'badge-magenta'
      : ['Warm', 'Proposal Sent', 'Meeting Booked'].includes(value)
        ? 'badge-cyan'
        : 'badge-purple';

  return <span className={`badge ${tone}`}>{value}</span>;
};

const Kpi = ({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string | number; hint: string }) => (
  <article className="crm-kpi">
    <Icon size={18} />
    <small>{label}</small>
    <strong>{value}</strong>
    <span>{hint}</span>
  </article>
);

const contactFromWorkspace = (record: Record<string, unknown>, index: number): Contact => ({
  id: String(record.resourceName || record.id || `google-contact-${index}`),
  name: String(record.name || 'Google Contact'),
  email: String(record.email || ''),
  phone: String(record.phone || ''),
  company: String(record.company || ''),
  tags: splitTags(String(record.tags || 'google')),
  source: 'Google Contacts',
  notes: String(record.notes || ''),
  lastInteraction: todayIso(),
  relationshipStatus: 'Warm',
  isClient: false
});

const leadFromWorkspace = (record: Record<string, unknown>): Lead => ({
  id: String(record.id || uid('lead')),
  name: String(record.contact_name || 'Workspace Lead'),
  company: String(record.company || ''),
  source: 'Google Sheets',
  service: String(record.deal_title || 'Creative service'),
  budget: Number(record.value) || 0,
  priority: Number(record.ai_score) >= 80 ? 'High' : Number(record.ai_score) >= 50 ? 'Medium' : 'Low',
  aiScore: Number(record.ai_score) || 50,
  status: 'Qualified',
  nextAction: String(record.notes || 'Review Google Sheets lead'),
  contactId: String(record.id || '')
});

const dealFromWorkspace = (record: Record<string, unknown>): Deal => ({
  id: String(record.id || uid('deal')),
  title: String(record.deal_title || 'Workspace deal'),
  contactId: String(record.id || ''),
  value: Number(record.value) || 0,
  stage: dealStages.includes(String(record.stage) as DealStage) ? String(record.stage) as DealStage : 'New Lead',
  probability: Number(record.probability) || 30,
  expectedClose: String(record.expected_close || todayIso()),
  nextAction: String(record.notes || 'Review next action')
});

const crmDatasetForWorkspace = (store: CrmStore) => {
  const now = new Date().toISOString();
  return {
    leads: store.deals.map(deal => {
      const contact = getContact(store, deal.contactId);
      const lead = store.leads.find(item => item.id === deal.id || item.contactId === deal.contactId);
      return {
        id: deal.id,
        contact_name: contact?.name || lead?.name || '',
        contact_email: contact?.email || '',
        company: contact?.company || lead?.company || '',
        deal_title: deal.title,
        value: deal.value,
        currency: 'JOD',
        stage: deal.stage,
        probability: deal.probability,
        expected_close: deal.expectedClose,
        owner: 'local-owner',
        created_at: now,
        updated_at: now,
        notes: deal.nextAction,
        tags: contact?.tags.join(', ') || '',
        ai_score: lead?.aiScore || deal.probability,
        ai_score_label: (lead?.aiScore || deal.probability) >= 80 ? 'Hot' : (lead?.aiScore || deal.probability) >= 50 ? 'Warm' : 'Cold',
        last_ai_update: now
      };
    }),
    notes: store.notes.map(note => ({
      id: note.id,
      contact_id: note.contactId || '',
      deal_id: '',
      note: note.text,
      pinned: false,
      created_at: note.date,
      updated_at: note.date
    })),
    activityLog: store.activityLog,
    sequences: store.sequences,
    templates: store.templates,
    aiLog: store.aiLog
  };
};

export const CRM: React.FC = () => {
  const [activeTab, setActiveTab] = usePersistentState<CrmTabId>(CRM_ACTIVE_TAB_KEY, 'dashboard');
  const [store, setStore] = usePersistentState<CrmStore>(CRM_STORAGE_KEY, seedStore);
  const [query, setQuery] = usePersistentState('nova_crm_search_v1', '', 'session');
  const [selectedContactId, setSelectedContactId] = usePersistentState<string>('nova_crm_selected_contact_v1', seedStore.contacts[0].id, 'session');
  const [modalAction, setModalAction] = useState<ModalAction | null>(null);
  const [draft, setDraft] = useState<ModalDraft>(() => emptyDraft(store.contacts));
  const [aiCommand, setAiCommand] = useState('');
  const [aiResult, setAiResult] = useState('Ready for CRM commands. Supabase is the source of truth; offline fallback remains available.');
  const [syncStatus, setSyncStatus] = useState('Connecting to Supabase CRM...');
  const [meetingBriefs, setMeetingBriefs] = useState<Record<string, MeetingBrief>>({});
  const [dealHealthById, setDealHealthById] = useState<Record<string, DealHealth>>({});
  const [triageByEmailId, setTriageByEmailId] = useState<Record<string, InboxTriage>>({});
  const [enrichment, setEnrichment] = useState<ContactEnrichment | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [crmCommandOpen, setCrmCommandOpen] = useState(false);
  const [crmCommandInput, setCrmCommandInput] = useState('');
  const [crmCommandResult, setCrmCommandResult] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && activeTab === 'advisor') {
        event.preventDefault();
        setCrmCommandOpen(true);
      }
      if (event.key === 'Escape') {
        setCrmCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  useEffect(() => {
    if (modalAction !== 'contact') return;
    if ((draft.name.trim().length < 3) && (draft.email.trim().length < 5)) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setEnrichmentLoading(true);
      const result = await cloudRunClient.crmAi('enrichment', {
        name: draft.name,
        email: draft.email,
        company: draft.company,
        notes: draft.notes || draft.description
      });
      if (cancelled) return;
      setEnrichment((result.json || null) as ContactEnrichment | null);
      setEnrichmentLoading(false);
    }, 850);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [draft.company, draft.description, draft.email, draft.name, draft.notes, modalAction]);

  const contacts = store.contacts;
  const activeContact = getContact(store, selectedContactId) || contacts[0];
  const filteredContacts = contacts.filter(contact => `${contact.name} ${contact.company} ${contact.email} ${contact.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const filteredLeads = store.leads.filter(lead => `${lead.name} ${lead.company} ${lead.source} ${lead.service}`.toLowerCase().includes(query.toLowerCase()));
  const clients = contacts.filter(contact => contact.isClient);
  const openDeals = store.deals.filter(deal => !['Won', 'Lost'].includes(deal.stage));
  const wonDeals = store.deals.filter(deal => deal.stage === 'Won');
  const overdueTasks = store.tasks.filter(task => task.status === 'Open' && daysPastDue(task.dueDate) > 0);
  const upcomingMeetings = store.meetings.filter(meeting => meeting.status === 'Scheduled' && daysPastDue(meeting.date) <= 0);
  const unreadEmails = store.emails.filter(email => email.unread);
  const hotLeads = store.leads.filter(lead => lead.aiScore >= 80).sort((a, b) => b.aiScore - a.aiScore);
  const stuckDeals = openDeals.filter(deal => deal.probability < 55 || daysPastDue(deal.expectedClose) > 0);
  const forecast = openDeals.reduce((sum, deal) => sum + deal.value * (deal.probability / 100), 0);
  const wonValue = wonDeals.reduce((sum, deal) => sum + deal.value, 0);
  const conversionRate = store.leads.length ? ((clients.length + wonDeals.length) / (store.leads.length + clients.length)) * 100 : 0;

  const timeline = useMemo(() => {
    if (!activeContact) return [];
    const id = activeContact.id;
    return [
      ...store.emails.filter(email => email.contactId === id).map(email => ({ date: email.date, type: 'Email', text: email.subject, detail: email.aiSummary })),
      ...store.meetings.filter(meeting => meeting.contactId === id).map(meeting => ({ date: meeting.date, type: meeting.type, text: meeting.title, detail: meeting.status })),
      ...store.tasks.filter(task => task.contactId === id).map(task => ({ date: task.dueDate, type: 'Task', text: task.title, detail: task.status })),
      ...store.files.filter(file => file.contactId === id).map(file => ({ date: file.updatedAt, type: 'File', text: file.name, detail: file.type })),
      ...store.notes.filter(note => note.contactId === id).map(note => ({ date: note.date, type: 'Note', text: note.text, detail: 'Manual note' })),
      ...store.deals.filter(deal => deal.contactId === id).map(deal => ({ date: deal.expectedClose, type: 'Deal', text: deal.title, detail: `${deal.stage} - ${money(deal.value)}` }))
    ].sort((a, b) => b.date.localeCompare(a.date));
  }, [activeContact, store]);

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStoreRef = useRef<CrmStore | null>(null);
  const flushSync = useCallback(async () => {
    syncTimerRef.current = null;
    const storeToSync = pendingStoreRef.current;
    if (!storeToSync) return;
    pendingStoreRef.current = null;
    setSyncStatus('Syncing CRM_Data in Google Sheets...');
    const result = await cloudRunClient.syncCrm(crmDatasetForWorkspace(storeToSync));
    if (result.error) {
      setSyncStatus(`Google sync paused: ${result.error}. Local fallback cache is active.`);
      return;
    }
    setSyncStatus(`Google Workspace synced at ${new Date().toLocaleTimeString()}.`);
  }, []);

  const scheduleSync = useCallback((store: CrmStore) => {
    pendingStoreRef.current = store;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(flushSync, 2000);
  }, [flushSync]);

  const patchStore = useCallback((next: Partial<CrmStore>) => {
    setStore(current => {
      const merged = { ...current, ...next };
      scheduleSync(merged);
      return merged;
    });
  }, [scheduleSync, setStore]);

  const handleCompleteTask = useCallback((taskId: string) => {
    patchStore({
      tasks: store.tasks.map(item => item.id === taskId ? { ...item, status: 'Done' } : item)
    });
  }, [patchStore, store.tasks]);

  useEffect(() => {
    let mounted = true;
    const loadWorkspace = async () => {
      await cloudRunClient.bootstrapCrm();
      if (!mounted) return;

      const snapshot = await cloudRunClient.getCrmSnapshot();
      if (!mounted) return;
      if (snapshot.error) {
        setSyncStatus(`Reconnect Google Workspace: ${snapshot.error}. Showing offline CRM cache.`);
        return;
      }

      const workspaceContacts = Array.isArray(snapshot.contacts) ? snapshot.contacts.map(contactFromWorkspace) : [];
      const workspaceLeads = Array.isArray(snapshot.leads) ? snapshot.leads.filter((lead: Record<string, unknown>) => lead.id).map(leadFromWorkspace) : [];
      const workspaceDeals = Array.isArray(snapshot.leads) ? snapshot.leads.filter((lead: Record<string, unknown>) => lead.id).map(dealFromWorkspace) : [];
      setSyncStatus('Google Workspace CRM connected.');
      setStore(current => ({
        ...current,
        contacts: workspaceContacts.length ? [...workspaceContacts, ...current.contacts.filter(contact => !workspaceContacts.some((item: Contact) => item.email && item.email === contact.email))] : current.contacts,
        leads: workspaceLeads.length ? workspaceLeads : current.leads,
        deals: workspaceDeals.length ? workspaceDeals : current.deals,
        notes: Array.isArray(snapshot.notes) && snapshot.notes.length ? snapshot.notes.map((note: Record<string, unknown>, index: number) => ({
          id: String(note.id || `sheet-note-${index}`),
          contactId: String(note.contact_id || ''),
          text: String(note.note || ''),
          date: String(note.created_at || todayIso())
        })) : current.notes,
        activityLog: Array.isArray(snapshot.activityLog) ? snapshot.activityLog : current.activityLog,
        sequences: Array.isArray(snapshot.sequences) ? snapshot.sequences : current.sequences,
        templates: Array.isArray(snapshot.templates) ? snapshot.templates : current.templates,
        aiLog: Array.isArray(snapshot.aiLog) ? snapshot.aiLog : current.aiLog
      }));
    };
    void loadWorkspace();
    return () => { mounted = false; };
  }, [setStore]);

  const openModal = (action: ModalAction) => {
    setDraft(emptyDraft(store.contacts));
    setEnrichment(null);
    setModalAction(action);
  };

  const addActivityNote = (text: string, contactId?: string) => {
    patchStore({ notes: [{ id: uid('note'), contactId, text, date: todayIso() }, ...store.notes] });
  };

  const logAiResult = (feature: string, entityId: string, response: unknown) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);
    const entry = {
      id: uid('ai'),
      feature,
      entity_id: entityId,
      prompt_hash: `${feature}-${entityId}`,
      response_json: response,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    };
    patchStore({ aiLog: [entry, ...store.aiLog] });
  };

  const moveDealStage = (deal: Deal, stage: DealStage) => {
    if (stage === deal.stage) return;
    const confirmed = window.confirm(`Move "${deal.title}" from ${deal.stage} to ${stage}?`);
    if (!confirmed) return;
    const activity = {
      id: uid('activity'),
      entity_type: 'deal',
      entity_id: deal.id,
      action: 'stage_changed',
      details: `${deal.stage} -> ${stage}`,
      created_at: new Date().toISOString()
    };
    patchStore({
      deals: store.deals.map(item => item.id === deal.id ? { ...item, stage } : item),
      activityLog: [activity, ...store.activityLog]
    });
    void cloudRunClient.logCrmActivity(activity);
  };

  const runMeetingBrief = async (meeting: MeetingRecord) => {
    const contact = getContact(store, meeting.contactId);
    const deal = store.deals.find(item => item.contactId === meeting.contactId);
    const result = await cloudRunClient.crmAi('meeting-brief', {
      contact,
      meeting,
      deal,
      last_5_email_summaries: store.emails.filter(email => email.contactId === meeting.contactId).slice(0, 5).map(email => email.aiSummary),
      open_tasks: store.tasks.filter(task => task.contactId === meeting.contactId && task.status === 'Open'),
      notes_with_commitments: store.notes.filter(note => note.contactId === meeting.contactId)
    });
    const brief = (result.json || {}) as MeetingBrief;
    setMeetingBriefs(current => ({ ...current, [meeting.id]: brief }));
    logAiResult('meeting-brief', meeting.id, brief);
  };

  const runDealHealth = async (deal: Deal) => {
    const contact = getContact(store, deal.contactId);
    const result = await cloudRunClient.crmAi('deal-health', {
      deal,
      contact,
      timeline: timeline.filter(item => item.text.includes(deal.title) || item.detail.includes(deal.stage)),
      emails: store.emails.filter(email => email.contactId === deal.contactId),
      notes: store.notes.filter(note => note.contactId === deal.contactId),
      open_tasks: store.tasks.filter(task => task.contactId === deal.contactId && task.status === 'Open')
    });
    const health = (result.json || {}) as DealHealth;
    setDealHealthById(current => ({ ...current, [deal.id]: health }));
    logAiResult('deal-health', deal.id, health);
  };

  const runInboxTriage = async (email: EmailRecord) => {
    const deal = store.deals.find(item => item.contactId === email.contactId);
    const result = await cloudRunClient.crmAi('inbox-triage', {
      email_text: `${email.subject}\n${email.snippet}`,
      deal_stage: deal?.stage || 'unknown'
    });
    const triage = (result.json || {}) as InboxTriage;
    setTriageByEmailId(current => ({ ...current, [email.id]: triage }));
    logAiResult('inbox-triage', email.id, triage);
  };

  const createTaskFromTriage = (email: EmailRecord, triage: InboxTriage) => {
    const title = triage.suggested_task?.title || `Follow up: ${email.subject}`;
    patchStore({
      tasks: [{
        id: uid('task'),
        title,
        contactId: email.contactId,
        dueDate: triage.suggested_task?.due || tomorrowIso(),
        priority: triage.intent === 'urgent' ? 'High' : 'Medium',
        status: 'Open',
        source: 'AI'
      }, ...store.tasks]
    });
  };

  const acceptEnrichment = () => {
    if (!enrichment) return;
    setDraft(current => ({
      ...current,
      tags: Array.from(new Set([...splitTags(current.tags), ...(enrichment.suggested_tags || [])])).join(', '),
      notes: [current.notes, `AI inferred: ${enrichment.one_liner || enrichment.inferred_company_type || ''}`].filter(Boolean).join('\n')
    }));
    setEnrichment(null);
  };

  const runCrmCommand = async (event: React.FormEvent) => {
    event.preventDefault();
    const command = crmCommandInput.trim();
    if (!command) return;
    setCrmCommandResult('AI is reading your CRM context...');
    const result = await cloudRunClient.crmAi('command-bar', {
      command,
      context: {
        contacts: store.contacts.slice(0, 25),
        deals: store.deals,
        tasks: store.tasks.filter(task => task.status === 'Open')
      }
    });
    const parsed = (result.json || {}) as { action?: string; target?: string; answer?: string | null; params?: Record<string, unknown> };
    if (parsed.action === 'navigate' && parsed.target) {
      const target = parsed.target.toLowerCase();
      if (target.includes('deal') || target.includes('pipeline')) setActiveTab('pipeline');
      else if (target.includes('contact')) setActiveTab('contacts');
      else if (target.includes('task')) setActiveTab('tasks');
      else if (target.includes('email') || target.includes('inbox')) setActiveTab('emails');
      else setActiveTab('dashboard');
    }
    if (parsed.action === 'create') {
      const target = String(parsed.target || '').toLowerCase();
      if (target.includes('lead')) openModal('lead');
      else if (target.includes('deal')) openModal('deal');
      else if (target.includes('task')) openModal('task');
      else openModal('contact');
    }
    if (parsed.action === 'draft') openModal('email');
    if (parsed.action === 'schedule') openModal('meeting');
    setCrmCommandResult(parsed.answer || `AI action: ${parsed.action || 'query'} ${parsed.target ? `for ${parsed.target}` : ''}`);
    logAiResult('command-bar', 'crm-command', parsed);
  };

  const saveModal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!modalAction) return;

    if (modalAction === 'contact') {
      const id = uid('contact');
      patchStore({
        contacts: [{
          id,
          name: draft.name || 'New Contact',
          email: draft.email,
          phone: draft.phone,
          company: draft.company,
          tags: splitTags(draft.tags),
          source: draft.source,
          notes: draft.notes,
          lastInteraction: todayIso(),
          relationshipStatus: 'Warm',
          isClient: false
        }, ...store.contacts]
      });
      setSelectedContactId(id);
      const result = await cloudRunClient.createCrmContact({
        name: draft.name || 'New Contact',
        email: draft.email,
        phone: draft.phone,
        company: draft.company,
        tags: draft.tags,
        notes: draft.notes || draft.description
      });
      if (result.error) {
        setSyncStatus(`Google Contacts create paused: ${result.error}. Contact stayed in CRM_Data fallback.`);
      }
    }

    if (modalAction === 'lead') {
      patchStore({
        leads: [{
          id: uid('lead'),
          name: draft.name || 'New Lead',
          company: draft.company,
          source: draft.source,
          service: draft.service,
          budget: Number(draft.budget) || 0,
          priority: draft.priority,
          aiScore: Math.min(98, 55 + (draft.priority === 'High' ? 25 : draft.priority === 'Medium' ? 14 : 6) + (Number(draft.budget) > 700 ? 12 : 0)),
          status: 'New',
          nextAction: draft.description || 'Qualify need, budget, and timeline',
          contactId: draft.contactId || undefined
        }, ...store.leads]
      });
    }

    if (modalAction === 'deal') {
      patchStore({
        deals: [{
          id: uid('deal'),
          title: draft.title || `${getContact(store, draft.contactId)?.company || 'Client'} project`,
          contactId: draft.contactId,
          value: Number(draft.value) || Number(draft.budget) || 0,
          stage: draft.stage,
          probability: draft.stage === 'Proposal Sent' ? 70 : draft.stage === 'Negotiation' ? 82 : 45,
          expectedClose: draft.dueDate || tomorrowIso(),
          nextAction: draft.description || 'Define next deal action'
        }, ...store.deals]
      });
    }

    if (modalAction === 'task') {
      patchStore({
        tasks: [{
          id: uid('task'),
          title: draft.title || draft.description || 'Follow up',
          contactId: draft.contactId,
          dueDate: draft.dueDate || tomorrowIso(),
          priority: draft.priority,
          status: 'Open',
          source: 'Manual'
        }, ...store.tasks]
      });
    }

    if (modalAction === 'note') {
      addActivityNote(draft.description || draft.notes || 'New CRM note', draft.contactId);
    }

    if (modalAction === 'email') {
      patchStore({
        emails: [{
          id: uid('email'),
          contactId: draft.contactId,
          subject: draft.subject || 'Draft follow-up',
          snippet: draft.description || 'Draft email created from CRM.',
          date: todayIso(),
          unread: false,
          aiSummary: 'Draft prepared locally. Send through Gmail when connected.',
          followUpNeeded: false
        }, ...store.emails]
      });
      setSyncStatus('Email draft saved. Gmail send requires explicit user confirmation.');
    }

    if (modalAction === 'meeting') {
      const contact = getContact(store, draft.contactId);
      patchStore({
        meetings: [{
          id: uid('meeting'),
          contactId: draft.contactId,
          title: draft.title || 'Client meeting',
          date: draft.dueDate || tomorrowIso(),
          type: 'Meeting',
          status: 'Scheduled'
        }, ...store.meetings]
      });
      const result = await cloudRunClient.createCrmCalendarEvent({
        title: draft.title || 'Client meeting',
        date: draft.dueDate || tomorrowIso(),
        email: contact?.email || '',
        description: `${contact?.name || 'CRM contact'} - ${draft.description || 'CRM scheduled meeting'}`
      });
      if (result.error) {
        setSyncStatus(`Calendar create paused: ${result.error}. Meeting stayed in CRM_Data fallback.`);
      }
    }

    if (modalAction === 'file') {
      patchStore({
        files: [{
          id: uid('file'),
          contactId: draft.contactId,
          name: draft.title || 'Client file',
          type: draft.fileType,
          url: draft.url || SHEET_BASE_URL,
          updatedAt: todayIso()
        }, ...store.files]
      });
    }

    setModalAction(null);
  };

  const runAiCommand = (event: React.FormEvent) => {
    event.preventDefault();
    const command = aiCommand.trim();
    const normalized = command.toLowerCase();
    if (!command) return;

    const addLeadMatch = command.match(/add\s+(.+?)\s+as\s+a\s+new\s+lead\s+for\s+(.+?)(\.|$)/i);
    if (addLeadMatch) {
      const name = addLeadMatch[1].trim();
      const service = addLeadMatch[2].trim();
      const id = uid('contact');
      const leadId = uid('lead');
      setStore(current => ({
        ...current,
        contacts: [{ id, name, email: '', phone: '', company: name, tags: [service], source: 'AI command', notes: `Created from: ${command}`, lastInteraction: todayIso(), relationshipStatus: 'Warm', isClient: false }, ...current.contacts],
        leads: [{ id: leadId, name, company: name, source: 'AI command', service, budget: 0, priority: 'Medium', aiScore: 74, status: 'New', nextAction: 'Qualify budget and timeline', contactId: id }, ...current.leads]
      }));
      setSelectedContactId(id);
      setAiResult(`Added ${name} as a new lead for ${service}. Saved locally and queued for Google sync.`);
      setAiCommand('');
      return;
    }

    if (normalized.includes('follow-up task')) {
      const contact = activeContact || contacts[0];
      setStore(current => ({
        ...current,
        tasks: [{ id: uid('task'), title: `Follow up with ${contact.name}`, contactId: contact.id, dueDate: normalized.includes('tomorrow') ? tomorrowIso() : todayIso(), priority: 'High', status: 'Open', source: 'AI' }, ...current.tasks]
      }));
      setAiResult(`Created a follow-up task for ${contact.name}.`);
      setAiCommand('');
      return;
    }

    if (normalized.includes('move') && normalized.includes('proposal sent')) {
      const nextDeal = openDeals[0];
      if (nextDeal) {
        patchStore({ deals: store.deals.map(deal => deal.id === nextDeal.id ? { ...deal, stage: 'Proposal Sent', probability: Math.max(deal.probability, 70), nextAction: 'Follow up on proposal feedback' } : deal) });
        setAiResult(`Moved "${nextDeal.title}" to Proposal Sent and updated next action.`);
      } else {
        setAiResult('No open deal found to move.');
      }
      setAiCommand('');
      return;
    }

    if (normalized.includes('hot leads')) {
      setActiveTab('leads');
      setAiResult(hotLeads.length ? `Hot leads this week: ${hotLeads.map(lead => `${lead.name} (${lead.aiScore})`).join(', ')}.` : 'No hot leads above 80 score yet.');
      setAiCommand('');
      return;
    }

    if (normalized.includes('summarize') && normalized.includes('emails')) {
      const contact = activeContact || contacts[0];
      const summaries = store.emails.filter(email => email.contactId === contact.id).map(email => email.aiSummary);
      setActiveTab('emails');
      setAiResult(summaries.length ? `${contact.name}: ${summaries.join(' ')}` : `No synced email summaries found for ${contact.name}.`);
      setAiCommand('');
      return;
    }

    setAiResult('Command understood as CRM intent. Try: add Ahmad as a new lead for motion graphics, create a follow-up task for this client tomorrow, move this deal to proposal sent, or show me hot leads this week.');
  };

  const syncCards = [
    { title: 'Google Contacts', body: 'Syncs people, emails, phones, tags, sources, and relationship status.', status: 'Reconnect-safe local fallback' },
    { title: 'Gmail', body: 'Pulls client conversations, AI summaries, reply drafts, and follow-up detection.', status: 'Connect in Integrations' },
    { title: 'Google Calendar', body: 'Shows meetings, calls, follow-up events, deadlines, and client review sessions.', status: 'Calendar-ready architecture' },
    { title: 'Google Drive', body: 'Links proposals, briefs, contracts, invoices, designs, and source files.', status: 'Drive file links supported' }
  ];

  const renderActionBar = () => (
    <div className="crm-actions">
      <button className="glass-btn btn-cyan" onClick={() => openModal('contact')}><UserPlus size={15} /> New Contact</button>
      <button className="glass-btn" onClick={() => openModal('lead')}><Target size={15} /> New Lead</button>
      <button className="glass-btn" onClick={() => openModal('deal')}><DollarSign size={15} /> New Deal</button>
      <button className="glass-btn" onClick={() => openModal('task')}><CheckCircle2 size={15} /> Add Task</button>
      <button className="glass-btn" onClick={() => openModal('note')}><MessageSquareText size={15} /> Add Note</button>
      <button className="glass-btn" onClick={() => openModal('email')}><Send size={15} /> Draft Email</button>
      <button className="glass-btn" onClick={() => openModal('meeting')}><CalendarClock size={15} /> Schedule Meeting</button>
      <button className="glass-btn" onClick={() => openModal('file')}><Paperclip size={15} /> Attach File</button>
    </div>
  );

  const renderDashboard = () => (
    <div className="crm-dashboard-grid">
      <Kpi icon={Target} label="Total Leads" value={store.leads.length} hint={`${hotLeads.length} hot leads`} />
      <Kpi icon={BriefcaseBusiness} label="Active Clients" value={clients.length} hint="Client profiles with timeline" />
      <Kpi icon={DollarSign} label="Open Deals" value={openDeals.length} hint={`${money(forecast)} weighted forecast`} />
      <Kpi icon={CheckCircle2} label="Won Deals" value={wonDeals.length} hint={`${money(wonValue)} closed value`} />
      <Kpi icon={Clock3} label="Overdue Follow-ups" value={overdueTasks.length} hint="Needs action today" />
      <Kpi icon={CalendarClock} label="Upcoming Meetings" value={upcomingMeetings.length} hint="Calendar sync ready" />
      <Kpi icon={Mail} label="Unread Client Emails" value={unreadEmails.length} hint="Gmail summaries queued" />
      <Kpi icon={Sparkles} label="AI Recommendations" value={hotLeads.length + stuckDeals.length + overdueTasks.length} hint="Prioritized actions" />

      <section className="glass-panel os-section crm-span-2">
        <div className="os-section-title"><Sparkles size={18} /> AI Recommendations</div>
        <div className="crm-advice-list">
          <article><StatusBadge value="High" /><strong>Follow up with Lina today</strong><p>Unread email and proposal feedback request create immediate revenue risk.</p></article>
          <article><StatusBadge value="Hot" /><strong>Prioritize Ahmad / Amana Studio</strong><p>High lead score, clear service need, and launch timing make this a strong conversion candidate.</p></article>
          <article><StatusBadge value="Medium" /><strong>Unblock North Pixel</strong><p>Deal is early and needs a studio reel plus calendar link to keep momentum.</p></article>
        </div>
      </section>

      <section className="glass-panel os-section">
        <div className="os-section-title"><Clock3 size={18} /> Today’s Follow-ups</div>
        {store.tasks.filter(task => task.status === 'Open').slice(0, 5).map(task => (
          // eslint-disable-next-line react-hooks/refs
          <button className="signal-row" key={task.id} onClick={() => handleCompleteTask(task.id)}>
            <span>{task.title}</span>
            <StatusBadge value={daysPastDue(task.dueDate) > 0 ? 'Overdue' : task.priority} />
          </button>
        ))}
      </section>
    </div>
  );

  const renderContacts = () => (
    <section className="glass-panel os-section">
      <div className="crm-section-head"><div className="os-section-title"><Users size={18} /> Google Contacts / Local Contacts</div><button className="glass-btn btn-cyan" onClick={() => openModal('contact')}><Plus size={15} /> New Contact</button></div>
      <div className="crm-table-wrap">
        <table className="crm-table">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Tags</th><th>Source</th><th>Last Interaction</th><th>Status</th></tr></thead>
          <tbody>{filteredContacts.map(contact => (
            <tr key={contact.id} onClick={() => setSelectedContactId(contact.id)}>
              <td><strong>{contact.name}</strong></td><td>{contact.email || 'Not synced'}</td><td>{contact.phone || '-'}</td><td>{contact.company}</td>
              <td><div className="crm-tags">{contact.tags.map(tag => <span key={tag}>{tag}</span>)}</div></td>
              <td>{contact.source}</td><td>{contact.lastInteraction}</td><td><StatusBadge value={contact.relationshipStatus} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );

  const renderLeads = () => (
    <section className="crm-card-grid">
      {filteredLeads.map(lead => (
        <article className="glass-panel os-section crm-lead-card" key={lead.id}>
          <div className="crm-card-head"><div><strong>{lead.name}</strong><span>{lead.company} - {lead.source}</span></div><StatusBadge value={lead.priority} /></div>
          <p>{lead.service}</p>
          <div className="crm-progress"><i style={{ width: `${lead.aiScore}%` }} /></div>
          <div className="crm-card-meta"><span>AI score <b>{lead.aiScore}</b></span><span>Budget <b>{money(lead.budget)}</b></span><span>Status <b>{lead.status}</b></span></div>
          <div className="crm-next-action"><Sparkles size={14} /> {lead.nextAction}</div>
        </article>
      ))}
    </section>
  );

  const renderClients = () => (
    <div className="crm-client-layout">
      <section className="glass-panel os-section">
        <div className="os-section-title"><BriefcaseBusiness size={18} /> Client Profiles</div>
        {clients.map(client => (
          <button key={client.id} className={`crm-client-row ${activeContact?.id === client.id ? 'active' : ''}`} onClick={() => setSelectedContactId(client.id)}>
            <strong>{client.name}</strong><span>{client.company}</span><StatusBadge value={client.relationshipStatus} />
          </button>
        ))}
      </section>
      <section className="glass-panel os-section crm-span-2">
        <div className="crm-profile-head">
          <div><h3>{activeContact?.name}</h3><p>{activeContact?.company} - {activeContact?.email || 'No email synced'}</p></div>
          <StatusBadge value={activeContact?.relationshipStatus || 'Warm'} />
        </div>
        <div className="crm-profile-grid">
          <Kpi icon={DollarSign} label="Deals" value={store.deals.filter(deal => deal.contactId === activeContact?.id).length} hint="Linked pipeline" />
          <Kpi icon={Mail} label="Emails" value={store.emails.filter(email => email.contactId === activeContact?.id).length} hint="Gmail conversations" />
          <Kpi icon={CalendarClock} label="Meetings" value={store.meetings.filter(meeting => meeting.contactId === activeContact?.id).length} hint="Calendar events" />
        </div>
        <div className="os-section-title"><Clock3 size={18} /> Unified Activity Timeline</div>
        <div className="crm-timeline">{timeline.map((item, index) => (
          <article key={`${item.type}-${item.date}-${index}`}><strong>{item.date}</strong><div><span>{item.type}</span><p>{item.text}</p><small>{item.detail}</small></div></article>
        ))}</div>
      </section>
    </div>
  );

  const renderPipeline = () => (
    <section className="crm-kanban">
      {dealStages.map(stage => (
        <div className="glass-panel crm-stage" key={stage}>
          <div className="crm-stage-head"><strong>{stage}</strong><span>{store.deals.filter(deal => deal.stage === stage).length}</span></div>
          {store.deals.filter(deal => deal.stage === stage).map(deal => {
            const contact = getContact(store, deal.contactId);
            return (
              <article className="crm-deal-card" key={deal.id}>
                <strong>{deal.title}</strong>
                <span>{contact?.company || 'No client'} - {money(deal.value)}</span>
                <div className="crm-progress"><i style={{ width: `${deal.probability}%` }} /></div>
                <small>{deal.probability}% probability - close {deal.expectedClose}</small>
                <p>{deal.nextAction}</p>
                <button className="glass-btn" type="button" onClick={() => runDealHealth(deal)}><Sparkles size={14} /> Deal Health</button>
                {dealHealthById[deal.id] && (
                  <div className="crm-ai-panel">
                    <div className="crm-ai-panel-head"><span>✦ AI Deal Health</span><b>{dealHealthById[deal.id].momentum || 'stalled'}</b></div>
                    <div className="crm-progress"><i style={{ width: `${dealHealthById[deal.id].win_probability || deal.probability}%` }} /></div>
                    <small>{dealHealthById[deal.id].win_probability || deal.probability}% win probability</small>
                    <div className="crm-risk-chips">{(dealHealthById[deal.id].risk_flags || []).slice(0, 3).map(flag => <span key={flag}>{flag}</span>)}</div>
                    <p>{dealHealthById[deal.id].recommendation}</p>
                  </div>
                )}
                <select value={deal.stage} onChange={event => moveDealStage(deal, event.target.value as DealStage)}>
                  {dealStages.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </article>
            );
          })}
        </div>
      ))}
    </section>
  );

  const renderTasks = () => (
    <section className="glass-panel os-section">
      <div className="crm-section-head"><div className="os-section-title"><CheckCircle2 size={18} /> Tasks & Follow-ups</div><button className="glass-btn btn-cyan" onClick={() => openModal('task')}><Plus size={15} /> Add Task</button></div>
      <div className="crm-task-list">{store.tasks.map(task => {
        const contact = getContact(store, task.contactId);
        return (
          <article key={task.id} className={task.status === 'Done' ? 'done' : ''}>
            <button onClick={() => patchStore({ tasks: store.tasks.map(item => item.id === task.id ? { ...item, status: item.status === 'Done' ? 'Open' : 'Done' } : item) })}><CheckCircle2 size={16} /></button>
            <div><strong>{task.title}</strong><span>{contact?.name || 'General CRM'} - {task.source}</span></div>
            <span>{task.dueDate}</span>
            <StatusBadge value={daysPastDue(task.dueDate) > 0 && task.status === 'Open' ? 'Overdue' : task.priority} />
          </article>
        );
      })}</div>
    </section>
  );

  const renderEmails = () => (
    <section className="crm-card-grid">
      {store.emails.map(email => {
        const contact = getContact(store, email.contactId);
        return (
          <article className="glass-panel os-section crm-email-card" key={email.id}>
            <div className="crm-card-head"><div><strong>{email.subject}</strong><span>{contact?.name} - {email.date}</span></div>{email.unread && <StatusBadge value="Unread" />}</div>
            <p>{email.snippet}</p>
            <div className="crm-ai-note"><Sparkles size={14} /> {email.aiSummary}</div>
            <div className="crm-smart-replies">
              <button className="glass-btn" type="button" onClick={() => runInboxTriage(email)}><Sparkles size={14} /> AI Triage</button>
              <button className="glass-btn" type="button" onClick={() => openModal('email')}>Draft with AI</button>
            </div>
            {triageByEmailId[email.id] && (
              <div className="crm-ai-panel">
                <div className="crm-ai-panel-head"><span>✦ AI Inbox Triage</span><StatusBadge value={triageByEmailId[email.id].intent || 'reply_needed'} /></div>
                {!!triageByEmailId[email.id].commitments?.length && <p>Commitments: {triageByEmailId[email.id].commitments?.join(', ')}</p>}
                {triageByEmailId[email.id].buying_signal && <div className="crm-ai-note"><Sparkles size={14} /> Buying signal: {triageByEmailId[email.id].buying_signal_note}</div>}
                {triageByEmailId[email.id].suggested_task && <button className="glass-btn btn-cyan" type="button" onClick={() => createTaskFromTriage(email, triageByEmailId[email.id])}>Create task?</button>}
              </div>
            )}
            {email.followUpNeeded && <button className="glass-btn" onClick={() => openModal('task')}><CheckCircle2 size={14} /> Create Follow-up</button>}
          </article>
        );
      })}
    </section>
  );

  const renderCalendar = () => (
    <section className="glass-panel os-section">
      <div className="crm-section-head"><div className="os-section-title"><CalendarClock size={18} /> Google Calendar Meetings</div><button className="glass-btn btn-cyan" onClick={() => openModal('meeting')}><Plus size={15} /> Schedule Meeting</button></div>
      <div className="crm-sync-banner"><CalendarClock size={16} /> Calendar plugin-ready: meetings and follow-up events stay local if Google connection expires, then resync after reconnect.</div>
      <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>Date</th><th>Meeting</th><th>Client</th><th>Type</th><th>Status</th><th>AI</th></tr></thead><tbody>
        {store.meetings.map(meeting => <tr key={meeting.id}><td>{meeting.date}</td><td>{meeting.title}</td><td>{getContact(store, meeting.contactId)?.name}</td><td>{meeting.type}</td><td><StatusBadge value={meeting.status} /></td><td><button className="glass-btn" type="button" onClick={() => runMeetingBrief(meeting)}><Sparkles size={14} /> Meeting Brief</button></td></tr>)}
      </tbody></table></div>
      <div className="crm-card-grid">
        {Object.entries(meetingBriefs).map(([meetingId, brief]) => (
          <article className="crm-ai-panel" key={meetingId}>
            <div className="crm-ai-panel-head"><span>✦ AI Meeting Brief</span><b>{store.meetings.find(item => item.id === meetingId)?.title}</b></div>
            <details open><summary>Who</summary><p>{brief.who}</p></details>
            <details><summary>Last interaction</summary><p>{brief.last_interaction}</p></details>
            <details><summary>What they care about</summary><p>{brief.what_they_care_about}</p></details>
            <details><summary>Talking points</summary><ul>{(brief.talking_points || []).map(item => <li key={item}>{item}</li>)}</ul></details>
            <details><summary>Open items</summary><ul>{(brief.open_items || []).map(item => <li key={item}>{item}</li>)}</ul></details>
            <div className="crm-next-action"><Sparkles size={14} /> {brief.suggested_next_step}</div>
          </article>
        ))}
      </div>
    </section>
  );

  const renderFiles = () => (
    <section className="crm-card-grid">
      {store.files.map(file => <article className="glass-panel os-section crm-file-card" key={file.id}>
        <FileText size={22} /><strong>{file.name}</strong><span>{file.type} - {getContact(store, file.contactId)?.company}</span><small>Updated {file.updatedAt}</small>
        <a className="glass-btn" href={file.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open File</a>
      </article>)}
    </section>
  );


  const renderReports = () => (
    <div className="crm-dashboard-grid">
      <Kpi icon={Target} label="Monthly Leads" value={store.leads.length} hint="All lead sources" />
      <Kpi icon={BarChart3} label="Conversion Rate" value={pct(conversionRate)} hint="Leads to clients / won" />
      <Kpi icon={DollarSign} label="Income Forecast" value={money(forecast)} hint="Weighted open deals" />
      <Kpi icon={CheckCircle2} label="Won / Lost" value={`${wonDeals.length}/${store.deals.filter(deal => deal.stage === 'Lost').length}`} hint="Closed outcomes" />
      <section className="glass-panel os-section crm-span-2">
        <div className="os-section-title"><BarChart3 size={18} /> Best Lead Sources</div>
        {Object.entries(store.leads.reduce<Record<string, number>>((acc, lead) => ({ ...acc, [lead.source]: (acc[lead.source] || 0) + 1 }), {})).map(([source, count]) => (
          <div className="signal-row" key={source}><span>{source}</span><strong>{count}</strong></div>
        ))}
      </section>
      <section className="glass-panel os-section">
        <div className="os-section-title"><Users size={18} /> Client Activity</div>
        {clients.map(client => <div className="signal-row" key={client.id}><span>{client.company}</span><small>{timeline.filter(item => item.text.includes(client.name)).length || 'active'} signals</small></div>)}
      </section>
    </div>
  );

  const renderAdvisor = () => (
    <section className="glass-panel os-section crm-advisor">
      <div className="crm-ai-command">
        <div><div className="os-section-title"><Bot size={18} /> AI CRM Advisor</div><p>Natural language CRM actions become structured CRM records, AI logs, and Google Workspace sync actions when connected.</p></div>
        <form onSubmit={runAiCommand}>
          <input className="glass-input" value={aiCommand} onChange={event => setAiCommand(event.target.value)} placeholder="Add Ahmad as a new lead for motion graphics..." />
          <button className="glass-btn btn-cyan" type="submit"><Sparkles size={15} /> Run</button>
        </form>
      </div>
      <div className="crm-ai-result">{aiResult}</div>
      <div className="crm-advice-list">
        <article><StatusBadge value="High" /><strong>Who to follow up with</strong><p>{overdueTasks[0]?.title || 'No overdue follow-ups. Keep momentum with warm leads.'}</p></article>
        <article><StatusBadge value="Hot" /><strong>Hot leads</strong><p>{hotLeads.map(lead => `${lead.name} (${lead.aiScore})`).join(', ') || 'No hot leads yet.'}</p></article>
        <article><StatusBadge value="Medium" /><strong>Stuck deals</strong><p>{stuckDeals.map(deal => deal.title).join(', ') || 'No stuck deals detected.'}</p></article>
        <article><StatusBadge value="High" /><strong>What to send today</strong><p>Send Lina the final RezBook price and timeline, then send Ahmad a short proposal with three options.</p></article>
      </div>
    </section>
  );

  const renderIntegrations = () => (
    <section className="crm-card-grid">
      {syncCards.map(card => <article className="glass-panel os-section crm-sync-card" key={card.title}><CheckCircle2 size={18} /><strong>{card.title}</strong><p>{card.body}</p><StatusBadge value={card.status} /></article>)}
    </section>
  );

  const activeTabLabel = tabs.find(tab => tab.id === activeTab)?.label || 'Dashboard';
  const modalTitle = modalAction ? {
    contact: 'New Contact',
    lead: 'New Lead',
    deal: 'New Deal',
    task: 'Add Task',
    note: 'Add Note',
    email: 'Draft Email',
    meeting: 'Schedule Meeting',
    file: 'Attach File'
  }[modalAction] : '';

  return (
    <div className="crm-shell">
      <PageHeader title="CRM" description="Supabase CRM layer for leads, clients, deals, follow-ups, emails, meetings, files, and income opportunities.">
        <label className="crm-search"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search contacts, leads, clients..." /></label>
        <button className="glass-btn" type="button" onClick={() => setCrmCommandOpen(true)}><Bot size={15} /> CRM Command</button>
      </PageHeader>
      <small className="crm-sync-line">{syncStatus}</small>

      <div className="page-body crm-body">
        {renderActionBar()}
        <section className="crm-tabs" aria-label="CRM tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}><Icon size={16} /><span>{tab.label}</span></button>;
          })}
        </section>

        <div className="crm-active-title"><span>{activeTabLabel}</span><small>Supabase source - reconnect-safe fallback cache</small></div>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'contacts' && renderContacts()}
        {activeTab === 'leads' && renderLeads()}
        {activeTab === 'clients' && renderClients()}
        {activeTab === 'pipeline' && renderPipeline()}
        {activeTab === 'tasks' && renderTasks()}
        {activeTab === 'emails' && renderEmails()}
        {activeTab === 'calendar' && renderCalendar()}
        {activeTab === 'files' && renderFiles()}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'advisor' && renderAdvisor()}
        {activeTab !== 'calendar' && renderIntegrations()}
      </div>

      {modalAction && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel crm-modal">
            <form onSubmit={saveModal}>
              <div className="crm-modal-head"><div><h3>{modalTitle}</h3><p>Saved to the CRM workspace flow; Google services sync when the active connection is available.</p></div><button className="glass-btn" type="button" onClick={() => setModalAction(null)}><X size={16} /></button></div>
              <div className="crm-modal-grid">
                {['contact', 'lead'].includes(modalAction) && <label>Name<input className="glass-input" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} required /></label>}
                {modalAction === 'contact' && <label>Email<input className="glass-input" type="email" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} /></label>}
                {modalAction === 'contact' && <label>Phone<input className="glass-input" value={draft.phone} onChange={event => setDraft({ ...draft, phone: event.target.value })} /></label>}
                {['contact', 'lead'].includes(modalAction) && <label>Company<input className="glass-input" value={draft.company} onChange={event => setDraft({ ...draft, company: event.target.value })} /></label>}
                {modalAction === 'contact' && <label>Tags<input className="glass-input" value={draft.tags} onChange={event => setDraft({ ...draft, tags: event.target.value })} placeholder="motion, retainer" /></label>}
                {['contact', 'lead'].includes(modalAction) && <label>Source<input className="glass-input" value={draft.source} onChange={event => setDraft({ ...draft, source: event.target.value })} /></label>}
                {modalAction === 'lead' && <label>Service Needed<input className="glass-input" value={draft.service} onChange={event => setDraft({ ...draft, service: event.target.value })} /></label>}
                {['lead', 'deal'].includes(modalAction) && <label>Estimated Budget / Value<input className="glass-input" type="number" value={modalAction === 'deal' ? draft.value : draft.budget} onChange={event => setDraft({ ...draft, [modalAction === 'deal' ? 'value' : 'budget']: event.target.value })} /></label>}
                {['lead', 'task'].includes(modalAction) && <label>Priority<select className="glass-input" value={draft.priority} onChange={event => setDraft({ ...draft, priority: event.target.value as ModalDraft['priority'] })}><option>Low</option><option>Medium</option><option>High</option></select></label>}
                {['deal', 'task', 'note', 'email', 'meeting', 'file'].includes(modalAction) && <label>Contact / Client<select className="glass-input" value={draft.contactId} onChange={event => setDraft({ ...draft, contactId: event.target.value })}>{contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.name} - {contact.company}</option>)}</select></label>}
                {['deal', 'task', 'meeting', 'file'].includes(modalAction) && <label>Title<input className="glass-input" value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>}
                {modalAction === 'deal' && <label>Stage<select className="glass-input" value={draft.stage} onChange={event => setDraft({ ...draft, stage: event.target.value as DealStage })}>{dealStages.map(stage => <option key={stage}>{stage}</option>)}</select></label>}
                {['deal', 'task', 'meeting'].includes(modalAction) && <label>Date<input className="glass-input" type="date" value={draft.dueDate} onChange={event => setDraft({ ...draft, dueDate: event.target.value })} /></label>}
                {modalAction === 'email' && <label>Subject<input className="glass-input" value={draft.subject} onChange={event => setDraft({ ...draft, subject: event.target.value })} /></label>}
                {modalAction === 'file' && <label>File Type<select className="glass-input" value={draft.fileType} onChange={event => setDraft({ ...draft, fileType: event.target.value as FileRecord['type'] })}><option>Proposal</option><option>Brief</option><option>Contract</option><option>Design</option><option>Invoice</option><option>Project File</option></select></label>}
                {modalAction === 'file' && <label>File URL<input className="glass-input" value={draft.url} onChange={event => setDraft({ ...draft, url: event.target.value })} /></label>}
              </div>
              {modalAction === 'contact' && (
                <div className="crm-ai-panel">
                  <div className="crm-ai-panel-head"><span>✦ AI Contact Enrichment</span><b>{enrichmentLoading ? 'Thinking...' : enrichment ? 'Ready' : 'Waiting'}</b></div>
                  {enrichment ? (
                    <>
                      <p>{enrichment.one_liner}</p>
                      <div className="crm-risk-chips">{(enrichment.suggested_tags || []).map(tag => <span key={tag}>{tag}</span>)}</div>
                      <small>{enrichment.inferred_company_type} - {enrichment.inferred_seniority}</small>
                      <div className="crm-smart-replies">
                        <button className="glass-btn btn-cyan" type="button" onClick={acceptEnrichment}>Accept</button>
                        <button className="glass-btn" type="button" onClick={() => setEnrichment(null)}>Ignore</button>
                      </div>
                    </>
                  ) : <p>Type a name or email to generate inferred suggestions. Nothing is applied without confirmation.</p>}
                </div>
              )}
              <label className="crm-modal-label">Notes / Description<textarea className="glass-input" value={draft.description || draft.notes} onChange={event => setDraft({ ...draft, description: event.target.value, notes: event.target.value })} /></label>
              <div className="crm-modal-actions"><button className="glass-btn" type="button" onClick={() => setModalAction(null)}>Cancel</button><button className="glass-btn btn-cyan" type="submit"><Plus size={16} /> Save</button></div>
            </form>
          </div>
        </div>
      )}

      {crmCommandOpen && (
        <div className="modal-overlay" onClick={() => setCrmCommandOpen(false)}>
          <div className="cmd-palette glass-panel" onClick={event => event.stopPropagation()}>
            <form className="cmd-input-container" onSubmit={runCrmCommand}>
              <Bot size={18} className="text-cyan" />
              <input
                className="cmd-input"
                value={crmCommandInput}
                onChange={event => setCrmCommandInput(event.target.value)}
                placeholder="Ask CRM: show stalled deals, draft a re-engagement email, schedule a call..."
                autoFocus
              />
              <button className="glass-btn btn-cyan" type="submit"><Sparkles size={14} /> Run</button>
              <button className="glass-btn" type="button" onClick={() => setCrmCommandOpen(false)}><X size={16} /></button>
            </form>
            <div className="crm-command-body">
              <span className="badge badge-cyan">✦ AI Command Bar</span>
              <p>{crmCommandResult || 'Natural language commands are parsed by Gemini and converted into confirmable CRM actions.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
