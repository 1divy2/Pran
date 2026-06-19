import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createCollection,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  addItem,
  removeItem,
  updateItem,
  isInCollection,
  getCollectionsForEvidence,
  searchCollection,
  filterByTag,
  filterByRating,
  exportToMarkdown,
  exportToJson,
  exportToCsv,
  getCollectionStats,
} from "@/lib/collections";
import type { EvidencePiece } from "@/lib/evidence";

// Mock localStorage
const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  get length() {
    return storage.size;
  },
  key: (index: number) => [...storage.keys()][index] ?? null,
});

function mockEvidence(overrides: Partial<EvidencePiece> = {}): EvidencePiece {
  return {
    id: `pmid-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test evidence piece",
    tier: "rct",
    year: 2024,
    source: "PubMed",
    authors: "Author A; Author B",
    journal: "Test Journal",
    n: 500,
    effect: "OR 1.5, 95% CI 1.1–2.0",
    confidence: 75,
    url: "https://example.com",
    abstract: "Test abstract",
    ...overrides,
  };
}

describe("Evidence Collections", () => {
  beforeEach(() => {
    storage.clear();
  });

  describe("createCollection", () => {
    it("creates a collection with defaults", () => {
      const col = createCollection("My Collection");
      expect(col.id).toMatch(/^col-/);
      expect(col.name).toBe("My Collection");
      expect(col.description).toBe("");
      expect(col.items).toEqual([]);
      expect(col.topicId).toBeNull();
      expect(col.color).toBe("#6366f1");
    });

    it("creates with options", () => {
      const col = createCollection("Guidelines", {
        description: "Important guidelines",
        topicId: "hypertension",
        color: "#ef4444",
      });
      expect(col.description).toBe("Important guidelines");
      expect(col.topicId).toBe("hypertension");
      expect(col.color).toBe("#ef4444");
    });

    it("trims whitespace from name", () => {
      const col = createCollection("  My Collection  ");
      expect(col.name).toBe("My Collection");
    });
  });

  describe("listCollections", () => {
    it("returns empty array when no collections exist", () => {
      expect(listCollections()).toEqual([]);
    });

    it("returns summaries of all collections", () => {
      createCollection("A");
      createCollection("B");
      const list = listCollections();
      expect(list.length).toBe(2);
      expect(list[0].name).toBe("A");
      expect(list[0].itemCount).toBe(0);
    });
  });

  describe("getCollection", () => {
    it("retrieves a collection by ID", () => {
      const created = createCollection("Test");
      const retrieved = getCollection(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe("Test");
    });

    it("returns null for unknown ID", () => {
      expect(getCollection("nonexistent")).toBeNull();
    });
  });

  describe("updateCollection", () => {
    it("updates name and description", () => {
      const col = createCollection("Old Name");
      const updated = updateCollection(col.id, {
        name: "New Name",
        description: "Updated",
      });
      expect(updated!.name).toBe("New Name");
      expect(updated!.description).toBe("Updated");
    });

    it("returns null for unknown ID", () => {
      expect(updateCollection("nonexistent", { name: "X" })).toBeNull();
    });
  });

  describe("deleteCollection", () => {
    it("deletes a collection", () => {
      const col = createCollection("To Delete");
      expect(deleteCollection(col.id)).toBe(true);
      expect(getCollection(col.id)).toBeNull();
    });

    it("returns false for unknown ID", () => {
      expect(deleteCollection("nonexistent")).toBe(false);
    });
  });

  describe("addItem", () => {
    it("adds an evidence piece to a collection", () => {
      const col = createCollection("Test");
      const evidence = mockEvidence({ id: "pmid-123" });
      const item = addItem(col.id, evidence);

      expect(item).not.toBeNull();
      expect(item!.evidence.id).toBe("pmid-123");
      expect(item!.tags).toEqual([]);
      expect(item!.note).toBeNull();
    });

    it("adds with note, tags, and rating", () => {
      const col = createCollection("Test");
      const evidence = mockEvidence();
      const item = addItem(col.id, evidence, {
        note: "Important study",
        tags: ["key-evidence", "cardiology"],
        rating: 5,
      });

      expect(item!.note).toBe("Important study");
      expect(item!.tags).toEqual(["key-evidence", "cardiology"]);
      expect(item!.rating).toBe(5);
    });

    it("returns existing item for duplicate evidence ID", () => {
      const col = createCollection("Test");
      const evidence = mockEvidence({ id: "pmid-123" });
      const item1 = addItem(col.id, evidence);
      const item2 = addItem(col.id, evidence, { note: "Updated" });

      expect(item2!.note).toBeNull(); // Original item returned
      const reloaded = getCollection(col.id);
      expect(reloaded!.items.length).toBe(1);
    });

    it("returns null for unknown collection", () => {
      const evidence = mockEvidence();
      expect(addItem("nonexistent", evidence)).toBeNull();
    });
  });

  describe("removeItem", () => {
    it("removes an item from a collection", () => {
      const col = createCollection("Test");
      const evidence = mockEvidence({ id: "pmid-123" });
      addItem(col.id, evidence);

      expect(removeItem(col.id, "pmid-123")).toBe(true);
      const reloaded = getCollection(col.id);
      expect(reloaded!.items.length).toBe(0);
    });

    it("returns false for unknown item", () => {
      const col = createCollection("Test");
      expect(removeItem(col.id, "nonexistent")).toBe(false);
    });
  });

  describe("updateItem", () => {
    it("updates note and tags", () => {
      const col = createCollection("Test");
      const evidence = mockEvidence({ id: "pmid-123" });
      addItem(col.id, evidence);

      const updated = updateItem(col.id, "pmid-123", {
        note: "Updated note",
        tags: ["new-tag"],
        rating: 4,
      });

      expect(updated!.note).toBe("Updated note");
      expect(updated!.tags).toEqual(["new-tag"]);
      expect(updated!.rating).toBe(4);
    });

    it("returns null for unknown item", () => {
      const col = createCollection("Test");
      expect(updateItem(col.id, "nonexistent", { note: "X" })).toBeNull();
    });
  });

  describe("isInCollection", () => {
    it("finds evidence in a collection", () => {
      const col = createCollection("Test");
      const evidence = mockEvidence({ id: "pmid-123" });
      addItem(col.id, evidence);

      expect(isInCollection("pmid-123")).toBe(col.id);
    });

    it("returns null for evidence not in any collection", () => {
      expect(isInCollection("nonexistent")).toBeNull();
    });
  });

  describe("getCollectionsForEvidence", () => {
    it("finds all collections containing evidence", () => {
      const col1 = createCollection("A");
      const col2 = createCollection("B");
      const evidence = mockEvidence({ id: "pmid-123" });
      addItem(col1.id, evidence);
      addItem(col2.id, evidence);

      const results = getCollectionsForEvidence("pmid-123");
      expect(results.length).toBe(2);
    });
  });

  describe("searchCollection", () => {
    it("searches by title", () => {
      const col = createCollection("Test");
      addItem(col.id, mockEvidence({ id: "1", title: "Aspirin for cardiovascular prevention" }));
      addItem(col.id, mockEvidence({ id: "2", title: "Metformin for diabetes" }));

      const results = searchCollection(col.id, "aspirin");
      expect(results.length).toBe(1);
      expect(results[0].evidence.title).toContain("Aspirin");
    });

    it("searches by note", () => {
      const col = createCollection("Test");
      addItem(col.id, mockEvidence({ id: "1" }), { note: "Landmark study" });
      addItem(col.id, mockEvidence({ id: "2" }));

      const results = searchCollection(col.id, "landmark");
      expect(results.length).toBe(1);
    });

    it("searches by tag", () => {
      const col = createCollection("Test");
      addItem(col.id, mockEvidence({ id: "1" }), { tags: ["priority"] });
      addItem(col.id, mockEvidence({ id: "2" }));

      const results = searchCollection(col.id, "priority");
      expect(results.length).toBe(1);
    });
  });

  describe("filterByTag", () => {
    it("filters items by tag", () => {
      const col = createCollection("Test");
      addItem(col.id, mockEvidence({ id: "1" }), { tags: ["cardiology"] });
      addItem(col.id, mockEvidence({ id: "2" }), { tags: ["oncology"] });
      addItem(col.id, mockEvidence({ id: "3" }), { tags: ["cardiology", "elderly"] });

      const results = filterByTag(col.id, "cardiology");
      expect(results.length).toBe(2);
    });
  });

  describe("filterByRating", () => {
    it("filters items by minimum rating", () => {
      const col = createCollection("Test");
      addItem(col.id, mockEvidence({ id: "1" }), { rating: 5 });
      addItem(col.id, mockEvidence({ id: "2" }), { rating: 3 });
      addItem(col.id, mockEvidence({ id: "3" }), { rating: 4 });

      const results = filterByRating(col.id, 4);
      expect(results.length).toBe(2);
    });
  });

  describe("exportToMarkdown", () => {
    it("exports a collection as markdown", () => {
      const col = createCollection("My Research", { description: "Key findings" });
      addItem(
        col.id,
        mockEvidence({ id: "1", title: "Study A", tier: "meta-analysis", year: 2023 }),
        {
          note: "Important",
          tags: ["key"],
          rating: 5,
        },
      );

      const md = exportToMarkdown(col.id);
      expect(md).toContain("# My Research");
      expect(md).toContain("Key findings");
      expect(md).toContain("Study A");
      expect(md).toContain("meta-analysis");
      expect(md).toContain("Important");
      expect(md).toContain("key");
      expect(md).toContain("★".repeat(5));
    });

    it("returns null for unknown collection", () => {
      expect(exportToMarkdown("nonexistent")).toBeNull();
    });
  });

  describe("exportToJson", () => {
    it("exports a collection as JSON", () => {
      const col = createCollection("Test");
      addItem(col.id, mockEvidence({ id: "1" }));

      const json = exportToJson(col.id);
      expect(json).not.toBeNull();
      const parsed = JSON.parse(json!);
      expect(parsed.name).toBe("Test");
      expect(parsed.items.length).toBe(1);
    });
  });

  describe("exportToCsv", () => {
    it("exports a collection as CSV", () => {
      const col = createCollection("Test");
      addItem(col.id, mockEvidence({ id: "pmid-1", title: "Study A" }));

      const csv = exportToCsv(col.id);
      expect(csv).toContain("ID,Title,Tier");
      expect(csv).toContain("pmid-1");
      expect(csv).toContain("Study A");
    });
  });

  describe("getCollectionStats", () => {
    it("computes aggregate statistics", () => {
      const col = createCollection("Test");
      addItem(
        col.id,
        mockEvidence({ id: "1", tier: "rct", source: "PubMed", year: 2023, confidence: 80 }),
        {
          tags: ["key"],
          rating: 5,
        },
      );
      addItem(
        col.id,
        mockEvidence({ id: "2", tier: "cohort", source: "PubMed", year: 2024, confidence: 60 }),
        {
          tags: ["key", "secondary"],
          rating: 3,
        },
      );

      const stats = getCollectionStats(col.id);
      expect(stats).not.toBeNull();
      expect(stats!.totalItems).toBe(2);
      expect(stats!.byTier["rct"]).toBe(1);
      expect(stats!.byTier["cohort"]).toBe(1);
      expect(stats!.bySource["PubMed"]).toBe(2);
      expect(stats!.avgConfidence).toBe(70);
      expect(stats!.yearRange.min).toBe(2023);
      expect(stats!.yearRange.max).toBe(2024);
      expect(stats!.avgRating).toBe(4);
      expect(stats!.tagCounts["key"]).toBe(2);
      expect(stats!.tagCounts["secondary"]).toBe(1);
    });

    it("returns null for unknown collection", () => {
      expect(getCollectionStats("nonexistent")).toBeNull();
    });

    it("handles empty collection", () => {
      const col = createCollection("Empty");
      const stats = getCollectionStats(col.id);
      expect(stats!.totalItems).toBe(0);
      expect(stats!.avgConfidence).toBe(0);
      expect(stats!.avgRating).toBeNull();
    });
  });
});
