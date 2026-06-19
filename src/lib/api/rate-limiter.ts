// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiter — token bucket implementation with usage statistics.
// Each source gets its own bucket with configurable tokens-per-second.
// Tracks request counts, wait times, and error rates for the dashboard.
// ─────────────────────────────────────────────────────────────────────────────

interface TokenBucket {
  tokens: number;
  maxTokens: number;
  refillRate: number;
  lastRefill: number;
}

export interface RateLimitStats {
  sourceId: string;
  totalRequests: number;
  throttledRequests: number;
  totalWaitMs: number;
  avgWaitMs: number;
  currentTokens: number;
  maxTokens: number;
  refillRate: number;
  lastRequestAt: number | null;
  errorCount: number;
}

interface SourceStats {
  totalRequests: number;
  throttledRequests: number;
  totalWaitMs: number;
  lastRequestAt: number | null;
  errorCount: number;
}

const buckets = new Map<string, TokenBucket>();
const stats = new Map<string, SourceStats>();

function getSourceStats(sourceId: string): SourceStats {
  let s = stats.get(sourceId);
  if (!s) {
    s = {
      totalRequests: 0,
      throttledRequests: 0,
      totalWaitMs: 0,
      lastRequestAt: null,
      errorCount: 0,
    };
    stats.set(sourceId, s);
  }
  return s;
}

/**
 * Configure a rate limiter for a specific source.
 */
export function configureRateLimit(
  sourceId: string,
  requestsPerSecond: number,
  burstSize?: number,
): void {
  const max = burstSize ?? requestsPerSecond;
  buckets.set(sourceId, {
    tokens: max,
    maxTokens: max,
    refillRate: requestsPerSecond,
    lastRefill: Date.now(),
  });
}

/**
 * Wait for a token to become available.
 * Returns a promise that resolves when the request can proceed.
 */
export async function waitForToken(sourceId: string): Promise<void> {
  let bucket = buckets.get(sourceId);
  const s = getSourceStats(sourceId);
  s.totalRequests++;
  s.lastRequestAt = Date.now();

  if (!bucket) {
    configureRateLimit(sourceId, 3);
    bucket = buckets.get(sourceId)!;
  }

  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + elapsed * bucket.refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return;
  }

  s.throttledRequests++;
  const waitTime = ((1 - bucket.tokens) / bucket.refillRate) * 1000;
  s.totalWaitMs += waitTime;
  await new Promise((resolve) => setTimeout(resolve, waitTime));

  bucket.tokens = 0;
  bucket.lastRefill = Date.now();
}

/**
 * Record a request error for a source.
 */
export function recordRequestError(sourceId: string): void {
  getSourceStats(sourceId).errorCount++;
}

/**
 * Reset a source's rate limiter.
 */
export function resetRateLimit(sourceId: string): void {
  buckets.delete(sourceId);
}

/**
 * Get stats for a specific source.
 */
export function getSourceRateLimitStats(sourceId: string): RateLimitStats {
  const bucket = buckets.get(sourceId);
  const s = getSourceStats(sourceId);

  return {
    sourceId,
    totalRequests: s.totalRequests,
    throttledRequests: s.throttledRequests,
    totalWaitMs: Math.round(s.totalWaitMs),
    avgWaitMs: s.throttledRequests > 0 ? Math.round(s.totalWaitMs / s.throttledRequests) : 0,
    currentTokens: bucket ? Math.round(bucket.tokens * 10) / 10 : 0,
    maxTokens: bucket?.maxTokens ?? 0,
    refillRate: bucket?.refillRate ?? 0,
    lastRequestAt: s.lastRequestAt,
    errorCount: s.errorCount,
  };
}

/**
 * Get stats for all configured sources.
 */
export function getAllRateLimitStats(): RateLimitStats[] {
  const sourceIds = new Set([...buckets.keys(), ...stats.keys()]);
  return [...sourceIds].map(getSourceRateLimitStats);
}

/**
 * Reset all stats (e.g., for a fresh session).
 */
export function resetAllStats(): void {
  stats.clear();
  buckets.clear();
}
