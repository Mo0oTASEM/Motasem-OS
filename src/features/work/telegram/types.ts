export type TelegramCommandCategory = 'CRM' | 'Outreach' | 'Content' | 'Portfolio' | 'Upwork' | 'Reports' | 'Task';

export interface TelegramCommandExample {
  id: string;
  category: TelegramCommandCategory;
  english: string;
  arabic: string;
  workflow: string;
  requiresApproval: boolean;
  mockResult: string;
}

export interface TelegramCommandSimulation {
  interpretation: string;
  selectedWorkflow: string;
  requiresApproval: boolean;
  mockResult: string;
}
