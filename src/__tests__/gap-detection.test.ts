import { describe, it, expect } from "vitest";
import { detectGaps } from "@/lib/gap-detection";
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

describe("Gap Detection", () => {
  describe("detectGaps", () => {
    it("returns empty gaps for comprehensive evidence", () => {
      const evidence: EvidencePiece[] = [
        makeEvidence({ id: "1", tier: "meta-analysis", confidence: 90 }),
        makeEvidence({ id: "2", tier: "meta-analysis", confidence: 85 }),
        makeEvidence({ id: "3", tier: "rct", confidence: 80 }),
        makeEvidence({ id: "4", tier: "rct", confidence: 75 }),
        makeEvidence({ id: "5", tier: "rct", confidence: 70 }),
        makeEvidence({ id: "6", tier: "guideline", confidence: 80 }),
        makeEvidence({ id: "7", tier: "cohort", confidence: 60 }),
      ];

      const result = detectGaps(evidence);
      expect(result.gaps.filter((g) => g.severity === "critical")).toHaveLength(0);
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it("detects missing meta-analysis", () => {
      const evidence: EvidencePiece[] = [
        makeEvidence({ id: "1", tier: "rct", confidence: 80 }),
        makeEvidence({ id: "2", tier: "rct", confidence: 75 }),
      ];

      const result = detectGaps(evidence);
      const gap = result.gaps.find((g) => g.id === "tier-missing-meta-analysis");
      expect(gap).toBeDefined();
      expect(gap!.severity).toBe("critical");
    });

    it("detects missing RCTs", () => {
      const evidence: EvidencePiece[] = [
        makeEvidence({ id: "1", tier: "cohort", confidence: 60 }),
        makeEvidence({ id: "2", tier: "cohort", confidence: 55 }),
      ];

      const result = detectGaps(evidence);
      const gap = result.gaps.find((g) => g.id === "tier-missing-rct");
      expect(gap).toBeDefined();
      expect(gap!.severity).toBe("critical");
    });

    it("detects temporal gap", () => {
      const currentYear = new Date().getFullYear();
      const evidence: EvidencePiece[] = [
        makeEvidence({ id: "1", year: currentYear - 15, confidence: 70 }),
        makeEvidence({ id: "2", year: currentYear - 12, confidence: 65 }),
      ];

      const result = detectGaps(evidence);
      const gap = result.gaps.find((g) => g.type === "temporal");
      expect(gap).toBeDefined();
    });

    it("detects single source bias", () => {
      const evidence: EvidencePiece[] = [
        makeEvidence({ id: "1", source: "PubMed", confidence: 70 }),
        makeEvidence({ id: "2", source: "PubMed", confidence: 65 }),
        makeEvidence({ id: "3", source: "PubMed", confidence: 60 }),
      ];

      const result = detectGaps(evidence);
      const gap = result.gaps.find((g) => g.type === "source_diversity");
      expect(gap).toBeDefined();
    });

    it("detects no sample size data", () => {
      const evidence: EvidencePiece[] = [
        makeEvidence({ id: "1", n: null, confidence: 70 }),
        makeEvidence({ id: "2", n: null, confidence: 65 }),
      ];

      const result = detectGaps(evidence);
      const gap = result.gaps.find((g) => g.type === "sample_size");
      expect(gap).toBeDefined();
    });

    it("detects small sample sizes", () => {
      const evidence: EvidencePiece[] = [
        makeEvidence({ id: "1", n: 30, confidence: 70 }),
        makeEvidence({ id: "2", n: 25, confidence: 65 }),
        makeEvidence({ id: "3", n: 15, confidence: 60 }),
      ];

      const result = detectGaps(evidence);
      const gap = result.gaps.find((g) => g.id === "sample-small-dominant");
      expect(gap).toBeDefined();
    });

    it("returns score 0 for empty evidence", () => {
      const result = detectGaps([]);
      expect(result.score).toBe(0);
    });

    it("identifies strengths", () => {
      const evidence: EvidencePiece[] = [
        makeEvidence({ id: "1", tier: "meta-analysis", confidence: 90, n: 5000 }),
        makeEvidence({ id: "2", tier: "rct", confidence: 80, n: 1200 }),
        makeEvidence({ id: "3", tier: "rct", confidence: 75, n: 800 }),
      ];

      const result = detectGaps(evidence);
      expect(result.strengths.length).toBeGreaterThan(0);
    });

    it("detects no replication when each RCT studies different intervention", () => {
      const evidence: EvidencePiece[] = [
        makeEvidence({ id: "1", tier: "rct", title: "Drug A versus placebo", confidence: 80 }),
        makeEvidence({
          id: "2",
          tier: "rct",
          title: "Drug B versus standard care",
          confidence: 75,
        }),
        makeEvidence({
          id: "3",
          tier: "rct",
          title: "Surgery versus conservative management",
          confidence: 70,
        }),
      ];

      const result = detectGaps(evidence);
      const gap = result.gaps.find((g) => g.type === "replication");
      expect(gap).toBeDefined();
    });

    it("detects limited outcome reporting", () => {
      const evidence: EvidencePiece[] = [
        makeEvidence({ id: "1", effect: null, confidence: 70 }),
        makeEvidence({ id: "2", effect: null, confidence: 65 }),
        makeEvidence({ id: "3", effect: null, confidence: 60 }),
        makeEvidence({ id: "4", effect: "Positive", confidence: 75 }),
        makeEvidence({ id: "5", effect: null, confidence: 55 }),
      ];

      const result = detectGaps(evidence);
      const gap = result.gaps.find((g) => g.type === "outcome_reporting");
      expect(gap).toBeDefined();
    });
  });
});
