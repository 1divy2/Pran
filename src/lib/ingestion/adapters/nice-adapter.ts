// ─────────────────────────────────────────────────────────────────────────────
// NICE Adapter — ingests from National Institute for Health and Care Excellence
// API docs: https://api.nice.org.uk/
// Provides clinical guidelines, technology appraisals, and quality standards.
// ─────────────────────────────────────────────────────────────────────────────

import type { DataSourceAdapter } from "../adapter";
import type { IngestionQuery, IngestionResult, NormalizedEvidence } from "../types";
import { classifyTier } from "@/lib/evidence";

const BASE = "https://api.nice.org.uk";

interface NiceSearchResult {
  totalResults: number;
  documents: NiceDocument[];
}

interface NiceDocument {
  id: string;
  title: string;
  shortTitle?: string;
  type: string;
  published: string;
  lastUpdated: string;
  documentType?: string;
  topics?: { name: string }[];
  url: string;
}

export const niceAdapter: DataSourceAdapter = {
  id: "nice",
  name: "NICE (National Institute for Health and Care Excellence)",
  baseUrl: BASE,
  requiresApiKey: false,
  rateLimit: 2,

  async search(query: IngestionQuery): Promise<IngestionResult> {
    const warnings: string[] = [];
    const ingestedAt = new Date().toISOString();

    try {
      const searchUrl =
        `${BASE}/search?q=${encodeURIComponent(query.term)}` +
        `&pageSize=${query.limit}&page=1` +
        `&indextype=guidance,indicators,workplace,information` +
        `&sortOrder=relevance`;

      const res = await fetch(searchUrl, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        return {
          sourceId: "nice",
          items: [],
          totalCount: 0,
          ingestedAt,
          warnings: [`NICE search failed: ${res.status}`],
        };
      }

      const data = (await res.json()) as NiceSearchResult;
      const items: NormalizedEvidence[] = (data.documents ?? []).map((doc) => {
        const yearMatch = doc.published?.match(/\d{4}/);
        const year = yearMatch ? parseInt(yearMatch[0], 10) : null;
        const title = doc.title ?? "Untitled";
        const tier = classifyTier(title, "paper");
        const docType = doc.documentType ?? doc.type ?? "guidance";

        return {
          id: `NICE-${doc.id}`,
          title,
          tier,
          year,
          sourceId: "nice",
          sourceName: "NICE",
          authors: "National Institute for Health and Care Excellence",
          journal: `NICE ${docType.charAt(0).toUpperCase() + docType.slice(1)}`,
          sampleSize: null,
          effect: null,
          abstract: `NICE ${docType} document published ${doc.published ?? "unknown date"}.`,
          url: doc.url?.startsWith("http") ? doc.url : `https://www.nice.org.uk${doc.url ?? ""}`,
          conditions: (doc.topics ?? []).map((t) => t.name),
          interventions: [],
          status: null,
          rawMetadata: {
            niceId: doc.id,
            documentType: docType,
            shortTitle: doc.shortTitle,
            lastUpdated: doc.lastUpdated,
          },
          ingestedAt,
        };
      });

      return {
        sourceId: "nice",
        items,
        totalCount: data.totalResults ?? items.length,
        ingestedAt,
        warnings,
      };
    } catch (e) {
      return {
        sourceId: "nice",
        items: [],
        totalCount: 0,
        ingestedAt,
        warnings: [`NICE ingestion error: ${e instanceof Error ? e.message : String(e)}`],
      };
    }
  },

  async fetchById(id: string): Promise<NormalizedEvidence | null> {
    const niceId = id.replace(/^NICE-/, "");
    try {
      const url = `${BASE}/documents/${niceId}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return null;

      const doc = (await res.json()) as NiceDocument;
      const yearMatch = doc.published?.match(/\d{4}/);
      const year = yearMatch ? parseInt(yearMatch[0], 10) : null;

      return {
        id: `NICE-${doc.id}`,
        title: doc.title ?? "Untitled",
        tier: classifyTier(doc.title ?? "", "paper"),
        year,
        sourceId: "nice",
        sourceName: "NICE",
        authors: "National Institute for Health and Care Excellence",
        journal: `NICE ${doc.documentType ?? "Guidance"}`,
        sampleSize: null,
        effect: null,
        abstract: `NICE document published ${doc.published ?? "unknown"}.`,
        url: doc.url?.startsWith("http") ? doc.url : `https://www.nice.org.uk${doc.url ?? ""}`,
        conditions: (doc.topics ?? []).map((t) => t.name),
        interventions: [],
        status: null,
        rawMetadata: {
          niceId: doc.id,
          documentType: doc.documentType,
          shortTitle: doc.shortTitle,
          lastUpdated: doc.lastUpdated,
        },
        ingestedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  },

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE}/search?q=test&pageSize=1`, {
        headers: { Accept: "application/json" },
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
