// ─────────────────────────────────────────────────────────────────────────────
// Evidence Tier Classifier — methodology-aware classification engine.
// Analyzes title + abstract text to determine study design with confidence.
// Replaces simple keyword heuristics with pattern-based scoring.
// ─────────────────────────────────────────────────────────────────────────────

import type { EvidenceTier } from "./evidence";

export interface ClassificationResult {
  tier: EvidenceTier;
  confidence: number;
  matchedPatterns: string[];
}

interface PatternRule {
  pattern: RegExp;
  tier: EvidenceTier;
  weight: number;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern rules — ordered by specificity (most specific first)
// Each rule has a regex, target tier, confidence weight, and human-readable name
// ─────────────────────────────────────────────────────────────────────────────

const PATTERNS: PatternRule[] = [
  // ── Meta-analysis / Systematic Review ──
  {
    pattern: /\bmeta[\s-]?analysis\b/i,
    tier: "meta-analysis",
    weight: 10,
    name: "meta-analysis keyword",
  },
  {
    pattern: /\bsystematic\s+(review|review\s+and\s+meta[\s-]?analysis)\b/i,
    tier: "meta-analysis",
    weight: 9,
    name: "systematic review keyword",
  },
  {
    pattern: /\bprisma\b.*\b(flow\s+diagram|checklist|statement)\b/i,
    tier: "meta-analysis",
    weight: 8,
    name: "PRISMA reporting",
  },
  {
    pattern: /\bcombined\s+(results|analysis|data)\s+from\b.*\bstudies\b/i,
    tier: "meta-analysis",
    weight: 6,
    name: "combined results phrasing",
  },
  {
    pattern: /\bpooled\s+(analysis|estimate|effect|odds)\b/i,
    tier: "meta-analysis",
    weight: 7,
    name: "pooled analysis",
  },
  {
    pattern: /\bforest\s+plot\b/i,
    tier: "meta-analysis",
    weight: 8,
    name: "forest plot mention",
  },
  {
    pattern: /\bheterogeneity\b.*\b(i²|i-squared|tau²)\b/i,
    tier: "meta-analysis",
    weight: 7,
    name: "heterogeneity metrics",
  },

  // ── Randomized Controlled Trial ──
  {
    pattern: /\brandomized\s+(controlled|placebo[\s-]?controlled)\s+trial\b/i,
    tier: "rct",
    weight: 10,
    name: "randomized controlled trial",
  },
  {
    pattern: /\brandomised\s+(controlled|placebo[\s-]?controlled)\s+trial\b/i,
    tier: "rct",
    weight: 10,
    name: "randomised controlled trial",
  },
  {
    pattern: /\bdouble[\s-]?blind\b.*\brandomized\b/i,
    tier: "rct",
    weight: 9,
    name: "double-blind randomized",
  },
  {
    pattern: /\bconsort\b.*\b(statement|checklist|flow)\b/i,
    tier: "rct",
    weight: 8,
    name: "CONSORT reporting",
  },
  {
    pattern: /\brandomly\s+(assigned|allocated|assigned\s+to|allocated\s+to)\b/i,
    tier: "rct",
    weight: 7,
    name: "random allocation",
  },
  {
    pattern: /\bphase\s+[1-4]\s+(clinical\s+)?trial\b/i,
    tier: "rct",
    weight: 7,
    name: "phase trial",
  },
  {
    pattern: /\bintervention(?:al)?\s+(group|arm|trial)\b/i,
    tier: "rct",
    weight: 5,
    name: "intervention group",
  },
  {
    pattern: /\bplacebo[\s-]?controlled\b/i,
    tier: "rct",
    weight: 6,
    name: "placebo controlled",
  },
  {
    pattern: /\bcrossover\s+(design|trial|study)\b/i,
    tier: "rct",
    weight: 7,
    name: "crossover design",
  },

  // ── Guideline / Recommendation ──
  {
    pattern: /\bclinical\s+practice\s+guideline\b/i,
    tier: "guideline",
    weight: 10,
    name: "clinical practice guideline",
  },
  {
    pattern: /\bguideline[s]?\b.*\b(recommend|update|revis|issu)\w*/i,
    tier: "guideline",
    weight: 8,
    name: "guideline recommendation",
  },
  {
    pattern: /\bconsensus\s+(statement|recommendation|conference)\b/i,
    tier: "guideline",
    weight: 7,
    name: "consensus statement",
  },
  {
    pattern: /\bgrading\s+of\s+recommendations?\b/i,
    tier: "guideline",
    weight: 7,
    name: "GRADE framework",
  },
  {
    pattern: /evidence[\s-]?based\s+(practice|recommendation|guideline|medicine)\b/i,
    tier: "guideline",
    weight: 6,
    name: "evidence-based practice",
  },
  {
    pattern: /\b(aha|acc|esc|nice|who|cdc|nccn)\b.*\b(guideline|recommendation|statement)\b/i,
    tier: "guideline",
    weight: 8,
    name: "society guideline",
  },
  {
    pattern: /\b(world health organization)\b.*\b(guideline|recommendation)\b/i,
    tier: "guideline",
    weight: 8,
    name: "WHO full name guideline",
  },
  {
    pattern: /\bexpert\s+(consensus|panel|group|committee)\b/i,
    tier: "guideline",
    weight: 6,
    name: "expert consensus",
  },

  // ── Cohort / Observational ──
  {
    pattern: /\bcohort\s+(study|analysis|design|trial)\b/i,
    tier: "cohort",
    weight: 8,
    name: "cohort study",
  },
  {
    pattern: /\bprospective\s+(cohort|study|observation|analysis)\b/i,
    tier: "cohort",
    weight: 8,
    name: "prospective cohort",
  },
  {
    pattern: /\bretrospective\s+(cohort|study|analysis|review)\b/i,
    tier: "cohort",
    weight: 7,
    name: "retrospective cohort",
  },
  {
    pattern: /\bcross[\s-]?sectional\s+(study|survey|analysis)\b/i,
    tier: "cohort",
    weight: 7,
    name: "cross-sectional study",
  },
  {
    pattern: /\bobservational\s+(study|design|analysis|trial)\b/i,
    tier: "cohort",
    weight: 6,
    name: "observational study",
  },
  {
    pattern: /\bepidemiolog\w+\s+(study|analysis|survey|investigation)\b/i,
    tier: "cohort",
    weight: 6,
    name: "epidemiological study",
  },
  {
    pattern: /\bincidence\s+(and|&)\s+mortality\b/i,
    tier: "cohort",
    weight: 5,
    name: "incidence and mortality",
  },
  {
    pattern: /\bprediction\s+(model|modeling|score|tool)\b/i,
    tier: "cohort",
    weight: 5,
    name: "prediction model",
  },
  {
    pattern: /\brisk\s+(factor|assessment|score|stratification)\b/i,
    tier: "cohort",
    weight: 5,
    name: "risk factor assessment",
  },
  {
    pattern: /\bsurvival\s+(analysis|rate|curve|outcome)\b/i,
    tier: "cohort",
    weight: 5,
    name: "survival analysis",
  },
  {
    pattern: /\bnarrative\s+review\b/i,
    tier: "cohort",
    weight: 3,
    name: "narrative review",
  },

  // ── Case Report ──
  {
    pattern: /\bcase\s+report\b/i,
    tier: "case-report",
    weight: 8,
    name: "case report",
  },
  {
    pattern: /\bcase\s+series\b/i,
    tier: "case-report",
    weight: 7,
    name: "case series",
  },
  {
    pattern: /\bhere\s+we\s+(report|describe|present)\s+a\s+(case|patient|novel)\b/i,
    tier: "case-report",
    weight: 6,
    name: "here we report case",
  },
  {
    pattern: /\ba\s+case\s+of\b/i,
    tier: "case-report",
    weight: 5,
    name: "a case of",
  },

  // ── Expert Opinion ──
  {
    pattern: /\beditorial\b/i,
    tier: "expert-opinion",
    weight: 6,
    name: "editorial",
  },
  {
    pattern: /\bcommentary\b/i,
    tier: "expert-opinion",
    weight: 5,
    name: "commentary",
  },
  {
    pattern: /\bopinion\b.*\barticle|piece|paper\b/i,
    tier: "expert-opinion",
    weight: 5,
    name: "opinion piece",
  },
  {
    pattern: /\bperspective\b.*\b(editorial|commentary)\b/i,
    tier: "expert-opinion",
    weight: 5,
    name: "perspective piece",
  },
  {
    pattern: /\bleditorial\s+comment\b/i,
    tier: "expert-opinion",
    weight: 6,
    name: "editorial comment",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Source-type hints — some sources strongly imply a tier
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_HINTS: Array<{ match: RegExp; tier: EvidenceTier; weight: number; name: string }> = [
  { match: /cochrane\b/i, tier: "meta-analysis", weight: 9, name: "Cochrane source" },
  { match: /clinicaltrials\.gov/i, tier: "rct", weight: 6, name: "ClinicalTrials.gov" },
  {
    match: /\b(world health organization|who)\b.*guideline/i,
    tier: "guideline",
    weight: 8,
    name: "WHO guideline",
  },
  { match: /\bnice\b.*guideline/i, tier: "guideline", weight: 8, name: "NICE guideline" },
  {
    match: /\bcdc\b.*\b(report|mmwr|guideline)\b/i,
    tier: "guideline",
    weight: 7,
    name: "CDC report",
  },
  {
    match: /\baha\b.*\b(guideline|statement|recommendation)\b/i,
    tier: "guideline",
    weight: 8,
    name: "AHA guideline",
  },
  {
    match: /\bacc\b.*\b(guideline|statement|recommendation)\b/i,
    tier: "guideline",
    weight: 8,
    name: "ACC guideline",
  },
  {
    match: /\bnccn\b.*\b(guideline|version|update)\b/i,
    tier: "guideline",
    weight: 8,
    name: "NCCN guideline",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sample size heuristics — methodology can sometimes be inferred from N
// ─────────────────────────────────────────────────────────────────────────────

function sampleSizeHint(n: number | null): { tier: EvidenceTier; weight: number } | null {
  if (n === null) return null;
  if (n <= 15) return { tier: "case-report", weight: 3 };
  if (n <= 100) return { tier: "cohort", weight: 2 };
  // Large N doesn't confirm methodology but weakly suggests observational
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main classification function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify a study's evidence tier using pattern-based scoring.
 * Analyzes title + abstract + source metadata for methodology clues.
 *
 * Returns the tier with highest cumulative score, plus a confidence
 * score and list of matched patterns for transparency.
 */
export function classifyTierAdvanced(
  text: string,
  opts: {
    source?: string;
    type?: "paper" | "trial";
    sampleSize?: number | null;
  } = {},
): ClassificationResult {
  const combined = `${text} ${opts.source ?? ""}`;
  const matchedPatterns: string[] = [];

  // Score accumulator per tier
  const scores: Record<EvidenceTier, number> = {
    "meta-analysis": 0,
    rct: 0,
    cohort: 0,
    guideline: 0,
    "case-report": 0,
    "expert-opinion": 0,
  };

  // Source type hint — immediate strong signal
  if (opts.type === "trial") {
    scores.rct += 6;
    matchedPatterns.push("source type: trial");
  }

  // Source-specific hints
  for (const hint of SOURCE_HINTS) {
    if (hint.match.test(combined)) {
      scores[hint.tier] += hint.weight;
      matchedPatterns.push(hint.name);
    }
  }

  // Pattern matching — all matching rules contribute
  for (const rule of PATTERNS) {
    if (rule.pattern.test(combined)) {
      scores[rule.tier] += rule.weight;
      matchedPatterns.push(rule.name);
    }
  }

  // Sample size weak signal
  const sizeHint = sampleSizeHint(opts.sampleSize ?? null);
  if (sizeHint) {
    scores[sizeHint.tier] += sizeHint.weight;
    matchedPatterns.push(`sample size hint (N=${opts.sampleSize})`);
  }

  // Find winning tier
  let bestTier: EvidenceTier = "cohort";
  let bestScore = 0;
  let totalScore = 0;

  for (const [tier, score] of Object.entries(scores) as [EvidenceTier, number][]) {
    totalScore += score;
    if (score > bestScore) {
      bestScore = score;
      bestTier = tier;
    }
  }

  // Confidence: ratio of winner to total, scaled 0–100
  const confidence =
    totalScore > 0
      ? Math.min(100, Math.round((bestScore / totalScore) * 100 * Math.min(1, bestScore / 8)))
      : 50;

  // If no patterns matched at all, return low-confidence default
  if (matchedPatterns.length === 0) {
    return {
      tier: "cohort",
      confidence: 30,
      matchedPatterns: ["no patterns matched — defaulting"],
    };
  }

  return { tier: bestTier, confidence, matchedPatterns };
}

/**
 * Simplified tier classification — backward-compatible wrapper.
 * Returns just the tier (no confidence), matching the old classifyTier() signature.
 */
export function classifyTierEnhanced(
  title: string,
  type?: "paper" | "trial",
  source?: string,
): EvidenceTier {
  return classifyTierAdvanced(title, { type, source }).tier;
}
