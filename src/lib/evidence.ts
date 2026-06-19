// ─────────────────────────────────────────────────────────────────────────────
// Evidence Engine — core domain model for PRAN's evidence intelligence layer.
// Every piece of evidence has provenance: source, citation, confidence, metadata.
// Nothing exists without origin.
// ─────────────────────────────────────────────────────────────────────────────

/** Evidence quality tiers — maps to the pyramid levels */
export type EvidenceTier =
  | "meta-analysis"
  | "rct"
  | "cohort"
  | "case-report"
  | "guideline"
  | "expert-opinion";

export interface TierMeta {
  label: string;
  token: string;
  color: string;
}

/** Tier display metadata — used by EvidenceCard and Pyramid views */
export const tierMeta: Record<EvidenceTier, TierMeta> = {
  "meta-analysis": {
    label: "Meta-Analysis",
    token: "tier-meta",
    color: "var(--color-tier-meta)",
  },
  rct: {
    label: "RCT",
    token: "tier-rct",
    color: "var(--color-tier-rct)",
  },
  cohort: {
    label: "Cohort",
    token: "tier-cohort",
    color: "var(--color-tier-cohort)",
  },
  "case-report": {
    label: "Case Report",
    token: "tier-case",
    color: "var(--color-tier-case)",
  },
  guideline: {
    label: "Guideline",
    token: "tier-guide",
    color: "var(--color-tier-guide)",
  },
  "expert-opinion": {
    label: "Expert Opinion",
    token: "tier-case",
    color: "var(--color-tier-case)",
  },
};

/** A single piece of evidence — the atomic unit of PRAN's knowledge layer */
export interface EvidencePiece {
  /** Unique identifier (PMID, NCT ID, DOI, etc.) */
  id: string;
  /** Human-readable title */
  title: string;
  /** Evidence tier classification */
  tier: EvidenceTier;
  /** Publication or registration year */
  year: number | null;
  /** Source system (PubMed, ClinicalTrials.gov, OpenFDA, etc.) */
  source: string;
  /** Author list (semicolon-separated) */
  authors: string;
  /** Journal or registry name */
  journal: string;
  /** Sample size if applicable */
  n: number | null;
  /** Effect size or key finding summary */
  effect: string | null;
  /** Confidence score (0–100) based on tier + recency + sample size */
  confidence: number;
  /** Direct URL to the source record */
  url: string;
  /** Raw abstract text (fetched on demand) */
  abstract: string;
}

/** Conflict between two evidence pieces */
export interface EvidenceConflict {
  id: string;
  a: EvidencePiece;
  b: EvidencePiece;
  /** Nature of the disagreement */
  nature: string;
  /** Confidence that this is a genuine conflict (not just different populations) */
  confidence: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier classification heuristics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify a paper's evidence tier from its title and metadata.
 * Uses keyword heuristics — will be upgraded to LLM classification later.
 */
export function classifyTier(title: string, type?: "paper" | "trial"): EvidenceTier {
  const lower = title.toLowerCase();

  if (type === "trial") return "rct";
  if (lower.includes("meta-analysis") || lower.includes("systematic review"))
    return "meta-analysis";
  if (lower.includes("randomized") || lower.includes("rct") || lower.includes("randomised"))
    return "rct";
  if (lower.includes("cohort") || lower.includes("prospective") || lower.includes("retrospective"))
    return "cohort";
  if (lower.includes("case report") || lower.includes("case series")) return "case-report";
  if (
    lower.includes("guideline") ||
    lower.includes("recommendation") ||
    lower.includes("consensus")
  )
    return "guideline";

  return "cohort";
}

/**
 * Compute a confidence score (0–100) based on tier, recency, and sample size.
 * Higher tiers, more recent data, and larger samples yield higher confidence.
 */
export function computeConfidence(piece: {
  tier: EvidenceTier;
  year: number | null;
  n: number | null;
}): number {
  // Base score from tier
  const tierScores: Record<EvidenceTier, number> = {
    "meta-analysis": 90,
    rct: 80,
    cohort: 60,
    guideline: 70,
    "case-report": 30,
    "expert-opinion": 20,
  };

  let score = tierScores[piece.tier] ?? 50;

  // Recency adjustment: +5 per decade since 2000, capped at +15
  if (piece.year) {
    const decadesSince2000 = Math.max(0, (piece.year - 2000) / 10);
    score += Math.min(15, decadesSince2000 * 5);
  }

  // Sample size boost: +10 if n > 1000, +5 if n > 100
  if (piece.n && piece.n > 1000) score += 10;
  else if (piece.n && piece.n > 100) score += 5;

  return Math.min(100, Math.round(score));
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion: LiveTopicData items → EvidencePiece[]
// ─────────────────────────────────────────────────────────────────────────────

import type { Trial, Paper } from "./api/types";
import { parseAbstract } from "./abstract-parser";

/** Convert a PubMed paper to an EvidencePiece */
export function paperToEvidence(paper: Paper): EvidencePiece {
  const tier = classifyTier(paper.title, "paper");
  const parsed = parseAbstract(paper.abstract);
  const n = parsed.sampleSize;
  // Build effect string from extracted data
  const effectParts: string[] = [];
  if (parsed.effectSize) effectParts.push(parsed.effectSize);
  if (parsed.pValue && !effectParts.some((e) => e.includes("p "))) {
    effectParts.push(parsed.pValue);
  }
  const effect = effectParts.length > 0 ? effectParts.join("; ") : parsed.conclusion;

  return {
    id: paper.pmid,
    title: paper.title,
    tier,
    year: paper.year,
    source: "PubMed",
    authors: paper.authors.join(" · "),
    journal: paper.journal,
    n,
    effect: effect && effect.length > 200 ? effect.slice(0, 197) + "..." : effect,
    confidence: computeConfidence({ tier, year: paper.year, n }),
    url: paper.url,
    abstract: paper.abstract,
  };
}

/** Convert a ClinicalTrials.gov trial to an EvidencePiece */
export function trialToEvidence(trial: Trial): EvidencePiece {
  const tier: EvidenceTier = "rct";
  return {
    id: trial.nctId,
    title: trial.title,
    tier,
    year: trial.startDate
      ? parseInt(trial.startDate.match(/\b(19|20)\d{2}\b/)?.[0] ?? "0", 10) || null
      : null,
    source: "ClinicalTrials.gov",
    authors: trial.sponsor,
    journal: trial.conditions.join(", "),
    n: trial.enrollment,
    effect: null,
    confidence: computeConfidence({
      tier,
      year: null,
      n: trial.enrollment,
    }),
    url: trial.url,
    abstract: "",
  };
}
