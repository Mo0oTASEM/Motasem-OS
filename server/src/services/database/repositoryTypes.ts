import type { CanonicalCollectionName, CanonicalEntity } from './models.js';

export type CreateInput<T extends CanonicalEntity> = Partial<Omit<T, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> &
  Partial<Pick<T, 'userId' | 'createdAt' | 'updatedAt'>> & {
  id?: string;
};

export type UpdateInput<T extends CanonicalEntity> = Partial<Omit<T, 'id' | 'userId' | 'createdAt'>>;

export interface CanonicalRepository<T extends CanonicalEntity> {
  collectionName: CanonicalCollectionName;
  create(input: CreateInput<T>): Promise<T>;
  read(id: string): Promise<T | null>;
  update(id: string, updates: UpdateInput<T>): Promise<T>;
  delete(id: string): Promise<{ id: string; deletedAt: string }>;
  list(limit?: number): Promise<T[]>;
  batchWrite(records: Array<CreateInput<T>>): Promise<T[]>;
}
