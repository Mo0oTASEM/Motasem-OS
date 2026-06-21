import crypto from 'node:crypto';
import { google, calendar_v3 } from 'googleapis';
import { z } from 'zod';
import { config } from '../../config.js';
import { getSupabaseClientOrThrow } from '../supabaseClient.js';
import { userDocumentStore } from '../userDocumentStore.js';
import { buildOAuthClient } from '../googleWorkspaceService.js';

const CONNECTION_COLLECTION = 'planner_google_calendar_connection';
const OAUTH_STATE_COLLECTION = 'planner_google_calendar_oauth_states';
const SYNC_STATE_COLLECTION = 'planner_google_calendar_sync_state';

export const GOOGLE_CALENDAR_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events'
];

type CalendarSelection = {
  id: string;
  summary: string;
  primary: boolean;
  selected: boolean;
  backgroundColor?: string;
  accessRole?: string;
};

type CalendarConnection = {
  status: 'disconnected' | 'connected' | 'error' | 'token_expired';
  connectedAccount?: string;
  scopes?: string[];
  encryptedRefreshToken?: string;
  calendars: CalendarSelection[];
  selectedCalendarIds: string[];
  lastSuccessfulSyncAt?: string;
  lastSyncAttemptAt?: string;
  syncStatus?: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
  updatedAt: string;
};

type OAuthState = {
  id: string;
  userId: string;
  codeVerifier: string;
  createdAt: string;
  expiresAt: string;
};

type CalendarSyncState = {
  id: string;
  calendarId: string;
  syncToken?: string;
  lastSyncedAt?: string;
  lastError?: string;
  status: 'idle' | 'syncing' | 'error';
  updatedAt: string;
};

export const plannerCalendarEventInputSchema = z.object({
  workspaceId: z.string().uuid(),
  calendarId: z.string().optional(),
  title: z.string().min(1).max(250),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  timezone: z.string().optional(),
  isAllDay: z.boolean().optional()
});

const nowIso = () => new Date().toISOString();
const encodeDocId = (value: string) => Buffer.from(value).toString('base64url');

const sanitizeError = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Google Calendar request failed.';
  if (/invalid_grant|unauthorized|revoked/i.test(message)) return 'Google Calendar access was revoked. Reconnect Calendar.';
  if (/sync token/i.test(message)) return 'Calendar sync token expired. A full sync will run.';
  return 'Google Calendar request failed. Try again or reconnect Calendar.';
};

const getEncryptionKey = () => {
  if (!config.googleTokenEncryptionKey) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY is required for Google Calendar token storage.');
  }
  return crypto.createHash('sha256').update(config.googleTokenEncryptionKey).digest();
};

const encryptSecret = (plainText: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
};

const decryptSecret = (payload: string) => {
  const [version, ivRaw, tagRaw, encryptedRaw] = payload.split('.');
  if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) throw new Error('Stored Google token is invalid.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final()
  ]).toString('utf8');
};

const pkcePair = () => {
  const codeVerifier = crypto.randomBytes(48).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
};

const readConnection = async (userId: string): Promise<CalendarConnection> => {
  const existing = await userDocumentStore.readUserDoc<CalendarConnection>(userId, CONNECTION_COLLECTION, 'default');
  return existing || {
    status: 'disconnected',
    calendars: [],
    selectedCalendarIds: [],
    syncStatus: 'idle',
    updatedAt: nowIso()
  };
};

const writeConnection = async (userId: string, connection: CalendarConnection) => {
  await userDocumentStore.writeUserDoc(userId, CONNECTION_COLLECTION, 'default', {
    ...connection,
    updatedAt: nowIso()
  });
};

const getCalendarClient = async (userId: string) => {
  const connection = await readConnection(userId);
  if (!connection.encryptedRefreshToken) {
    throw new Error('Google Calendar is not connected.');
  }
  const oauth = await buildOAuthClient(userId);
  oauth.setCredentials({ refresh_token: decryptSecret(connection.encryptedRefreshToken) });
  return {
    connection,
    oauth,
    calendar: google.calendar({ version: 'v3', auth: oauth })
  };
};

const calendarFromGoogle = (item: calendar_v3.Schema$CalendarListEntry, selectedIds: string[]): CalendarSelection => ({
  id: item.id || '',
  summary: item.summary || item.id || 'Google Calendar',
  primary: Boolean(item.primary),
  selected: selectedIds.length ? selectedIds.includes(item.id || '') : Boolean(item.primary),
  backgroundColor: item.backgroundColor || undefined,
  accessRole: item.accessRole || undefined
});

export const getGoogleCalendarStatus = async (userId: string) => {
  const connection = await readConnection(userId);
  return {
    status: connection.status,
    connectedAccount: connection.connectedAccount || '',
    calendars: connection.calendars.map(calendar => ({ ...calendar, id: calendar.id })),
    selectedCalendarIds: connection.selectedCalendarIds,
    lastSuccessfulSyncAt: connection.lastSuccessfulSyncAt || null,
    lastSyncAttemptAt: connection.lastSyncAttemptAt || null,
    syncStatus: connection.syncStatus || 'idle',
    errorMessage: connection.errorMessage || '',
    scopes: connection.scopes || [],
    webhooksSupported: Boolean(config.googleCalendarWebhookUrl)
  };
};

export const createGoogleCalendarConnectUrl = async (userId: string) => {
  const oauth = await buildOAuthClient(userId);
  type AuthUrlOptions = NonNullable<Parameters<typeof oauth.generateAuthUrl>[0]>;
  const { codeVerifier, codeChallenge } = pkcePair();
  const stateId = crypto.randomUUID();
  const state: OAuthState = {
    id: stateId,
    userId,
    codeVerifier,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  };

  await userDocumentStore.writeUserDoc(userId, OAUTH_STATE_COLLECTION, stateId, state);

  const encodedState = Buffer.from(JSON.stringify({ userId, stateId, flow: 'planner_google_calendar' })).toString('base64url');
  return oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: GOOGLE_CALENDAR_SCOPES,
    state: encodedState,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256' as unknown as AuthUrlOptions['code_challenge_method']
  });
};

export const handleGoogleCalendarCallback = async (code: string, statePayload: string) => {
  const parsed = JSON.parse(Buffer.from(statePayload, 'base64url').toString('utf8')) as { userId?: string; stateId?: string; flow?: string };
  if (!parsed.userId || !parsed.stateId || parsed.flow !== 'planner_google_calendar') {
    throw new Error('Invalid Google Calendar OAuth state.');
  }

  const state = await userDocumentStore.readUserDoc<OAuthState>(parsed.userId, OAUTH_STATE_COLLECTION, parsed.stateId);
  if (!state || state.userId !== parsed.userId || new Date(state.expiresAt).getTime() < Date.now()) {
    throw new Error('Google Calendar OAuth state expired.');
  }

  const oauth = await buildOAuthClient(parsed.userId);
  const { tokens } = await oauth.getToken({ code, codeVerifier: state.codeVerifier });
  if (!tokens.refresh_token) {
    throw new Error('Google did not return a refresh token. Reconnect and approve offline access.');
  }

  oauth.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth });
  const profile = await oauth2.userinfo.get();
  const email = profile.data.email || '';
  const now = nowIso();
  const previous = await readConnection(parsed.userId);

  const connection: CalendarConnection = {
    ...previous,
    status: 'connected',
    connectedAccount: email,
    scopes: typeof tokens.scope === 'string' ? tokens.scope.split(' ') : GOOGLE_CALENDAR_SCOPES,
    encryptedRefreshToken: encryptSecret(tokens.refresh_token),
    calendars: previous.calendars || [],
    selectedCalendarIds: previous.selectedCalendarIds || [],
    syncStatus: 'idle',
    errorMessage: '',
    updatedAt: now
  };
  await writeConnection(parsed.userId, connection);
  await refreshGoogleCalendarList(parsed.userId);
  await userDocumentStore.writeUserDoc(parsed.userId, OAUTH_STATE_COLLECTION, parsed.stateId, { ...state, consumedAt: now });
  return { userId: parsed.userId, connectedAccount: email };
};

export const refreshGoogleCalendarList = async (userId: string) => {
  const { calendar } = await getCalendarClient(userId);
  const connection = await readConnection(userId);
  const selectedIds = connection.selectedCalendarIds || [];
  const calendars: CalendarSelection[] = [];
  let pageToken: string | undefined;

  do {
    const response = await calendar.calendarList.list({ maxResults: 250, pageToken });
    calendars.push(...(response.data.items || []).map(item => calendarFromGoogle(item, selectedIds)).filter(item => item.id));
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  const nextSelected = selectedIds.length ? selectedIds.filter(id => calendars.some(calendarItem => calendarItem.id === id)) : calendars.filter(item => item.primary).map(item => item.id);
  await writeConnection(userId, {
    ...connection,
    status: 'connected',
    calendars: calendars.map(item => ({ ...item, selected: nextSelected.includes(item.id) })),
    selectedCalendarIds: nextSelected,
    errorMessage: '',
    syncStatus: 'idle',
    updatedAt: nowIso()
  });
  return readConnection(userId);
};

export const updateSelectedGoogleCalendars = async (userId: string, selectedCalendarIds: string[]) => {
  const connection = await readConnection(userId);
  const allowed = new Set(connection.calendars.map(calendar => calendar.id));
  const selected = selectedCalendarIds.filter(id => allowed.has(id));
  await writeConnection(userId, {
    ...connection,
    calendars: connection.calendars.map(calendar => ({ ...calendar, selected: selected.includes(calendar.id) })),
    selectedCalendarIds: selected,
    updatedAt: nowIso()
  });
  return readConnection(userId);
};

const googleEventTimes = (event: calendar_v3.Schema$Event) => {
  if (event.start?.date) {
    return {
      startTime: `${event.start.date}T00:00:00.000Z`,
      endTime: `${event.end?.date || event.start.date}T00:00:00.000Z`,
      timezone: event.start.timeZone || event.end?.timeZone || 'UTC',
      isAllDay: true
    };
  }

  return {
    startTime: event.start?.dateTime || new Date().toISOString(),
    endTime: event.end?.dateTime || event.start?.dateTime || new Date().toISOString(),
    timezone: event.start?.timeZone || event.end?.timeZone || undefined,
    isAllDay: false
  };
};

export const mapGoogleEventToCalendarPayload = (event: calendar_v3.Schema$Event, args: {
  workspaceId: string;
  userId: string;
  calendarId: string;
}) => {
  const times = googleEventTimes(event);
  return {
    workspace_id: args.workspaceId,
    user_id: args.userId,
    external_id: event.id || '',
    source: 'google',
    title: event.summary || '(Untitled Google event)',
    description: event.description || '',
    start_time: times.startTime,
    end_time: times.endTime,
    timezone: times.timezone,
    is_all_day: times.isAllDay,
    is_recurring: Boolean(event.recurringEventId || event.recurrence?.length),
    recurrence_data: {
      provider: 'google',
      providerCalendarId: args.calendarId,
      providerEventId: event.id,
      iCalUID: event.iCalUID,
      htmlLink: event.htmlLink,
      status: event.status,
      updated: event.updated,
      recurrence: event.recurrence || [],
      recurringEventId: event.recurringEventId || null
    },
    is_locked: false,
    sync_status: 'synced',
    last_synced_at: nowIso()
  };
};

const upsertGoogleEvent = async (workspaceId: string, userId: string, calendarId: string, event: calendar_v3.Schema$Event) => {
  if (!event.id) return;
  const supabase = getSupabaseClientOrThrow();
  const payload = mapGoogleEventToCalendarPayload(event, { workspaceId, userId, calendarId });

  const { data: existing, error: selectError } = await supabase
    .from('calendar_events')
    .select('id,updated_at,recurrence_data')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('source', 'google')
    .eq('external_id', event.id)
    .maybeSingle();
  if (selectError) throw selectError;

  if (event.status === 'cancelled') {
    if (existing?.id) {
      const { error } = await supabase.from('calendar_events').delete().eq('id', existing.id).eq('user_id', userId).eq('workspace_id', workspaceId);
      if (error) throw error;
    }
    return;
  }

  if (existing?.id) {
    const { error } = await supabase.from('calendar_events').update(payload).eq('id', existing.id).eq('user_id', userId).eq('workspace_id', workspaceId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('calendar_events').insert(payload);
  if (error) throw error;
};

const readSyncState = async (userId: string, calendarId: string): Promise<CalendarSyncState> => {
  const docId = encodeDocId(calendarId);
  const existing = await userDocumentStore.readUserDoc<CalendarSyncState>(userId, SYNC_STATE_COLLECTION, docId);
  return existing || { id: docId, calendarId, status: 'idle', updatedAt: nowIso() };
};

const writeSyncState = async (userId: string, state: CalendarSyncState) => {
  await userDocumentStore.writeUserDoc(userId, SYNC_STATE_COLLECTION, state.id, { ...state, updatedAt: nowIso() });
};

const syncOneCalendar = async (userId: string, workspaceId: string, calendarId: string, forceFullSync = false) => {
  const { calendar } = await getCalendarClient(userId);
  let syncState = await readSyncState(userId, calendarId);
  await writeSyncState(userId, { ...syncState, status: 'syncing', lastError: '' });

  let pageToken: string | undefined;
  let syncToken = forceFullSync ? undefined : syncState.syncToken;
  let imported = 0;

  const runPage = async () => calendar.events.list({
    calendarId,
    maxResults: 2500,
    pageToken,
    showDeleted: true,
    singleEvents: false,
    syncToken
  });

  try {
    do {
      const response = await runPage();
      for (const event of response.data.items || []) {
        await upsertGoogleEvent(workspaceId, userId, calendarId, event);
        imported += 1;
      }
      pageToken = response.data.nextPageToken || undefined;
      if (!pageToken && response.data.nextSyncToken) {
        syncState = { ...syncState, syncToken: response.data.nextSyncToken, lastSyncedAt: nowIso(), status: 'idle', lastError: '' };
      }
    } while (pageToken);
  } catch (error) {
    const status = (error as { code?: number; status?: number }).code || (error as { code?: number; status?: number }).status;
    if (syncToken && status === 410) {
      syncToken = undefined;
      pageToken = undefined;
      return syncOneCalendar(userId, workspaceId, calendarId, true);
    }
    const message = sanitizeError(error);
    await writeSyncState(userId, { ...syncState, status: 'error', lastError: message });
    throw new Error(message, { cause: error });
  }

  await writeSyncState(userId, syncState);
  return { calendarId, imported, fullSync: forceFullSync || !syncToken };
};

export const syncGoogleCalendar = async (userId: string, workspaceId: string, forceFullSync = false) => {
  const connection = await readConnection(userId);
  if (connection.status !== 'connected') throw new Error('Google Calendar is not connected.');
  const selected = connection.selectedCalendarIds.length ? connection.selectedCalendarIds : connection.calendars.filter(calendar => calendar.selected).map(calendar => calendar.id);
  if (!selected.length) throw new Error('Select at least one Google Calendar before syncing.');

  await writeConnection(userId, { ...connection, syncStatus: 'syncing', lastSyncAttemptAt: nowIso(), errorMessage: '' });
  try {
    const results = [];
    for (const calendarId of selected) {
      results.push(await syncOneCalendar(userId, workspaceId, calendarId, forceFullSync));
    }
    const updated = await readConnection(userId);
    await writeConnection(userId, {
      ...updated,
      syncStatus: 'idle',
      lastSuccessfulSyncAt: nowIso(),
      lastSyncAttemptAt: nowIso(),
      errorMessage: ''
    });
    return { status: 'synced', results };
  } catch (error) {
    const updated = await readConnection(userId);
    const message = sanitizeError(error);
    await writeConnection(userId, { ...updated, syncStatus: 'error', lastSyncAttemptAt: nowIso(), errorMessage: message });
    throw new Error(message, { cause: error });
  }
};

export const disconnectGoogleCalendar = async (userId: string) => {
  const connection = await readConnection(userId);
  if (connection.encryptedRefreshToken) {
    try {
      const oauth = await buildOAuthClient(userId);
      await oauth.revokeToken(decryptSecret(connection.encryptedRefreshToken));
    } catch {
      // Revoke is best-effort; the local encrypted token is still removed.
    }
  }
  await writeConnection(userId, {
    status: 'disconnected',
    calendars: [],
    selectedCalendarIds: [],
    syncStatus: 'idle',
    updatedAt: nowIso()
  });
  return { status: 'disconnected' };
};

export const createPlannerGoogleEvent = async (userId: string, input: z.infer<typeof plannerCalendarEventInputSchema>) => {
  const { calendar } = await getCalendarClient(userId);
  const calendarId = input.calendarId || 'primary';
  const requestBody: calendar_v3.Schema$Event = {
    summary: input.title,
    description: input.description,
    start: input.isAllDay
      ? { date: input.startTime.slice(0, 10) }
      : { dateTime: input.startTime, timeZone: input.timezone },
    end: input.isAllDay
      ? { date: input.endTime.slice(0, 10) }
      : { dateTime: input.endTime, timeZone: input.timezone }
  };
  const response = await calendar.events.insert({ calendarId, requestBody });
  await upsertGoogleEvent(input.workspaceId, userId, calendarId, response.data);
  return { event: response.data };
};

const getLinkedGoogleEvent = async (userId: string, workspaceId: string, localEventId: string) => {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id,external_id,recurrence_data')
    .eq('id', localEventId)
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('source', 'google')
    .maybeSingle();
  if (error) throw error;
  if (!data?.external_id) throw new Error('Linked Google Calendar event not found.');
  const recurrenceData = (data.recurrence_data || {}) as { providerCalendarId?: string };
  return {
    id: data.id as string,
    providerEventId: data.external_id as string,
    providerCalendarId: recurrenceData.providerCalendarId || 'primary'
  };
};

export const updatePlannerGoogleEvent = async (
  userId: string,
  localEventId: string,
  input: z.infer<typeof plannerCalendarEventInputSchema>
) => {
  const linked = await getLinkedGoogleEvent(userId, input.workspaceId, localEventId);
  const { calendar } = await getCalendarClient(userId);
  const requestBody: calendar_v3.Schema$Event = {
    summary: input.title,
    description: input.description,
    start: input.isAllDay
      ? { date: input.startTime.slice(0, 10) }
      : { dateTime: input.startTime, timeZone: input.timezone },
    end: input.isAllDay
      ? { date: input.endTime.slice(0, 10) }
      : { dateTime: input.endTime, timeZone: input.timezone }
  };
  const calendarId = input.calendarId || linked.providerCalendarId;
  const response = await calendar.events.patch({
    calendarId,
    eventId: linked.providerEventId,
    requestBody
  });
  await upsertGoogleEvent(input.workspaceId, userId, calendarId, response.data);
  return { event: response.data };
};

export const deletePlannerGoogleEvent = async (userId: string, workspaceId: string, localEventId: string) => {
  const linked = await getLinkedGoogleEvent(userId, workspaceId, localEventId);
  const { calendar } = await getCalendarClient(userId);
  await calendar.events.delete({
    calendarId: linked.providerCalendarId,
    eventId: linked.providerEventId
  });
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', localEventId)
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);
  if (error) throw error;
  return { success: true };
};
