import type { WorkSettings } from '../models';
import { nowIso } from './utils';

const defaultWorkSettings: WorkSettings = {
  id: '',
  createdAt: nowIso(),
  updatedAt: nowIso(),
  source: 'manual',
  status: 'active',
  requireEmailApproval: true,
  requirePostApproval: true,
  requireCrmBulkApproval: true,
  disableWhatsappAutoSend: true,
  draftFirstMode: true,
  maxAiActionsPerDay: 10,
  connectedIntegrations: {}
};

export const settingsService = {
  getWorkSettings: async (): Promise<WorkSettings> => ({ ...defaultWorkSettings, updatedAt: nowIso() }),
  updateWorkSettings: async (updates: Partial<WorkSettings>): Promise<WorkSettings> => ({
    ...defaultWorkSettings,
    ...updates,
    updatedAt: nowIso()
  })
};
