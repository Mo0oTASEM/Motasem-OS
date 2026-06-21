import type { CrmDataset, Interaction, InteractionSnapshot, Lead, LeadCreateInput } from './types';

const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

export const scoreLeadWithAI = (lead: Pick<Lead, 'budgetRange' | 'platform' | 'serviceInterest' | 'temperature' | 'notes'>): number => {
  let score = lead.temperature === 'Hot' ? 78 : lead.temperature === 'Warm' ? 62 : 42;
  if (lead.budgetRange.includes('3,000') || lead.budgetRange.includes('5,000')) score += 12;
  if (['Portfolio Website', 'Gmail', 'Behance'].includes(lead.platform)) score += 7;
  if (['Brand Video', 'Logo Animation', 'Motion Design'].includes(lead.serviceInterest)) score += 5;
  if (/urgent|launch|timeline|retainer|proposal/i.test(lead.notes)) score += 8;
  return Math.max(0, Math.min(100, score));
};

export const generateNextBestAction = (lead: Pick<Lead, 'aiScore' | 'temperature' | 'serviceInterest' | 'platform'>): string => {
  if (lead.aiScore >= 85 || lead.temperature === 'Hot') {
    return `Send a tailored ${lead.serviceInterest.toLowerCase()} proof reel and propose a short discovery call.`;
  }
  if (lead.aiScore < 55 || lead.temperature === 'Cold') {
    return 'Ask one qualifying question about budget, deadline, and decision owner before drafting anything custom.';
  }
  return `Share one relevant ${lead.platform} example, confirm deadline, and offer two package options.`;
};

export const createLead = (input: LeadCreateInput): Lead => {
  const createdAt = nowIso();
  const draft: Lead = {
    id: uid('lead'),
    source: input.source || 'manual',
    sourceId: input.sourceId,
    createdAt,
    updatedAt: createdAt,
    lastContactedAt: input.lastContactedAt,
    nextFollowUpAt: input.nextFollowUpAt,
    status: input.status || 'New',
    tags: input.tags || [],
    notes: input.notes || '',
    aiSummary: input.aiSummary || '',
    aiScore: input.aiScore || 0,
    consentStatus: input.consentStatus || 'unknown',
    preferredChannel: input.preferredChannel || 'email',
    interactionHistory: input.interactionHistory || [],
    name: input.name,
    platform: input.platform,
    email: input.email,
    phoneOrHandle: input.phoneOrHandle,
    contactId: input.contactId,
    companyId: input.companyId,
    serviceInterest: input.serviceInterest,
    budgetRange: input.budgetRange,
    temperature: input.temperature,
    nextBestAction: input.nextBestAction || ''
  };

  const aiScore = draft.aiScore || scoreLeadWithAI(draft);
  return {
    ...draft,
    aiScore,
    nextBestAction: draft.nextBestAction || generateNextBestAction({ ...draft, aiScore }),
    aiSummary: draft.aiSummary || 'Mock AI summary pending real model integration.'
  };
};

export const updateLead = (leads: Lead[], leadId: string, updates: Partial<Lead>): Lead[] => {
  return leads.map(lead => lead.id === leadId ? { ...lead, ...updates, updatedAt: nowIso() } : lead);
};

export const logInteraction = (leads: Lead[], leadId: string, interaction: Omit<InteractionSnapshot, 'id'>): Lead[] => {
  const snapshot: InteractionSnapshot = { ...interaction, id: uid('interaction') };
  return leads.map(lead => lead.id === leadId ? {
    ...lead,
    updatedAt: nowIso(),
    lastContactedAt: snapshot.occurredAt,
    interactionHistory: [snapshot, ...lead.interactionHistory]
  } : lead);
};

export const getLeadsForFollowUp = (leads: Lead[], asOfIso = nowIso()): Lead[] => {
  const asOf = new Date(asOfIso).getTime();
  return leads.filter(lead => {
    if (!lead.nextFollowUpAt || ['Client', 'Lost'].includes(lead.status)) return false;
    return new Date(lead.nextFollowUpAt).getTime() <= asOf;
  });
};

export const syncGoogleContacts = async (): Promise<{ status: 'mock'; contacts: CrmDataset['contacts']; message: string }> => {
  return {
    status: 'mock',
    contacts: [],
    message: 'Google Contacts sync placeholder. Add OAuth client and People API adapter here later.'
  };
};


export const createInteractionRecord = (leadId: string, subject: string, body: string): Interaction => {
  const createdAt = nowIso();
  return {
    id: uid('interaction'),
    source: 'manual',
    createdAt,
    updatedAt: createdAt,
    status: 'Done',
    tags: [],
    notes: body,
    aiSummary: subject,
    aiScore: 50,
    consentStatus: 'unknown',
    preferredChannel: 'email',
    interactionHistory: [],
    leadId,
    type: 'note',
    occurredAt: createdAt,
    subject,
    body
  };
};
