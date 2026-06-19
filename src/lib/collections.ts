// ─────────────────────────────────────────────────────────────────────────────
// Evidence Collections — save, organize, annotate, and export evidence sets.
// Persists to localStorage. Each collection holds evidence pieces with
// optional user annotations, tags, and export capabilities.
// ─────────────────────────────────────────────────────────────────────────────

import type { EvidencePiece } from "@/lib/evidence";

export interface CollectionItem {
  /** The evidence piece */
  evidence: EvidencePiece;
  /** User annotation/note on this piece */
  note: string | null;
  /** User-assigned tags */
  tags: string[];
  /** When this item was added to the collection */
  addedAt: string;
  /** Relevance rating (1-5) by the user */
  rating: number | null;
}

export interface EvidenceCollection {
  /** Unique collection ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description: string;
  /** Items in this collection */
  items: CollectionItem[];
  /** When the collection was created */
  createdAt: string;
  /** When the collection was last modified */
  updatedAt: string;
  /** Topic this collection is associated with */
  topicId: string | null;
  /** Color label for visual organization */
  color: string;
}

export interface CollectionSummary {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  topicId: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "pran-evidence-collections";
const MAX_COLLECTIONS = 50;
const MAX_ITEMS_PER_COLLECTION = 500;

// ─────────────────────────────────────────────────────────────────────────────
// Storage helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadCollections(): EvidenceCollection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EvidenceCollection[];
  } catch {
    return [];
  }
}

function saveCollections(collections: EvidenceCollection[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

function generateId(): string {
  return `col-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Collection CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new evidence collection.
 */
export function createCollection(
  name: string,
  opts: {
    description?: string;
    topicId?: string | null;
    color?: string;
  } = {},
): EvidenceCollection {
  const collections = loadCollections();

  if (collections.length >= MAX_COLLECTIONS) {
    throw new Error(`Maximum ${MAX_COLLECTIONS} collections reached`);
  }

  const now = new Date().toISOString();
  const collection: EvidenceCollection = {
    id: generateId(),
    name: name.trim(),
    description: opts.description?.trim() ?? "",
    items: [],
    createdAt: now,
    updatedAt: now,
    topicId: opts.topicId ?? null,
    color: opts.color ?? "#6366f1",
  };

  collections.push(collection);
  saveCollections(collections);
  return collection;
}

/**
 * Get all collections (summary view).
 */
export function listCollections(): CollectionSummary[] {
  return loadCollections().map(({ items, ...rest }) => ({
    ...rest,
    itemCount: items.length,
  }));
}

/**
 * Get a single collection by ID.
 */
export function getCollection(id: string): EvidenceCollection | null {
  return loadCollections().find((c) => c.id === id) ?? null;
}

/**
 * Update collection metadata (name, description, color).
 */
export function updateCollection(
  id: string,
  updates: Partial<Pick<EvidenceCollection, "name" | "description" | "color" | "topicId">>,
): EvidenceCollection | null {
  const collections = loadCollections();
  const idx = collections.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  if (updates.name !== undefined) collections[idx].name = updates.name.trim();
  if (updates.description !== undefined) collections[idx].description = updates.description.trim();
  if (updates.color !== undefined) collections[idx].color = updates.color;
  if (updates.topicId !== undefined) collections[idx].topicId = updates.topicId;
  collections[idx].updatedAt = new Date().toISOString();

  saveCollections(collections);
  return collections[idx];
}

/**
 * Delete a collection.
 */
export function deleteCollection(id: string): boolean {
  const collections = loadCollections();
  const filtered = collections.filter((c) => c.id !== id);
  if (filtered.length === collections.length) return false;
  saveCollections(filtered);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Item management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add an evidence piece to a collection.
 */
export function addItem(
  collectionId: string,
  evidence: EvidencePiece,
  opts: {
    note?: string;
    tags?: string[];
    rating?: number;
  } = {},
): CollectionItem | null {
  const collections = loadCollections();
  const collection = collections.find((c) => c.id === collectionId);
  if (!collection) return null;

  if (collection.items.length >= MAX_ITEMS_PER_COLLECTION) {
    throw new Error(`Maximum ${MAX_ITEMS_PER_COLLECTION} items per collection`);
  }

  // Check for duplicates by evidence ID
  const existing = collection.items.find((i) => i.evidence.id === evidence.id);
  if (existing) return existing;

  const item: CollectionItem = {
    evidence,
    note: opts.note ?? null,
    tags: opts.tags ?? [],
    addedAt: new Date().toISOString(),
    rating: opts.rating ?? null,
  };

  collection.items.push(item);
  collection.updatedAt = new Date().toISOString();
  saveCollections(collections);
  return item;
}

/**
 * Remove an evidence piece from a collection.
 */
export function removeItem(collectionId: string, evidenceId: string): boolean {
  const collections = loadCollections();
  const collection = collections.find((c) => c.id === collectionId);
  if (!collection) return false;

  const before = collection.items.length;
  collection.items = collection.items.filter((i) => i.evidence.id !== evidenceId);
  if (collection.items.length === before) return false;

  collection.updatedAt = new Date().toISOString();
  saveCollections(collections);
  return true;
}

/**
 * Update an item's note, tags, or rating.
 */
export function updateItem(
  collectionId: string,
  evidenceId: string,
  updates: Partial<Pick<CollectionItem, "note" | "tags" | "rating">>,
): CollectionItem | null {
  const collections = loadCollections();
  const collection = collections.find((c) => c.id === collectionId);
  if (!collection) return null;

  const item = collection.items.find((i) => i.evidence.id === evidenceId);
  if (!item) return null;

  if (updates.note !== undefined) item.note = updates.note;
  if (updates.tags !== undefined) item.tags = updates.tags;
  if (updates.rating !== undefined) item.rating = updates.rating;

  collection.updatedAt = new Date().toISOString();
  saveCollections(collections);
  return item;
}

/**
 * Check if an evidence piece is in any collection.
 */
export function isInCollection(evidenceId: string): string | null {
  for (const collection of loadCollections()) {
    if (collection.items.some((i) => i.evidence.id === evidenceId)) {
      return collection.id;
    }
  }
  return null;
}

/**
 * Get all collections containing a specific evidence piece.
 */
export function getCollectionsForEvidence(evidenceId: string): CollectionSummary[] {
  return loadCollections()
    .filter((c) => c.items.some((i) => i.evidence.id === evidenceId))
    .map(({ items, ...rest }) => ({ ...rest, itemCount: items.length }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Search and filter within collections
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search items within a collection by title, note, or tags.
 */
export function searchCollection(
  collectionId: string,
  query: string,
): CollectionItem[] {
  const collection = getCollection(collectionId);
  if (!collection) return [];

  const lower = query.toLowerCase();
  return collection.items.filter(
    (item) =>
      item.evidence.title.toLowerCase().includes(lower) ||
      item.note?.toLowerCase().includes(lower) ||
      item.tags.some((t) => t.toLowerCase().includes(lower)),
  );
}

/**
 * Filter items by tag.
 */
export function filterByTag(collectionId: string, tag: string): CollectionItem[] {
  const collection = getCollection(collectionId);
  if (!collection) return [];

  const lower = tag.toLowerCase();
  return collection.items.filter((item) =>
    item.tags.some((t) => t.toLowerCase() === lower),
  );
}

/**
 * Filter items by minimum rating.
 */
export function filterByRating(
  collectionId: string,
  minRating: number,
): CollectionItem[] {
  const collection = getCollection(collectionId);
  if (!collection) return [];

  return collection.items.filter(
    (item) => item.rating !== null && item.rating >= minRating,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export a collection to Markdown format.
 */
export function exportToMarkdown(collectionId: string): string | null {
  const collection = getCollection(collectionId);
  if (!collection) return null;

  const lines: string[] = [
    `# ${collection.name}`,
    "",
    collection.description ? `> ${collection.description}` + "\n" : "",
    `**Created:** ${new Date(collection.createdAt).toLocaleDateString()}`,
    `**Items:** ${collection.items.length}`,
    "",
    "---",
    "",
  ];

  for (const item of collection.items) {
    const { evidence } = item;
    lines.push(`## ${evidence.title}`);
    lines.push("");
    lines.push(`- **Tier:** ${evidence.tier}`);
    lines.push(`- **Year:** ${evidence.year ?? "Unknown"}`);
    lines.push(`- **Source:** ${evidence.source}`);
    lines.push(`- **Authors:** ${evidence.authors}`);
    lines.push(`- **Journal:** ${evidence.journal}`);
    if (evidence.n) lines.push(`- **Sample size:** ${evidence.n.toLocaleString()}`);
    if (evidence.effect) lines.push(`- **Effect:** ${evidence.effect}`);
    lines.push(`- **Confidence:** ${evidence.confidence}%`);
    lines.push(`- **URL:** ${evidence.url}`);
    if (item.note) lines.push(`- **Note:** ${item.note}`);
    if (item.tags.length > 0) lines.push(`- **Tags:** ${item.tags.join(", ")}`);
    if (item.rating) lines.push(`- **Rating:** ${"★".repeat(item.rating)}${"☆".repeat(5 - item.rating)}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Export a collection to a structured JSON format.
 */
export function exportToJson(collectionId: string): string | null {
  const collection = getCollection(collectionId);
  if (!collection) return null;
  return JSON.stringify(collection, null, 2);
}

/**
 * Export a collection as a CSV string.
 */
export function exportToCsv(collectionId: string): string | null {
  const collection = getCollection(collectionId);
  if (!collection) return null;

  const headers = [
    "ID",
    "Title",
    "Tier",
    "Year",
    "Source",
    "Authors",
    "Journal",
    "Sample Size",
    "Effect",
    "Confidence",
    "URL",
    "Note",
    "Tags",
    "Rating",
    "Added At",
  ];

  const rows = collection.items.map((item) => {
    const { evidence } = item;
    return [
      evidence.id,
      `"${evidence.title.replace(/"/g, '""')}"`,
      evidence.tier,
      evidence.year ?? "",
      evidence.source,
      `"${evidence.authors.replace(/"/g, '""')}"`,
      `"${evidence.journal.replace(/"/g, '""')}"`,
      evidence.n ?? "",
      `"${(evidence.effect ?? "").replace(/"/g, '""')}"`,
      evidence.confidence,
      evidence.url,
      `"${(item.note ?? "").replace(/"/g, '""')}"`,
      `"${item.tags.join("; ")}"`,
      item.rating ?? "",
      item.addedAt,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Get aggregate statistics for a collection.
 */
export function getCollectionStats(collectionId: string): {
  totalItems: number;
  byTier: Record<string, number>;
  bySource: Record<string, number>;
  avgConfidence: number;
  yearRange: { min: number | null; max: number | null };
  avgRating: number | null;
  tagCounts: Record<string, number>;
} | null {
  const collection = getCollection(collectionId);
  if (!collection) return null;

  const byTier: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  let confidenceSum = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  let minYear: number | null = null;
  let maxYear: number | null = null;

  for (const item of collection.items) {
    const { evidence } = item;
    byTier[evidence.tier] = (byTier[evidence.tier] ?? 0) + 1;
    bySource[evidence.source] = (bySource[evidence.source] ?? 0) + 1;
    confidenceSum += evidence.confidence;

    if (evidence.year) {
      if (minYear === null || evidence.year < minYear) minYear = evidence.year;
      if (maxYear === null || evidence.year > maxYear) maxYear = evidence.year;
    }

    if (item.rating !== null) {
      ratingSum += item.rating;
      ratingCount++;
    }

    for (const tag of item.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  const total = collection.items.length;

  return {
    totalItems: total,
    byTier,
    bySource,
    avgConfidence: total > 0 ? Math.round(confidenceSum / total) : 0,
    yearRange: { min: minYear, max: maxYear },
    avgRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    tagCounts,
  };
}
