import type { ToolRiskLevel } from '../tools/toolSchemas.js';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'edited' | 'editing' | 'cancelled' | 'executed' | 'failed';

const highRiskActionTypes = new Set([
  'sendEmail',
  'publishSocialPost',
  'scheduleSocialPost',
  'autoReplySocialComment',
  'submitJobApplication',
  'contactLeadExternally',
  'deleteRecord',
  'createFinanceTransaction',
  'updateFinanceRecord',
  'runBulkAutomation',
  'updateGoal',
  'createCalendarEvent',
  'promoteLeadToGoogleContact'
]);

const highRiskPatterns = [
  /send.*gmail/i,
  /publish|schedule.*social/i,
  /auto.?reply/i,
  /job application/i,
  /contact.*lead/i,
  /delete/i,
  /finance|transaction/i,
  /bulk/i,
  /important.*goal/i
];

export const approvalPolicy = {
  requiresApproval(actionType: string, riskLevel?: ToolRiskLevel) {
    if (riskLevel === 'medium' || riskLevel === 'high') return true;
    if (highRiskActionTypes.has(actionType)) return true;
    return highRiskPatterns.some(pattern => pattern.test(actionType));
  },

  canTransition(from: ApprovalStatus, to: ApprovalStatus) {
    const transitions: Record<ApprovalStatus, ApprovalStatus[]> = {
      pending: ['approved', 'rejected', 'edited', 'editing', 'cancelled'],
      editing: ['edited', 'cancelled'],
      edited: ['approved', 'rejected', 'cancelled'],
      approved: ['executed', 'failed', 'cancelled'],
      rejected: [],
      cancelled: [],
      executed: [],
      failed: ['approved', 'cancelled']
    };
    return transitions[from]?.includes(to) || false;
  },

  assertApproved(actionType: string, approval: { status: ApprovalStatus; actionType: string }) {
    if (approval.actionType !== actionType) {
      throw new Error(`Approval action mismatch. Expected ${actionType}, received ${approval.actionType}.`);
    }
    if (approval.status !== 'approved') {
      throw new Error(`Approval ${approval.status} cannot execute ${actionType}.`);
    }
  }
};
