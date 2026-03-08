interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

const store = new Map<string, CacheEntry<unknown>>();

function isExpired(entry: CacheEntry<unknown>): boolean {
  if (entry.expiresAt === null) return false;
  return Date.now() > entry.expiresAt;
}

export const cache = {
  get<T>(key: string): T | undefined {
    const entry = store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (isExpired(entry)) {
      store.delete(key);
      return undefined;
    }
    return entry.value;
  },

  set<T>(key: string, value: T, ttlMs?: number): void {
    const expiresAt = ttlMs != null ? Date.now() + ttlMs : null;
    store.set(key, { value, expiresAt });
  },

  has(key: string): boolean {
    const entry = store.get(key);
    if (!entry) return false;
    if (isExpired(entry)) {
      store.delete(key);
      return false;
    }
    return true;
  },

  delete(key: string): void {
    store.delete(key);
  },

  clear(): void {
    store.clear();
  },
};

export function getAnswersCacheKey(institutionId: string, candidateId: string): string {
  return `answers:${institutionId}:${candidateId}`;
}

export function getCandidatesCacheKey(institutionId: string): string {
  return `candidates:${institutionId}`;
}
