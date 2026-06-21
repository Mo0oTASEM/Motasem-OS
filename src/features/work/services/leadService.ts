import type { Contact, Interaction, Lead } from '../models';
import type { Lead as UiLead } from '../crm/types';
import { nowIso } from './utils';

export const leadService = {
  getUiLeads: (): UiLead[] => [],
  listLeads: async (): Promise<Lead[]> => [],
  listContacts: async (): Promise<Contact[]> => [],
  listInteractions: async (): Promise<Interaction[]> => [],
  getLeadById: async (_id: string): Promise<Lead | undefined> => { void _id; return undefined; },
  createLead: async (input: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> => {
    const id = Date.now().toString(36);
    const createdAt = nowIso();
    return { ...input, id, createdAt, updatedAt: createdAt };
  },
  updateLead: async (lead: Lead, updates: Partial<Lead>): Promise<Lead> => ({
    ...lead,
    ...updates,
    updatedAt: nowIso()
  })
};
