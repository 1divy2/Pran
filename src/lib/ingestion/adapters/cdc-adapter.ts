// ─────────────────────────────────────────────────────────────────────────────
// CDC Adapter — ingests from Centers for Disease Control and Prevention
// Sources: MMWR, CDC Wonder API, and public health data endpoints
// ─────────────────────────────────────────────────────────────────────────────

import type { DataSourceAdapter } from "../adapter";
import type { IngestionQuery, IngestionResult, NormalizedEvidence } from "../types";
import { classifyTier } from "@/lib/evidence";

const WONDER_BASE = "https://wonder.cdc.gov/controller/saved/D76";

async function searchWonder(
  query: IngestionQuery,
  warnings: string[],
  ingestedAt: string,
): Promise<NormalizedEvidence[]> {
  const items: NormalizedEvidence[] = [];

  try {
    const params = new URLSearchParams();
    params.append("Action-1", "61:6676844:f31:F31:10:2020");
    params.append("Action-2", "62:0");
    params.append("Action-3", "63:2020");
    params.append("Action-4", "64:0");
    params.append("Action-5", "65:0");
    params.append("Action-6", "7:1");
    params.append("Action-7", "9:99");
    params.append("Action-8", "8:1");
    params.append("Action-9", "5:52");
    params.append("Action-10", "4:01");
    params.append("Action-11", "3:01");
    params.append("Action-12", "2:01");
    params.append("Action-13", "1:01");

    const res = await fetch(WONDER_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      warnings.push(`CDC WONDER request failed: ${res.status}`);
      return items;
    }

    const html = await res.text();

    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
    for (const row of rows.slice(1, query.limit + 1)) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? [];
      const values = cells.map((c) => c.replace(/<[^>]*>/g, "").trim());

      if (values.length >= 7 && values[0]) {
        items.push({
          id: `CDC-WONDER-${encodeURIComponent(values[0])}-${values[3] ?? "unknown"}`,
          title: `${values[0]} — ${values[1] ?? "All ages"} (${values[3] ?? "unknown year"})`,
          tier: "cohort" as const,
          year: parseInt(values[3] ?? "0", 10) || null,
          sourceId: "cdc",
          sourceName: "CDC WONDER",
          authors: "Centers for Disease Control and Prevention",
          journal: "CDC WONDER Mortality Database",
          sampleSize: parseInt(values[5] ?? "0", 10) || null,
          effect: values[6] ? `Crude rate: ${values[6]}` : null,
          abstract:
            `Mortality data from CDC WONDER for ${values[0]} in ${values[3] ?? "unknown"}. ` +
            `${values[4] ?? "?"} deaths out of population ${values[5] ?? "?"}.`,
          url: "https://wonder.cdc.gov/ucd-icd10.html",
          conditions: [query.term, values[0]].filter(Boolean),
          interventions: [],
          status: null,
          rawMetadata: { cause: values[0], ageGroup: values[1], year: values[3] },
          ingestedAt,
        });
      }
    }
  } catch {
    warnings.push("CDC WONDER parsing failed");
  }

  return items;
}

async function searchMmwr(
  query: IngestionQuery,
  warnings: string[],
  ingestedAt: string,
): Promise<NormalizedEvidence[]> {
  const items: NormalizedEvidence[] = [];

  try {
    const searchUrl =
      `https://search.cdc.gov/search/?query=${encodeURIComponent(query.term)}` +
      `&dpage=1&mmwr=true&af=on`;

    const res = await fetch(searchUrl, {
      headers: { Accept: "text/html" },
    });

    if (!res.ok) {
      warnings.push(`CDC MMWR search failed: ${res.status}`);
      return items;
    }

    const html = await res.text();

    const titlePattern =
      /<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/gi;
    let match;
    let count = 0;

    while ((match = titlePattern.exec(html)) !== null && count < query.limit) {
      const [, url, rawTitle] = match;
      const title = rawTitle.replace(/<[^>]*>/g, "").trim();
      if (!title) continue;

      const yearMatch = title.match(/\b(20\d{2}|19\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[0], 10) : null;

      items.push({
        id: `CDC-MMWR-${encodeURIComponent(title.slice(0, 50))}`,
        title,
        tier: classifyTier(title, "paper"),
        year,
        sourceId: "cdc",
        sourceName: "CDC MMWR",
        authors: "Centers for Disease Control and Prevention",
        journal: "Morbidity and Mortality Weekly Report",
        sampleSize: null,
        effect: null,
        abstract: `MMWR report: ${title}`,
        url: url?.startsWith("http") ? url : `https://www.cdc.gov${url ?? ""}`,
        conditions: [query.term],
        interventions: [],
        status: null,
        rawMetadata: { source: "mmwr" },
        ingestedAt,
      });
      count++;
    }
  } catch {
    warnings.push("CDC MMWR search parsing failed");
  }

  return items;
}

function fetchCdcById(id: string): NormalizedEvidence | null {
  if (id.startsWith("CDC-WONDER-")) {
    const parts = id.replace("CDC-WONDER-", "").split("-");
    const cause = decodeURIComponent(parts.slice(0, -1).join("-"));
    const year = parts[parts.length - 1];

    return {
      id,
      title: `${cause} — CDC WONDER (${year})`,
      tier: "cohort",
      year: parseInt(year, 10) || null,
      sourceId: "cdc",
      sourceName: "CDC WONDER",
      authors: "Centers for Disease Control and Prevention",
      journal: "CDC WONDER Mortality Database",
      sampleSize: null,
      effect: null,
      abstract: `Mortality data for ${cause} from CDC WONDER.`,
      url: "https://wonder.cdc.gov/ucd-icd10.html",
      conditions: [cause],
      interventions: [],
      status: null,
      rawMetadata: { cause, year },
      ingestedAt: new Date().toISOString(),
    };
  }

  return null;
}

export const cdcAdapter: DataSourceAdapter = {
  id: "cdc",
  name: "CDC (Centers for Disease Control and Prevention)",
  baseUrl: "https://www.cdc.gov",
  requiresApiKey: false,
  rateLimit: 1,

  async search(query: IngestionQuery): Promise<IngestionResult> {
    const warnings: string[] = [];
    const ingestedAt = new Date().toISOString();

    try {
      const [wonderResults, mmwrResults] = await Promise.all([
        searchWonder(query, warnings, ingestedAt),
        searchMmwr(query, warnings, ingestedAt),
      ]);

      return {
        sourceId: "cdc",
        items: [...wonderResults, ...mmwrResults].slice(0, query.limit),
        totalCount: wonderResults.length + mmwrResults.length,
        ingestedAt,
        warnings,
      };
    } catch (e) {
      return {
        sourceId: "cdc",
        items: [],
        totalCount: 0,
        ingestedAt,
        warnings: [`CDC ingestion error: ${e instanceof Error ? e.message : String(e)}`],
      };
    }
  },

  fetchById: (id: string) => Promise.resolve(fetchCdcById(id)),

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch("https://www.cdc.gov", { method: "HEAD" });
      return res.ok;
    } catch {
      return false;
    }
  },
};
