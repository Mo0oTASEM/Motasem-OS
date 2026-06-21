import { Router } from 'express';
import { z } from 'zod';
import { assertOwner, requireSupabaseUser, type AuthedRequest } from '../security/securityService.js';
import { createCrmRepository, leadInputSchema, leadPatchSchema } from '../services/crm/crmRepository.js';
import { promoteLeadToGoogleContact, importGoogleClientsToCrm } from '../services/google/googleContactsService.js';
import { userDocumentStore } from '../services/userDocumentStore.js';

export const crmRoutes = Router();

crmRoutes.get('/leads', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const repo = createCrmRepository(userId);
  res.json({ leads: await repo.listLeads(), source: 'canonical_repository' });
});

crmRoutes.post('/leads', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = leadInputSchema.parse(req.body);
  const repo = createCrmRepository(userId);
  res.status(201).json({ lead: await repo.createLead(body) });
});

crmRoutes.patch('/leads/:id', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = leadPatchSchema.parse(req.body);
  const repo = createCrmRepository(userId);
  res.json({ lead: await repo.updateLead(String(req.params.id), body) });
});

crmRoutes.delete('/leads/:id', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const repo = createCrmRepository(userId);
  res.json(await repo.deleteLead(String(req.params.id)));
});

crmRoutes.post('/leads/:id/promote', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = z.object({
    approvalId: z.string().optional(),
    trusted: z.boolean().optional().default(false)
  }).parse(req.body || {});
  try {
    res.json(await promoteLeadToGoogleContact(String(req.params.id), userId, body));
  } catch (error) {
    res.status(400).json({
      error: (error as Error).message,
      needsGoogleOAuth: (error as Error).message.includes('Google Workspace OAuth')
    });
  }
});

crmRoutes.post('/contacts/import-google', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  try {
    res.json(await importGoogleClientsToCrm(userId));
  } catch (error) {
    res.status(400).json({
      error: (error as Error).message,
      needsGoogleOAuth: (error as Error).message.includes('Google Workspace OAuth')
    });
  }
});

const dealInputSchema = z.object({
  clientName: z.string().min(1),
  serviceDeliverable: z.string().optional().default(''),
  styleFormat: z.string().optional().default(''),
  agreedPrice: z.number().optional().default(0),
  depositPaid: z.number().optional().default(0),
  balanceDue: z.number().optional().default(0),
  paymentStatus: z.string().optional().default('Pending'),
  deliveryDate: z.string().optional().default(''),
  revisionsUsed: z.string().optional().default(''),
  contractSigned: z.boolean().optional().default(false),
  notes: z.string().optional().default('')
});

crmRoutes.get('/deals', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const deals = await userDocumentStore.listUserCollection<Record<string, unknown>>(userId, 'deal_details');
  res.json({ deals: (deals || []).filter(d => !d.deletedAt) });
});

crmRoutes.post('/deals', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const body = dealInputSchema.parse(req.body);
  const now = new Date().toISOString();
  const deal = await userDocumentStore.addUserDoc(userId, 'deal_details', {
    ...body,
    createdAt: now,
    updatedAt: now
  });
  res.status(201).json({ deal });
});

crmRoutes.patch('/deals/:id', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const dealId = String(req.params.id);
  const body = dealInputSchema.partial().parse(req.body);
  const existing = await userDocumentStore.readUserDoc<Record<string, unknown>>(userId, 'deal_details', dealId);
  if (!existing) {
    res.status(404).json({ error: 'Deal not found' });
    return;
  }
  const updated: Record<string, unknown> = {
    ...existing,
    ...body,
    updatedAt: new Date().toISOString()
  };
  await userDocumentStore.writeUserDoc(userId, 'deal_details', dealId, updated);
  res.json({ deal: updated });
});

crmRoutes.delete('/deals/:id', requireSupabaseUser, async (req: AuthedRequest, res) => {
  const userId = assertOwner(req);
  const dealId = String(req.params.id);
  const existing = await userDocumentStore.readUserDoc<Record<string, unknown>>(userId, 'deal_details', dealId);
  if (existing) {
    const updated = { ...existing, deletedAt: new Date().toISOString() };
    await userDocumentStore.writeUserDoc(userId, 'deal_details', dealId, updated);
  }
  res.json({ success: true });
});
