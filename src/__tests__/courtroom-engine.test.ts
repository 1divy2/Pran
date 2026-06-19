import { describe, it, expect } from "vitest";
import { runDebate } from "@/lib/llm/courtroom-engine";
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

describe("Courtroom Debate Engine", () => {
  describe("runDebate (heuristic mode)", () => {
    it("generates a debate result without LLM", async () => {
      const treatmentA = {
        name: "Metformin",
        evidence: [
          makeEvidence({ id: "1", tier: "meta-analysis", confidence: 90, n: 10000 }),
          makeEvidence({ id: "2", tier: "rct", confidence: 85, n: 2000 }),
        ],
      };

      const treatmentB = {
        name: "Insulin",
        evidence: [
          makeEvidence({ id: "3", tier: "rct", confidence: 80, n: 1500 }),
          makeEvidence({ id: "4", tier: "cohort", confidence: 65, n: 800 }),
        ],
      };

      const result = await runDebate(treatmentA, treatmentB, "Type 2 Diabetes", null);

      expect(result.defense).toBeDefined();
      expect(result.prosecution).toBeDefined();
      expect(result.verdict).toBeDefined();
      expect(result.metadata.generatedWith).toBe("heuristic");
    });

    it("declares a winner based on confidence gap", async () => {
      const treatmentA = {
        name: "Strong Drug",
        evidence: [
          makeEvidence({ id: "1", tier: "meta-analysis", confidence: 95, n: 10000 }),
          makeEvidence({ id: "2", tier: "meta-analysis", confidence: 90, n: 8000 }),
        ],
      };

      const treatmentB = {
        name: "Weak Drug",
        evidence: [
          makeEvidence({ id: "3", tier: "cohort", confidence: 50, n: 200 }),
          makeEvidence({ id: "4", tier: "case-report", confidence: 30, n: 10 }),
        ],
      };

      const result = await runDebate(treatmentA, treatmentB, "Test Condition", null);

      expect(result.verdict.winner).toBe("defense");
      expect(result.verdict.confidenceGap).toBeGreaterThan(5);
    });

    it("declares tie when confidence is close", async () => {
      const treatmentA = {
        name: "Drug A",
        evidence: [
          makeEvidence({ id: "1", tier: "rct", confidence: 80, n: 1000 }),
          makeEvidence({ id: "2", tier: "rct", confidence: 78, n: 900 }),
        ],
      };

      const treatmentB = {
        name: "Drug B",
        evidence: [
          makeEvidence({ id: "3", tier: "rct", confidence: 79, n: 950 }),
          makeEvidence({ id: "4", tier: "rct", confidence: 77, n: 880 }),
        ],
      };

      const result = await runDebate(treatmentA, treatmentB, "Test Condition", null);

      expect(result.verdict.winner).toBe("tie");
    });

    it("generates arguments for both sides", async () => {
      const treatmentA = {
        name: "Drug A",
        evidence: [
          makeEvidence({ id: "1", tier: "meta-analysis", confidence: 90 }),
          makeEvidence({ id: "2", tier: "rct", confidence: 80 }),
        ],
      };

      const treatmentB = {
        name: "Drug B",
        evidence: [
          makeEvidence({ id: "3", tier: "rct", confidence: 85 }),
          makeEvidence({ id: "4", tier: "cohort", confidence: 65 }),
        ],
      };

      const result = await runDebate(treatmentA, treatmentB, "Test", null);

      expect(result.defense.arguments.length).toBeGreaterThan(0);
      expect(result.prosecution.arguments.length).toBeGreaterThan(0);
    });

    it("provides summaries for both sides", async () => {
      const treatmentA = {
        name: "Drug A",
        evidence: [makeEvidence({ id: "1", tier: "meta-analysis", confidence: 90 })],
      };

      const treatmentB = {
        name: "Drug B",
        evidence: [makeEvidence({ id: "2", tier: "rct", confidence: 80 })],
      };

      const result = await runDebate(treatmentA, treatmentB, "Test", null);

      expect(result.defense.summary.length).toBeGreaterThan(0);
      expect(result.prosecution.summary.length).toBeGreaterThan(0);
    });
  });
});
