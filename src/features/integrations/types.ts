import type { CanonicalStatus } from '../../lib/integrationStatus/shared';

export type IntegrationProvider = 'google_workspace' | 'telegram' | 'whatsapp' | 'hermes' | 'gemini' | 'github' | 'vercel';

export type GoogleServiceName = 'gmail' | 'calendar' | 'drive' | 'tasks' | 'contacts' | 'sheets' | 'docs';

export type IntegrationCategory = 'workspace' | 'messaging' | 'ai' | 'development';

export interface ProviderMeta {
  id: IntegrationProvider;
  name: string;
  description: string;
  icon: string;
  category: IntegrationCategory;
  services: GoogleServiceName[];
}

export interface IntegrationConnection {
  id: string;
  userId: string;
  providerId: IntegrationProvider;
  label: string | null;
  status: CanonicalStatus;
  scopes: string[];
  accountEmail: string | null;
  accountName: string | null;
  avatarUrl: string | null;
  connectedAt: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleIntegrationStatus {
  connected: boolean;
  email: string | null;
  services: Record<GoogleServiceName, boolean>;
  scopes: string[];
}

export interface IntegrationHealth {
  ok: boolean;
  status: CanonicalStatus;
  message?: string;
  error?: string;
}

export interface SyncJob {
  id: string;
  connectionId: string;
  service: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  syncType: 'full' | 'incremental' | 'webhook';
  itemsProcessed: number;
  itemsTotal: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export const PROVIDER_META: Record<IntegrationProvider, ProviderMeta> = {
  google_workspace: {
    id: 'google_workspace',
    name: 'Google Workspace',
    description: 'Gmail, Calendar, Drive, Tasks, Contacts, Sheets & Docs',
    icon: 'globe',
    category: 'workspace',
    services: ['gmail', 'calendar', 'drive', 'tasks', 'contacts', 'sheets', 'docs'],
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    description: 'Messaging bot for tasks, notes & reminders',
    icon: 'message_circle',
    category: 'messaging',
    services: [],
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'WhatsApp Cloud API messaging',
    icon: 'message_square',
    category: 'messaging',
    services: [],
  },
  hermes: {
    id: 'hermes',
    name: 'Hermes AI',
    description: 'Primary AI agent brain',
    icon: 'brain',
    category: 'ai',
    services: [],
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini AI',
    description: 'Fallback AI provider (embeddings)',
    icon: 'sparkles',
    category: 'ai',
    services: [],
  },
  github: {
    id: 'github',
    name: 'GitHub',
    description: 'Code repository integration',
    icon: 'github',
    category: 'development',
    services: [],
  },
  vercel: {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deployment platform',
    icon: 'triangle',
    category: 'development',
    services: [],
  },
};

export const GOOGLE_SERVICE_META: Record<GoogleServiceName, { label: string; icon: string; color: string }> = {
  gmail: { label: 'Gmail', icon: 'mail', color: '#ea4335' },
  calendar: { label: 'Calendar', icon: 'calendar', color: '#fbbc05' },
  drive: { label: 'Drive', icon: 'hard_drive', color: '#fbbc05' },
  tasks: { label: 'Tasks', icon: 'check_square', color: '#34a853' },
  contacts: { label: 'Contacts', icon: 'users', color: '#4285f4' },
  sheets: { label: 'Sheets', icon: 'table', color: '#0f9d58' },
  docs: { label: 'Docs', icon: 'file_text', color: '#4285f4' },
};
