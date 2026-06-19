// ─────────────────────────────────────────────────────────────────────────────
// Ingestion Orchestrator — queries all registered adapters in parallel,
// normalizes results, deduplicates, and returns a unified IngestionResult.
// ─────────────────────────────────────────────────────────────────────────────

import type { IngestionQuery, IngestionResult, NormalizedEvidence } from "./types";
import { getAllAdapters, getFreeAdapters } from "./registry";

/**
 * Ingest data from all registered adapters in parallel.
 * Returns merged and deduplicated results.
 */
export async function ingestAll(query: IngestionQuery): Promise<IngestionResult> {
  const adapters = getFreeAdapters(); // Only use free adapters by default
  const ingestedAt = new Date().toISOString();
  const allWarnings: string[] = [];

  // Fire all adapters in parallel
  const results = await Promise.allSettled(adapters.map((adapter) => adapter.search(query)));

  // Collect all items
  const allItems: NormalizedEvidence[] = [];
  let totalCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value.items);
      totalCount += result.value.totalCount;
      allWarnings.push(...result.value.warnings);
    } else {
      allWarnings.push(`Adapter failed: ${result.reason}`);
    }
  }

  // Deduplicate by title similarity (simple: exact match after normalization)
  const deduplicated = deduplicateEvidence(allItems);

  return {
    sourceId: "all",
    items: deduplicated,
    totalCount,
    ingestedAt,
    warnings: allWarnings,
  };
}

/**
 * Ingest data from a specific adapter only.
 */
export async function ingestFrom(
  sourceId: string,
  query: IngestionQuery,
): Promise<IngestionResult> {
  const { getAdapter } = await import("./registry");
  const adapter = getAdapter(sourceId);

  if (!adapter) {
    return {
      sourceId,
      items: [],
      totalCount: 0,
      ingestedAt: new Date().toISOString(),
      warnings: [`Unknown adapter: ${sourceId}`],
    };
  }

  return adapter.search(query);
}

/**
 * Deduplicate evidence records using multiple strategies:
 * 1. Exact ID match (PMID, NCT ID, DOI) — highest confidence
 * 2. Normalized title match — handles punctuation/case differences
 * 3. Fuzzy title similarity — handles minor typos and rewording
 *
 * When duplicates are found, keeps the record with higher confidence
 * and merges unique metadata from both records.
 */
function deduplicateEvidence(items: NormalizedEvidence[]): NormalizedEvidence[] {
  // Phase 1: ID-based deduplication (most reliable)
  const byId = new Map<string, NormalizedEvidence>();
  const unmatched: NormalizedEvidence[] = [];

  for (const item of items) {
    const idKey = extractIdKey(item);
    if (idKey) {
      const existing = byId.get(idKey);
      if (!existing || getConfidence(item) > getConfidence(existing)) {
        byId.set(idKey, mergeEvidence(existing ?? item, item));
      } else if (existing) {
        byId.set(idKey, mergeEvidence(existing, item));
      }
    } else {
      unmatched.push(item);
    }
  }

  // Phase 2: Title-based deduplication on remaining items
  const byTitle = new Map<string, NormalizedEvidence>();

  for (const item of unmatched) {
    const titleKey = normalizeTitle(item.title);
    const existing = byTitle.get(titleKey);

    if (!existing) {
      byTitle.set(titleKey, item);
    } else {
      // Merge: keep higher confidence, combine metadata
      byTitle.set(titleKey, mergeEvidence(existing, item));
    }
  }

  // Phase 3: Fuzzy title matching for remaining near-duplicates
  const titleKeys = Array.from(byTitle.keys());
  const fuzzyMatches = new Set<string>();

  for (let i = 0; i < titleKeys.length; i++) {
    if (fuzzyMatches.has(titleKeys[i])) continue;
    for (let j = i + 1; j < titleKeys.length; j++) {
      if (fuzzyMatches.has(titleKeys[j])) continue;
      if (titleSimilarity(titleKeys[i], titleKeys[j]) > 0.85) {
        const a = byTitle.get(titleKeys[i])!;
        const b = byTitle.get(titleKeys[j])!;
        byTitle.set(titleKeys[i], mergeEvidence(a, b));
        fuzzyMatches.add(titleKeys[j]);
      }
    }
  }

  // Combine ID-matched and title-matched results
  return [
    ...Array.from(byId.values()),
    ...Array.from(byTitle.entries())
      .filter(([k]) => !fuzzyMatches.has(k))
      .map(([, v]) => v),
  ];
}

/**
 * Extract a deduplication key from an evidence record's ID.
 * Matches PMID, NCT ID, DOI, or FDA drug ID patterns.
 */
function extractIdKey(item: NormalizedEvidence): string | null {
  const id = item.id;

  // PMID: numeric, typically 6-8 digits
  if (/^\d{6,8}$/.test(id)) return `pmid:${id}`;

  // NCT ID: NCT followed by digits
  if (/^NCT\d+$/i.test(id)) return `nct:${id.toUpperCase()}`;

  // DOI: starts with 10.
  if (/^10\.\d+/.test(id)) return `doi:${id.toLowerCase()}`;

  // FDA drug ID
  if (item.sourceId === "openfda" && id) return `fda:${id.toLowerCase()}`;

  return null;
}

/**
 * Merge two evidence records, keeping the higher-confidence one as base
 * and combining unique metadata from both.
 */
function mergeEvidence(a: NormalizedEvidence, b: NormalizedEvidence): NormalizedEvidence {
  const base = getConfidence(a) >= getConfidence(b) ? a : b;
  const other = base === a ? b : a;

  // Merge conditions and interventions (unique values)
  const conditions = [...new Set([...base.conditions, ...other.conditions])];
  const interventions = [...new Set([...base.interventions, ...other.interventions])];

  // Merge authors if different
  const authors =
    base.authors !== other.authors ? `${base.authors}; ${other.authors}` : base.authors;

  return {
    ...base,
    conditions,
    interventions,
    authors,
    // Prefer non-null values from either record
    sampleSize: base.sampleSize ?? other.sampleSize,
    effect: base.effect ?? other.effect,
    abstract: base.abstract || other.abstract,
    status: base.status ?? other.status,
  };
}

/**
 * Normalize a title for deduplication comparison.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compute similarity between two normalized titles using character bigrams.
 * Returns a value between 0 (no similarity) and 1 (identical).
 */
function titleSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 3 || b.length < 3) return 0;

  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) {
      set.add(s.slice(i, i + 2));
    }
    return set;
  };

  const aBigrams = bigrams(a);
  const bBigrams = bigrams(b);

  let intersection = 0;
  for (const bg of aBigrams) {
    if (bBigrams.has(bg)) intersection++;
  }

  return (2 * intersection) / (aBigrams.size + bBigrams.size);
}

/**
 * Compute confidence for a normalized evidence record.
 * (Same logic as computeConfidence in evidence.ts, but for NormalizedEvidence)
 */
function getConfidence(item: NormalizedEvidence): number {
  const tierScores: Record<string, number> = {
    "meta-analysis": 90,
    rct: 80,
    cohort: 60,
    guideline: 70,
    "case-report": 30,
    "expert-opinion": 20,
  };

  let score = tierScores[item.tier] ?? 50;

  if (item.year) {
    const decadesSince2000 = Math.max(0, (item.year - 2000) / 10);
    score += Math.min(15, decadesSince2000 * 5);
  }

  if (item.sampleSize && item.sampleSize > 1000) score += 10;
  else if (item.sampleSize && item.sampleSize > 100) score += 5;

  return Math.min(100, Math.round(score));
}
