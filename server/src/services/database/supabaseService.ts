import type { CanonicalCollectionName, CanonicalEntity } from './models.js';
import type { CanonicalRepository, CreateInput } from './repositoryTypes.js';
import { getSupabaseClientOrThrow } from '../supabaseClient.js';

const tableName = 'nova_records';
const nowIso = () => new Date().toISOString();
const generatedId = (collectionName: string) => `${collectionName}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;

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
    source: input.source || 'supabase',
    syncStatus: input.syncStatus || 'synced',
    externalIds: input.externalIds || {}
  } as T;
};

const rowToRecord = <T extends CanonicalEntity>(row: { id: string; payload: unknown }) => ({
  id: row.id,
  ...(row.payload as Record<string, unknown>)
}) as T;

const upsertRecord = async <T extends CanonicalEntity>(collectionName: CanonicalCollectionName, payload: T) => {
  const supabase = getSupabaseClientOrThrow();
  const { error } = await supabase.from(tableName).upsert({
    id: payload.id,
    user_id: payload.userId,
    collection_name: collectionName,
    payload,
    updated_at: payload.updatedAt
  }, { onConflict: 'user_id,collection_name,id' });
  if (error) throw error;
};

export const createSupabaseRepository = <T extends CanonicalEntity>(
  userId: string,
  collectionName: CanonicalCollectionName
): CanonicalRepository<T> => ({
  collectionName,

  async create(input) {
    const payload = hydrateCreate<T>(userId, collectionName, input);
    await upsertRecord(collectionName, payload);
    return payload;
  },

  async read(id) {
    const supabase = getSupabaseClientOrThrow();
    const { data, error } = await supabase
      .from(tableName)
      .select('id,payload')
      .eq('user_id', userId)
      .eq('collection_name', collectionName)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToRecord<T>(data) : null;
  },

  async update(id, updates) {
    const current = await this.read(id);
    if (!current) throw new Error(`Supabase ${collectionName} record not found: ${id}`);
    const payload = {
      ...current,
      ...updates,
      id,
      userId,
      updatedAt: nowIso()
    } as T;
    await upsertRecord(collectionName, payload);
    return payload;
  },

  async delete(id) {
    const deletedAt = nowIso();
    const current = await this.read(id);
    if (current) {
      await upsertRecord(collectionName, {
        ...current,
        deletedAt,
        syncStatus: 'pending',
        updatedAt: deletedAt
      } as T);
    }
    return { id, deletedAt };
  },

  async list(limit = 500) {
    const supabase = getSupabaseClientOrThrow();
    const { data, error } = await supabase
      .from(tableName)
      .select('id,payload')
      .eq('user_id', userId)
      .eq('collection_name', collectionName)
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(row => rowToRecord<T>(row));
  },

  async batchWrite(records) {
    const payloads = records.map(input => hydrateCreate<T>(userId, collectionName, input));
    const supabase = getSupabaseClientOrThrow();
    const { error } = await supabase.from(tableName).upsert(
      payloads.map(payload => ({
        id: payload.id,
        user_id: payload.userId,
        collection_name: collectionName,
        payload,
        updated_at: payload.updatedAt
      })),
      { onConflict: 'user_id,collection_name,id' }
    );
    if (error) throw error;
    return payloads;
  }
});
