import type { PortfolioProject } from '../models';
import { nowIso } from './utils';

export const portfolioService = {
  listPortfolioProjects: async (): Promise<PortfolioProject[]> => [],
  createPortfolioProject: async (input: Omit<PortfolioProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<PortfolioProject> => {
    const id = Date.now().toString(36);
    const createdAt = nowIso();
    return { ...input, id, createdAt, updatedAt: createdAt };
  },
  markPublished: async (project: PortfolioProject): Promise<PortfolioProject> => ({
    ...project,
    status: 'published',
    updatedAt: nowIso()
  })
};
