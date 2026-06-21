import { z } from 'zod';
import { repositoryFactory } from '../database/repositoryFactory.js';
import type {
  CrmActivityRecord,
  CrmCompanyRecord,
  CrmContactRecord,
  CrmDealRecord,
  CrmFollowUpRecord,
  CrmLeadRecord,
  CrmNoteRecord
} from '../database/models.js';

export const crmStages = ['new', 'qualified', 'contacted', 'replied', 'proposal', 'negotiation', 'won', 'lost', 'archived'] as const;

export const leadInputSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
  phone: z.string().optional().default(''),
  socialProfile: z.string().optional().default(''),
  source: z.string().optional().default('manual'),
  status: z.string().optional().default('New'),
  stage: z.enum(crmStages).optional().default('new'),
  serviceInterest: z.string().optional().default(''),
  budget: z.string().optional().default(''),
  priority: z.string().optional().default('medium'),
  score: z.number().min(0).max(100).optional().default(50),
  notes: z.string().optional().default(''),
  nextAction: z.string().optional().default('Qualify the lead and confirm fit.'),
  followUpDate: z.string().optional().default(''),
  externalIds: z.record(z.string()).optional().default({}),
  googleContactResourceName: z.string().optional().default(''),
  sheetRowId: z.string().optional().default('')
});

export const leadPatchSchema = leadInputSchema.partial();

export type LeadInput = z.input<typeof leadInputSchema>;

const clean = <T extends Record<string, unknown>>(input: T) => Object.fromEntries(
  Object.entries(input).filter(([, value]) => value !== undefined)
) as T;

const leadToContact = (lead: CrmLeadRecord): Omit<CrmContactRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'> => ({
  name: lead.name,
  company: lead.company,
  email: lead.email,
  phone: lead.phone,
  sourceLeadId: lead.id,
  notes: lead.notes,
  googleContactResourceName: lead.googleContactResourceName,
  sheetRowId: '',
  source: 'manual',
  syncStatus: 'pending',
  externalIds: {
    ...lead.externalIds,
    ...(lead.googleContactResourceName ? { google_contacts: lead.googleContactResourceName } : {})
  }
});

export const createCrmRepository = (userId: string) => {
  const leads = repositoryFactory.forUserCollection(userId, 'crm_leads');
  const contacts = repositoryFactory.forUserCollection(userId, 'crm_contacts');
  const companies = repositoryFactory.forUserCollection(userId, 'crm_companies');
  const deals = repositoryFactory.forUserCollection(userId, 'crm_deals');
  const activities = repositoryFactory.forUserCollection(userId, 'crm_activities');
  const followUps = repositoryFactory.forUserCollection(userId, 'crm_followups');
  const notes = repositoryFactory.forUserCollection(userId, 'crm_notes');

  const logActivity = async (activity: Omit<CrmActivityRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => (
    activities.create({
      ...activity,
      source: activity.source || 'manual',
      syncStatus: activity.syncStatus || 'pending',
      externalIds: activity.externalIds || {}
    })
  );

  return {
    leads,
    contacts,
    companies,
    deals,
    activities,
    followUps,
    notes,

    async listLeads() {
      return (await leads.list(1000)).filter(lead => !lead.deletedAt);
    },

    async createLead(input: LeadInput) {
      const parsed = leadInputSchema.parse(input);
      const { source: leadSource, ...leadFields } = parsed;
      const lead = await leads.create({
        ...leadFields,
        externalIds: {
          ...leadFields.externalIds,
          lead_source: leadSource
        },
        source: 'manual',
        syncStatus: 'pending'
      });
      await logActivity({
        leadId: lead.id,
        type: 'lead_created',
        summary: `Created lead ${lead.name}`,
        occurredAt: new Date().toISOString(),
        payload: { stage: lead.stage, source: lead.source },
        source: 'manual',
        syncStatus: 'pending',
        externalIds: {}
      });
      return lead;
    },

    async updateLead(id: string, updates: Partial<LeadInput>) {
      const parsed = leadPatchSchema.parse(clean(updates));
      const { source: leadSource, ...leadFields } = parsed;
      const current = await leads.read(id);
      const lead = await leads.update(id, {
        ...leadFields,
        ...(leadSource ? { externalIds: { ...current?.externalIds, lead_source: leadSource } } : {}),
        syncStatus: 'pending'
      });
      await logActivity({
        leadId: id,
        type: 'lead_updated',
        summary: `Updated lead ${lead.name}`,
        occurredAt: new Date().toISOString(),
        payload: parsed,
        source: 'manual',
        syncStatus: 'pending',
        externalIds: {}
      });
      return lead;
    },

    async deleteLead(id: string) {
      const result = await leads.delete(id);
      await logActivity({
        leadId: id,
        type: 'lead_deleted',
        summary: `Deleted lead ${id}`,
        occurredAt: result.deletedAt,
        payload: {},
        source: 'manual',
        syncStatus: 'pending',
        externalIds: {}
      });
      return result;
    },

    async promoteLead(id: string) {
      const lead = await leads.read(id);
      if (!lead || lead.deletedAt) throw new Error(`Lead not found: ${id}`);
      const contact = await contacts.create(leadToContact(lead));
      const promoted = await leads.update(id, {
        stage: 'won',
        status: 'Client',
        syncStatus: 'pending',
        externalIds: { ...lead.externalIds, crm_contact_id: contact.id }
      });
      await logActivity({
        leadId: id,
        contactId: contact.id,
        type: 'lead_promoted',
        summary: `Promoted ${lead.name} to contact`,
        occurredAt: new Date().toISOString(),
        payload: { contactId: contact.id },
        source: 'manual',
        syncStatus: 'pending',
        externalIds: {}
      });
      return { lead: promoted, contact };
    },

    async snapshot() {
      const [
        leadRows,
        contactRows,
        companyRows,
        dealRows,
        activityRows,
        followUpRows,
        noteRows
      ] = await Promise.all([
        leads.list(1000),
        contacts.list(1000),
        companies.list(1000) as Promise<CrmCompanyRecord[]>,
        deals.list(1000) as Promise<CrmDealRecord[]>,
        activities.list(1000),
        followUps.list(1000) as Promise<CrmFollowUpRecord[]>,
        notes.list(1000) as Promise<CrmNoteRecord[]>
      ]);

      return {
        leads: leadRows.filter(item => !item.deletedAt),
        contacts: contactRows.filter(item => !item.deletedAt),
        companies: companyRows.filter(item => !item.deletedAt),
        deals: dealRows.filter(item => !item.deletedAt),
        activities: activityRows.filter(item => !item.deletedAt),
        followUps: followUpRows.filter(item => !item.deletedAt),
        notes: noteRows.filter(item => !item.deletedAt)
      };
    }
  };
};

export type CrmRepository = ReturnType<typeof createCrmRepository>;
