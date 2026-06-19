// ─────────────────────────────────────────────────────────────────────────────
// In-memory + sessionStorage cache for API responses.
// TTL: 30 minutes. Keyed by a string cache key.
// ─────────────────────────────────────────────────────────────────────────────

const TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

// In-memory store (fastest, cleared on page refresh)
const memoryCache = new Map<string, CacheEntry<unknown>>();

function isExpired(entry: CacheEntry<unknown>): boolean {
  return Date.now() - entry.fetchedAt > TTL_MS;
}

export function cacheGet<T>(key: string): T | null {
  // Try memory first
  const mem = memoryCache.get(key);
  if (mem && !isExpired(mem)) return mem.data as T;

  // Try sessionStorage fallback
  try {
    const raw = sessionStorage.getItem(`pran:${key}`);
    if (raw) {
      const entry = JSON.parse(raw) as CacheEntry<T>;
      if (!isExpired(entry)) {
        // Restore to memory
        memoryCache.set(key, entry);
        return entry.data;
      }
      sessionStorage.removeItem(`pran:${key}`);
    }
  } catch {
    // sessionStorage unavailable (SSR, private mode, etc.)
  }

  return null;
}

export function cacheSet<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, fetchedAt: Date.now() };
  memoryCache.set(key, entry);

  try {
    sessionStorage.setItem(`pran:${key}`, JSON.stringify(entry));
  } catch {
    // Quota exceeded or unavailable — memory cache still works
  }
}

export function cacheKey(...parts: string[]): string {
  return parts.join(":").toLowerCase().replace(/\s+/g, "-");
}
