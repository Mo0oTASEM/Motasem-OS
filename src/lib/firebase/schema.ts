export const firestoreCollections = [
  'memory_items',
  'memory_edges',
  'tasks',
  'calendar_events',
  'goals',
  'projects',
  'clients',
  'finance_entries',
  'journal_entries',
  'health_entries',
  'opportunities',
  'time_blocks',
  'agent_runs',
  'sync_state'
] as const;

export type FirestoreCollection = typeof firestoreCollections[number];

export const userScopedPath = (userId: string, collection: FirestoreCollection) =>
  `users/${userId}/${collection}`;
