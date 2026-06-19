// ─────────────────────────────────────────────────────────────────────────────
// Evidence Gap Detection — identifies missing or underrepresented evidence
// in a topic's landscape. Flags methodological gaps, population gaps,
// temporal gaps, and source gaps without requiring LLM integration.
// ─────────────────────────────────────────────────────────────────────────────

import type { EvidencePiece, EvidenceTier } from "@/lib/evidence";

export type GapSeverity = "critical" | "significant" | "minor";

export interface EvidenceGap {
  id: string;
  type:
    | "tier_missing"
    | "tier_underrepresented"
    | "temporal"
    | "sample_size"
    | "source_diversity"
    | "population"
    | "outcome_reporting"
    | "replication";
  severity: GapSeverity;
  title: string;
  description: string;
  recommendation: string;
  affectedTiers?: EvidenceTier[];
  currentCount?: number;
  expectedMinimum?: number;
}

export interface GapAnalysis {
  gaps: EvidenceGap[];
  score: number;
  summary: string;
  strengths: string[];
}

const MINIMUM_EVIDENCE_THRESHOLDS: Record<EvidenceTier, number> = {
  "meta-analysis": 1,
  rct: 3,
  cohort: 2,
  guideline: 1,
  "case-report": 0,
  "expert-opinion": 0,
};

const EXPECTED_TIERS_FOR_STRONG_EVIDENCE: EvidenceTier[] = ["meta-analysis", "rct", "guideline"];

export function detectGaps(evidence: EvidencePiece[]): GapAnalysis {
  const gaps: EvidenceGap[] = [];
  const strengths: string[] = [];

  detectTierGaps(evidence, gaps, strengths);
  detectTemporalGaps(evidence, gaps, strengths);
  detectSampleSizeGaps(evidence, gaps, strengths);
  detectSourceDiversityGaps(evidence, gaps, strengths);
  detectReplicationGaps(evidence, gaps, strengths);
  detectOutcomeReportingGaps(evidence, gaps, strengths);

  const score = computeGapScore(gaps, evidence.length);
  const summary = generateGapSummary(gaps, score, evidence.length);

  return { gaps, score, summary, strengths };
}

function detectTierGaps(evidence: EvidencePiece[], gaps: EvidenceGap[], strengths: string[]): void {
  const tierCounts = countByTier(evidence);

  for (const [tier, minimum] of Object.entries(MINIMUM_EVIDENCE_THRESHOLDS)) {
    const t = tier as EvidenceTier;
    const count = tierCounts[t] ?? 0;

    if (count === 0 && minimum > 0) {
      gaps.push({
        id: `tier-missing-${t}`,
        type: "tier_missing",
        severity: t === "meta-analysis" || t === "rct" ? "critical" : "significant",
        title: `No ${t.replace("-", " ")} studies found`,
        description: `The evidence base contains no ${t.replace("-", " ")} studies. ${t === "meta-analysis" ? "Meta-analyses are the gold standard for evidence synthesis." : t === "rct" ? "RCTs are essential for establishing causal relationships." : `At least ${minimum} ${t.replace("-", " ")} studies are recommended.`}`,
        recommendation: `Search for ${t.replace("-", " ")} studies on ${t === "meta-analysis" ? "systematic review databases" : "clinical trial registries"}. Consider broadening search terms.`,
        affectedTiers: [t],
        currentCount: 0,
        expectedMinimum: minimum,
      });
    } else if (count > 0 && count < minimum) {
      gaps.push({
        id: `tier-under-${t}`,
        type: "tier_underrepresented",
        severity: "minor",
        title: `Only ${count} ${t.replace("-", " ")} study${count > 1 ? "ies" : ""}`,
        description: `Only ${count} ${t.replace("-", " ")} ${count > 1 ? "studies" : "study"} found. A minimum of ${minimum} is recommended for robust evidence.`,
        recommendation: `Increase ${t.replace("-", " ")} evidence through additional literature review.`,
        affectedTiers: [t],
        currentCount: count,
        expectedMinimum: minimum,
      });
    } else if (count >= minimum) {
      strengths.push(
        `${t.replace("-", " ")} evidence: ${count} ${count > 1 ? "studies" : "study"} (meets minimum threshold)`,
      );
    }
  }

  const hasHighTier = EXPECTED_TIERS_FOR_STRONG_EVIDENCE.some((t) => (tierCounts[t] ?? 0) > 0);
  if (hasHighTier) {
    strengths.push("Contains high-tier evidence (meta-analysis, RCT, or guideline)");
  }
}

function detectTemporalGaps(
  evidence: EvidencePiece[],
  gaps: EvidenceGap[],
  strengths: string[],
): void {
  const currentYear = new Date().getFullYear();
  const years = evidence.map((e) => e.year).filter((y): y is number => y !== null);

  if (years.length === 0) return;

  const mostRecent = Math.max(...years);
  const oldest = Math.min(...years);
  const yearsSinceRecent = currentYear - mostRecent;

  if (yearsSinceRecent >= 7) {
    gaps.push({
      id: "temporal-outdated",
      type: "temporal",
      severity: yearsSinceRecent >= 10 ? "critical" : "significant",
      title: `Evidence is ${yearsSinceRecent} years old`,
      description: `The most recent evidence is from ${mostRecent} (${yearsSinceRecent} years ago). Medical evidence should ideally be updated within 5 years.`,
      recommendation: `Search for recent publications and ongoing clinical trials.`,
    });
  } else if (yearsSinceRecent <= 3) {
    strengths.push(`Recent evidence available (most recent: ${mostRecent})`);
  }

  const span = mostRecent - oldest;
  if (span > 0 && evidence.length >= 5) {
    const decades = Math.ceil(span / 10);
    if (decades >= 3) {
      gaps.push({
        id: "temporal-span",
        type: "temporal",
        severity: "minor",
        title: `Evidence spans ${span} years (${oldest}–${mostRecent})`,
        description: `Evidence spans ${decades} decades. Older studies may not reflect current medical practice.`,
        recommendation: `Weight recent evidence more heavily in analysis.`,
      });
    }
  }
}

function detectSampleSizeGaps(
  evidence: EvidencePiece[],
  gaps: EvidenceGap[],
  strengths: string[],
): void {
  const withSampleSize = evidence.filter((e) => e.n !== null && e.n > 0);
  if (withSampleSize.length === 0) {
    gaps.push({
      id: "sample-unknown",
      type: "sample_size",
      severity: "significant",
      title: "Sample sizes unknown",
      description:
        "No sample size data available for any evidence piece. Sample size is critical for assessing statistical power.",
      recommendation: "Extract sample sizes from study abstracts or full texts.",
    });
    return;
  }

  const largeSample = withSampleSize.filter((e) => (e.n ?? 0) >= 1000);
  const mediumSample = withSampleSize.filter((e) => (e.n ?? 0) >= 100 && (e.n ?? 0) < 1000);
  const smallSample = withSampleSize.filter((e) => (e.n ?? 0) < 100);

  if (largeSample.length > 0) {
    strengths.push(
      `${largeSample.length} large-scale ${largeSample.length > 1 ? "studies" : "study"} (n ≥ 1,000)`,
    );
  }

  if (smallSample.length > 0 && withSampleSize.length >= 3) {
    const pct = Math.round((smallSample.length / withSampleSize.length) * 100);
    if (pct >= 50) {
      gaps.push({
        id: "sample-small-dominant",
        type: "sample_size",
        severity: "significant",
        title: `${pct}% of studies have small samples (n < 100)`,
        description: `${smallSample.length} of ${withSampleSize.length} studies have sample sizes below 100, limiting statistical power.`,
        recommendation: "Prioritize larger studies or pooled analyses.",
      });
    }
  }

  if (mediumSample.length + largeSample.length > 0) {
    strengths.push(
      `${mediumSample.length + largeSample.length} studies with adequate sample sizes (n ≥ 100)`,
    );
  }
}

function detectSourceDiversityGaps(
  evidence: EvidencePiece[],
  gaps: EvidenceGap[],
  strengths: string[],
): void {
  const bySource = new Map<string, number>();
  for (const e of evidence) {
    bySource.set(e.source, (bySource.get(e.source) ?? 0) + 1);
  }

  if (bySource.size === 1) {
    gaps.push({
      id: "source-single",
      type: "source_diversity",
      severity: "significant",
      title: "Single source bias",
      description: `All evidence comes from one source (${[...bySource.keys()][0]}). Cross-source validation strengthens evidence reliability.`,
      recommendation: "Search additional data sources (PubMed, ClinicalTrials.gov, WHO, NICE).",
    });
  } else if (bySource.size >= 3) {
    strengths.push(`Evidence from ${bySource.size} different sources`);
  }

  const dominantSource = [...bySource.entries()].sort((a, b) => b[1] - a[1])[0];
  if (dominantSource && dominantSource[1] > evidence.length * 0.8 && evidence.length >= 5) {
    gaps.push({
      id: "source-concentration",
      type: "source_diversity",
      severity: "minor",
      title: `Source concentration: ${dominantSource[0]} provides ${Math.round((dominantSource[1] / evidence.length) * 100)}%`,
      description: `One source dominates the evidence base. Diversifying sources reduces bias.`,
      recommendation: "Include evidence from complementary data sources.",
    });
  }
}

function detectReplicationGaps(
  evidence: EvidencePiece[],
  gaps: EvidenceGap[],
  strengths: string[],
): void {
  const rcts = evidence.filter((e) => e.tier === "rct");
  if (rcts.length === 0) return;

  const interventions = new Map<string, EvidencePiece[]>();
  for (const rct of rcts) {
    const key = extractInterventionKey(rct.title);
    if (key) {
      const existing = interventions.get(key) ?? [];
      existing.push(rct);
      interventions.set(key, existing);
    }
  }

  for (const [intervention, studies] of interventions) {
    if (studies.length >= 2) {
      strengths.push(`${studies.length} RCTs replicated for "${intervention}"`);
    }
  }

  if (rcts.length >= 3 && interventions.size === rcts.length) {
    gaps.push({
      id: "replication-none",
      type: "replication",
      severity: "significant",
      title: "No RCT replication detected",
      description: `${rcts.length} RCTs found but each studies a different intervention. Replication of findings is essential for evidence reliability.`,
      recommendation: "Look for additional RCTs on the same interventions.",
    });
  }
}

function detectOutcomeReportingGaps(
  evidence: EvidencePiece[],
  gaps: EvidenceGap[],
  strengths: string[],
): void {
  const withEffect = evidence.filter((e) => e.effect && e.effect.length > 0);
  const pct = evidence.length > 0 ? Math.round((withEffect.length / evidence.length) * 100) : 0;

  if (pct < 30 && evidence.length >= 5) {
    gaps.push({
      id: "outcome-reporting",
      type: "outcome_reporting",
      severity: "significant",
      title: "Limited outcome reporting",
      description: `Only ${pct}% of evidence pieces report effect sizes or outcomes. Quantitative synthesis requires reported outcomes.`,
      recommendation: "Extract effect sizes, confidence intervals, and p-values from abstracts.",
    });
  } else if (pct >= 60) {
    strengths.push(`${pct}% of evidence reports quantitative outcomes`);
  }
}

function extractInterventionKey(title: string): string | null {
  const lower = title.toLowerCase();
  const vsMatch = lower.match(/(\w[\w\s]*?)\s+versus\s+/);
  if (vsMatch) return vsMatch[1].trim();

  const vsMatch2 = lower.match(/(\w[\w\s]*?)\s+vs\.?\s+/);
  if (vsMatch2) return vsMatch2[1].trim();

  const comparedMatch = lower.match(/(\w[\w\s]*?)\s+compared\s+to\s+/);
  if (comparedMatch) return comparedMatch[1].trim();

  return null;
}

function computeGapScore(gaps: EvidenceGap[], totalEvidence: number): number {
  if (totalEvidence === 0) return 0;

  let penalty = 0;
  for (const gap of gaps) {
    switch (gap.severity) {
      case "critical":
        penalty += 25;
        break;
      case "significant":
        penalty += 15;
        break;
      case "minor":
        penalty += 5;
        break;
    }
  }

  return Math.max(0, Math.min(100, 100 - penalty));
}

function generateGapSummary(gaps: EvidenceGap[], score: number, totalEvidence: number): string {
  if (totalEvidence === 0) {
    return "No evidence available for analysis. Start by searching for relevant studies.";
  }

  const critical = gaps.filter((g) => g.severity === "critical").length;
  const significant = gaps.filter((g) => g.severity === "significant").length;

  if (critical > 0) {
    return `Evidence landscape has ${critical} critical gap${critical > 1 ? "s" : ""} and ${significant} significant gap${significant > 1 ? "s" : ""}. Score: ${score}/100. Major improvements needed.`;
  }

  if (significant > 0) {
    return `Evidence landscape has ${significant} significant gap${significant > 1 ? "s" : ""}. Score: ${score}/100. Targeted improvements recommended.`;
  }

  if (gaps.length > 0) {
    return `Evidence landscape is solid with ${gaps.length} minor gap${gaps.length > 1 ? "s" : ""}. Score: ${score}/100.`;
  }

  return `Excellent evidence landscape with no significant gaps detected. Score: ${score}/100.`;
}

function countByTier(evidence: EvidencePiece[]): Record<EvidenceTier, number> {
  const counts: Record<string, number> = {};
  for (const e of evidence) {
    counts[e.tier] = (counts[e.tier] ?? 0) + 1;
  }
  return counts as Record<EvidenceTier, number>;
}
