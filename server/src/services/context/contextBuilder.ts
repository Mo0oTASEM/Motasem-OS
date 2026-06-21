import { getDynamicIntegrationHealth } from '../integrations/integrationSettingsService.js';
import { searchMemory, type MemorySearchResult } from '../memoryService.js';
import type { AiCommandRequest, AiSource } from '../aiBrain/aiSchemas.js';
import type { CanonicalCollectionName, CanonicalRecord } from '../database/models.js';
import { repositoryFactory } from '../database/repositoryFactory.js';
import { resolveViewContext } from './viewContextMap.js';

export interface BuiltAiContext {
  userProfile: Record<string, unknown>;
  currentPage: {
    view: string;
    description: string;
  };
  selectedEntity?: {
    collection: CanonicalCollectionName;
    value: CanonicalRecord;
  };
  recent: Partial<Record<CanonicalCollectionName, CanonicalRecord[]>>;
  integrations: Record<string, unknown>;
  pendingApprovals: CanonicalRecord[];
  memorySnippets: MemorySearchResult[];
  sources: AiSource[];
}

const MAX_COLLECTION_ITEMS = 8;
const MAX_MEMORY_SNIPPETS = 6;

const compactRecord = (record: CanonicalRecord): CanonicalRecord => {
  const shallow = { ...record } as CanonicalRecord;
  if ('content' in shallow && typeof shallow.content === 'string' && shallow.content.length > 900) {
    shallow.content = `${shallow.content.slice(0, 900)}...`;
  }
  if ('notes' in shallow && typeof shallow.notes === 'string' && shallow.notes.length > 500) {
    shallow.notes = `${shallow.notes.slice(0, 500)}...`;
  }
  return shallow;
};

const readRecent = async (userId: string, collection: CanonicalCollectionName) => {
  const repository = repositoryFactory.forUserCollection(userId, collection);
  const records = await repository.list(MAX_COLLECTION_ITEMS);
  return records.filter(record => !record.deletedAt).map(compactRecord);
};

const readSelectedEntity = async (
  userId: string,
  collections: CanonicalCollectionName[],
  selectedEntityId?: string
): Promise<BuiltAiContext['selectedEntity']> => {
  if (!selectedEntityId) return undefined;

  for (const collection of collections) {
    const repository = repositoryFactory.forUserCollection(userId, collection);
    const record = await repository.read(selectedEntityId);
    if (record && !record.deletedAt) {
      return { collection, value: compactRecord(record) };
    }
  }

  return undefined;
};

export const buildAiContext = async (userId: string, request: AiCommandRequest): Promise<BuiltAiContext> => {
  const viewDefinition = resolveViewContext(request.currentView, request.message);
  const recentEntries = await Promise.allSettled(
    viewDefinition.collections.map(async collection => [collection, await readRecent(userId, collection)] as const)
  );

  const recent: BuiltAiContext['recent'] = {};
  recentEntries.forEach(entry => {
    if (entry.status === 'fulfilled') {
      const [collection, records] = entry.value;
      recent[collection] = records;
    }
  });

  const selectedEntity = await readSelectedEntity(userId, viewDefinition.collections, request.selectedEntityId);
  const memorySnippets = (await searchMemory(userId, request.message)).slice(0, MAX_MEMORY_SNIPPETS);
  const pendingApprovals = (recent.approvals || [])
    .filter(record => 'status' in record && (record.status === 'pending' || record.status === 'editing'))
    .slice(0, MAX_COLLECTION_ITEMS);

  const sources: AiSource[] = [
    ...Object.entries(recent).flatMap(([collection, records]) =>
      (records || []).slice(0, 3).map(record => ({
        type: 'canonical_record',
        collection,
        id: record.id,
        title: 'title' in record && typeof record.title === 'string'
          ? record.title
          : 'name' in record && typeof record.name === 'string'
            ? record.name
            : record.id
      }))
    ),
    ...memorySnippets.map(memory => ({
      type: 'memory_search',
      collection: 'memory_items',
      id: memory.id,
      title: memory.title
    }))
  ];

  return {
    userProfile: {
      userId,
      ...(typeof request.contextHints.userProfile === 'object' && request.contextHints.userProfile
        ? request.contextHints.userProfile as Record<string, unknown>
        : {})
    },
    currentPage: {
      view: viewDefinition.view,
      description: viewDefinition.description
    },
    selectedEntity,
    recent,
    integrations: await getDynamicIntegrationHealth(userId),
    pendingApprovals,
    memorySnippets,
    sources
  };
};
