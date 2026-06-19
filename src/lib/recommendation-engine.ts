// ─────────────────────────────────────────────────────────────────────────────
// Treatment Recommendation Engine — synthesizes evidence into structured
// treatment recommendations with confidence intervals and evidence grades.
// Follows GRADE-like evidence assessment methodology.
// ─────────────────────────────────────────────────────────────────────────────

import type { EvidencePiece, EvidenceTier } from "@/lib/evidence";
import { tierMeta } from "@/lib/evidence";
import { detectGaps, type GapAnalysis } from "@/lib/gap-detection";

export type RecommendationStrength =
  | "strongly-recommend"
  | "conditionally-recommend"
  | "insufficient-evidence"
  | "recommend-against";

export type EvidenceGrade = "A" | "B" | "C" | "D" | "I";

export interface TreatmentRecommendation {
  treatment: string;
  strength: RecommendationStrength;
  grade: EvidenceGrade;
  confidenceInterval: {
    lower: number;
    upper: number;
    pointEstimate: number;
  };
  evidenceCount: number;
  evidenceBreakdown: {
    metaAnalysis: number;
    rct: number;
    cohort: number;
    guideline: number;
    other: number;
  };
  summary: string;
  caveats: string[];
  references: EvidencePiece[];
}

export interface RecommendationReport {
  topicName: string;
  generatedAt: string;
  recommendations: TreatmentRecommendation[];
  overallEvidenceQuality: EvidenceGrade;
  gapAnalysis: GapAnalysis;
  clinicalNotes: string[];
}

export function generateRecommendations(
  topicName: string,
  treatments: Array<{ name: string; evidence: EvidencePiece[] }>,
): RecommendationReport {
  const allEvidence = treatments.flatMap((t) => t.evidence);
  const gapAnalysis = detectGaps(allEvidence);

  const recommendations = treatments
    .map((t) => buildRecommendation(t.name, t.evidence))
    .sort((a, b) => gradeToNum(a.grade) - gradeToNum(b.grade));

  const overallQuality = computeOverallGrade(treatments.map((t) => t.evidence));

  const clinicalNotes = generateClinicalNotes(recommendations, gapAnalysis, overallQuality);

  return {
    topicName,
    generatedAt: new Date().toISOString(),
    recommendations,
    overallEvidenceQuality: overallQuality,
    gapAnalysis,
    clinicalNotes,
  };
}

function buildRecommendation(name: string, evidence: EvidencePiece[]): TreatmentRecommendation {
  if (evidence.length === 0) {
    return {
      treatment: name,
      strength: "insufficient-evidence",
      grade: "I",
      confidenceInterval: { lower: 0, upper: 0, pointEstimate: 0 },
      evidenceCount: 0,
      evidenceBreakdown: {
        metaAnalysis: 0,
        rct: 0,
        cohort: 0,
        guideline: 0,
        other: 0,
      },
      summary: "No evidence available for this treatment.",
      caveats: ["Cannot make a recommendation without evidence."],
      references: [],
    };
  }

  const breakdown = getEvidenceBreakdown(evidence);
  const grade = computeGrade(breakdown, evidence);
  const strength = gradeToRecommendation(grade, evidence);
  const ci = computeConfidenceInterval(evidence);
  const summary = generateRecommendationSummary(name, grade, strength, breakdown);
  const caveats = identifyCaveats(evidence, breakdown, ci);
  const references = [...evidence].sort((a, b) => b.confidence - a.confidence).slice(0, 10);

  return {
    treatment: name,
    strength,
    grade,
    confidenceInterval: ci,
    evidenceCount: evidence.length,
    evidenceBreakdown: breakdown,
    summary,
    caveats,
    references,
  };
}

interface EvidenceBreakdown {
  metaAnalysis: number;
  rct: number;
  cohort: number;
  guideline: number;
  other: number;
}

function getEvidenceBreakdown(evidence: EvidencePiece[]): EvidenceBreakdown {
  const breakdown: EvidenceBreakdown = {
    metaAnalysis: 0,
    rct: 0,
    cohort: 0,
    guideline: 0,
    other: 0,
  };

  for (const e of evidence) {
    switch (e.tier) {
      case "meta-analysis":
        breakdown.metaAnalysis++;
        break;
      case "rct":
        breakdown.rct++;
        break;
      case "cohort":
        breakdown.cohort++;
        break;
      case "guideline":
        breakdown.guideline++;
        break;
      default:
        breakdown.other++;
        break;
    }
  }

  return breakdown;
}

function computeGrade(breakdown: EvidenceBreakdown, evidence: EvidencePiece[]): EvidenceGrade {
  const highTier = breakdown.metaAnalysis + breakdown.rct;
  const total = evidence.length;
  const avgConfidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / total;

  if (breakdown.metaAnalysis >= 2 && avgConfidence >= 75) return "A";
  if (breakdown.metaAnalysis >= 1 || (breakdown.rct >= 3 && avgConfidence >= 70)) return "B";
  if (highTier >= 1 || (breakdown.cohort >= 3 && avgConfidence >= 55)) return "C";
  if (total >= 3 && avgConfidence >= 40) return "D";
  return "I";
}

function gradeToRecommendation(
  grade: EvidenceGrade,
  evidence: EvidencePiece[],
): RecommendationStrength {
  switch (grade) {
    case "A":
      return "strongly-recommend";
    case "B":
      return "conditionally-recommend";
    case "C":
      return "conditionally-recommend";
    case "D":
      return evidence.length >= 5 ? "conditionally-recommend" : "insufficient-evidence";
    case "I":
      return "insufficient-evidence";
  }
}

function gradeToNum(grade: EvidenceGrade): number {
  const map: Record<EvidenceGrade, number> = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
    I: 4,
  };
  return map[grade];
}

function computeConfidenceInterval(evidence: EvidencePiece[]): {
  lower: number;
  upper: number;
  pointEstimate: number;
} {
  if (evidence.length === 0) {
    return { lower: 0, upper: 0, pointEstimate: 0 };
  }

  const confidences = evidence.map((e) => e.confidence);
  const mean = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

  const variance =
    confidences.reduce((sum, c) => sum + (c - mean) ** 2, 0) / Math.max(1, confidences.length - 1);
  const stdDev = Math.sqrt(variance);

  const se = stdDev / Math.sqrt(confidences.length);
  const marginOfError = 1.96 * se;

  return {
    lower: Math.max(0, Math.round(mean - marginOfError)),
    upper: Math.min(100, Math.round(mean + marginOfError)),
    pointEstimate: Math.round(mean),
  };
}

function generateRecommendationSummary(
  name: string,
  grade: EvidenceGrade,
  strength: RecommendationStrength,
  breakdown: EvidenceBreakdown,
): string {
  const parts: string[] = [];

  parts.push(`${name} receives an evidence grade of ${grade}.`);

  if (breakdown.metaAnalysis > 0) {
    parts.push(
      `Supported by ${breakdown.metaAnalysis} meta-analysis${breakdown.metaAnalysis > 1 ? "es" : ""}.`,
    );
  }
  if (breakdown.rct > 0) {
    parts.push(
      `Backed by ${breakdown.rct} randomized controlled trial${breakdown.rct > 1 ? "s" : ""}.`,
    );
  }

  switch (strength) {
    case "strongly-recommend":
      parts.push("Strong evidence supports this treatment.");
      break;
    case "conditionally-recommend":
      parts.push("Moderate evidence suggests benefit, but caveats apply.");
      break;
    case "insufficient-evidence":
      parts.push("Evidence is insufficient to make a recommendation.");
      break;
    case "recommend-against":
      parts.push("Evidence suggests this treatment may not be beneficial.");
      break;
  }

  return parts.join(" ");
}

function identifyCaveats(
  evidence: EvidencePiece[],
  breakdown: EvidenceBreakdown,
  ci: { lower: number; upper: number; pointEstimate: number },
): string[] {
  const caveats: string[] = [];

  if (breakdown.metaAnalysis === 0 && breakdown.rct === 0) {
    caveats.push("No high-tier experimental evidence available.");
  }

  if (ci.upper - ci.lower > 30) {
    caveats.push("Wide confidence interval indicates uncertainty in estimates.");
  }

  const recentCount = evidence.filter(
    (e) => e.year && e.year >= new Date().getFullYear() - 5,
  ).length;
  if (recentCount === 0 && evidence.length > 0) {
    caveats.push("No evidence from the last 5 years.");
  }

  const totalN = evidence.reduce((sum, e) => sum + (e.n ?? 0), 0);
  if (totalN < 500 && evidence.length > 0) {
    caveats.push(`Limited total sample size (n=${totalN.toLocaleString()}).`);
  }

  const sources = new Set(evidence.map((e) => e.source));
  if (sources.size === 1) {
    caveats.push("All evidence from a single source.");
  }

  return caveats;
}

function computeOverallGrade(evidenceArrays: EvidencePiece[][]): EvidenceGrade {
  const allEvidence = evidenceArrays.flat();
  if (allEvidence.length === 0) return "I";

  const breakdown = getEvidenceBreakdown(allEvidence);
  return computeGrade(breakdown, allEvidence);
}

function generateClinicalNotes(
  recommendations: TreatmentRecommendation[],
  gapAnalysis: GapAnalysis,
  overallGrade: EvidenceGrade,
): string[] {
  const notes: string[] = [];

  if (overallGrade === "A" || overallGrade === "B") {
    notes.push("Evidence base is sufficient for clinical decision-making.");
  } else if (overallGrade === "C") {
    notes.push(
      "Evidence supports conditional recommendations. Clinical judgment should guide final decisions.",
    );
  } else {
    notes.push(
      "Evidence is insufficient for strong recommendations. Consider consulting clinical experts.",
    );
  }

  if (gapAnalysis.gaps.length > 0) {
    const critical = gapAnalysis.gaps.filter((g) => g.severity === "critical");
    if (critical.length > 0) {
      notes.push(
        `${critical.length} critical evidence gap(s) identified. Address before making definitive recommendations.`,
      );
    }
  }

  const tied = recommendations.filter((r) => r.grade === recommendations[0]?.grade);
  if (tied.length > 1) {
    notes.push(
      `Multiple treatments have comparable evidence grades (${tied.map((r) => r.treatment).join(", ")}). Consider patient-specific factors.`,
    );
  }

  return notes;
}
