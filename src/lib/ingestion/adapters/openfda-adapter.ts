// ─────────────────────────────────────────────────────────────────────────────
// OpenFDA Adapter — ingests drug labels and adverse events
// Docs: https://open.fda.gov/apis/
// Free, no key for basic use (240 req/min). CORS-enabled.
// ─────────────────────────────────────────────────────────────────────────────

import type { DataSourceAdapter } from "../adapter";
import type { IngestionQuery, IngestionResult, NormalizedEvidence } from "../types";
import { classifyTier } from "@/lib/evidence";

const BASE = "https://api.fda.gov/drug";

interface FDALabelResult {
  meta?: { results?: { total?: number } };
  results?: Array<{
    openfda?: {
      brand_name?: string[];
      generic_name?: string[];
      manufacturer_name?: string[];
      substance_name?: string[];
      pharmacologic_class?: string[];
    };
    indications_and_usage?: string[];
    description?: string[];
    dosage_and_administration?: string[];
    warnings?: string[];
  }>;
}

export const openfdaAdapter: DataSourceAdapter = {
  id: "openfda",
  name: "OpenFDA",
  baseUrl: BASE,
  requiresApiKey: false,
  rateLimit: 4, // 240 req/min ≈ 4 req/s

  async search(query: IngestionQuery): Promise<IngestionResult> {
    const warnings: string[] = [];
    const ingestedAt = new Date().toISOString();

    try {
      const url =
        `${BASE}/label.json?search=indications_and_usage:"${encodeURIComponent(query.term)}"` +
        `&limit=${query.limit}`;

      const res = await fetch(url);
      if (!res.ok) {
        return {
          sourceId: "openfda",
          items: [],
          totalCount: 0,
          ingestedAt,
          warnings: [`OpenFDA label search failed: ${res.status}`],
        };
      }

      const data = (await res.json()) as FDALabelResult;
      const total = data.meta?.results?.total ?? 0;
      const results = data.results ?? [];

      // Deduplicate by generic name
      const seen = new Set<string>();
      const items: NormalizedEvidence[] = [];

      for (const r of results) {
        const generic = (r.openfda?.generic_name?.[0] ?? "").toUpperCase();
        if (!generic || seen.has(generic)) continue;
        seen.add(generic);

        const brand = r.openfda?.brand_name?.[0] ?? "Unknown";
        const indication = r.indications_and_usage?.[0] ?? "";
        const truncated =
          indication.length > 300
            ? indication.slice(0, 300).replace(/\s+\S*$/, "") + "..."
            : indication;

        items.push({
          id: `fda-${generic.toLowerCase().replace(/\s+/g, "-")}`,
          title: `${brand} (${generic})`,
          tier: classifyTier("drug label", "paper"),
          year: null, // FDA labels don't have a publication year
          sourceId: "openfda",
          sourceName: "OpenFDA",
          authors: r.openfda?.manufacturer_name?.[0] ?? "Unknown manufacturer",
          journal: r.openfda?.pharmacologic_class?.join("; ") ?? "Drug Label",
          sampleSize: null,
          effect: truncated || null,
          abstract: r.description?.[0] ?? "",
          url: `https://open.fda.gov/drug/label/#${encodeURIComponent(generic)}`,
          conditions: [query.term],
          interventions: [brand, generic],
          status: null,
          rawMetadata: {
            brand,
            generic,
            manufacturer: r.openfda?.manufacturer_name,
            substances: r.openfda?.substance_name,
            dosage: r.dosage_and_administration?.[0],
            warnings: r.warnings?.[0],
          },
          ingestedAt,
        });
      }

      return { sourceId: "openfda", items, totalCount: total, ingestedAt, warnings };
    } catch (e) {
      return {
        sourceId: "openfda",
        items: [],
        totalCount: 0,
        ingestedAt,
        warnings: [`OpenFDA ingestion error: ${e instanceof Error ? e.message : String(e)}`],
      };
    }
  },

  async fetchById(id: string): Promise<NormalizedEvidence | null> {
    // OpenFDA doesn't have a single-record fetch by ID
    // The ID format is "fda-{generic-name}", so we'd need to search
    return null;
  },

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE}/label.json?search=aspirin&limit=1`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
