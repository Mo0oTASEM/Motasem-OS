import type { EmailDraft, OutreachSequence } from '../models';
import { nowIso } from './utils';

export const outreachService = {
  listEmailDrafts: async (): Promise<EmailDraft[]> => [],
  listOutreachSequences: async (): Promise<OutreachSequence[]> => [],
  createEmailDraft: async (input: Omit<EmailDraft, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailDraft> => {
    const id = Date.now().toString(36);
    const createdAt = nowIso();
    return { ...input, id, createdAt, updatedAt: createdAt };
  },
  approveDraft: async (draft: EmailDraft): Promise<EmailDraft> => ({
    ...draft,
    status: 'approved',
    approvedAt: nowIso(),
    updatedAt: nowIso()
  })
};
