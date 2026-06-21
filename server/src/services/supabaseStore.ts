import { getSupabaseClientOrThrow } from './supabaseClient.js';

const tableName = 'nova_user_docs';

export const supabaseStore = {
  async readUserDoc<T>(userId: string, collectionName: string, docId: string) {
    const supabase = getSupabaseClientOrThrow();
    const { data, error } = await supabase
      .from(tableName)
      .select('payload')
      .eq('user_id', userId)
      .eq('collection_name', collectionName)
      .eq('doc_id', docId)
      .maybeSingle();
    if (error) throw error;
    return data?.payload as T | null;
  },

  async writeUserDoc(userId: string, collectionName: string, docId: string, payload: unknown) {
    const supabase = getSupabaseClientOrThrow();
    const { error } = await supabase.from(tableName).upsert({
      user_id: userId,
      collection_name: collectionName,
      doc_id: docId,
      payload,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,collection_name,doc_id' });
    if (error) throw error;
  },

  async listUserCollection<T>(userId: string, collectionName: string, limit = 500) {
    const supabase = getSupabaseClientOrThrow();
    const { data, error } = await supabase
      .from(tableName)
      .select('doc_id,payload')
      .eq('user_id', userId)
      .eq('collection_name', collectionName)
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(row => ({ id: row.doc_id, ...(row.payload as Record<string, unknown>) })) as Array<T & { id: string }>;
  },

  async addUserDoc<T extends Record<string, unknown>>(userId: string, collectionName: string, payload: T) {
    const docId = String(payload.id || `${collectionName}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`);
    const next = { ...payload, id: docId };
    await this.writeUserDoc(userId, collectionName, docId, next);
    return next as T & { id: string };
  }
};
