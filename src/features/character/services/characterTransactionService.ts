export interface CharacterTransaction {
  id: string;
  userId: string;
  type: string;
  status: 'pending' | 'committed' | 'rolled_back';
  entities: Record<string, unknown>;
  createdAt: string;
  completedAt: string | null;
}

export interface TransactionResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export function createTransaction(
  userId: string,
  type: string,
  entities: Record<string, unknown>,
): CharacterTransaction {
  return {
    id: crypto.randomUUID(),
    userId,
    type,
    status: 'pending',
    entities,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}

export async function executeTransaction<T>(
  transaction: CharacterTransaction,
  operation: () => Promise<T>,
): Promise<TransactionResult<T>> {
  try {
    const data = await operation();
    transaction.status = 'committed';
    transaction.completedAt = new Date().toISOString();
    return { success: true, data, error: null };
  } catch (err) {
    transaction.status = 'rolled_back';
    transaction.completedAt = new Date().toISOString();
    return { success: false, data: null, error: (err as Error).message };
  }
}
