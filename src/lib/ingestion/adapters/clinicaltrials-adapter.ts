// ─────────────────────────────────────────────────────────────────────────────
// ClinicalTrials.gov Adapter — ingests from APIv2
// Docs: https://clinicaltrials.gov/data-api/api
// Free, no API key. CORS-enabled.
// ─────────────────────────────────────────────────────────────────────────────

import type { DataSourceAdapter } from "../adapter";
import type { IngestionQuery, IngestionResult, NormalizedEvidence } from "../types";
import { classifyTier } from "@/lib/evidence";

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
      enrollmentInfo?: { count?: number };
    };
    sponsorCollaboratorsModule?: {
      leadSponsor?: { name?: string };
    };
    conditionsModule?: {
      conditions?: string[];
    };
    armsInterventionsModule?: {
      interventions?: Array<{ name?: string; type?: string }>;
    };
  };
}

interface CTResponse {
  totalCount?: number;
  studies?: CTStudy[];
}

export const clinicaltrialsAdapter: DataSourceAdapter = {
  id: "clinicaltrials",
  name: "ClinicalTrials.gov APIv2",
  baseUrl: BASE,
  requiresApiKey: false,
  rateLimit: 10,

  async search(query: IngestionQuery): Promise<IngestionResult> {
    const warnings: string[] = [];
    const ingestedAt = new Date().toISOString();

    try {
      const url =
        `${BASE}/studies?query.cond=${encodeURIComponent(query.term)}` +
        `&pageSize=${query.limit}&sort=EnrollmentCount:desc` +
        `&fields=NCTId,BriefTitle,OverallStatus,Phase,EnrollmentCount,LeadSponsorName,StartDate,CompletionDate,Condition,InterventionName,InterventionType` +
        `&countTotal=true`;

      const res = await fetch(url);
      if (!res.ok) {
        return {
          sourceId: "clinicaltrials",
          items: [],
          totalCount: 0,
          ingestedAt,
          warnings: [`ClinicalTrials.gov API failed: ${res.status}`],
        };
      }

      const data = (await res.json()) as CTResponse;
      const total = data.totalCount ?? 0;
      const studies = data.studies ?? [];

      const items: NormalizedEvidence[] = studies.map((s) => {
        const p = s.protocolSection;
        const id = p?.identificationModule;
        const st = p?.statusModule;
        const design = p?.designModule;
        const sponsor = p?.sponsorCollaboratorsModule;
        const cond = p?.conditionsModule;
        const arms = p?.armsInterventionsModule;

        const nctId = id?.nctId ?? "Unknown";
        const title = id?.briefTitle ?? "Untitled Study";
        const tier = classifyTier(title, "trial");

        const startDate = st?.startDateStruct?.date;
        const yearMatch = startDate?.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? parseInt(yearMatch[0], 10) : null;

        return {
          id: nctId,
          title,
          tier,
          year,
          sourceId: "clinicaltrials",
          sourceName: "ClinicalTrials.gov",
          authors: sponsor?.leadSponsor?.name ?? "Unknown sponsor",
          journal: (cond?.conditions ?? []).join("; "),
          sampleSize: design?.enrollmentInfo?.count ?? null,
          effect: null,
          abstract: "",
          url: `https://clinicaltrials.gov/study/${nctId}`,
          conditions: cond?.conditions ?? [],
          interventions: (arms?.interventions ?? []).map((i) => i.name ?? "Unknown"),
          status: st?.overallStatus ?? "UNKNOWN",
          rawMetadata: {
            phase: design?.phases?.[0] ?? "N/A",
            completionDate: st?.completionDateStruct?.date,
          },
          ingestedAt,
        };
      });

      return { sourceId: "clinicaltrials", items, totalCount: total, ingestedAt, warnings };
    } catch (e) {
      return {
        sourceId: "clinicaltrials",
        items: [],
        totalCount: 0,
        ingestedAt,
        warnings: [`ClinicalTrials ingestion error: ${e instanceof Error ? e.message : String(e)}`],
      };
    }
  },

  async fetchById(id: string): Promise<NormalizedEvidence | null> {
    try {
      const url = `${BASE}/studies/${id}`;
      const res = await fetch(url);
      if (!res.ok) return null;

      const data = (await res.json()) as { protocolSection?: CTStudy["protocolSection"] };
      const p = data.protocolSection;
      if (!p) return null;

      const title = p.identificationModule?.briefTitle ?? "Untitled";
      const tier = classifyTier(title, "trial");
      const startDate = p.statusModule?.startDateStruct?.date;
      const yearMatch = startDate?.match(/\b(19|20)\d{2}\b/);

      return {
        id,
        title,
        tier,
        year: yearMatch ? parseInt(yearMatch[0], 10) : null,
        sourceId: "clinicaltrials",
        sourceName: "ClinicalTrials.gov",
        authors: p.sponsorCollaboratorsModule?.leadSponsor?.name ?? "Unknown",
        journal: (p.conditionsModule?.conditions ?? []).join("; "),
        sampleSize: p.designModule?.enrollmentInfo?.count ?? null,
        effect: null,
        abstract: "",
        url: `https://clinicaltrials.gov/study/${id}`,
        conditions: p.conditionsModule?.conditions ?? [],
        interventions: (p.armsInterventionsModule?.interventions ?? []).map(
          (i) => i.name ?? "Unknown",
        ),
        status: p.statusModule?.overallStatus ?? "UNKNOWN",
        rawMetadata: { phase: p.designModule?.phases?.[0] ?? "N/A" },
        ingestedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  },

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE}/studies?query.cond=test&pageSize=1`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
