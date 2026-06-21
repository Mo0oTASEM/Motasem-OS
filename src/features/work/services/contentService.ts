import type { ContentItem } from '../models';
import { nowIso } from './utils';

export const contentService = {
  listContentItems: async (): Promise<ContentItem[]> => [],
  createContentItem: async (input: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentItem> => {
    const id = Date.now().toString(36);
    const createdAt = nowIso();
    return { ...input, id, createdAt, updatedAt: createdAt };
  },
  approveContentItem: async (item: ContentItem): Promise<ContentItem> => ({
    ...item,
    status: 'scheduled',
    approvedAt: nowIso(),
    updatedAt: nowIso()
  })
};
