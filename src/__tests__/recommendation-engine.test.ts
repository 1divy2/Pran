import { describe, it, expect } from "vitest";
import { generateRecommendations } from "@/lib/recommendation-engine";
import type { EvidencePiece } from "@/lib/evidence";

function makeEvidence(overrides: Partial<EvidencePiece> = {}): EvidencePiece {
  return {
    id: "test-1",
    title: "Test Study",
    tier: "rct",
    year: 2023,
    source: "PubMed",
    authors: "Smith J",
    journal: "Test Journal",
    n: 500,
    effect: "Significant improvement",
    confidence: 75,
    url: "https://example.com",
    abstract: "Test abstract",
    ...overrides,
  };
}

describe("Recommendation Engine", () => {
  describe("generateRecommendations", () => {
    it("generates recommendations for treatments with evidence", () => {
      const result = generateRecommendations("Diabetes", [
        {
          name: "Metformin",
          evidence: [
            makeEvidence({ id: "1", tier: "meta-analysis", confidence: 90, n: 10000 }),
            makeEvidence({ id: "2", tier: "rct", confidence: 85, n: 2000 }),
            makeEvidence({ id: "3", tier: "rct", confidence: 80, n: 1500 }),
          ],
        },
      ]);

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].treatment).toBe("Metformin");
      expect(result.recommendations[0].evidenceCount).toBe(3);
    });

    it("returns insufficient evidence for empty treatment", () => {
      const result = generateRecommendations("Diabetes", [{ name: "Unknown Drug", evidence: [] }]);

      expect(result.recommendations[0].strength).toBe("insufficient-evidence");
      expect(result.recommendations[0].grade).toBe("I");
    });

    it("assigns grade A to treatments with multiple meta-analyses", () => {
      const result = generateRecommendations("Hypertension", [
        {
          name: "ACE Inhibitors",
          evidence: [
            makeEvidence({ id: "1", tier: "meta-analysis", confidence: 92, n: 15000 }),
            makeEvidence({ id: "2", tier: "meta-analysis", confidence: 88, n: 12000 }),
            makeEvidence({ id: "3", tier: "rct", confidence: 85, n: 3000 }),
          ],
        },
      ]);

      expect(result.recommendations[0].grade).toBe("A");
      expect(result.recommendations[0].strength).toBe("strongly-recommend");
    });

    it("assigns grade B to treatments with one meta-analysis", () => {
      const result = generateRecommendations("Hypertension", [
        {
          name: "ARBs",
          evidence: [
            makeEvidence({ id: "1", tier: "meta-analysis", confidence: 88, n: 8000 }),
            makeEvidence({ id: "2", tier: "rct", confidence: 80, n: 2000 }),
          ],
        },
      ]);

      expect(result.recommendations[0].grade).toBe("B");
      expect(result.recommendations[0].strength).toBe("conditionally-recommend");
    });

    it("assigns grade B to treatments with 3+ RCTs and high avg confidence", () => {
      const result = generateRecommendations("Depression", [
        {
          name: "SSRIs",
          evidence: [
            makeEvidence({ id: "1", tier: "rct", confidence: 78, n: 1500 }),
            makeEvidence({ id: "2", tier: "rct", confidence: 75, n: 1200 }),
            makeEvidence({ id: "3", tier: "rct", confidence: 72, n: 900 }),
          ],
        },
      ]);

      expect(result.recommendations[0].grade).toBe("B");
    });

    it("assigns grade C to treatments with few RCTs and moderate confidence", () => {
      const result = generateRecommendations("Depression", [
        {
          name: "New Therapy",
          evidence: [
            makeEvidence({ id: "1", tier: "rct", confidence: 65, n: 200 }),
            makeEvidence({ id: "2", tier: "rct", confidence: 60, n: 150 }),
          ],
        },
      ]);

      expect(result.recommendations[0].grade).toBe("C");
    });

    it("sorts recommendations by grade", () => {
      const result = generateRecommendations("Diabetes", [
        {
          name: "Weak Treatment",
          evidence: [makeEvidence({ id: "1", tier: "cohort", confidence: 45, n: 100 })],
        },
        {
          name: "Strong Treatment",
          evidence: [
            makeEvidence({ id: "2", tier: "meta-analysis", confidence: 92, n: 10000 }),
            makeEvidence({ id: "3", tier: "meta-analysis", confidence: 88, n: 8000 }),
          ],
        },
      ]);

      expect(result.recommendations[0].treatment).toBe("Strong Treatment");
      expect(result.recommendations[1].treatment).toBe("Weak Treatment");
    });

    it("computes confidence intervals", () => {
      const result = generateRecommendations("Diabetes", [
        {
          name: "Metformin",
          evidence: [
            makeEvidence({ id: "1", confidence: 90 }),
            makeEvidence({ id: "2", confidence: 80 }),
            makeEvidence({ id: "3", confidence: 70 }),
          ],
        },
      ]);

      const ci = result.recommendations[0].confidenceInterval;
      expect(ci.pointEstimate).toBeGreaterThan(0);
      expect(ci.lower).toBeLessThan(ci.pointEstimate);
      expect(ci.upper).toBeGreaterThan(ci.pointEstimate);
    });

    it("generates caveats for limited evidence", () => {
      const result = generateRecommendations("Diabetes", [
        {
          name: "New Drug",
          evidence: [makeEvidence({ id: "1", tier: "cohort", confidence: 50, n: 50, year: 2018 })],
        },
      ]);

      expect(result.recommendations[0].caveats.length).toBeGreaterThan(0);
    });

    it("includes gap analysis", () => {
      const result = generateRecommendations("Diabetes", [
        {
          name: "Metformin",
          evidence: [makeEvidence({ id: "1", tier: "rct", confidence: 80 })],
        },
      ]);

      expect(result.gapAnalysis).toBeDefined();
      expect(result.gapAnalysis.gaps.length).toBeGreaterThanOrEqual(0);
    });

    it("includes clinical notes", () => {
      const result = generateRecommendations("Diabetes", [
        {
          name: "Metformin",
          evidence: [makeEvidence({ id: "1", tier: "meta-analysis", confidence: 90 })],
        },
      ]);

      expect(result.clinicalNotes.length).toBeGreaterThan(0);
    });

    it("provides evidence breakdown", () => {
      const result = generateRecommendations("Diabetes", [
        {
          name: "Metformin",
          evidence: [
            makeEvidence({ id: "1", tier: "meta-analysis", confidence: 90 }),
            makeEvidence({ id: "2", tier: "rct", confidence: 80 }),
            makeEvidence({ id: "3", tier: "cohort", confidence: 60 }),
          ],
        },
      ]);

      const breakdown = result.recommendations[0].evidenceBreakdown;
      expect(breakdown.metaAnalysis).toBe(1);
      expect(breakdown.rct).toBe(1);
      expect(breakdown.cohort).toBe(1);
    });

    it("limits references to top 10", () => {
      const evidence = Array.from({ length: 15 }, (_, i) =>
        makeEvidence({ id: `${i}`, confidence: 50 + i * 2 }),
      );

      const result = generateRecommendations("Diabetes", [{ name: "Metformin", evidence }]);

      expect(result.recommendations[0].references).toHaveLength(10);
    });
  });
});
