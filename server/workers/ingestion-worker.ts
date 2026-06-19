// ─────────────────────────────────────────────────────────────────────────────
// Background Worker — processes ingestion jobs asynchronously.
// Polls for pending jobs and executes them with concurrency control.
// ─────────────────────────────────────────────────────────────────────────────

import type { QueryFunction } from "../db/dal";
import {
  createIngestionJob,
  updateIngestionJob,
  type IngestionJobRow,
} from "../db/dal";

export type WorkerStatus = "idle" | "processing" | "stopped";

export interface WorkerConfig {
  pollIntervalMs: number;
  maxConcurrent: number;
  retryAttempts: number;
  retryDelayMs: number;
}

const DEFAULT_CONFIG: WorkerConfig = {
  pollIntervalMs: 5000,
  maxConcurrent: 3,
  retryAttempts: 3,
  retryDelayMs: 1000,
};

export interface Worker {
  start(): void;
  stop(): void;
  getStatus(): WorkerStatus;
  getStats(): WorkerStats;
}

export interface WorkerStats {
  processed: number;
  failed: number;
  activeJobs: number;
  uptime: number;
}

export type JobProcessor = (
  job: IngestionJobRow,
  onProgress: (completed: number, failed: number) => Promise<void>,
) => Promise<void>;

export function createWorker(
  query: QueryFunction,
  processor: JobProcessor,
  config: Partial<WorkerConfig> = {},
): Worker {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  let status: WorkerStatus = "idle";
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let startTime = Date.now();
  let stats = { processed: 0, failed: 0, activeJobs: 0 };

  async function poll(): Promise<void> {
    if (status !== "processing") return;

    try {
      // Find pending jobs
      const result = await query(
        `SELECT * FROM ingestion_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT $1`,
        [cfg.maxConcurrent - stats.activeJobs],
      );

      const jobs = result.rows as IngestionJobRow[];
      if (jobs.length === 0) return;

      // Process each job
      const promises = jobs.map(async (job) => {
        stats.activeJobs++;
        try {
          await updateIngestionJob(query, job.id, {
            status: "running",
            started_at: new Date().toISOString(),
          });

          await processor(job, async (completed, failed) => {
            await updateIngestionJob(query, job.id, { completed, failed });
          });

          await updateIngestionJob(query, job.id, {
            status: "completed",
            completed_at: new Date().toISOString(),
          });
          stats.processed++;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          await updateIngestionJob(query, job.id, {
            status: "failed",
            error_message: message,
            completed_at: new Date().toISOString(),
          });
          stats.failed++;
        } finally {
          stats.activeJobs--;
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      console.error("Worker poll error:", error);
    }
  }

  return {
    start() {
      if (intervalId) return;
      status = "processing";
      startTime = Date.now();
      intervalId = setInterval(poll, cfg.pollIntervalMs);
      console.log("Worker started");
    },

    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      status = "stopped";
      console.log("Worker stopped");
    },

    getStatus() {
      return status;
    },

    getStats() {
      return {
        ...stats,
        uptime: Date.now() - startTime,
      };
    },
  };
}

// ─── Job Factory ─────────────────────────────────────────────────────────────

export async function submitIngestionJob(
  query: QueryFunction,
  queries: string[],
): Promise<IngestionJobRow> {
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return createIngestionJob(query, { id, queries });
}

export async function getJobStatus(
  query: QueryFunction,
  jobId: string,
): Promise<IngestionJobRow | null> {
  const result = await query(
    "SELECT * FROM ingestion_jobs WHERE id = $1",
    [jobId],
  );
  return (result.rows[0] as IngestionJobRow) ?? null;
}

export async function listRecentJobs(
  query: QueryFunction,
  limit: number = 20,
): Promise<IngestionJobRow[]> {
  const result = await query(
    "SELECT * FROM ingestion_jobs ORDER BY created_at DESC LIMIT $1",
    [limit],
  );
  return result.rows as IngestionJobRow[];
}
