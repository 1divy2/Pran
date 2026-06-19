// ─────────────────────────────────────────────────────────────────────────────
// ClinicalTrials.gov APIv2 client
// Docs: https://clinicaltrials.gov/data-api/api
// Free, no API key. CORS-enabled.
// ─────────────────────────────────────────────────────────────────────────────

import type { Trial } from "./types";
import { cacheGet, cacheSet, cacheKey } from "./cache";
import { logError } from "../error-monitor";

const BASE = "https://clinicaltrials.gov/api/v2";

interface CTStudy {
  protocolSection?: {
    identificationModule?: {
      nctId?: string;
      briefTitle?: string;
    };
    statusModule?: {
      overallStatus?: string;
      startDateStruct?: { date?: string };
      completionDateStruct?: { date?: string };
    };
    designModule?: {
      phases?: string[];
      enrollmentInfo?: {
        count?: number;
      };
    };
    sponsorCollaboratorsModule?: {
      leadSponsor?: {
        name?: string;
      };
    };
    conditionsModule?: {
      conditions?: string[];
    };
    armsInterventionsModule?: {
      interventions?: Array<{
        name?: string;
        type?: string;
      }>;
    };
  };
}

interface CTResponse {
  totalCount?: number;
  studies?: CTStudy[];
}

/**
 * Search ClinicalTrials.gov for trials matching a condition.
 * Returns total count and structured Trial objects.
 */
export async function searchTrials(
  condition: string,
  limit = 10,
): Promise<{ total: number; trials: Trial[] }> {
  const key = cacheKey("ct", condition, String(limit));
  const cached = cacheGet<{ total: number; trials: Trial[] }>(key);
  if (cached) return cached;

  const url =
    `${BASE}/studies?query.cond=${encodeURIComponent(condition)}` +
    `&pageSize=${limit}&sort=EnrollmentCount:desc` +
    `&fields=NCTId,BriefTitle,OverallStatus,Phase,EnrollmentCount,LeadSponsorName,StartDate,CompletionDate,Condition,InterventionName,InterventionType` +
    `&countTotal=true`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    logError(e, "api", { source: "clinicaltrials", condition });
    return { total: 0, trials: [] };
  }

  if (!res.ok) {
    logError(new Error(`ClinicalTrials.gov API failed: ${res.status}`), "api", {
      source: "clinicaltrials",
      condition,
      status: res.status,
    });
    return { total: 0, trials: [] };
  }

  const data = (await res.json()) as CTResponse;
  const total = data.totalCount ?? 0;
  const studies = data.studies ?? [];

  const trials: Trial[] = studies.map((s) => {
    const p = s.protocolSection;
    const id = p?.identificationModule;
    const st = p?.statusModule;
    const design = p?.designModule;
    const sponsor = p?.sponsorCollaboratorsModule;
    const cond = p?.conditionsModule;
    const arms = p?.armsInterventionsModule;

    const nctId = id?.nctId ?? "Unknown";

    return {
      nctId,
      title: id?.briefTitle ?? "Untitled Study",
      status: st?.overallStatus ?? "UNKNOWN",
      phase: design?.phases?.[0] ?? "N/A",
      enrollment: design?.enrollmentInfo?.count ?? null,
      sponsor: sponsor?.leadSponsor?.name ?? "Unknown",
      startDate: st?.startDateStruct?.date ?? null,
      completionDate: st?.completionDateStruct?.date ?? null,
      conditions: cond?.conditions ?? [],
      interventions: (arms?.interventions ?? []).map((i) => i.name ?? "Unknown"),
      url: `https://clinicaltrials.gov/study/${nctId}`,
    };
  });

  const result = { total, trials };
  cacheSet(key, result);
  return result;
}
