import { listMemoryItems, type DurableMemoryItem, type DurableMemoryType } from './memoryRepository.js';

export interface MemorySearchInput {
  query: string;
  types?: DurableMemoryType[];
  entityType?: string;
  entityId?: string;
  limit?: number;
}

export interface DurableMemorySearchResult extends DurableMemoryItem {
  score: number;
  matches: string[];
  snippet: string;
}

const tokenize = (value: string) =>
  value.toLowerCase().split(/[^a-z0-9\u0600-\u06FF]+/i).map(term => term.trim()).filter(Boolean);

const includes = (haystack: string, needle: string) => haystack.includes(needle.toLowerCase());

const snippetFor = (memory: DurableMemoryItem, terms: string[]) => {
  const content = memory.content || '';
  const lower = content.toLowerCase();
  const firstTerm = terms.find(term => lower.includes(term));
  if (!firstTerm) return content.slice(0, 220);
  const index = Math.max(0, lower.indexOf(firstTerm) - 80);
  return `${index > 0 ? '...' : ''}${content.slice(index, index + 240)}${index + 240 < content.length ? '...' : ''}`;
};

export const searchDurableMemory = async (
  userId: string,
  input: MemorySearchInput
): Promise<DurableMemorySearchResult[]> => {
  const query = input.query.trim();
  const terms = tokenize(query);
  const limit = Math.max(1, Math.min(Number(input.limit) || 12, 50));
  const allMemory = await listMemoryItems(userId, 750);

  return allMemory
    .filter(memory => !input.types?.length || input.types.includes(memory.type))
    .filter(memory => !input.entityType || memory.entityType === input.entityType)
    .filter(memory => !input.entityId || memory.entityId === input.entityId)
    .map(memory => {
      const haystack = [
        memory.title,
        memory.content,
        memory.type,
        memory.source,
        memory.entityType,
        memory.entityId,
        memory.tags.join(' ')
      ].join(' ').toLowerCase();

      const matches = terms.filter(term => includes(haystack, term));
      const titleHits = terms.filter(term => includes(memory.title.toLowerCase(), term)).length;
      const tagHits = terms.filter(term => memory.tags.some(tag => includes(tag.toLowerCase(), term))).length;
      const entityBoost = input.entityId && memory.entityId === input.entityId ? 3 : 0;
      const score = matches.length + titleHits * 1.5 + tagHits + entityBoost + memory.importance / 100;

      return {
        ...memory,
        score,
        matches,
        snippet: snippetFor(memory, terms)
      };
    })
    .filter(result => result.score > (terms.length ? 0.4 : 0))
    .sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
};

