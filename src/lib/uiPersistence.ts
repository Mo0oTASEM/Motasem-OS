import { useEffect, useState } from 'react';

type StorageTarget = 'local' | 'session';

const storageFor = (target: StorageTarget) => target === 'session' ? window.sessionStorage : window.localStorage;

export const readStoredJson = <T,>(key: string, fallback: T, target: StorageTarget = 'local'): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = storageFor(target).getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
};

export const writeStoredJson = (key: string, value: unknown, target: StorageTarget = 'local') => {
  if (typeof window === 'undefined') return;
  try {
    storageFor(target).setItem(key, JSON.stringify(value));
  } catch {
    // Storage can fail in private browsing or full quota states. UI should keep working.
  }
};

export const readStoredValue = <T,>(key: string, fallback: T, target: StorageTarget = 'local'): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = storageFor(target).getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
        fallback && typeof fallback === 'object' && !Array.isArray(fallback)) {
      return { ...fallback, ...parsed } as unknown as T;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
};

export const usePersistentState = <T,>(key: string, initialValue: T, target: StorageTarget = 'local') => {
  const [value, setValue] = useState<T>(() => readStoredValue(key, initialValue, target));

  useEffect(() => {
    writeStoredJson(key, value, target);
  }, [key, target, value]);

  return [value, setValue] as const;
};
