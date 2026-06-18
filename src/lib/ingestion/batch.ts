// ─────────────────────────────────────────────────────────────────────────────
// Batch Ingestion Pipeline — processes multiple queries concurrently
// with configurable concurrency, progress tracking, and error resilience.
// Useful for bulk data pulls, multi-topic analysis, and background ingestion.
// ─────────────────────────────────────────────────────────────────────────────

import type { IngestionQuery, IngestionResult } from "./types";
import { ingestAll } from "./normalizer";

export interface BatchJob {
  id: string;
  queries: string[];
  status: "pending" | "running" | "completed" | "failed";
  concurrency: number;
  results: Map<string, IngestionResult>;
  errors: Map<string, Error>;
  startedAt: number | null;
  completedAt: number | null;
  onProgress?: (progress: BatchProgress) => void;
}

export interface BatchProgress {
  jobId: string;
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
  percentComplete: number;
  currentQuery: string | null;
  elapsed: number;
}

interface BatchOptions {
  /** Max concurrent requests (default: 3) */
  concurrency?: number;
  /** Max results per query (default: 10) */
  limit?: number;
  /** Progress callback */
  onProgress?: (progress: BatchProgress) => void;
}

let jobCounter = 0;

/**
 * Create a batch job for multiple queries.
 * Returns a BatchJob that can be awaited or monitored.
 */
export function createBatchJob(queries: string[], options: BatchOptions = {}): BatchJob {
  const id = `batch-${Date.now()}-${++jobCounter}`;
  return {
    id,
    queries: [...queries],
    status: "pending",
    concurrency: options.concurrency ?? 3,
    results: new Map(),
    errors: new Map(),
    startedAt: null,
    completedAt: null,
    onProgress: options.onProgress,
  };
}

/**
 * Execute a batch job. Processes queries with concurrency control.
 * Returns the job with all results populated.
 */
export async function executeBatch(job: BatchJob, options: BatchOptions = {}): Promise<BatchJob> {
  const limit = options.limit ?? 10;
  job.status = "running";
  job.startedAt = Date.now();

  const queue = [...job.queries];
  const running = new Set<Promise<void>>();
  let completed = 0;
  let failed = 0;

  const reportProgress = (currentQuery: string | null) => {
    job.onProgress?.({
      jobId: job.id,
      total: job.queries.length,
      completed,
      failed,
      running: running.size,
      pending: queue.length,
      percentComplete: Math.round(((completed + failed) / job.queries.length) * 100),
      currentQuery,
      elapsed: Date.now() - (job.startedAt ?? Date.now()),
    });
  };

  const processQuery = async (query: string) => {
    reportProgress(query);
    try {
      const result = await ingestAll({ term: query, limit });
      job.results.set(query, result);
      completed++;
    } catch (error) {
      job.errors.set(query, error instanceof Error ? error : new Error(String(error)));
      failed++;
    }
    reportProgress(null);
  };

  // Process queue with concurrency control
  while (queue.length > 0 || running.size > 0) {
    // Fill up to concurrency limit
    while (running.size < job.concurrency && queue.length > 0) {
      const query = queue.shift()!;
      const promise = processQuery(query).then(() => {
        running.delete(promise);
      });
      running.add(promise);
    }

    // Wait for at least one to finish
    if (running.size > 0) {
      await Promise.race(running);
    }
  }

  job.status = job.errors.size === job.queries.length ? "failed" : "completed";
  job.completedAt = Date.now();
  reportProgress(null);

  return job;
}

/**
 * Execute a batch job and return results as a flat array.
 */
export async function batchIngest(
  queries: string[],
  options: BatchOptions = {},
): Promise<{
  results: IngestionResult[];
  errors: Map<string, Error>;
  elapsed: number;
}> {
  const job = createBatchJob(queries, options);
  const start = Date.now();
  await executeBatch(job, options);

  return {
    results: Array.from(job.results.values()),
    errors: job.errors,
    elapsed: Date.now() - start,
  };
}

/**
 * Get a summary of batch job results.
 */
export function summarizeBatch(job: BatchJob): {
  totalQueries: number;
  successful: number;
  failed: number;
  totalItems: number;
  bySource: Record<string, number>;
  avgItemsPerQuery: number;
  elapsed: number;
} {
  let totalItems = 0;
  const bySource: Record<string, number> = {};

  for (const result of job.results.values()) {
    totalItems += result.items.length;
    for (const item of result.items) {
      bySource[item.sourceId] = (bySource[item.sourceId] || 0) + 1;
    }
  }

  const successful = job.results.size;
  return {
    totalQueries: job.queries.length,
    successful,
    failed: job.errors.size,
    totalItems,
    bySource,
    avgItemsPerQuery: successful > 0 ? Math.round(totalItems / successful) : 0,
    elapsed: (job.completedAt ?? Date.now()) - (job.startedAt ?? Date.now()),
  };
}
