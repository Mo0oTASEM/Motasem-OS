import { google } from 'googleapis';
import { createCrmRepository } from './crm/crmRepository.js';
import { getUserOAuthClient } from './googleAuthService.js';

const readPeopleContacts = async (userId: string) => {
  const auth = await getUserOAuthClient(userId);
  const people = google.people({ version: 'v1', auth });
  const response = await people.people.connections.list({
    resourceName: 'people/me',
    pageSize: 100,
    personFields: 'names,emailAddresses,phoneNumbers,organizations,biographies,userDefined,urls'
  });

  return (response.data.connections || []).map(person => ({
    resourceName: person.resourceName || '',
    name: person.names?.[0]?.displayName || '',
    email: person.emailAddresses?.[0]?.value || '',
    phone: person.phoneNumbers?.[0]?.value || '',
    company: person.organizations?.[0]?.name || '',
    role: person.organizations?.[0]?.title || '',
    notes: person.biographies?.[0]?.value || '',
    tags: person.userDefined?.filter(field => field.key === 'crm_tags').map(field => field.value || '').join(', ') || '',
    social: person.urls?.map(url => url.value).filter(Boolean).join(', ') || ''
  })).filter(contact => contact.name || contact.email);
};

export const readCrmSnapshot = async (userId: string) => {
  const repo = createCrmRepository(userId);
  const snapshot = await repo.snapshot();
  const googleContacts = await readPeopleContacts(userId).catch(() => []);
  return {
    ...snapshot,
    googleContacts,
    source: 'supabase'
  };
};

export const appendCrmActivity = async (userId: string, activity: Record<string, unknown>) => {
  const repo = createCrmRepository(userId);
  const created = await repo.activities.create({
    leadId: typeof activity.leadId === 'string' ? activity.leadId : undefined,
    contactId: typeof activity.contactId === 'string' ? activity.contactId : undefined,
    type: String(activity.type || activity.action || 'crm_activity'),
    summary: String(activity.summary || activity.details || 'CRM activity'),
    occurredAt: String(activity.occurredAt || activity.created_at || new Date().toISOString()),
    payload: activity,
    source: 'manual',
    syncStatus: 'pending',
    externalIds: {}
  });
  return { status: 'logged', storage: 'supabase', activity: created };
};

export const createCrmCalendarEvent = async (userId: string, event: Record<string, unknown>) => {
  const auth = await getUserOAuthClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });
  const startDate = String(event.date || new Date().toISOString().split('T')[0]);
  const start = `${startDate}T10:00:00+03:00`;
  const end = `${startDate}T10:30:00+03:00`;
  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: String(event.title || 'CRM follow-up'),
      description: String(event.description || ''),
      start: { dateTime: start, timeZone: 'Asia/Amman' },
      end: { dateTime: end, timeZone: 'Asia/Amman' },
      attendees: String(event.email || '') ? [{ email: String(event.email) }] : [],
      conferenceData: {
        createRequest: {
          requestId: `crm-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    }
  });

  return { status: 'created', eventId: response.data.id, htmlLink: response.data.htmlLink };
};

export const createCrmGoogleContact = async (userId: string, contact: Record<string, unknown>) => {
  const auth = await getUserOAuthClient(userId);
  const people = google.people({ version: 'v1', auth });
  const response = await people.people.createContact({
    requestBody: {
      names: [{ givenName: String(contact.name || 'CRM Contact') }],
      emailAddresses: String(contact.email || '') ? [{ value: String(contact.email) }] : [],
      phoneNumbers: String(contact.phone || '') ? [{ value: String(contact.phone) }] : [],
      organizations: String(contact.company || '') ? [{ name: String(contact.company) }] : [],
      biographies: String(contact.notes || '') ? [{ value: String(contact.notes), contentType: 'TEXT_PLAIN' }] : [],
      userDefined: String(contact.tags || '') ? [{ key: 'crm_tags', value: String(contact.tags) }] : []
    }
  });

  return {
    status: 'created',
    resourceName: response.data.resourceName,
    etag: response.data.etag
  };
};

export const sendCrmEmail = async (userId: string, email: Record<string, unknown>) => {
  const auth = await getUserOAuthClient(userId);
  const gmail = google.gmail({ version: 'v1', auth });
  const to = String(email.to || '');
  const subject = String(email.subject || 'CRM follow-up');
  const body = String(email.body || '');
  const raw = Buffer.from([
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body
  ].join('\n')).toString('base64url');
  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw }
  });
  return { status: 'sent', messageId: response.data.id };
};
