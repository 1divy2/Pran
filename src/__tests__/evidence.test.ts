import { describe, it, expect } from "vitest";
import {
  classifyTier,
  computeConfidence,
  paperToEvidence,
  trialToEvidence,
  tierMeta,
  type EvidenceTier,
} from "@/lib/evidence";
import type { Paper, Trial } from "@/lib/api/types";

// ─────────────────────────────────────────────────────────────────────────────
// classifyTier tests
// ─────────────────────────────────────────────────────────────────────────────

describe("classifyTier", () => {
  it("classifies meta-analysis papers", () => {
    expect(classifyTier("Meta-analysis of statin therapy")).toBe("meta-analysis");
    expect(classifyTier("Systematic review and meta-analysis")).toBe("meta-analysis");
  });

  it("classifies RCT papers", () => {
    expect(classifyTier("Randomized controlled trial of aspirin")).toBe("rct");
    expect(classifyTier("A randomized study of metformin")).toBe("rct");
    expect(classifyTier("Double-blind RCT of placebo")).toBe("rct");
  });

  it("classifies cohort studies", () => {
    expect(classifyTier("Cohort study of hypertension")).toBe("cohort");
    expect(classifyTier("Prospective analysis of diabetes")).toBe("cohort");
    expect(classifyTier("Retrospective cohort study")).toBe("cohort");
  });

  it("classifies case reports", () => {
    expect(classifyTier("Case report of rare side effect")).toBe("case-report");
    expect(classifyTier("Case series of 5 patients")).toBe("case-report");
  });

  it("classifies guidelines", () => {
    expect(classifyTier("ACC/AHA Guideline for hypertension")).toBe("guideline");
    expect(classifyTier("Recommendations for diabetes management")).toBe("guideline");
    expect(classifyTier("Expert consensus on treatment")).toBe("guideline");
  });

  it("classifies trials by type parameter", () => {
    expect(classifyTier("Some trial title", "trial")).toBe("rct");
  });

  it("defaults to cohort for unclassified papers", () => {
    expect(classifyTier("A study of aspirin effects")).toBe("cohort");
    expect(classifyTier("Observational analysis")).toBe("cohort");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeConfidence tests
// ─────────────────────────────────────────────────────────────────────────────

describe("computeConfidence", () => {
  it("returns high confidence for meta-analyses", () => {
    const score = computeConfidence({ tier: "meta-analysis", year: 2024, n: null });
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it("returns medium confidence for RCTs", () => {
    const score = computeConfidence({ tier: "rct", year: 2024, n: null });
    expect(score).toBeGreaterThanOrEqual(80);
    expect(score).toBeLessThan(100);
  });

  it("returns lower confidence for case reports", () => {
    const score = computeConfidence({ tier: "case-report", year: 2024, n: null });
    expect(score).toBeLessThan(50);
  });

  it("boosts score for recent papers", () => {
    const recent = computeConfidence({ tier: "cohort", year: 2024, n: null });
    const old = computeConfidence({ tier: "cohort", year: 2000, n: null });
    expect(recent).toBeGreaterThan(old);
  });

  it("boosts score for large sample sizes", () => {
    const large = computeConfidence({ tier: "cohort", year: 2020, n: 5000 });
    const small = computeConfidence({ tier: "cohort", year: 2020, n: 50 });
    expect(large).toBeGreaterThan(small);
  });

  it("caps score at 100", () => {
    const score = computeConfidence({ tier: "meta-analysis", year: 2024, n: 10000 });
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// paperToEvidence tests
// ─────────────────────────────────────────────────────────────────────────────

describe("paperToEvidence", () => {
  const mockPaper: Paper = {
    pmid: "12345678",
    title: "Meta-analysis of statin therapy for cardiovascular disease",
    authors: ["Smith J", "Jones A", "Williams B"],
    journal: "The Lancet",
    year: 2023,
    abstract: "Abstract text here",
    url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
  };

  it("converts paper to evidence piece", () => {
    const evidence = paperToEvidence(mockPaper);

    expect(evidence.id).toBe("12345678");
    expect(evidence.title).toBe(mockPaper.title);
    expect(evidence.tier).toBe("meta-analysis");
    expect(evidence.year).toBe(2023);
    expect(evidence.source).toBe("PubMed");
    expect(evidence.journal).toBe("The Lancet");
    expect(evidence.url).toBe(mockPaper.url);
  });

  it("joins authors with semicolons", () => {
    const evidence = paperToEvidence(mockPaper);
    expect(evidence.authors).toBe("Smith J · Jones A · Williams B");
  });

  it("computes confidence score", () => {
    const evidence = paperToEvidence(mockPaper);
    expect(evidence.confidence).toBeGreaterThan(0);
    expect(evidence.confidence).toBeLessThanOrEqual(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// trialToEvidence tests
// ─────────────────────────────────────────────────────────────────────────────

describe("trialToEvidence", () => {
  const mockTrial: Trial = {
    nctId: "NCT12345678",
    title: "Phase 3 trial of new hypertension drug",
    status: "RECRUITING",
    phase: "PHASE3",
    enrollment: 1500,
    sponsor: "Pfizer Inc.",
    startDate: "2023-01-15",
    completionDate: "2025-06-30",
    conditions: ["Hypertension", "High Blood Pressure"],
    interventions: ["Drug A", "Placebo"],
    url: "https://clinicaltrials.gov/study/NCT12345678",
  };

  it("converts trial to evidence piece", () => {
    const evidence = trialToEvidence(mockTrial);

    expect(evidence.id).toBe("NCT12345678");
    expect(evidence.title).toBe(mockTrial.title);
    expect(evidence.tier).toBe("rct");
    expect(evidence.source).toBe("ClinicalTrials.gov");
    expect(evidence.n).toBe(1500);
    expect(evidence.url).toBe(mockTrial.url);
  });

  it("extracts year from startDate", () => {
    const evidence = trialToEvidence(mockTrial);
    expect(evidence.year).toBe(2023);
  });

  it("uses sponsor as authors", () => {
    const evidence = trialToEvidence(mockTrial);
    expect(evidence.authors).toBe("Pfizer Inc.");
  });

  it("uses conditions as journal", () => {
    const evidence = trialToEvidence(mockTrial);
    expect(evidence.journal).toBe("Hypertension, High Blood Pressure");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// tierMeta tests
// ─────────────────────────────────────────────────────────────────────────────

describe("tierMeta", () => {
  it("has metadata for all tiers", () => {
    const tiers: EvidenceTier[] = [
      "meta-analysis",
      "rct",
      "cohort",
      "case-report",
      "guideline",
      "expert-opinion",
    ];

    for (const tier of tiers) {
      expect(tierMeta[tier]).toBeDefined();
      expect(tierMeta[tier].label).toBeTruthy();
      expect(tierMeta[tier].token).toBeTruthy();
      expect(tierMeta[tier].color).toBeTruthy();
    }
  });
});
