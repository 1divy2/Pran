import { describe, it, expect } from "vitest";
import { parseAbstract } from "@/lib/abstract-parser";

describe("parseAbstract", () => {
  describe("sample size extraction", () => {
    it("extracts n = 234", () => {
      const result = parseAbstract("Methods: We enrolled n = 234 patients with hypertension.");
      expect(result.sampleSize).toBe(234);
    });

    it("extracts N = 1,234 with comma separator", () => {
      const result = parseAbstract("A total of N = 1,234 participants were randomized.");
      expect(result.sampleSize).toBe(1234);
    });

    it("extracts 'enrolled 500 participants'", () => {
      const result = parseAbstract("We enrolled 500 participants aged 18-65.");
      expect(result.sampleSize).toBe(500);
    });

    it("extracts '892 patients were randomized'", () => {
      const result = parseAbstract("892 patients were randomized to treatment or control.");
      expect(result.sampleSize).toBe(892);
    });

    it("extracts 'a total of 3456'", () => {
      const result = parseAbstract("A total of 3456 individuals completed the study.");
      expect(result.sampleSize).toBe(3456);
    });

    it("extracts 'sample size of 120 subjects'", () => {
      const result = parseAbstract("The sample size of 120 subjects was sufficient.");
      expect(result.sampleSize).toBe(120);
    });

    it("returns null when no sample size is found", () => {
      const result = parseAbstract(
        "This review examines current evidence for treatment of hypertension.",
      );
      expect(result.sampleSize).toBeNull();
    });
  });

  describe("effect size extraction", () => {
    it("extracts OR with CI", () => {
      const result = parseAbstract("Treatment reduced events (OR 2.34, 95% CI 1.12–4.56).");
      expect(result.effectSize).toBe("OR 2.34, 95% CI 1.12–4.56");
    });

    it("extracts HR with parenthetical CI", () => {
      const result = parseAbstract("Mortality was lower (HR 0.72 (95% CI 0.55–0.94)).");
      expect(result.effectSize).toBe("HR 0.72, 95% CI 0.55–0.94");
    });

    it("extracts RR with CI", () => {
      const result = parseAbstract("Risk ratio was 1.23 (1.05-1.44) for the intervention group.");
      expect(result.effectSize).toBe("RR 1.23, 95% CI 1.05–1.44");
    });

    it("extracts standalone 95% CI", () => {
      const result = parseAbstract("The mean difference was significant, 95% CI 1.23–4.56.");
      expect(result.effectSize).toBe("95% CI 1.23–4.56");
    });

    it("extracts p-value as fallback effect indicator", () => {
      const result = parseAbstract("The difference was statistically significant (p < 0.001).");
      expect(result.effectSize).toBeTruthy();
    });

    it("returns null for abstracts with no effect data", () => {
      const result = parseAbstract(
        "This study reviewed existing literature on diabetes management.",
      );
      expect(result.effectSize).toBeNull();
    });
  });

  describe("p-value extraction", () => {
    it("extracts p < 0.001", () => {
      const result = parseAbstract("The result was significant (p < 0.001).");
      expect(result.pValue).toBe("p < 0.001");
    });

    it("extracts p = 0.023", () => {
      const result = parseAbstract("p = 0.023 for the primary endpoint.");
      expect(result.pValue).toBe("p = 0.023");
    });

    it("extracts P-value 0.04", () => {
      const result = parseAbstract("P-value 0.04 was observed.");
      expect(result.pValue).toBe("p = 0.04");
    });

    it("returns null when no p-value found", () => {
      const result = parseAbstract("The study showed improvement in outcomes.");
      expect(result.pValue).toBeNull();
    });
  });

  describe("conclusion extraction", () => {
    it("extracts CONCLUSION: label", () => {
      const result = parseAbstract(
        "CONCLUSION: Aspirin reduces cardiovascular risk in high-risk patients.",
      );
      expect(result.conclusion).toBe("Aspirin reduces cardiovascular risk in high-risk patients");
    });

    it("extracts CONCLUSIONS: label", () => {
      const result = parseAbstract("CONCLUSIONS: The treatment was effective and well tolerated.");
      expect(result.conclusion).toBe("The treatment was effective and well tolerated");
    });

    it("extracts RESULTS: label", () => {
      const result = parseAbstract("RESULTS: Mortality decreased by 15% (HR 0.85).");
      expect(result.conclusion).toContain("Mortality decreased");
    });

    it("returns null for empty abstract", () => {
      const result = parseAbstract("");
      expect(result.conclusion).toBeNull();
    });
  });

  describe("full abstract parsing", () => {
    it("extracts multiple fields from a realistic abstract", () => {
      const abstract = `
        BACKGROUND: Hypertension is a major risk factor for cardiovascular disease.
        METHODS: We conducted a randomized controlled trial enrolling 1,500 patients
        with stage 2 hypertension. Participants were randomized to combination therapy
        or monotherapy. The primary endpoint was composite cardiovascular events.
        RESULTS: Over 36 months, combination therapy reduced events (OR 0.68, 95% CI
        0.52–0.89, p = 0.005). The mean age was 58 years.
        CONCLUSION: Combination therapy significantly reduces cardiovascular events
        compared to monotherapy in hypertensive patients.
      `;
      const result = parseAbstract(abstract);
      expect(result.sampleSize).toBe(1500);
      expect(result.effectSize).toBe("OR 0.68, 95% CI 0.52–0.89");
      expect(result.pValue).toBe("p = 0.005");
      expect(result.conclusion).toContain("Combination therapy");
    });
  });
});
