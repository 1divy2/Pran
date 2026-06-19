// ─────────────────────────────────────────────────────────────────────────────
// DataSourceAdapter — interface for data source ingestion adapters.
// Each adapter knows how to:
// 1. Query its specific API
// 2. Normalize results into NormalizedEvidence
// 3. Handle errors and rate limits gracefully
// ─────────────────────────────────────────────────────────────────────────────

import type { IngestionQuery, IngestionResult } from "./types";

export interface DataSourceAdapter {
  /** Unique identifier for this source (e.g., "pubmed", "clinicaltrials", "openfda") */
  readonly id: string;

  /** Human-readable name (e.g., "PubMed / NCBI E-utilities") */
  readonly name: string;

  /** Base URL of the API */
  readonly baseUrl: string;

  /** Whether this adapter requires an API key */
  readonly requiresApiKey: boolean;

  /** Rate limit: requests per second */
  readonly rateLimit: number;

  /**
   * Execute a search query against this data source.
   * Returns normalized evidence records.
   */
  search(query: IngestionQuery): Promise<IngestionResult>;

  /**
   * Fetch a single record by its source-specific ID.
   * Returns null if not found.
   */
  fetchById(id: string): Promise<NormalizedEvidence | null>;

  /**
   * Health check — returns true if the API is reachable.
   */
  healthCheck(): Promise<boolean>;
}

import type { NormalizedEvidence } from "./types";
