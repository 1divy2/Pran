import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createWorker, submitIngestionJob } from "../../server/workers/ingestion-worker";
import type { IngestionJobRow } from "../../server/db/dal";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryFn = (sql: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number }>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProcessorFn = (job: IngestionJobRow, onProgress: (c: number, f: number) => Promise<void>) => Promise<void>;

describe("Ingestion Worker", () => {
  let mockQuery: ReturnType<typeof vi.fn>;
  let mockProcessor: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    mockProcessor = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a worker with default config", () => {
    const worker = createWorker(
      mockQuery as unknown as QueryFn,
      mockProcessor as unknown as ProcessorFn,
    );

    expect(worker.getStatus()).toBe("idle");
    expect(worker.getStats()).toEqual({
      processed: 0,
      failed: 0,
      activeJobs: 0,
      uptime: expect.any(Number),
    });
  });

  it("starts and stops the worker", () => {
    vi.useFakeTimers();
    const worker = createWorker(
      mockQuery as unknown as QueryFn,
      mockProcessor as unknown as ProcessorFn,
      { pollIntervalMs: 1000 },
    );

    worker.start();
    expect(worker.getStatus()).toBe("processing");

    worker.stop();
    expect(worker.getStatus()).toBe("stopped");

    vi.useRealTimers();
  });

  it("polls for pending jobs", async () => {
    vi.useFakeTimers();
    const worker = createWorker(
      mockQuery as unknown as QueryFn,
      mockProcessor as unknown as ProcessorFn,
      { pollIntervalMs: 100 },
    );

    // Mock pending jobs
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "job-1",
          status: "pending",
          queries: ["diabetes"],
          total: 0,
          completed: 0,
          failed: 0,
        },
      ],
      rowCount: 1,
    });

    // Mock update to running
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // Mock processor progress update
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // Mock update to completed
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    worker.start();

    // Trigger poll
    await vi.advanceTimersByTimeAsync(150);

    expect(mockProcessor).toHaveBeenCalled();

    worker.stop();
    vi.useRealTimers();
  });

  it("handles processor errors gracefully", async () => {
    vi.useFakeTimers();
    mockProcessor.mockRejectedValueOnce(new Error("Processing failed"));

    const worker = createWorker(
      mockQuery as unknown as QueryFn,
      mockProcessor as unknown as ProcessorFn,
      { pollIntervalMs: 100 },
    );

    // Mock pending job
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "job-2",
          status: "pending",
          queries: ["test"],
          total: 0,
          completed: 0,
          failed: 0,
        },
      ],
      rowCount: 1,
    });
    // Mock update to running
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // Mock update to failed
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    worker.start();
    await vi.advanceTimersByTimeAsync(150);

    const stats = worker.getStats();
    expect(stats.failed).toBe(1);

    worker.stop();
    vi.useRealTimers();
  });

  it("submits a new ingestion job", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const job = await submitIngestionJob(
      mockQuery as unknown as QueryFn,
      ["diabetes", "hypertension"],
    );

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO ingestion_jobs"),
      expect.arrayContaining([expect.stringContaining("job-")]),
    );
  });
});
