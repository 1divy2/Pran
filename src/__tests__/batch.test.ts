import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IngestionResult } from "@/lib/ingestion/types";

const mockIngestAll = vi.fn(
  async (query: { term: string; limit: number }): Promise<IngestionResult> => {
    await new Promise((r) => setTimeout(r, 5));
    return {
      sourceId: "test",
      items: [
        {
          id: `${query.term}-1`,
          title: `Evidence for ${query.term}`,
          tier: "rct" as const,
          year: 2024,
          sourceId: "pubmed",
          sourceName: "PubMed",
          authors: "Test Author",
          journal: "Test Journal",
          sampleSize: 100,
          effect: null,
          abstract: "Test abstract",
          url: "https://example.com",
          conditions: [query.term],
          interventions: [],
          status: null,
          rawMetadata: {},
          ingestedAt: new Date().toISOString(),
        },
      ],
      totalCount: 1,
      ingestedAt: new Date().toISOString(),
      warnings: [],
    };
  },
);

vi.mock("@/lib/ingestion/normalizer", () => ({
  ingestAll: (...args: unknown[]) => mockIngestAll(...(args as [{ term: string; limit: number }])),
}));

// Import AFTER mock setup
const { createBatchJob, executeBatch, batchIngest, summarizeBatch } =
  await import("@/lib/ingestion/batch");

describe("Batch Ingestion Pipeline", () => {
  beforeEach(() => {
    mockIngestAll.mockClear();
    mockIngestAll.mockImplementation(async (query: { term: string; limit: number }) => {
      await new Promise((r) => setTimeout(r, 5));
      return {
        sourceId: "test",
        items: [
          {
            id: `${query.term}-1`,
            title: `Evidence for ${query.term}`,
            tier: "rct" as const,
            year: 2024,
            sourceId: "pubmed",
            sourceName: "PubMed",
            authors: "Test Author",
            journal: "Test Journal",
            sampleSize: 100,
            effect: null,
            abstract: "Test abstract",
            url: "https://example.com",
            conditions: [query.term],
            interventions: [],
            status: null,
            rawMetadata: {},
            ingestedAt: new Date().toISOString(),
          },
        ],
        totalCount: 1,
        ingestedAt: new Date().toISOString(),
        warnings: [],
      };
    });
  });

  describe("createBatchJob", () => {
    it("creates a job with correct defaults", () => {
      const job = createBatchJob(["hypertension", "diabetes"]);
      expect(job.id).toMatch(/^batch-/);
      expect(job.queries).toEqual(["hypertension", "diabetes"]);
      expect(job.status).toBe("pending");
      expect(job.concurrency).toBe(3);
      expect(job.results.size).toBe(0);
      expect(job.errors.size).toBe(0);
    });

    it("accepts custom concurrency", () => {
      const job = createBatchJob(["a"], { concurrency: 5 });
      expect(job.concurrency).toBe(5);
    });

    it("does not mutate input queries", () => {
      const queries = ["a", "b"];
      const job = createBatchJob(queries);
      job.queries.push("c");
      expect(queries).toEqual(["a", "b"]);
    });
  });

  describe("executeBatch", () => {
    it("processes all queries", async () => {
      const job = createBatchJob(["hypertension", "diabetes", "asthma"]);
      await executeBatch(job, { limit: 5 });

      expect(job.status).toBe("completed");
      expect(job.results.size).toBe(3);
      expect(job.errors.size).toBe(0);
      expect(job.startedAt).toBeTypeOf("number");
      expect(job.completedAt).toBeTypeOf("number");
    });

    it("reports progress via callback", async () => {
      const calls: Array<{ total: number; percentComplete: number; currentQuery: string | null }> =
        [];
      const job = createBatchJob(["a", "b"], {
        onProgress: (p) => calls.push(p),
      });
      await executeBatch(job);

      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0].total).toBe(2);
      expect(calls[calls.length - 1].percentComplete).toBe(100);
    });

    it("respects concurrency limit", async () => {
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      mockIngestAll.mockImplementation(async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise((r) => setTimeout(r, 20));
        currentConcurrent--;
        return {
          sourceId: "test",
          items: [],
          totalCount: 0,
          ingestedAt: new Date().toISOString(),
          warnings: [],
        };
      });

      const job = createBatchJob(["a", "b", "c", "d", "e"], { concurrency: 2 });
      await executeBatch(job);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it("handles errors gracefully", async () => {
      mockIngestAll.mockImplementation(async (q: { term: string }) => {
        if (q.term === "fail") throw new Error("API failure");
        return {
          sourceId: "test",
          items: [],
          totalCount: 0,
          ingestedAt: new Date().toISOString(),
          warnings: [],
        };
      });

      const job = createBatchJob(["ok", "fail", "ok2"]);
      await executeBatch(job);

      expect(job.results.size).toBe(2);
      expect(job.errors.size).toBe(1);
      expect(job.errors.get("fail")?.message).toBe("API failure");
      expect(job.status).toBe("completed");
    });
  });

  describe("batchIngest", () => {
    it("returns results and timing", async () => {
      const { results, errors, elapsed } = await batchIngest(["a", "b"]);

      expect(results.length).toBe(2);
      expect(errors.size).toBe(0);
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("summarizeBatch", () => {
    it("computes summary statistics", async () => {
      const job = createBatchJob(["a", "b"]);
      await executeBatch(job);
      const summary = summarizeBatch(job);

      expect(summary.totalQueries).toBe(2);
      expect(summary.successful).toBe(2);
      expect(summary.failed).toBe(0);
      expect(summary.totalItems).toBe(2);
      expect(summary.avgItemsPerQuery).toBe(1);
      expect(summary.elapsed).toBeGreaterThanOrEqual(0);
    });

    it("counts items by source", async () => {
      const job = createBatchJob(["a"]);
      await executeBatch(job);
      const summary = summarizeBatch(job);

      expect(summary.bySource["pubmed"]).toBe(1);
    });
  });
});
