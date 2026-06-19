// ─────────────────────────────────────────────────────────────────────────────
// OpenFDA API client
// Docs: https://open.fda.gov/apis/
// Free, no key for basic use (240 req/min). CORS-enabled.
// ─────────────────────────────────────────────────────────────────────────────

import type { Drug } from "./types";
import { cacheGet, cacheSet, cacheKey } from "./cache";
import { logError } from "../error-monitor";

const BASE = "https://api.fda.gov/drug";

interface FDALabelResult {
  meta?: { results?: { total?: number } };
  results?: Array<{
    openfda?: {
      brand_name?: string[];
      generic_name?: string[];
      manufacturer_name?: string[];
    };
    indications_and_usage?: string[];
  }>;
}

interface FDAEventResult {
  meta?: { results?: { total?: number } };
}

/**
 * Search OpenFDA for drugs approved/labelled for a condition.
 * Returns structured Drug objects.
 */
export async function searchDrugs(condition: string, limit = 8): Promise<Drug[]> {
  const key = cacheKey("fda-drugs", condition, String(limit));
  const cached = cacheGet<Drug[]>(key);
  if (cached) return cached;

  const url =
    `${BASE}/label.json?search=indications_and_usage:"${encodeURIComponent(condition)}"` +
    `&limit=${limit}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`OpenFDA label search failed: ${res.status}`);
      return [];
    }

    const data = (await res.json()) as FDALabelResult;
    const results = data.results ?? [];

    // Deduplicate by generic name
    const seen = new Set<string>();
    const drugs: Drug[] = [];

    for (const r of results) {
      const generic = (r.openfda?.generic_name?.[0] ?? "").toUpperCase();
      if (!generic || seen.has(generic)) continue;
      seen.add(generic);

      const indication = r.indications_and_usage?.[0] ?? "";
      // Truncate indication to ~200 chars for display
      const truncated =
        indication.length > 200
          ? indication.slice(0, 200).replace(/\s+\S*$/, "") + "…"
          : indication;

      drugs.push({
        brand: r.openfda?.brand_name?.[0] ?? "—",
        generic: r.openfda?.generic_name?.[0] ?? "Unknown",
        indication: truncated,
        manufacturer: r.openfda?.manufacturer_name?.[0] ?? "Unknown",
      });
    }

    cacheSet(key, drugs);
    return drugs;
  } catch (e) {
    logError(e, "api", { source: "openfda-drugs", condition });
    return [];
  }
}

/**
 * Get the total adverse event report count for a condition from FAERS.
 */
export async function getAdverseEventCount(condition: string): Promise<number> {
  const key = cacheKey("fda-aec", condition);
  const cached = cacheGet<number>(key);
  if (cached !== null) return cached;

  const url =
    `${BASE}/event.json?search=patient.drug.drugindication:"${encodeURIComponent(condition)}"` +
    `&limit=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = (await res.json()) as FDAEventResult;
    const total = data.meta?.results?.total ?? 0;
    cacheSet(key, total);
    return total;
  } catch (e) {
    logError(e, "api", { source: "openfda-aec", condition });
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Detailed adverse event reports for the Safety / Pharmacovigilance view
// ─────────────────────────────────────────────────────────────────────────────

export interface AdverseEventReaction {
  term: string;
  source: string;
}

export interface AdverseEventDrug {
  name: string;
  indication: string;
  role: string;
}

export interface AdverseEventReport {
  id: string;
  serious: boolean;
  reactions: AdverseEventReaction[];
  drugs: AdverseEventDrug[];
  patientAge: string | null;
  patientSex: string | null;
  reportDate: string | null;
  outcome: string | null;
  country: string | null;
}

interface FDAEventDetailResult {
  meta?: { results?: { total?: number } };
  results?: Array<{
    safetyreport?: {
      safetyreportid?: string;
      serious?: string;
      receivedate?: string;
      occurcountry?: string;
      patient?: {
        patientonsetage?: string;
        patientageunit?: string;
        patientsex?: string;
        drug?: Array<{
          drugname?: string;
          drugindication?: string;
          drugcharacterization?: string;
        }>;
        reaction?: Array<{
          reactionmeddrapt?: string;
          reactionoutcome?: string;
        }>;
      };
    };
  }>;
}

/**
 * Fetch detailed adverse event reports for a condition from FAERS.
 * Returns structured report data including reactions, drugs, patient info.
 */
export async function fetchAdverseEventReports(
  condition: string,
  limit = 20,
): Promise<{ total: number; reports: AdverseEventReport[] }> {
  const key = cacheKey("fda-aec-detail", condition, String(limit));
  const cached = cacheGet<{ total: number; reports: AdverseEventReport[] }>(key);
  if (cached) return cached;

  const url =
    `${BASE}/event.json?search=patient.drug.drugindication:"${encodeURIComponent(condition)}"` +
    `&limit=${limit}&sort=receivedate:desc`;

  try {
    const res = await fetch(url);
    if (!res.ok) return { total: 0, reports: [] };
    const data = (await res.json()) as FDAEventDetailResult;
    const total = data.meta?.results?.total ?? 0;

    const reports: AdverseEventReport[] = (data.results ?? []).map((r) => {
      const safety = r.safetyreport ?? {};
      const patient = safety.patient ?? {};

      return {
        id: safety.safetyreportid ?? "unknown",
        serious: safety.serious === "1",
        reactions: (patient.reaction ?? []).map((rx) => ({
          term: rx.reactionmeddrapt ?? "Unknown",
          source: rx.reactionoutcome ?? "Unknown",
        })),
        drugs: (patient.drug ?? []).map((d) => ({
          name: d.drugname ?? "Unknown",
          indication: d.drugindication ?? "",
          role:
            d.drugcharacterization === "1"
              ? "Suspect"
              : d.drugcharacterization === "2"
                ? "Concomitant"
                : "Interacting",
        })),
        patientAge: patient.patientonsetage
          ? `${patient.patientonsetage} ${patient.patientageunit ?? ""}`.trim()
          : null,
        patientSex: patient.patientsex ?? null,
        reportDate: safety.receivedate ?? null,
        outcome: patient.reaction?.[0]?.reactionoutcome ?? null,
        country: safety.occurcountry ?? null,
      };
    });

    const result = { total, reports };
    cacheSet(key, result);
    return result;
  } catch (e) {
    logError(e, "api", { source: "openfda-aec-detail", condition });
    return { total: 0, reports: [] };
  }
}

/**
 * Get top reported reactions for a condition (count aggregation).
 */
export async function getTopReactions(
  condition: string,
  limit = 10,
): Promise<{ term: string; count: number }[]> {
  const key = cacheKey("fda-reactions", condition, String(limit));
  const cached = cacheGet<{ term: string; count: number }[]>(key);
  if (cached) return cached;

  const url =
    `${BASE}/event.json?search=patient.drug.drugindication:"${encodeURIComponent(condition)}"` +
    `&count=patient.reaction.reactionmeddrapt.exact&limit=${limit}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{ time: string; count: number }>;
    };
    const reactions = (data.results ?? []).map((r) => ({
      term: r.time,
      count: r.count,
    }));
    cacheSet(key, reactions);
    return reactions;
  } catch (e) {
    logError(e, "api", { source: "openfda-reactions", condition });
    return [];
  }
}
