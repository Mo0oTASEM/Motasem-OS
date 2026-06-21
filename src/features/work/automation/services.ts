import type { ApprovalItem, ApprovalStatus, AutomationHistoryItem, ExternalActionKind } from './types';

export const SAFE_AUTOMATION_RULE =
  'Drafting, summarizing, scoring, and organizing can be automatic. Sending, publishing, deleting, or contacting external people requires explicit approval.';

const approvalRequiredActions: ExternalActionKind[] = ['send', 'publish', 'delete', 'contact'];

export const requiresExplicitApproval = (actionKind: ExternalActionKind) =>
  approvalRequiredActions.includes(actionKind);

export const setApprovalStatus = (
  items: ApprovalItem[],
  id: string,
  status: ApprovalStatus
) => items.map(item => (item.id === id ? { ...item, status } : item));

export const approvalToHistory = (
  item: ApprovalItem,
  status: ApprovalStatus
): AutomationHistoryItem => ({
  id: `history-approval-${item.id}-${Date.now()}`,
  timestamp: '2026-06-11 12:00',
  triggerSource: 'Approval Center',
  action: `${status}: ${item.actionType}`,
  status: status === 'Approved' ? 'Completed' : status === 'Rejected' ? 'Rejected' : 'Waiting Approval',
  result: `${item.target} moved to ${status}.`
});
