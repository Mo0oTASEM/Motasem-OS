import type { CanonicalCollectionName, CanonicalRecordByCollection } from './models.js';
import type { CanonicalRepository, CreateInput, UpdateInput } from './repositoryTypes.js';
import { createSupabaseRepository } from './supabaseService.js';
import { createLocalFallbackRepository } from './localFallbackStore.js';

const withFallback = <T extends CanonicalRecordByCollection[CanonicalCollectionName]>(
  primary: CanonicalRepository<T>,
  fallback: CanonicalRepository<T>
): CanonicalRepository<T> => ({
  collectionName: primary.collectionName,

  async create(input: CreateInput<T>) {
    try {
      return await primary.create(input);
    } catch {
      return fallback.create({ ...input, syncStatus: 'local_only' } as CreateInput<T>);
    }
  },

  async read(id: string) {
    try {
      return await primary.read(id);
    } catch {
      return fallback.read(id);
    }
  },

  async update(id: string, updates: UpdateInput<T>) {
    try {
      return await primary.update(id, updates);
    } catch {
      return fallback.update(id, { ...updates, syncStatus: 'local_only' } as UpdateInput<T>);
    }
  },

  async delete(id: string) {
    try {
      return await primary.delete(id);
    } catch {
      return fallback.delete(id);
    }
  },

  async list(limit?: number) {
    try {
      return await primary.list(limit);
    } catch {
      return fallback.list(limit);
    }
  },

  async batchWrite(records: Array<CreateInput<T>>) {
    try {
      return await primary.batchWrite(records);
    } catch {
      return fallback.batchWrite(records.map(record => ({ ...record, syncStatus: 'local_only' }) as CreateInput<T>));
    }
  }
});

export const repositoryFactory = {
  forUserCollection<K extends CanonicalCollectionName>(
    userId: string,
    collectionName: K
  ): CanonicalRepository<CanonicalRecordByCollection[K]> {
    return withFallback(
      createSupabaseRepository<CanonicalRecordByCollection[K]>(userId, collectionName),
      createLocalFallbackRepository<CanonicalRecordByCollection[K]>(userId, collectionName)
    );
  }
};

export type { CanonicalRepository } from './repositoryTypes.js';
