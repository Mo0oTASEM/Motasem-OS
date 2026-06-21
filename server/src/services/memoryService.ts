import { createMemoryItem } from './memory/memoryRepository.js';
import { searchDurableMemory } from './memory/memorySearchService.js';

export interface MemorySearchResult {
  id: string;
  title: string;
  content: string;
  type: string;
  score: number;
  tags: string[];
  source?: string;
  entityType?: string;
  entityId?: string;
  importance?: number;
  snippet?: string;
}

export const ingestMemoryItem = async (userId: string, input: Record<string, unknown>) => {
  const memory = await createMemoryItem(userId, input);
  return { id: memory.id, memory };
};

export const searchMemory = async (userId: string, query: string): Promise<MemorySearchResult[]> => {
  const results = await searchDurableMemory(userId, { query });
  return results.map(result => ({
    id: result.id,
    title: result.title,
    content: result.content,
    type: result.type,
    tags: result.tags,
    score: result.score,
    source: result.source,
    entityType: result.entityType,
    entityId: result.entityId,
    importance: result.importance,
    snippet: result.snippet
  }));
};

