// ─────────────────────────────────────────────────────────────────────────────
// Retry utility — exponential backoff with configurable retries.
// Handles network errors, 429 (rate limit), and 5xx (server errors).
// ─────────────────────────────────────────────────────────────────────────────

export interface RetryOptions {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Base delay in ms (default: 1000) */
  baseDelay?: number;
  /** Max delay in ms (default: 30000) */
  maxDelay?: number;
  /** HTTP status codes to retry on (default: [429, 500, 502, 503, 504]) */
  retryableStatuses?: number[];
}

const DEFAULT_RETRYABLE = [429, 500, 502, 503, 504];

/**
 * Execute a fetch with automatic retry and exponential backoff.
 * Respects Retry-After headers from 429 responses.
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOpts?: RetryOptions,
): Promise<Response> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    retryableStatuses = DEFAULT_RETRYABLE,
  } = retryOpts ?? {};

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);

      // Success or non-retryable status
      if (res.ok || !retryableStatuses.includes(res.status)) {
        return res;
      }

      // 429 with Retry-After header
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : calculateDelay(attempt, baseDelay, maxDelay);
        await sleep(waitMs);
        continue;
      }

      // Other retryable status
      if (attempt < maxRetries) {
        const delay = calculateDelay(attempt, baseDelay, maxDelay);
        await sleep(delay);
        continue;
      }

      return res; // Return last response after max retries
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));

      if (attempt < maxRetries) {
        const delay = calculateDelay(attempt, baseDelay, maxDelay);
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError ?? new Error("Retry failed");
}

/**
 * Calculate exponential backoff delay with jitter.
 */
function calculateDelay(attempt: number, base: number, max: number): number {
  const exponential = base * Math.pow(2, attempt);
  const jitter = exponential * 0.1 * Math.random();
  return Math.min(max, exponential + jitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
