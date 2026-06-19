import { describe, it, expect } from "vitest";
import { classifyTierAdvanced, classifyTierEnhanced } from "@/lib/evidence-classifier";

describe("classifyTierAdvanced", () => {
  // ── Meta-analysis ──
  it("classifies meta-analysis from title", () => {
    const result = classifyTierAdvanced("Meta-analysis of statin therapy for cardiovascular risk");
    expect(result.tier).toBe("meta-analysis");
    expect(result.confidence).toBeGreaterThan(60);
  });

  it("classifies systematic review", () => {
    const result = classifyTierAdvanced(
      "Systematic review of the efficacy of cognitive behavioral therapy",
    );
    expect(result.tier).toBe("meta-analysis");
  });

  it("classifies PRISMA-based studies", () => {
    const result = classifyTierAdvanced(
      "A systematic review following PRISMA guidelines for diabetes management",
    );
    expect(result.tier).toBe("meta-analysis");
  });

  it("classifies pooled analysis", () => {
    const result = classifyTierAdvanced(
      "Pooled analysis of individual patient data from 5 clinical trials",
    );
    expect(result.tier).toBe("meta-analysis");
  });

  it("classifies forest plot mention", () => {
    const result = classifyTierAdvanced(
      "Treatment effects shown in forest plot with heterogeneity assessment",
    );
    expect(result.tier).toBe("meta-analysis");
  });

  // ── RCT ──
  it("classifies randomized controlled trial", () => {
    const result = classifyTierAdvanced(
      "Randomized controlled trial of aspirin for primary prevention",
    );
    expect(result.tier).toBe("rct");
    expect(result.confidence).toBeGreaterThan(60);
  });

  it("classifies double-blind randomized", () => {
    const result = classifyTierAdvanced(
      "Double-blind randomized study comparing metformin to placebo",
    );
    expect(result.tier).toBe("rct");
  });

  it("classifies phase trial", () => {
    const result = classifyTierAdvanced("Phase 3 trial of pembrolizumab in lung cancer");
    expect(result.tier).toBe("rct");
  });

  it("classifies clinicaltrials.gov source", () => {
    const result = classifyTierAdvanced("Study of ACE inhibitors in hypertension", {
      source: "ClinicalTrials.gov",
    });
    expect(result.tier).toBe("rct");
  });

  it("classifies from type=trial hint", () => {
    const result = classifyTierAdvanced("Hypertension treatment study", { type: "trial" });
    expect(result.tier).toBe("rct");
  });

  it("classifies crossover design", () => {
    const result = classifyTierAdvanced(
      "Crossover design trial of caffeine on cognitive performance",
    );
    expect(result.tier).toBe("rct");
  });

  // ── Guideline ──
  it("classifies clinical practice guideline", () => {
    const result = classifyTierAdvanced(
      "Clinical practice guideline for the management of type 2 diabetes",
    );
    expect(result.tier).toBe("guideline");
    expect(result.confidence).toBeGreaterThan(60);
  });

  it("classifies consensus statement", () => {
    const result = classifyTierAdvanced(
      "Consensus statement on the diagnosis and treatment of autism spectrum disorder",
    );
    expect(result.tier).toBe("guideline");
  });

  it("classifies AHA guideline", () => {
    const result = classifyTierAdvanced(
      "AHA guideline on the management of patients with atrial fibrillation",
    );
    expect(result.tier).toBe("guideline");
  });

  it("classifies NICE guideline", () => {
    const result = classifyTierAdvanced(
      "NICE guideline on hypertension in adults — updated recommendations",
    );
    expect(result.tier).toBe("guideline");
  });

  it("classifies NCCN guideline", () => {
    const result = classifyTierAdvanced(
      "NCCN guideline version 1.2024 for breast cancer screening",
    );
    expect(result.tier).toBe("guideline");
  });

  // ── Cohort ──
  it("classifies cohort study", () => {
    const result = classifyTierAdvanced(
      "Prospective cohort study of smoking and lung cancer mortality",
    );
    expect(result.tier).toBe("cohort");
    expect(result.confidence).toBeGreaterThan(50);
  });

  it("classifies cross-sectional study", () => {
    const result = classifyTierAdvanced(
      "Cross-sectional survey of depression prevalence in urban populations",
    );
    expect(result.tier).toBe("cohort");
  });

  it("classifies epidemiological study", () => {
    const result = classifyTierAdvanced(
      "Epidemiological investigation of COVID-19 transmission dynamics",
    );
    expect(result.tier).toBe("cohort");
  });

  it("classifies survival analysis", () => {
    const result = classifyTierAdvanced(
      "Survival analysis of patients with metastatic colorectal cancer",
    );
    expect(result.tier).toBe("cohort");
  });

  it("classifies risk factor study", () => {
    const result = classifyTierAdvanced(
      "Risk factor assessment for cardiovascular disease in young adults",
    );
    expect(result.tier).toBe("cohort");
  });

  it("classifies prediction model", () => {
    const result = classifyTierAdvanced(
      "A prediction model for 30-day readmission risk in heart failure",
    );
    expect(result.tier).toBe("cohort");
  });

  it("classifies narrative review as cohort", () => {
    const result = classifyTierAdvanced("A narrative review of immunotherapy advances");
    expect(result.tier).toBe("cohort");
  });

  // ── Case Report ──
  it("classifies case report", () => {
    const result = classifyTierAdvanced("Case report: a novel BRCA2 mutation in ovarian cancer");
    expect(result.tier).toBe("case-report");
    expect(result.confidence).toBeGreaterThan(50);
  });

  it("classifies case series", () => {
    const result = classifyTierAdvanced(
      "Case series of five patients with drug-resistant epilepsy",
    );
    expect(result.tier).toBe("case-report");
  });

  it("classifies 'a case of' pattern", () => {
    const result = classifyTierAdvanced("A case of eosinophilic granulomatosis with polyangiitis");
    expect(result.tier).toBe("case-report");
  });

  // ── Expert Opinion ──
  it("classifies editorial", () => {
    const result = classifyTierAdvanced("Editorial: the future of precision medicine");
    expect(result.tier).toBe("expert-opinion");
  });

  it("classifies commentary", () => {
    const result = classifyTierAdvanced("Commentary on the updated WHO classification");
    expect(result.tier).toBe("expert-opinion");
  });

  // ── Source-specific classification ──
  it("classifies Cochrane as meta-analysis", () => {
    const result = classifyTierAdvanced("Effectiveness of exercise for chronic pain", {
      source: "Cochrane Database of Systematic Reviews",
    });
    expect(result.tier).toBe("meta-analysis");
  });

  it("classifies WHO guideline", () => {
    const result = classifyTierAdvanced("Malaria prevention recommendations", {
      source: "World Health Organization guideline",
    });
    expect(result.tier).toBe("guideline");
  });

  // ── Mixed signals ──
  it("resolves conflicting signals by score dominance", () => {
    // Has both "meta-analysis" and "randomized" — meta-analysis patterns are stronger
    const result = classifyTierAdvanced(
      "Meta-analysis of randomized controlled trials of statin therapy",
    );
    expect(result.tier).toBe("meta-analysis");
  });

  it("defaults to cohort when no patterns match", () => {
    const result = classifyTierAdvanced("The impact of diet on health outcomes");
    expect(result.tier).toBe("cohort");
    expect(result.confidence).toBeLessThan(50);
  });

  // ── Confidence scoring ──
  it("returns higher confidence for stronger matches", () => {
    const strong = classifyTierAdvanced(
      "Randomized double-blind placebo-controlled trial of aspirin for primary prevention of cardiovascular events",
    );
    const weak = classifyTierAdvanced("Some health study");
    expect(strong.confidence).toBeGreaterThan(weak.confidence);
  });

  it("returns default message for empty input", () => {
    const result = classifyTierAdvanced("");
    expect(result.matchedPatterns).toContain("no patterns matched — defaulting");
    expect(result.confidence).toBe(30);
  });
});

describe("classifyTierEnhanced", () => {
  it("returns just the tier (backward compatible)", () => {
    const tier = classifyTierEnhanced("Meta-analysis of statin therapy", "paper", "PubMed");
    expect(tier).toBe("meta-analysis");
  });

  it("classifies RCT from type hint", () => {
    const tier = classifyTierEnhanced("Any study title", "trial");
    expect(tier).toBe("rct");
  });

  it("classifies guideline from source", () => {
    const tier = classifyTierEnhanced(
      "Hypertension management",
      "paper",
      "NICE clinical guideline",
    );
    expect(tier).toBe("guideline");
  });
});
