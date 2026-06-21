import type { ApprovalRequest, AutomationLog, WorkStatus } from '../models';
import { nowIso } from './utils';

export const automationService = {
  listAutomationLogs: async (): Promise<AutomationLog[]> => [],
  listApprovalRequests: async (): Promise<ApprovalRequest[]> => [],
  setApprovalStatus: async (request: ApprovalRequest, status: WorkStatus): Promise<ApprovalRequest> => ({
    ...request,
    status,
    resolvedAt: ['approved', 'rejected'].includes(status) ? nowIso() : request.resolvedAt,
    updatedAt: nowIso()
  }),
  appendAutomationLog: async (input: Omit<AutomationLog, 'createdAt' | 'updatedAt'>): Promise<AutomationLog> => {
    const createdAt = nowIso();
    return { ...input, createdAt, updatedAt: createdAt };
  }
};
