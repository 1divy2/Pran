// ─────────────────────────────────────────────────────────────────────────────
// Topic Service — orchestrates data ingestion from all registered adapters
// into a single response. Uses the ingestion layer for normalized data,
// while maintaining backward compatibility with LiveTopicData for existing routes.
// ─────────────────────────────────────────────────────────────────────────────

import type { LiveTopicData, Paper, Trial, Drug } from "./types";
import type { NormalizedEvidence, IngestionResult } from "../ingestion/types";
import { ingestAll } from "../ingestion/normalizer";
import { cacheGet, cacheSet, cacheKey } from "./cache";
import { logError } from "../error-monitor";

/**
 * Convert a URL-friendly topicId to a search query.
 * "rheumatoid-arthritis" → "rheumatoid arthritis"
 */
function toSearchQuery(topicId: string): string {
  return topicId.replace(/-/g, " ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy interface — maintains backward compatibility with existing routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch comprehensive topic data from all APIs in parallel.
 * Returns LiveTopicData for backward compatibility with existing route components.
 */
export async function fetchTopicData(topicId: string): Promise<LiveTopicData> {
  const query = toSearchQuery(topicId);
  const key = cacheKey("topic-v2", query);

  const cached = cacheGet<LiveTopicData>(key);
  if (cached) return cached;

  let result: IngestionResult;
  try {
    result = await ingestAll({ term: query, limit: 10 });
  } catch (error) {
    logError(error, "ingestion", { query, source: "topic-service" });
    // Return empty result on failure
    result = {
      sourceId: "unknown",
      items: [],
      totalCount: 0,
      ingestedAt: new Date().toISOString(),
      warnings: ["Ingestion failed"],
    };
  }

  // Convert normalized evidence back to legacy types
  const papers: Paper[] = result.items
    .filter((e) => e.sourceId === "pubmed")
    .map(normalizedToPaper);

  const trials: Trial[] = result.items
    .filter((e) => e.sourceId === "clinicaltrials")
    .map(normalizedToTrial);

  const drugs: Drug[] = result.items.filter((e) => e.sourceId === "openfda").map(normalizedToDrug);

  const adverseEventCount = result.items.filter(
    (e) => e.sourceId === "openfda" && e.interventions.length > 0,
  ).length;

  const liveData: LiveTopicData = {
    query,
    trials: { total: result.totalCount, items: trials },
    papers: { total: result.totalCount, items: papers },
    drugs,
    adverseEventCount,
    fetchedAt: Date.now(),
  };

  cacheSet(key, liveData);
  return liveData;
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalized interface — richer data for new views
// ─────────────────────────────────────────────────────────────────────────────

export interface NormalizedTopicData {
  query: string;
  evidence: NormalizedEvidence[];
  totalCount: number;
  bySource: Record<string, NormalizedEvidence[]>;
  byTier: Record<string, NormalizedEvidence[]>;
  fetchedAt: number;
  warnings: string[];
}

/**
 * Fetch topic data in normalized format.
 * Used by new views (Pyramid, Conflicts, Knowledge Graph) that need
 * the full evidence engine capabilities.
 */
export async function fetchNormalizedTopicData(topicId: string): Promise<NormalizedTopicData> {
  const query = toSearchQuery(topicId);
  const key = cacheKey("topic-normalized", query);

  const cached = cacheGet<NormalizedTopicData>(key);
  if (cached) return cached;

  let result: IngestionResult;
  try {
    result = await ingestAll({ term: query, limit: 10 });
  } catch (error) {
    logError(error, "ingestion", { query, source: "topic-service-normalized" });
    result = {
      sourceId: "unknown",
      items: [],
      totalCount: 0,
      ingestedAt: new Date().toISOString(),
      warnings: ["Ingestion failed"],
    };
  }

  // Group by source
  const bySource: Record<string, NormalizedEvidence[]> = {};
  for (const item of result.items) {
    if (!bySource[item.sourceId]) bySource[item.sourceId] = [];
    bySource[item.sourceId].push(item);
  }

  // Group by tier
  const byTier: Record<string, NormalizedEvidence[]> = {};
  for (const item of result.items) {
    if (!byTier[item.tier]) byTier[item.tier] = [];
    byTier[item.tier].push(item);
  }

  const normalized: NormalizedTopicData = {
    query,
    evidence: result.items,
    totalCount: result.totalCount,
    bySource,
    byTier,
    fetchedAt: Date.now(),
    warnings: result.warnings,
  };

  cacheSet(key, normalized);
  return normalized;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion helpers: NormalizedEvidence → legacy types
// ─────────────────────────────────────────────────────────────────────────────

function normalizedToPaper(e: NormalizedEvidence): Paper {
  return {
    pmid: e.id,
    title: e.title,
    authors: e.authors.split("; "),
    journal: e.journal,
    year: e.year,
    abstract: e.abstract,
    url: e.url,
  };
}

function normalizedToTrial(e: NormalizedEvidence): Trial {
  return {
    nctId: e.id,
    title: e.title,
    status: e.status ?? "UNKNOWN",
    phase: (e.rawMetadata.phase as string) ?? "NA",
    enrollment: e.sampleSize,
    sponsor: e.authors,
    startDate: null,
    completionDate: null,
    conditions: e.conditions,
    interventions: e.interventions,
    url: e.url,
  };
}

function normalizedToDrug(e: NormalizedEvidence): Drug {
  const meta = e.rawMetadata;
  return {
    brand: (meta.brand as string) ?? e.title.split(" (")[0],
    generic: (meta.generic as string) ?? e.title,
    indication: e.effect ?? "",
    manufacturer: e.authors,
  };
}
