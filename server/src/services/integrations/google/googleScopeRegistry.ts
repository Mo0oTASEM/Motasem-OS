import type { google } from 'googleapis';

export type GoogleServiceName = 'gmail' | 'calendar' | 'drive' | 'tasks' | 'contacts' | 'sheets' | 'docs';

export type ScopeLevel = 'readonly' | 'manage' | 'full';

export type ServiceScopeConfig = {
  scopes: string[];
  version: 'v1' | 'v2' | 'v3' | 'v4';
  label: string;
  icon: string;
  readOnlyScopes: string[];
};

const GMAIL_READONLY = 'https://www.googleapis.com/auth/gmail.readonly';
const GMAIL_MODIFY = 'https://www.googleapis.com/auth/gmail.modify';
const GMAIL_SEND = 'https://www.googleapis.com/auth/gmail.send';
const GMAIL_COMPOSE = 'https://www.googleapis.com/auth/gmail.compose';
const GMAIL_LABELS = 'https://www.googleapis.com/auth/gmail.labels';

const CALENDAR_READONLY = 'https://www.googleapis.com/auth/calendar.readonly';
const CALENDAR_EVENTS = 'https://www.googleapis.com/auth/calendar.events';
const CALENDAR = 'https://www.googleapis.com/auth/calendar';

const TASKS_READONLY = 'https://www.googleapis.com/auth/tasks.readonly';
const TASKS = 'https://www.googleapis.com/auth/tasks';

const DRIVE_READONLY = 'https://www.googleapis.com/auth/drive.readonly';
const DRIVE_FILE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE = 'https://www.googleapis.com/auth/drive';

const CONTACTS_READONLY = 'https://www.googleapis.com/auth/contacts.readonly';
const CONTACTS = 'https://www.googleapis.com/auth/contacts';

const SHEETS_READONLY = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const SHEETS = 'https://www.googleapis.com/auth/spreadsheets';

const DOCS_READONLY = 'https://www.googleapis.com/auth/documents.readonly';
const DOCS = 'https://www.googleapis.com/auth/documents';

export const SERVICE_SCOPES: Record<GoogleServiceName, ServiceScopeConfig> = {
  gmail: {
    scopes: [GMAIL_MODIFY],
    version: 'v1',
    label: 'Gmail',
    icon: 'mail',
    readOnlyScopes: [GMAIL_READONLY],
  },
  calendar: {
    scopes: [CALENDAR_EVENTS],
    version: 'v3',
    label: 'Calendar',
    icon: 'calendar',
    readOnlyScopes: [CALENDAR_READONLY],
  },
  drive: {
    scopes: [DRIVE_FILE],
    version: 'v3',
    label: 'Drive',
    icon: 'hard_drive',
    readOnlyScopes: [DRIVE_READONLY],
  },
  tasks: {
    scopes: [TASKS],
    version: 'v1',
    label: 'Tasks',
    icon: 'check_square',
    readOnlyScopes: [TASKS_READONLY],
  },
  contacts: {
    scopes: [CONTACTS],
    version: 'v3',
    label: 'Contacts',
    icon: 'users',
    readOnlyScopes: [CONTACTS_READONLY],
  },
  sheets: {
    scopes: [SHEETS],
    version: 'v4',
    label: 'Sheets',
    icon: 'table',
    readOnlyScopes: [SHEETS_READONLY],
  },
  docs: {
    scopes: [DOCS],
    version: 'v1',
    label: 'Docs',
    icon: 'file_text',
    readOnlyScopes: [DOCS_READONLY],
  },
};

export const ALL_GOOGLE_SCOPES = Object.values(SERVICE_SCOPES).flatMap(s => s.scopes);

export const BASE_GOOGLE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export const getScopesForServices = (services: GoogleServiceName[], readOnly = false): string[] => {
  const scopeSet = new Set(BASE_GOOGLE_SCOPES);
  for (const svc of services) {
    const cfg = SERVICE_SCOPES[svc];
    for (const s of (readOnly ? cfg.readOnlyScopes : cfg.scopes)) {
      scopeSet.add(s);
    }
  }
  return [...scopeSet];
};

export const scopeLevels: Record<GoogleServiceName, ScopeLevel[]> = {
  gmail: ['readonly', 'manage', 'full'],
  calendar: ['readonly', 'full'],
  drive: ['readonly', 'full'],
  tasks: ['readonly', 'manage', 'full'],
  contacts: ['readonly', 'full'],
  sheets: ['readonly', 'full'],
  docs: ['readonly', 'full'],
};

const scopeHierarchy: Record<string, string[]> = {
  [GMAIL_MODIFY]: [GMAIL_READONLY, GMAIL_SEND, GMAIL_COMPOSE, GMAIL_LABELS],
  [CALENDAR]: [CALENDAR_READONLY, CALENDAR_EVENTS],
  [DRIVE]: [DRIVE_READONLY, DRIVE_FILE],
  [CONTACTS]: [CONTACTS_READONLY],
  [TASKS]: [TASKS_READONLY],
  [SHEETS]: [SHEETS_READONLY],
  [DOCS]: [DOCS_READONLY],
};

export const hasRequiredScopes = (grantedScopes: string[], requiredScopes: string[]): boolean => {
  const grantedSet = new Set(grantedScopes);
  const childToParents: Record<string, string[]> = {};
  for (const [parent, children] of Object.entries(scopeHierarchy)) {
    for (const child of children) {
      (childToParents[child] ??= []).push(parent);
    }
  }
  return requiredScopes.every(s => {
    if (grantedSet.has(s)) return true;
    return (childToParents[s] ?? []).some(p => grantedSet.has(p));
  });
};

export type GoogleApiVersion = {
  [K in GoogleServiceName]: string;
};
