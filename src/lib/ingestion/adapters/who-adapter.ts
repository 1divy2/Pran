// ─────────────────────────────────────────────────────────────────────────────
// WHO Adapter — ingests from World Health Organization iLibrary API
// Docs: https://www.who.int/data/gho/info/gho-odp-api-documentation
// ─────────────────────────────────────────────────────────────────────────────

import type { DataSourceAdapter } from "../adapter";
import type { IngestionQuery, IngestionResult, NormalizedEvidence } from "../types";
import { classifyTier } from "@/lib/evidence";

const BASE = "https://ghoapi.azureedge.net/api";

interface GhoIndicator {
  IndicatorCode: string;
  IndicatorName: string;
  Language: string;
  PersistedSmallVersion: number;
  AllowUpdate: boolean;
  LastUpdate: string;
  DataSourceUrl: string;
}

interface GhoObservation {
  SpatialDim: string;
  TimeDim: number;
  Dim1: string;
  NumericValue: number;
  Value: string;
  Low: number;
  High: number;
  DataSourceDim: string;
  TimeDimensionValue: string;
}

const RELEVANT_INDICATORS = [
  "MORT_100",
  "MDG_0000000001",
  "NCD_BMI_30A",
  "WHOSIS_000001",
  "TOBACCO_0000000867",
  "HIV_0000000026",
  "WHS4_100",
  "TB_e_inc_100k",
];

async function searchByIndicators(
  query: IngestionQuery,
  warnings: string[],
  ingestedAt: string,
): Promise<IngestionResult> {
  const items: NormalizedEvidence[] = [];
  const termLower = query.term.toLowerCase();

  const matchedIndicators = RELEVANT_INDICATORS.filter((code) => {
    const keywords = code.toLowerCase().split("_");
    return keywords.some((k) => termLower.includes(k)) || termLower.includes(code.toLowerCase());
  });

  const indicatorsToQuery =
    matchedIndicators.length > 0 ? matchedIndicators : RELEVANT_INDICATORS.slice(0, 3);

  for (const code of indicatorsToQuery) {
    try {
      const url = `${BASE}/${code}?$top=${query.limit}`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = (await res.json()) as { value: GhoObservation[] };
      const observations = data.value ?? [];

      for (
        let i = 0;
        i < Math.min(observations.length, Math.ceil(query.limit / indicatorsToQuery.length));
        i++
      ) {
        const obs = observations[i];
        items.push({
          id: `WHO-${code}-${obs.SpatialDim}-${obs.TimeDim}`,
          title: `WHO Indicator ${code} — ${obs.SpatialDim} (${obs.TimeDim})`,
          tier: "cohort" as const,
          year: obs.TimeDim,
          sourceId: "who",
          sourceName: "World Health Organization",
          authors: "World Health Organization",
          journal: "WHO Global Health Observatory",
          sampleSize: null,
          effect: `${obs.NumericValue?.toFixed(1) ?? obs.Value}`,
          abstract: `Global health observation data for ${obs.SpatialDim} in ${obs.TimeDim}.`,
          url: `https://www.who.int/data/gho/data/indicators/indicator-details/GHO/${code}`,
          conditions: [query.term],
          interventions: [],
          status: null,
          rawMetadata: { indicatorCode: code, spatialDim: obs.SpatialDim },
          ingestedAt,
        });
      }
    } catch {
      warnings.push(`Failed to fetch WHO indicator ${code}`);
    }
  }

  return { sourceId: "who", items, totalCount: items.length, ingestedAt, warnings };
}

async function searchIndicators(
  query: IngestionQuery,
  warnings: string[],
  ingestedAt: string,
): Promise<IngestionResult> {
  const items: NormalizedEvidence[] = [];

  try {
    const indicatorUrl = `${BASE}/Indicator?$filter=contains(IndicatorName,'${encodeURIComponent(query.term)}')`;
    const indicatorRes = await fetch(indicatorUrl);

    if (!indicatorRes.ok) {
      return searchByIndicators(query, warnings, ingestedAt);
    }

    const indicatorData = (await indicatorRes.json()) as { value: GhoIndicator[] };
    const indicators = indicatorData.value?.slice(0, 5) ?? [];

    if (indicators.length === 0) {
      return searchByIndicators(query, warnings, ingestedAt);
    }

    for (const indicator of indicators) {
      try {
        const obsUrl = `${BASE}/${indicator.IndicatorCode}?$top=${query.limit}`;
        const obsRes = await fetch(obsUrl);
        if (!obsRes.ok) continue;

        const obsData = (await obsRes.json()) as { value: GhoObservation[] };
        const observations = obsData.value ?? [];
        const perIndicator = Math.ceil(query.limit / indicators.length);

        for (let i = 0; i < Math.min(observations.length, perIndicator); i++) {
          const obs = observations[i];
          items.push({
            id: `WHO-${indicator.IndicatorCode}-${obs.SpatialDim}-${obs.TimeDim}`,
            title: `${indicator.IndicatorName} — ${obs.SpatialDim} (${obs.TimeDim})`,
            tier: "cohort" as const,
            year: obs.TimeDim,
            sourceId: "who",
            sourceName: "World Health Organization",
            authors: "World Health Organization",
            journal: "WHO Global Health Observatory",
            sampleSize: null,
            effect: `${obs.NumericValue?.toFixed(1) ?? obs.Value} (95% CI: ${obs.Low?.toFixed(1) ?? "?"}–${obs.High?.toFixed(1) ?? "?"})`,
            abstract: `${indicator.IndicatorName} for ${obs.SpatialDim} in ${obs.TimeDim}: ${obs.NumericValue?.toFixed(1) ?? obs.Value}.`,
            url: `https://www.who.int/data/gho/data/indicators/indicator-details/GHO/${indicator.IndicatorCode}`,
            conditions: [query.term],
            interventions: [],
            status: null,
            rawMetadata: {
              indicatorCode: indicator.IndicatorCode,
              spatialDim: obs.SpatialDim,
              dim1: obs.Dim1,
              low: obs.Low,
              high: obs.High,
            },
            ingestedAt,
          });
        }
      } catch {
        warnings.push(`Failed to fetch WHO indicator ${indicator.IndicatorCode}`);
      }
    }

    return { sourceId: "who", items, totalCount: items.length, ingestedAt, warnings };
  } catch (e) {
    return {
      sourceId: "who",
      items: [],
      totalCount: 0,
      ingestedAt,
      warnings: [`WHO ingestion error: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
}

async function fetchWhoById(id: string): Promise<NormalizedEvidence | null> {
  const parts = id.split("-");
  if (parts.length < 4 || parts[0] !== "WHO") return null;

  const [, indicatorCode, ...rest] = parts;
  const timeDim = rest[rest.length - 1];
  const spatialDim = rest.slice(0, -1).join("-");

  try {
    const url = `${BASE}/${indicatorCode}?$filter=SpatialDim eq '${spatialDim}' and TimeDim eq ${timeDim}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as { value: GhoObservation[] };
    const obs = data.value?.[0];
    if (!obs) return null;

    return {
      id,
      title: `WHO Indicator ${indicatorCode} — ${spatialDim} (${timeDim})`,
      tier: "cohort",
      year: parseInt(timeDim, 10),
      sourceId: "who",
      sourceName: "World Health Organization",
      authors: "World Health Organization",
      journal: "WHO Global Health Observatory",
      sampleSize: null,
      effect: `${obs.NumericValue?.toFixed(1) ?? obs.Value}`,
      abstract: `Global health observation data for ${spatialDim} in ${timeDim}.`,
      url: `https://www.who.int/data/gho/data/indicators/indicator-details/GHO/${indicatorCode}`,
      conditions: [],
      interventions: [],
      status: null,
      rawMetadata: { indicatorCode, spatialDim, timeDim: parseInt(timeDim, 10) },
      ingestedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export const whoAdapter: DataSourceAdapter = {
  id: "who",
  name: "World Health Organization (GHO)",
  baseUrl: BASE,
  requiresApiKey: false,
  rateLimit: 2,

  search: (query: IngestionQuery) => {
    const warnings: string[] = [];
    const ingestedAt = new Date().toISOString();
    return searchIndicators(query, warnings, ingestedAt);
  },

  fetchById: fetchWhoById,

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE}/Indicator?$top=1`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
