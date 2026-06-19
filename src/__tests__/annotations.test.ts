import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createAnnotation,
  getAnnotationsForEvidence,
  getAnnotationSummaries,
  getReplies,
  getAnnotation,
  updateAnnotation,
  deleteAnnotation,
  searchAnnotations,
  getAnnotationCounts,
  getRecentAnnotations,
  getAnnotationStats,
} from "@/lib/annotations";
import type { AnnotationCategory } from "@/lib/annotations";

const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => { for (const k of storage.keys()) storage.delete(k); },
  get length() { return storage.size; },
  key: (index: number) => [...storage.keys()][index] ?? null,
});

describe("Annotations System", () => {
  beforeEach(() => {
    for (const k of storage.keys()) storage.delete(k);
  });

  describe("createAnnotation", () => {
    it("creates an annotation with defaults", () => {
      const ann = createAnnotation("evidence-1", "This is important");
      expect(ann).not.toBeNull();
      expect(ann!.id).toMatch(/^ann-/);
      expect(ann!.evidenceId).toBe("evidence-1");
      expect(ann!.content).toBe("This is important");
      expect(ann!.category).toBe("note");
      expect(ann!.author).toBe("Anonymous");
      expect(ann!.parentId).toBeNull();
      expect(ann!.tags).toEqual([]);
      expect(ann!.resolved).toBe(false);
    });

    it("creates with custom options", () => {
      const ann = createAnnotation("evidence-1", "Methodology concern", {
        category: "critique",
        author: "Dr. Smith",
        tags: ["methods", "bias"],
      });
      expect(ann!.category).toBe("critique");
      expect(ann!.author).toBe("Dr. Smith");
      expect(ann!.tags).toEqual(["methods", "bias"]);
    });

    it("creates a reply to an annotation", () => {
      const parent = createAnnotation("evidence-1", "Parent comment");
      const reply = createAnnotation("evidence-1", "Reply to parent", {
        parentId: parent!.id,
      });
      expect(reply!.parentId).toBe(parent!.id);
    });

    it("returns null for invalid parentId", () => {
      const ann = createAnnotation("evidence-1", "Reply", {
        parentId: "nonexistent",
      });
      expect(ann).toBeNull();
    });

    it("trims content", () => {
      const ann = createAnnotation("evidence-1", "  spaced out  ");
      expect(ann!.content).toBe("spaced out");
    });

    it("rejects empty content", () => {
      const ann = createAnnotation("evidence-1", "   ");
      expect(ann).toBeNull();
    });
  });

  describe("getAnnotationsForEvidence", () => {
    it("returns all annotations for an evidence piece", () => {
      createAnnotation("ev-1", "Note 1");
      createAnnotation("ev-1", "Note 2");
      createAnnotation("ev-2", "Note 3");

      const results = getAnnotationsForEvidence("ev-1");
      expect(results.length).toBe(2);
    });

    it("returns empty for unknown evidence", () => {
      expect(getAnnotationsForEvidence("nonexistent")).toEqual([]);
    });
  });

  describe("getAnnotationSummaries", () => {
    it("returns summary with reply counts", () => {
      const parent = createAnnotation("ev-1", "Parent comment");
      createAnnotation("ev-1", "Reply 1", { parentId: parent!.id });
      createAnnotation("ev-1", "Reply 2", { parentId: parent!.id });
      createAnnotation("ev-1", "Another top-level");

      const summaries = getAnnotationSummaries("ev-1");
      expect(summaries.length).toBe(2); // 2 top-level
      const parentSummary = summaries.find((s) => s.id === parent!.id);
      expect(parentSummary!.replyCount).toBe(2);
    });

    it("truncates long content", () => {
      const longContent = "A".repeat(200);
      const ann = createAnnotation("ev-1", longContent);
      const summaries = getAnnotationSummaries("ev-1");
      expect(summaries[0].contentPreview.length).toBeLessThan(200);
      expect(summaries[0].contentPreview).toContain("...");
    });
  });

  describe("getReplies", () => {
    it("returns replies to an annotation", () => {
      const parent = createAnnotation("ev-1", "Parent");
      createAnnotation("ev-1", "Reply 1", { parentId: parent!.id });
      createAnnotation("ev-1", "Reply 2", { parentId: parent!.id });

      const replies = getReplies(parent!.id);
      expect(replies.length).toBe(2);
    });
  });

  describe("getAnnotation", () => {
    it("retrieves by ID", () => {
      const ann = createAnnotation("ev-1", "Test");
      expect(getAnnotation(ann!.id)).not.toBeNull();
    });

    it("returns null for unknown ID", () => {
      expect(getAnnotation("nonexistent")).toBeNull();
    });
  });

  describe("updateAnnotation", () => {
    it("updates content", () => {
      const ann = createAnnotation("ev-1", "Original");
      const updated = updateAnnotation(ann!.id, { content: "Updated" });
      expect(updated!.content).toBe("Updated");
    });

    it("updates category", () => {
      const ann = createAnnotation("ev-1", "Test");
      const updated = updateAnnotation(ann!.id, { category: "critique" as AnnotationCategory });
      expect(updated!.category).toBe("critique");
    });

    it("resolves an annotation", () => {
      const ann = createAnnotation("ev-1", "Test");
      const updated = updateAnnotation(ann!.id, { resolved: true });
      expect(updated!.resolved).toBe(true);
    });

    it("returns null for unknown ID", () => {
      expect(updateAnnotation("nonexistent", { content: "X" })).toBeNull();
    });
  });

  describe("deleteAnnotation", () => {
    it("deletes an annotation", () => {
      const ann = createAnnotation("ev-1", "To delete");
      expect(deleteAnnotation(ann!.id)).toBe(true);
      expect(getAnnotation(ann!.id)).toBeNull();
    });

    it("deletes replies recursively", () => {
      const parent = createAnnotation("ev-1", "Parent");
      const reply = createAnnotation("ev-1", "Reply", { parentId: parent!.id });
      createAnnotation("ev-1", "Nested reply", { parentId: reply!.id });

      deleteAnnotation(parent!.id);
      expect(getAnnotation(parent!.id)).toBeNull();
      expect(getAnnotation(reply!.id)).toBeNull();
    });

    it("returns false for unknown ID", () => {
      expect(deleteAnnotation("nonexistent")).toBe(false);
    });
  });

  describe("searchAnnotations", () => {
    it("searches by content", () => {
      createAnnotation("ev-1", "Cardiovascular risk assessment");
      createAnnotation("ev-1", "Diabetes management guidelines");
      createAnnotation("ev-2", "Cardiovascular outcomes study");

      const results = searchAnnotations("cardiovascular");
      expect(results.length).toBe(2);
    });

    it("filters by category", () => {
      createAnnotation("ev-1", "Important finding", { category: "note" });
      createAnnotation("ev-1", "Bias concern", { category: "critique" });

      const results = searchAnnotations("concern", { category: "critique" });
      expect(results.length).toBe(1);
    });

    it("filters by author", () => {
      createAnnotation("ev-1", "Note by Smith", { author: "Dr. Smith" });
      createAnnotation("ev-1", "Note by Jones", { author: "Dr. Jones" });

      const results = searchAnnotations("note", { author: "Dr. Smith" });
      expect(results.length).toBe(1);
    });

    it("filters by resolved status", () => {
      createAnnotation("ev-1", "Resolved issue");
      const ann2 = createAnnotation("ev-1", "Open issue");
      updateAnnotation(ann2!.id, { resolved: true });

      const unresolved = searchAnnotations("issue", { resolved: false });
      expect(unresolved.length).toBe(1);
    });

    it("searches by tags", () => {
      createAnnotation("ev-1", "Tagged note", { tags: ["priority"] });
      createAnnotation("ev-1", "Untagged note");

      const results = searchAnnotations("priority");
      expect(results.length).toBe(1);
    });
  });

  describe("getAnnotationCounts", () => {
    it("counts annotations per evidence piece", () => {
      createAnnotation("ev-1", "Note 1");
      createAnnotation("ev-1", "Note 2");
      createAnnotation("ev-2", "Note 3");

      const counts = getAnnotationCounts();
      expect(counts["ev-1"]).toBe(2);
      expect(counts["ev-2"]).toBe(1);
    });
  });

  describe("getRecentAnnotations", () => {
    it("returns recent annotations sorted by date", () => {
      createAnnotation("ev-1", "First");
      createAnnotation("ev-1", "Second");
      createAnnotation("ev-1", "Third");

      const recent = getRecentAnnotations(2);
      expect(recent.length).toBe(2);
    });

    it("excludes replies from top-level", () => {
      const parent = createAnnotation("ev-1", "Parent");
      createAnnotation("ev-1", "Reply", { parentId: parent!.id });

      const recent = getRecentAnnotations(10);
      expect(recent.length).toBe(1);
    });
  });

  describe("getAnnotationStats", () => {
    it("computes statistics", () => {
      createAnnotation("ev-1", "Note 1", { author: "Smith", category: "note" });
      createAnnotation("ev-1", "Critique", { author: "Jones", category: "critique" });
      const ann3 = createAnnotation("ev-2", "Resolved", { author: "Smith" });
      updateAnnotation(ann3!.id, { resolved: true });

      const stats = getAnnotationStats();
      expect(stats.total).toBe(3);
      expect(stats.byCategory["note"]).toBe(2);
      expect(stats.byCategory["critique"]).toBe(1);
      expect(stats.byAuthor["Smith"]).toBe(2);
      expect(stats.resolved).toBe(1);
      expect(stats.unresolved).toBe(2);
    });
  });
});
