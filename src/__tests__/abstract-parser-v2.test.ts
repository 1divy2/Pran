import { describe, it, expect } from "vitest";
import { parseAbstract } from "@/lib/abstract-parser-v2";

describe("parseAbstract v2 — enhanced extraction", () => {
  describe("existing features (backward compatible)", () => {
    it("extracts sample size", () => {
      const result = parseAbstract(
        "We enrolled 1,234 patients with hypertension. N = 1234 subjects were included.",
      );
      expect(result.sampleSize).toBe(1234);
    });

    it("extracts effect size", () => {
      const result = parseAbstract(
        "Aspirin reduced cardiovascular events (OR 0.72, 95% CI 0.55–0.94).",
      );
      expect(result.effectSize).toBe("OR 0.72, 95% CI 0.55–0.94");
    });

    it("extracts p-value", () => {
      const result = parseAbstract("The difference was significant (p < 0.001).");
      expect(result.pValue).toBe("p < 0.001");
    });

    it("extracts conclusion", () => {
      const result = parseAbstract(
        "METHODS: We studied 200 patients. CONCLUSION: Aspirin is effective for prevention.",
      );
      expect(result.conclusion).toContain("Aspirin is effective");
    });

    it("returns nulls for empty input", () => {
      const result = parseAbstract("");
      expect(result.sampleSize).toBeNull();
      expect(result.effectSize).toBeNull();
      expect(result.pValue).toBeNull();
      expect(result.conclusion).toBeNull();
    });
  });

  describe("methodology detection", () => {
    it("detects meta-analysis", () => {
      const result = parseAbstract(
        "We conducted a meta-analysis of 15 randomized controlled trials evaluating statin therapy.",
      );
      expect(result.methodology).not.toBeNull();
      expect(result.methodology!.tier).toBe("meta-analysis");
      expect(result.methodology!.indicators).toContain("meta-analysis");
    });

    it("detects systematic review", () => {
      const result = parseAbstract(
        "A systematic review and meta-analysis of cognitive behavioral therapy for depression.",
      );
      expect(result.methodology!.tier).toBe("meta-analysis");
    });

    it("detects RCT", () => {
      const result = parseAbstract(
        "This was a randomized controlled trial of metformin vs placebo in 400 patients with type 2 diabetes.",
      );
      expect(result.methodology!.tier).toBe("rct");
      expect(result.methodology!.indicators).toContain("RCT");
    });

    it("detects double-blind RCT", () => {
      const result = parseAbstract(
        "A double-blind, placebo-controlled trial of aspirin for primary prevention.",
      );
      expect(result.methodology!.tier).toBe("rct");
      expect(result.methodology!.indicators).toContain("double-blind");
    });

    it("detects cohort study", () => {
      const result = parseAbstract(
        "In this prospective cohort study, we followed 5,000 adults over 10 years.",
      );
      expect(result.methodology!.tier).toBe("cohort");
    });

    it("detects cross-sectional study", () => {
      const result = parseAbstract(
        "A cross-sectional survey of depression prevalence in 2,000 adults.",
      );
      expect(result.methodology!.tier).toBe("cohort");
    });

    it("detects case report", () => {
      const result = parseAbstract(
        "We present a case of a 45-year-old woman with drug-resistant epilepsy.",
      );
      expect(result.methodology!.tier).toBe("case-report");
    });

    it("detects guideline", () => {
      const result = parseAbstract(
        "This clinical practice guideline provides evidence-based recommendations for hypertension management.",
      );
      expect(result.methodology!.tier).toBe("guideline");
    });

    it("returns null methodology when no patterns match", () => {
      const result = parseAbstract(
        "The impact of diet on health outcomes in the general population.",
      );
      expect(result.methodology).toBeNull();
    });

    it("gives higher confidence for stronger methodology signals", () => {
      const strong = parseAbstract(
        "Randomized double-blind placebo-controlled trial following CONSORT guidelines.",
      );
      const weak = parseAbstract("A study was conducted.");
      expect(strong.methodology!.confidence).toBeGreaterThan(weak.methodology?.confidence ?? 0);
    });
  });

  describe("intervention extraction", () => {
    it("extracts treated-with interventions", () => {
      const result = parseAbstract("Patients were treated with metformin and compared to placebo.");
      expect(result.interventions.length).toBeGreaterThan(0);
      expect(result.interventions.some((i) => i.toLowerCase().includes("metformin"))).toBe(true);
    });

    it("extracts versus interventions", () => {
      const result = parseAbstract(
        "We compared Aspirin vs Warfarin in patients with atrial fibrillation.",
      );
      expect(result.interventions.length).toBeGreaterThanOrEqual(2);
    });

    it("extracts drug-context interventions", () => {
      const result = parseAbstract("The drug of interest was Pembrolizumab for advanced melanoma.");
      expect(result.interventions.some((i) => i.includes("Pembrolizumab"))).toBe(true);
    });

    it("deduplicates interventions", () => {
      const result = parseAbstract(
        "Metformin was compared to placebo. Patients received Metformin daily.",
      );
      const metforminCount = result.interventions.filter((i) =>
        i.toLowerCase().includes("metformin"),
      ).length;
      expect(metforminCount).toBe(1);
    });
  });

  describe("outcome extraction", () => {
    it("extracts primary endpoints", () => {
      const result = parseAbstract("The primary endpoint was all-cause mortality at 30 days.");
      expect(result.outcomes.length).toBeGreaterThan(0);
      expect(result.outcomes.some((o) => o.toLowerCase().includes("mortality"))).toBe(true);
    });

    it("extracts measured outcomes", () => {
      const result = parseAbstract("We measured blood pressure reduction and cholesterol levels.");
      expect(result.outcomes.some((o) => o.toLowerCase().includes("blood pressure"))).toBe(true);
    });

    it("extracts common outcome phrases", () => {
      const result = parseAbstract(
        "Primary outcome was progression-free survival. Secondary outcomes included quality of life.",
      );
      expect(result.outcomes.some((o) => o.toLowerCase().includes("survival"))).toBe(true);
    });
  });

  describe("population extraction", () => {
    it("extracts population from 'in patients with'", () => {
      const result = parseAbstract("In patients with type 2 diabetes, metformin reduced HbA1c.");
      expect(result.population).not.toBeNull();
      expect(result.population!.toLowerCase()).toContain("patients");
      expect(result.population!.toLowerCase()).toContain("diabetes");
    });

    it("extracts age-based population", () => {
      const result = parseAbstract(
        "Among elderly adults aged 65 years or older, fall risk was assessed.",
      );
      expect(result.population).not.toBeNull();
    });

    it("extracts demographic age range", () => {
      const result = parseAbstract("We studied adults aged 18–65 years with chronic pain.");
      expect(result.population).not.toBeNull();
    });
  });

  describe("duration extraction", () => {
    it("extracts month-based duration", () => {
      const result = parseAbstract("Over 12 months, cardiovascular events were tracked.");
      expect(result.duration).toBe("12 months");
    });

    it("extracts week-based duration", () => {
      const result = parseAbstract("During a 6-week period, symptoms were monitored.");
      expect(result.duration).toBe("6-week");
    });

    it("extracts follow-up duration", () => {
      const result = parseAbstract("Median follow-up of 24 months was achieved.");
      expect(result.duration).toBe("24 months");
    });
  });

  describe("arms extraction", () => {
    it("extracts named arms", () => {
      const result = parseAbstract("A two-arm study of metformin vs placebo.");
      expect(result.arms).toBe(2);
    });

    it("extracts numeric arms", () => {
      const result = parseAbstract("A 3-arm trial comparing four treatments.");
      expect(result.arms).toBe(3);
    });

    it("counts versus occurrences", () => {
      const result = parseAbstract("We compared drug A versus drug B versus placebo.");
      expect(result.arms).toBe(3);
    });
  });

  describe("funding extraction", () => {
    it("extracts funded-by statement", () => {
      const result = parseAbstract(
        "Funded by the National Institutes of Health. The authors report no conflicts.",
      );
      expect(result.funding).not.toBeNull();
      expect(result.funding!.toLowerCase()).toContain("national institutes");
    });

    it("extracts supported-by statement", () => {
      const result = parseAbstract("This study was supported by Pfizer Inc.");
      expect(result.funding).not.toBeNull();
      expect(result.funding).toContain("Pfizer");
    });

    it("returns null when no funding mentioned", () => {
      const result = parseAbstract("A randomized trial of aspirin for prevention.");
      expect(result.funding).toBeNull();
    });
  });

  describe("comprehensive extraction", () => {
    it("extracts all fields from a full abstract", () => {
      const result = parseAbstract(
        `METHODS: A randomized controlled trial was conducted among 850 adults aged 40–70 years with type 2 diabetes. 
Patients were treated with Empagliflozin compared to placebo over 24 months. 
The primary endpoint was cardiovascular mortality. 
We measured HbA1c reduction, blood pressure, and weight loss.
 RESULTS: Empagliflozin reduced cardiovascular mortality (HR 0.62, 95% CI 0.49–0.77, p < 0.001). 
The drug was well tolerated. 
CONCLUSION: Empagliflozin significantly reduces cardiovascular risk in diabetic patients.`,
      );

      expect(result.sampleSize).toBe(850);
      expect(result.effectSize).toContain("HR 0.62");
      expect(result.pValue).toBe("p < 0.001");
      expect(result.methodology).not.toBeNull();
      expect(result.methodology!.tier).toBe("rct");
      expect(result.interventions.length).toBeGreaterThan(0);
      expect(result.outcomes.length).toBeGreaterThan(0);
      expect(result.population).not.toBeNull();
      expect(result.duration).toBe("24 months");
      expect(result.arms).toBe(2);
    });
  });
});
