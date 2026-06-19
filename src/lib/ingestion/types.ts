// ─────────────────────────────────────────────────────────────────────────────
// Ingestion Layer — Normalized data model
// All data sources are normalized into this shape before entering the
// evidence engine. This ensures consistency across PubMed, ClinicalTrials.gov,
// OpenFDA, and future sources (WHO, NICE, CDC, etc.).
// ─────────────────────────────────────────────────────────────────────────────

import type { EvidenceTier } from "@/lib/evidence";

/** Normalized evidence record — the common shape across all data sources */
export interface NormalizedEvidence {
  /** Unique identifier (source-specific: PMID, NCT ID, FDA drug ID, etc.) */
  id: string;
  /** Human-readable title */
  title: string;
  /** Evidence tier classification */
  tier: EvidenceTier;
  /** Publication or registration year */
  year: number | null;
  /** Origin data source identifier */
  sourceId: string;
  /** Human-readable source name */
  sourceName: string;
  /** Author list (semicolon-separated) */
  authors: string;
  /** Journal, registry, or repository name */
  journal: string;
  /** Sample size if applicable */
  sampleSize: number | null;
  /** Effect size or key finding summary */
  effect: string | null;
  /** Abstract or description text */
  abstract: string;
  /** Direct URL to the source record */
  url: string;
  /** Conditions or indications this evidence relates to */
  conditions: string[];
  /** Interventions or treatments studied */
  interventions: string[];
  /** Status (for trials: RECRUITING, COMPLETED, etc.) */
  status: string | null;
  /** Raw metadata from the original source (preserved for provenance) */
  rawMetadata: Record<string, unknown>;
  /** ISO timestamp of when this record was ingested */
  ingestedAt: string;
}

/** Source-specific ingestion result */
export interface IngestionResult {
  /** The source adapter that produced this result */
  sourceId: string;
  /** Normalized evidence records */
  items: NormalizedEvidence[];
  /** Total count available (may be larger than items.length) */
  totalCount: number;
  /** ISO timestamp of ingestion */
  ingestedAt: string;
  /** Any warnings during ingestion */
  warnings: string[];
}

/** Search parameters for querying a data source */
export interface IngestionQuery {
  /** The search term (disease, drug, condition) */
  term: string;
  /** Maximum number of results to return */
  limit: number;
  /** Optional filters specific to the source */
  filters?: Record<string, string>;
}
