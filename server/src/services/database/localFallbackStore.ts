import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { CanonicalCollectionName, CanonicalEntity } from './models.js';
import type { CanonicalRepository, CreateInput } from './repositoryTypes.js';

const dataDir = join(process.cwd(), '.nova-local', 'canonical');
const nowIso = () => new Date().toISOString();
const generatedId = (collectionName: string) => `${collectionName}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;

const readJson = async <T>(path: string): Promise<T | null> => {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return null;
  }
};

const writeJson = async (path: string, payload: unknown) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(payload, null, 2), 'utf8');
};

const docPath = (userId: string, collectionName: CanonicalCollectionName, id: string) =>
  join(dataDir, userId, collectionName, `${id}.json`);

const hydrateCreate = <T extends CanonicalEntity>(
  userId: string,
  collectionName: CanonicalCollectionName,
  input: CreateInput<T>
): T => {
  const now = nowIso();
  return {
    ...input,
    id: input.id || generatedId(collectionName),
    userId,
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : now,
    updatedAt: now,
    source: input.source || 'localStorage',
    syncStatus: input.syncStatus || 'local_only',
    externalIds: input.externalIds || {}
  } as T;
};

export const createLocalFallbackRepository = <T extends CanonicalEntity>(
  userId: string,
  collectionName: CanonicalCollectionName
): CanonicalRepository<T> => ({
  collectionName,

  async create(input) {
    const payload = hydrateCreate<T>(userId, collectionName, input);
    await writeJson(docPath(userId, collectionName, payload.id), payload);
    return payload;
  },

  async read(id) {
    return readJson<T>(docPath(userId, collectionName, id));
  },

  async update(id, updates) {
    const current = await readJson<T>(docPath(userId, collectionName, id));
    if (!current) throw new Error(`Local ${collectionName} record not found: ${id}`);
    const payload = {
      ...current,
      ...updates,
      id,
      userId,
      updatedAt: nowIso()
    } as T;
    await writeJson(docPath(userId, collectionName, id), payload);
    return payload;
  },

  async delete(id) {
    const deletedAt = nowIso();
    const current = await readJson<T>(docPath(userId, collectionName, id));
    if (current) {
      await writeJson(docPath(userId, collectionName, id), {
        ...current,
        deletedAt,
        syncStatus: 'local_only',
        updatedAt: deletedAt
      });
    } else {
      await rm(docPath(userId, collectionName, id), { force: true });
    }
    return { id, deletedAt };
  },

  async list(limit = 500) {
    const collectionDir = join(dataDir, userId, collectionName);
    try {
      const files = await readdir(collectionDir);
      const records: T[] = [];
      for (const file of files.filter(item => item.endsWith('.json')).slice(0, limit)) {
        const record = await readJson<T>(join(collectionDir, file));
        if (record) records.push(record);
      }
      return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch {
      return [];
    }
  },

  async batchWrite(records) {
    const payloads = records.map(input => hydrateCreate<T>(userId, collectionName, input));
    await Promise.all(payloads.map(payload => writeJson(docPath(userId, collectionName, payload.id), payload)));
    return payloads;
  }
});
