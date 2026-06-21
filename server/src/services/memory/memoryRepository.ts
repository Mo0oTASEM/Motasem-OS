import { userDocumentStore } from '../userDocumentStore.js';

export const durableMemoryTypes = [
  'user_preference',
  'project_summary',
  'goal_update',
  'crm_note',
  'finance_summary',
  'content_idea',
  'portfolio_note',
  'decision',
  'journal_reflection'
] as const;

export type DurableMemoryType = typeof durableMemoryTypes[number];

export interface DurableMemoryItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: DurableMemoryType;
  tags: string[];
  source: string;
  entityType?: string;
  entityId?: string;
  importance: number;
  createdAt: string;
  updatedAt: string;
  embeddingVector?: number[];
  externalIds?: Record<string, string>;
  deletedAt?: string | null;
}

export interface MemoryWriteInput {
  id?: string;
  title?: unknown;
  content?: unknown;
  type?: unknown;
  tags?: unknown;
  source?: unknown;
  entityType?: unknown;
  entityId?: unknown;
  importance?: unknown;
  embeddingVector?: unknown;
  externalIds?: unknown;
  sourceId?: unknown;
  importanceScore?: unknown;
  aiSummary?: unknown;
  relatedEntityIds?: unknown;
}

const collectionName = 'memory_items';

const legacyTypeMap: Record<string, DurableMemoryType> = {
  note: 'decision',
  knowledge: 'decision',
  client_conversation: 'crm_note',
  client: 'crm_note',
  project: 'project_summary',
  goal: 'goal_update',
  finance: 'finance_summary',
  content: 'content_idea',
  portfolio: 'portfolio_note',
  journal: 'journal_reflection',
  preference: 'user_preference'
};

const secretPatterns: RegExp[] = [
  /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|authorization|bearer)\b\s*[:=]\s*[^\s,;]+/gi,
  /\bya29\.[A-Za-z0-9._-]+/g,
  /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\bghp_[A-Za-z0-9_]{20,}\b/g
];

export const redactSensitiveText = (value: unknown) => {
  let text = String(value ?? '');
  for (const pattern of secretPatterns) {
    text = text.replace(pattern, '[redacted-secret]');
  }
  return text.slice(0, 12000);
};

const cleanId = (value?: unknown) =>
  String(value || `memory-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`).replace(/[^a-zA-Z0-9_-]/g, '-');

const asTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(item => redactSensitiveText(item).trim()).filter(Boolean).slice(0, 24);
  }
  if (typeof value === 'string') {
    return value.split(',').map(item => redactSensitiveText(item).trim()).filter(Boolean).slice(0, 24);
  }
  return [];
};

const asImportance = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 50;
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

export const normalizeMemoryType = (value: unknown): DurableMemoryType => {
  const raw = String(value || '').trim().toLowerCase();
  if ((durableMemoryTypes as readonly string[]).includes(raw)) return raw as DurableMemoryType;
  return legacyTypeMap[raw] || 'decision';
};

const normalizeEmbedding = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;
  const vector = value.map(Number).filter(Number.isFinite).slice(0, 2048);
  return vector.length ? vector : undefined;
};

const normalizeExternalIds = (input: MemoryWriteInput, existing?: DurableMemoryItem | null) => {
  const fromInput = input.externalIds && typeof input.externalIds === 'object' && !Array.isArray(input.externalIds)
    ? input.externalIds as Record<string, unknown>
    : {};
  const fromExisting = existing?.externalIds || {};
  const externalIds = Object.fromEntries(
    Object.entries({ ...fromExisting, ...fromInput })
      .map(([key, value]) => [redactSensitiveText(key), redactSensitiveText(value)])
      .filter(([key, value]) => key && value)
  );
  if (input.sourceId) externalIds.sourceId = redactSensitiveText(input.sourceId);
  return externalIds;
};

const normalizeMemoryInput = (
  userId: string,
  input: MemoryWriteInput,
  existing?: DurableMemoryItem | null
): DurableMemoryItem => {
  const now = new Date().toISOString();
  const title = redactSensitiveText(input.title || existing?.title || 'Untitled memory').trim() || 'Untitled memory';
  const content = redactSensitiveText(input.content || input.aiSummary || existing?.content || '').trim();
  const importance = input.importance ?? input.importanceScore ?? existing?.importance ?? 50;

  return {
    id: existing?.id || cleanId(input.id),
    userId,
    title,
    content,
    type: normalizeMemoryType(input.type || existing?.type),
    tags: asTags(input.tags || existing?.tags),
    source: redactSensitiveText(input.source || existing?.source || 'manual').trim() || 'manual',
    entityType: input.entityType ? redactSensitiveText(input.entityType).trim() : existing?.entityType,
    entityId: input.entityId ? redactSensitiveText(input.entityId).trim() : existing?.entityId,
    importance: asImportance(importance),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    embeddingVector: normalizeEmbedding(input.embeddingVector) || existing?.embeddingVector,
    externalIds: normalizeExternalIds(input, existing),
    deletedAt: existing?.deletedAt || null
  };
};

const readLocalMemory = async (userId: string, id: string) =>
  userDocumentStore.readUserDoc<DurableMemoryItem>(userId, collectionName, id);

const writeLocalMemory = async (userId: string, memory: DurableMemoryItem) => {
  await userDocumentStore.writeUserDoc(userId, collectionName, memory.id, memory);
  return memory;
};

export const createMemoryItem = async (userId: string, input: MemoryWriteInput) => {
  const memory = normalizeMemoryInput(userId, input);
  return writeLocalMemory(userId, memory);
};

export const readMemoryItem = async (userId: string, id: string) => {
  return readLocalMemory(userId, id);
};

export const updateMemoryItem = async (userId: string, id: string, updates: MemoryWriteInput) => {
  const existing = await readMemoryItem(userId, id);
  if (!existing || existing.deletedAt) throw new Error('Memory item not found.');
  const memory = normalizeMemoryInput(userId, { ...updates, id }, existing);
  return writeLocalMemory(userId, memory);
};

export const deleteMemoryItem = async (userId: string, id: string) => {
  const existing = await readMemoryItem(userId, id);
  if (!existing) throw new Error('Memory item not found.');
  const deletedAt = new Date().toISOString();
  const payload = { ...existing, deletedAt, updatedAt: deletedAt };
  await writeLocalMemory(userId, payload);
  return { id, deletedAt };
};

export const listMemoryItems = async (userId: string, limit = 500) => {
  const docs = await userDocumentStore.listUserCollection<DurableMemoryItem>(userId, collectionName, limit);
  return docs.filter(item => !item.deletedAt).slice(0, limit);
};
