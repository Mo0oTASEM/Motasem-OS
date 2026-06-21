export type ApprovalActionType =
  | 'Email ready to send'
  | 'Social post ready to publish'
  | 'Follow-up sequence ready to start'
  | 'CRM status change'
  | 'Proposal draft ready'
  | 'WhatsApp manual message suggestion';

export type RiskLevel = 'Low' | 'Medium' | 'High';
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Editing';
export type AutomationStatus = 'Completed' | 'Waiting Approval' | 'Failed' | 'Rejected' | 'Drafted';
export type ExternalActionKind = 'draft' | 'summarize' | 'score' | 'organize' | 'send' | 'publish' | 'delete' | 'contact';

export interface ApprovalItem {
  id: string;
  actionType: ApprovalActionType;
  target: string;
  contentPreview: string;
  riskLevel: RiskLevel;
  reasonApprovalRequired: string;
  status: ApprovalStatus;
  createdAt: string;
}

export interface AutomationHistoryItem {
  id: string;
  timestamp: string;
  triggerSource: string;
  action: string;
  status: AutomationStatus;
  result: string;
  error?: string;
}
