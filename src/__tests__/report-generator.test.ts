import { describe, it, expect } from "vitest";
import { generateTopicReport, generateReportFromNormalized } from "@/lib/report-generator";
import type { EvidencePiece } from "@/lib/evidence";
import type { NormalizedEvidence } from "@/lib/ingestion/types";

function mockEvidence(overrides: Partial<EvidencePiece> = {}): EvidencePiece {
  return {
    id: "pmid-123",
    title: "Test study on hypertension treatment",
    tier: "rct",
    year: 2023,
    source: "PubMed",
    authors: "Smith J; Doe A",
    journal: "New England Journal of Medicine",
    n: 1200,
    effect: "OR 0.72, 95% CI 0.55–0.94",
    confidence: 82,
    url: "https://pubmed.ncbi.nlm.nih.gov/123/",
    abstract: "A randomized controlled trial of aspirin for prevention.",
    ...overrides,
  };
}

function mockNormalized(overrides: Partial<NormalizedEvidence> = {}): NormalizedEvidence {
  return {
    id: "pmid-456",
    title: "Meta-analysis of statin therapy",
    tier: "meta-analysis",
    year: 2024,
    sourceId: "pubmed",
    sourceName: "PubMed",
    authors: "Author A",
    journal: "Lancet",
    sampleSize: 5000,
    effect: "RR 0.80",
    abstract: "A meta-analysis of 10 RCTs of statin therapy for cardiovascular risk.",
    url: "https://pubmed.ncbi.nlm.nih.gov/456/",
    conditions: ["cardiovascular"],
    interventions: ["statins"],
    status: null,
    rawMetadata: {},
    ingestedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("generateTopicReport", () => {
  it("generates a complete report with all sections", () => {
    const evidence = [
      mockEvidence({
        id: "1",
        tier: "meta-analysis",
        confidence: 95,
        title: "Meta-analysis of statins",
      }),
      mockEvidence({ id: "2", tier: "rct", confidence: 82 }),
      mockEvidence({
        id: "3",
        tier: "cohort",
        confidence: 55,
        year: 2020,
        source: "ClinicalTrials.gov",
      }),
    ];

    const report = generateTopicReport("hypertension", "Hypertension Treatment", evidence);

    expect(report).toContain("# Hypertension Treatment — Evidence Report");
    expect(report).toContain("## Executive Summary");
    expect(report).toContain("## Evidence Quality Distribution");
    expect(report).toContain("## Source Distribution");
    expect(report).toContain("## Key Findings");
    expect(report).toContain("## Publication Timeline");
    expect(report).toContain("## Recommendations");
    expect(report).toContain("## Evidence Table");
    expect(report).toContain("PRAN");
  });

  it("handles empty evidence gracefully", () => {
    const report = generateTopicReport("empty", "Empty Topic", []);
    expect(report).toContain("No evidence found");
  });

  it("includes correct tier breakdown", () => {
    const evidence = [
      mockEvidence({ id: "1", tier: "meta-analysis" }),
      mockEvidence({ id: "2", tier: "meta-analysis" }),
      mockEvidence({ id: "3", tier: "rct" }),
    ];

    const report = generateTopicReport("t", "Test", evidence);
    expect(report).toContain("Meta-Analysis");
    expect(report).toContain("RCT");
  });

  it("includes source distribution", () => {
    const evidence = [
      mockEvidence({ id: "1", source: "PubMed" }),
      mockEvidence({ id: "2", source: "PubMed" }),
      mockEvidence({ id: "3", source: "ClinicalTrials.gov" }),
    ];

    const report = generateTopicReport("t", "Test", evidence);
    expect(report).toContain("PubMed");
    expect(report).toContain("ClinicalTrials.gov");
  });

  it("sorts key findings by confidence", () => {
    const evidence = [
      mockEvidence({ id: "1", confidence: 50, title: "Low confidence study" }),
      mockEvidence({ id: "2", confidence: 95, title: "High confidence study" }),
      mockEvidence({ id: "3", confidence: 75, title: "Medium confidence study" }),
    ];

    const report = generateTopicReport("t", "Test", evidence);
    const highIdx = report.indexOf("High confidence study");
    const medIdx = report.indexOf("Medium confidence study");
    const lowIdx = report.indexOf("Low confidence study");
    expect(highIdx).toBeLessThan(medIdx);
    expect(medIdx).toBeLessThan(lowIdx);
  });

  it("generates timeline visualization", () => {
    const evidence = [
      mockEvidence({ id: "1", year: 2020 }),
      mockEvidence({ id: "2", year: 2022 }),
      mockEvidence({ id: "3", year: 2022 }),
      mockEvidence({ id: "4", year: 2024 }),
    ];

    const report = generateTopicReport("t", "Test", evidence);
    expect(report).toContain("2020");
    expect(report).toContain("2022");
    expect(report).toContain("2024");
    expect(report).toContain("█");
  });

  it("generates recommendations based on evidence quality", () => {
    const highQuality = [
      mockEvidence({ id: "1", tier: "meta-analysis" }),
      mockEvidence({ id: "2", tier: "meta-analysis" }),
      mockEvidence({ id: "3", tier: "meta-analysis" }),
    ];
    const report = generateTopicReport("t", "Test", highQuality);
    expect(report).toContain("Strong evidence base");

    const lowQuality = [
      mockEvidence({ id: "1", tier: "cohort" }),
      mockEvidence({ id: "2", tier: "cohort" }),
    ];
    const report2 = generateTopicReport("t", "Test", lowQuality);
    expect(report2).toContain("Limited experimental evidence");
  });

  it("respects maxItems option", () => {
    const evidence = Array.from({ length: 30 }, (_, i) =>
      mockEvidence({ id: `${i}`, confidence: 90 - i }),
    );

    const report = generateTopicReport("t", "Test", evidence, { maxItems: 5 });
    expect(report).toContain("Showing top 5 of 30");
  });

  it("can exclude sections", () => {
    const evidence = [mockEvidence()];
    const report = generateTopicReport("t", "Test", evidence, {
      includeTimeline: false,
      includeRecommendations: false,
    });
    expect(report).not.toContain("## Publication Timeline");
    expect(report).not.toContain("## Recommendations");
  });

  it("includes effect sizes in key findings", () => {
    const evidence = [
      mockEvidence({ id: "1", effect: "OR 0.72, 95% CI 0.55–0.94", confidence: 90 }),
    ];
    const report = generateTopicReport("t", "Test", evidence);
    expect(report).toContain("OR 0.72, 95% CI 0.55–0.94");
  });
});

describe("generateReportFromNormalized", () => {
  it("converts NormalizedEvidence to report", () => {
    const items = [
      mockNormalized({ id: "1", title: "Study A", year: 2023 }),
      mockNormalized({ id: "2", title: "Study B", year: 2024 }),
    ];

    const report = generateReportFromNormalized("topic", "Test Topic", items);
    expect(report).toContain("# Test Topic — Evidence Report");
    expect(report).toContain("Study A");
    expect(report).toContain("Study B");
  });

  it("handles empty items", () => {
    const report = generateReportFromNormalized("topic", "Empty", []);
    expect(report).toContain("No evidence found");
  });
});
