import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'ds_cache:';

interface CacheEntry<T> {
  data: T;
  ts: number;
}

/**
 * Fetch with a simple AsyncStorage-backed TTL cache.
 * Returns cached data if fresh, otherwise calls fetchFn and stores result.
 */
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs: number,
): Promise<T> {
  const cacheKey = `${CACHE_PREFIX}${key}`;

  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (raw) {
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() - entry.ts < ttlMs) {
        return entry.data;
      }
    }
  } catch {
    // Cache miss — continue to fetch.
  }

  const data = await fetchFn();

  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Write failure is non-critical.
  }

  return data;
}

/** Remove a single cached key so the next getCached call will re-fetch. */
export async function invalidateCache(key: string): Promise<void> {
  await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`).catch(() => {});
}

/** Wipe every cache entry (useful on app reset / logout). */
export async function clearAllCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // Non-critical.
  }
}
