import { describe, it, expect } from "vitest";
import {
  getAdapter,
  getAllAdapters,
  getFreeAdapters,
  healthCheckAll,
} from "@/lib/ingestion/registry";
import type { DataSourceAdapter } from "@/lib/ingestion/adapter";
import type { NormalizedEvidence, IngestionResult, IngestionQuery } from "@/lib/ingestion/types";

// ─────────────────────────────────────────────────────────────────────────────
// Registry tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Adapter Registry", () => {
  it("has all built-in adapters registered", () => {
    const adapters = getAllAdapters();
    expect(adapters.length).toBe(6);
  });

  it("retrieves PubMed adapter by ID", () => {
    const adapter = getAdapter("pubmed");
    expect(adapter).toBeDefined();
    expect(adapter?.id).toBe("pubmed");
    expect(adapter?.name).toContain("PubMed");
  });

  it("retrieves ClinicalTrials adapter by ID", () => {
    const adapter = getAdapter("clinicaltrials");
    expect(adapter).toBeDefined();
    expect(adapter?.id).toBe("clinicaltrials");
    expect(adapter?.name).toContain("ClinicalTrials");
  });

  it("retrieves OpenFDA adapter by ID", () => {
    const adapter = getAdapter("openfda");
    expect(adapter).toBeDefined();
    expect(adapter?.id).toBe("openfda");
    expect(adapter?.name).toContain("OpenFDA");
  });

  it("returns undefined for unknown adapter", () => {
    const adapter = getAdapter("nonexistent");
    expect(adapter).toBeUndefined();
  });

  it("returns only free adapters", () => {
    const free = getFreeAdapters();
    expect(free.length).toBe(6); // All built-in adapters are free
    for (const adapter of free) {
      expect(adapter.requiresApiKey).toBe(false);
    }
  });

  it("each adapter has required interface methods", () => {
    const adapters = getAllAdapters();
    for (const adapter of adapters) {
      expect(typeof adapter.search).toBe("function");
      expect(typeof adapter.fetchById).toBe("function");
      expect(typeof adapter.healthCheck).toBe("function");
      expect(adapter.id).toBeTruthy();
      expect(adapter.name).toBeTruthy();
      expect(adapter.baseUrl).toBeTruthy();
      expect(adapter.rateLimit).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Type tests — verify interfaces are correctly shaped
// ─────────────────────────────────────────────────────────────────────────────

describe("Ingestion Types", () => {
  it("NormalizedEvidence has all required fields", () => {
    const evidence: NormalizedEvidence = {
      id: "test-id",
      title: "Test Title",
      tier: "rct",
      year: 2024,
      sourceId: "pubmed",
      sourceName: "PubMed",
      authors: "Author 1; Author 2",
      journal: "Test Journal",
      sampleSize: 100,
      effect: "Positive outcome",
      abstract: "Abstract text",
      url: "https://example.com",
      conditions: ["diabetes"],
      interventions: ["metformin"],
      status: "COMPLETED",
      rawMetadata: {},
      ingestedAt: "2024-01-01T00:00:00.000Z",
    };

    expect(evidence.id).toBe("test-id");
    expect(evidence.tier).toBe("rct");
    expect(evidence.conditions).toContain("diabetes");
  });

  it("IngestionResult has all required fields", () => {
    const result: IngestionResult = {
      sourceId: "pubmed",
      items: [],
      totalCount: 0,
      ingestedAt: "2024-01-01T00:00:00.000Z",
      warnings: [],
    };

    expect(result.sourceId).toBe("pubmed");
    expect(result.items).toEqual([]);
  });

  it("IngestionQuery has all required fields", () => {
    const query: IngestionQuery = {
      term: "hypertension",
      limit: 10,
    };

    expect(query.term).toBe("hypertension");
    expect(query.limit).toBe(10);
  });
});
