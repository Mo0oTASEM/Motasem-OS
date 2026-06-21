import { localDevStore } from './localDevStore.js';
import { supabaseStore } from './supabaseStore.js';

export const userDocumentStore = {
  async readUserDoc<T>(userId: string, collectionName: string, docId: string) {
    try {
      return await supabaseStore.readUserDoc<T>(userId, collectionName, docId);
    } catch {
      return localDevStore.readUserDoc<T>(userId, collectionName, docId);
    }
  },

  async writeUserDoc(userId: string, collectionName: string, docId: string, payload: unknown) {
    try {
      await supabaseStore.writeUserDoc(userId, collectionName, docId, payload);
    } catch {
      await localDevStore.writeUserDoc(userId, collectionName, docId, payload);
    }
  },

  async listUserCollection<T>(userId: string, collectionName: string, limit = 500) {
    try {
      return await supabaseStore.listUserCollection<T>(userId, collectionName, limit);
    } catch {
      const records = await localDevStore.listUserCollection<T>(userId, collectionName);
      return records.slice(0, limit);
    }
  },

  async addUserDoc<T extends Record<string, unknown>>(userId: string, collectionName: string, payload: T) {
    try {
      return await supabaseStore.addUserDoc(userId, collectionName, payload);
    } catch {
      const docId = String(payload.id || `${collectionName}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`);
      const next = { ...payload, id: docId };
      await localDevStore.writeUserDoc(userId, collectionName, docId, next);
      return next as T & { id: string };
    }
  }
};
