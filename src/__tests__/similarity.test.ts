import { describe, it, expect } from "vitest";
import {
  buildTopicProfile,
  computeSimilarity,
  findSimilarTopics,
  buildTopicGraph,
} from "@/lib/similarity";

describe("Similarity Scoring", () => {
  describe("buildTopicProfile", () => {
    it("creates a profile with terms", () => {
      const profile = buildTopicProfile(
        "diabetes",
        "Type 2 Diabetes",
        ["insulin resistance", "hyperglycemia"],
        ["metformin", "insulin"],
        ["metformin versus insulin in type 2 diabetes"],
      );

      expect(profile.id).toBe("diabetes");
      expect(profile.terms.size).toBeGreaterThan(0);
    });
  });

  describe("computeSimilarity", () => {
    it("returns high score for similar topics", () => {
      const a = buildTopicProfile(
        "diabetes-1",
        "Type 2 Diabetes Mellitus",
        ["insulin resistance", "hyperglycemia"],
        ["metformin", "insulin", "glipizide"],
        ["metformin versus insulin for glycemic control"],
      );

      const b = buildTopicProfile(
        "diabetes-2",
        "Diabetes Mellitus Management",
        ["hyperglycemia", "blood glucose"],
        ["metformin", "insulin", "sitagliptin"],
        ["insulin therapy for diabetes management"],
      );

      const result = computeSimilarity(a, b);
      expect(result.score).toBeGreaterThan(30);
      expect(result.sharedConditions.length).toBeGreaterThan(0);
      expect(result.sharedInterventions.length).toBeGreaterThan(0);
    });

    it("returns low score for dissimilar topics", () => {
      const a = buildTopicProfile(
        "diabetes",
        "Type 2 Diabetes",
        ["insulin resistance"],
        ["metformin"],
        ["metformin for diabetes"],
      );

      const b = buildTopicProfile(
        "fracture",
        "Hip Fracture",
        ["bone density", "osteoporosis"],
        ["calcium", "vitamin D"],
        ["calcium supplementation for fracture prevention"],
      );

      const result = computeSimilarity(a, b);
      expect(result.score).toBeLessThan(20);
    });

    it("returns low score for empty profiles", () => {
      const a = buildTopicProfile("a", "Aaa", [], [], []);
      const b = buildTopicProfile("b", "Bbb", [], [], []);

      const result = computeSimilarity(a, b);
      expect(result.score).toBe(0);
    });
  });

  describe("findSimilarTopics", () => {
    it("finds similar topics above threshold", () => {
      const target = buildTopicProfile(
        "diabetes",
        "Diabetes",
        ["hyperglycemia"],
        ["metformin"],
        ["metformin for diabetes treatment"],
      );

      const candidates = [
        buildTopicProfile(
          "hypertension",
          "Hypertension",
          ["high blood pressure"],
          ["lisinopril"],
          ["lisinopril for blood pressure"],
        ),
        buildTopicProfile(
          "diabetes-complications",
          "Diabetic Neuropathy",
          ["hyperglycemia", "nerve damage"],
          ["metformin", "pregabalin"],
          ["metformin for diabetic neuropathy prevention"],
        ),
      ];

      const results = findSimilarTopics(target, candidates, 15);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("excludes self from results", () => {
      const target = buildTopicProfile("a", "Topic A", [], [], []);

      const results = findSimilarTopics(target, [target], 0);
      expect(results).toHaveLength(0);
    });
  });

  describe("buildTopicGraph", () => {
    it("builds edges between similar topics", () => {
      const profiles = [
        buildTopicProfile(
          "diabetes",
          "Diabetes",
          ["hyperglycemia"],
          ["metformin"],
          ["metformin for diabetes"],
        ),
        buildTopicProfile(
          "diabetes-neuropathy",
          "Diabetic Neuropathy",
          ["hyperglycemia", "nerve pain"],
          ["metformin", "pregabalin"],
          ["metformin for diabetic neuropathy"],
        ),
        buildTopicProfile(
          "fracture",
          "Hip Fracture",
          ["bone density"],
          ["calcium"],
          ["calcium for fractures"],
        ),
      ];

      const edges = buildTopicGraph(profiles, 10);
      expect(edges.length).toBeGreaterThanOrEqual(1);
      expect(edges[0].weight).toBeGreaterThan(0);
    });

    it("returns empty for no similar topics", () => {
      const profiles = [
        buildTopicProfile("a", "Aaa", ["x"], ["y"], ["y for x"]),
        buildTopicProfile("b", "Bbb", ["p"], ["q"], ["q for p"]),
      ];

      const edges = buildTopicGraph(profiles, 50);
      expect(edges).toHaveLength(0);
    });
  });
});
