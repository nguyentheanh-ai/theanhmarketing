type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type AdminCacheMap = Map<string, CacheEntry<unknown>>;

declare global {
  var __tamAdminDataCache: AdminCacheMap | undefined;
}

const adminDataCache = globalThis.__tamAdminDataCache ?? new Map<string, CacheEntry<unknown>>();

globalThis.__tamAdminDataCache = adminDataCache;

export async function readAdminDataCache<T>(
  key: string,
  load: () => Promise<T>,
  ttlMs = 30_000,
): Promise<T> {
  const now = Date.now();
  const cached = adminDataCache.get(key) as CacheEntry<T> | undefined;

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = await load();
  adminDataCache.set(key, {
    expiresAt: now + ttlMs,
    value,
  });

  return value;
}

export function invalidateAdminDataCache(keys?: string[]) {
  if (!keys) {
    adminDataCache.clear();
    return;
  }

  for (const key of keys) {
    adminDataCache.delete(key);
  }
}
