// ─────────────────────────────────────────────────────────────────────────────
// Annotations System — structured notes on evidence pieces.
// Users can add categorized annotations with threading, timestamps,
// and search. Persists to localStorage.
// ─────────────────────────────────────────────────────────────────────────────

export type AnnotationCategory =
  | "note"
  | "critique"
  | "question"
  | "comparison"
  | "clinical-relevance"
  | "methodology"
  | "limitation"
  | "follow-up";

export interface Annotation {
  /** Unique annotation ID */
  id: string;
  /** The evidence piece this annotation belongs to */
  evidenceId: string;
  /** Category of annotation */
  category: AnnotationCategory;
  /** The annotation text */
  content: string;
  /** Author name (defaults to "Anonymous") */
  author: string;
  /** When the annotation was created */
  createdAt: string;
  /** When the annotation was last edited */
  updatedAt: string;
  /** Parent annotation ID for threading (null = top-level) */
  parentId: string | null;
  /** Tags for filtering */
  tags: string[];
  /** Whether this annotation is resolved/archived */
  resolved: boolean;
}

export interface AnnotationSummary {
  id: string;
  evidenceId: string;
  category: AnnotationCategory;
  contentPreview: string;
  author: string;
  createdAt: string;
  parentId: string | null;
  resolved: boolean;
  replyCount: number;
}

const STORAGE_KEY = "pran-annotations";
const MAX_ANNOTATIONS = 2000;

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

function loadAnnotations(): Annotation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Annotation[];
  } catch {
    return [];
  }
}

function saveAnnotations(annotations: Annotation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  } catch {
    // Storage full — fail silently
  }
}

function generateId(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new annotation on an evidence piece.
 */
export function createAnnotation(
  evidenceId: string,
  content: string,
  opts: {
    category?: AnnotationCategory;
    author?: string;
    parentId?: string | null;
    tags?: string[];
  } = {},
): Annotation | null {
  const annotations = loadAnnotations();

  if (annotations.length >= MAX_ANNOTATIONS) {
    throw new Error(`Maximum ${MAX_ANNOTATIONS} annotations reached`);
  }

  // Verify parent exists if specified
  if (opts.parentId) {
    const parent = annotations.find((a) => a.id === opts.parentId);
    if (!parent) return null;
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) return null;

  const now = new Date().toISOString();
  const annotation: Annotation = {
    id: generateId(),
    evidenceId,
    category: opts.category ?? "note",
    content: trimmed,
    author: opts.author?.trim() || "Anonymous",
    createdAt: now,
    updatedAt: now,
    parentId: opts.parentId ?? null,
    tags: opts.tags ?? [],
    resolved: false,
  };

  annotations.push(annotation);
  saveAnnotations(annotations);
  return annotation;
}

/**
 * Get all annotations for an evidence piece.
 */
export function getAnnotationsForEvidence(evidenceId: string): Annotation[] {
  return loadAnnotations().filter((a) => a.evidenceId === evidenceId);
}

/**
 * Get summary view of annotations for an evidence piece.
 * Includes reply counts for top-level annotations.
 */
export function getAnnotationSummaries(evidenceId: string): AnnotationSummary[] {
  const all = getAnnotationsForEvidence(evidenceId);
  const topLevel = all.filter((a) => a.parentId === null);

  return topLevel.map((a) => ({
    id: a.id,
    evidenceId: a.evidenceId,
    category: a.category,
    contentPreview: a.content.length > 150 ? a.content.slice(0, 147) + "..." : a.content,
    author: a.author,
    createdAt: a.createdAt,
    parentId: a.parentId,
    resolved: a.resolved,
    replyCount: all.filter((child) => child.parentId === a.id).length,
  }));
}

/**
 * Get replies to an annotation (threaded).
 */
export function getReplies(annotationId: string): Annotation[] {
  return loadAnnotations().filter((a) => a.parentId === annotationId);
}

/**
 * Get a single annotation by ID.
 */
export function getAnnotation(id: string): Annotation | null {
  return loadAnnotations().find((a) => a.id === id) ?? null;
}

/**
 * Update annotation content, category, or tags.
 */
export function updateAnnotation(
  id: string,
  updates: Partial<Pick<Annotation, "content" | "category" | "tags" | "resolved">>,
): Annotation | null {
  const annotations = loadAnnotations();
  const idx = annotations.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  if (updates.content !== undefined) annotations[idx].content = updates.content.trim();
  if (updates.category !== undefined) annotations[idx].category = updates.category;
  if (updates.tags !== undefined) annotations[idx].tags = updates.tags;
  if (updates.resolved !== undefined) annotations[idx].resolved = updates.resolved;
  annotations[idx].updatedAt = new Date().toISOString();

  saveAnnotations(annotations);
  return annotations[idx];
}

/**
 * Delete an annotation and its replies.
 */
export function deleteAnnotation(id: string): boolean {
  const annotations = loadAnnotations();
  const target = annotations.find((a) => a.id === id);
  if (!target) return false;

  // Delete annotation and all its replies
  const idsToDelete = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const a of annotations) {
      if (a.parentId && idsToDelete.has(a.parentId) && !idsToDelete.has(a.id)) {
        idsToDelete.add(a.id);
        changed = true;
      }
    }
  }

  const filtered = annotations.filter((a) => !idsToDelete.has(a.id));
  saveAnnotations(filtered);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Search and filter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search annotations across all evidence pieces.
 */
export function searchAnnotations(
  query: string,
  opts: {
    category?: AnnotationCategory;
    author?: string;
    resolved?: boolean;
    evidenceId?: string;
  } = {},
): Annotation[] {
  const lower = query.toLowerCase();
  let results = loadAnnotations();

  if (opts.category) {
    results = results.filter((a) => a.category === opts.category);
  }
  if (opts.author) {
    results = results.filter((a) => a.author.toLowerCase() === opts.author!.toLowerCase());
  }
  if (opts.resolved !== undefined) {
    results = results.filter((a) => a.resolved === opts.resolved);
  }
  if (opts.evidenceId) {
    results = results.filter((a) => a.evidenceId === opts.evidenceId);
  }

  return results.filter(
    (a) =>
      a.content.toLowerCase().includes(lower) ||
      a.tags.some((t) => t.toLowerCase().includes(lower)),
  );
}

/**
 * Get annotation counts per evidence piece.
 */
export function getAnnotationCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of loadAnnotations()) {
    counts[a.evidenceId] = (counts[a.evidenceId] ?? 0) + 1;
  }
  return counts;
}

/**
 * Get recent annotations across all evidence.
 */
export function getRecentAnnotations(limit: number = 10): AnnotationSummary[] {
  const all = loadAnnotations()
    .filter((a) => a.parentId === null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return all.map((a) => ({
    id: a.id,
    evidenceId: a.evidenceId,
    category: a.category,
    contentPreview: a.content.length > 150 ? a.content.slice(0, 147) + "..." : a.content,
    author: a.author,
    createdAt: a.createdAt,
    parentId: a.parentId,
    resolved: a.resolved,
    replyCount: loadAnnotations().filter((child) => child.parentId === a.id).length,
  }));
}

/**
 * Get statistics about annotations.
 */
export function getAnnotationStats(): {
  total: number;
  byCategory: Record<string, number>;
  byAuthor: Record<string, number>;
  resolved: number;
  unresolved: number;
} {
  const annotations = loadAnnotations();
  const byCategory: Record<string, number> = {};
  const byAuthor: Record<string, number> = {};

  for (const a of annotations) {
    byCategory[a.category] = (byCategory[a.category] ?? 0) + 1;
    byAuthor[a.author] = (byAuthor[a.author] ?? 0) + 1;
  }

  return {
    total: annotations.length,
    byCategory,
    byAuthor,
    resolved: annotations.filter((a) => a.resolved).length,
    unresolved: annotations.filter((a) => !a.resolved).length,
  };
}
