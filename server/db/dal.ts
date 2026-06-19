// ─────────────────────────────────────────────────────────────────────────────
// Data Access Layer — PostgreSQL implementation replacing localStorage.
// Provides typed CRUD operations for all entities.
// ─────────────────────────────────────────────────────────────────────────────

export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
}

export type QueryFunction = (sql: string, params?: unknown[]) => Promise<QueryResult>;

// ─── Evidence ────────────────────────────────────────────────────────────────

export interface EvidenceRow {
  id: string;
  title: string;
  tier: string;
  year: number | null;
  source: string;
  authors: string | null;
  journal: string | null;
  n: number | null;
  effect: string | null;
  confidence: number;
  url: string | null;
  abstract: string | null;
  conditions: string[];
  interventions: string[];
  created_at: string;
  updated_at: string;
}

export interface EvidenceInsert {
  id: string;
  title: string;
  tier: string;
  year?: number | null;
  source: string;
  authors?: string;
  journal?: string;
  n?: number | null;
  effect?: string;
  confidence: number;
  url?: string;
  abstract?: string;
  conditions?: string[];
  interventions?: string[];
}

export async function upsertEvidence(
  query: QueryFunction,
  evidence: EvidenceInsert,
): Promise<void> {
  await query(
    `INSERT INTO evidence_pieces (id, title, tier, year, source, authors, journal, n, effect, confidence, url, abstract, conditions, interventions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, tier = EXCLUDED.tier, year = EXCLUDED.year,
       source = EXCLUDED.source, authors = EXCLUDED.authors, journal = EXCLUDED.journal,
       n = EXCLUDED.n, effect = EXCLUDED.effect, confidence = EXCLUDED.confidence,
       url = EXCLUDED.url, abstract = EXCLUDED.abstract, conditions = EXCLUDED.conditions,
       interventions = EXCLUDED.interventions, updated_at = NOW()`,
    [
      evidence.id, evidence.title, evidence.tier, evidence.year ?? null,
      evidence.source, evidence.authors ?? null, evidence.journal ?? null,
      evidence.n ?? null, evidence.effect ?? null, evidence.confidence,
      evidence.url ?? null, evidence.abstract ?? null,
      evidence.conditions ?? [], evidence.interventions ?? [],
    ],
  );
}

export async function getEvidenceById(
  query: QueryFunction,
  id: string,
): Promise<EvidenceRow | null> {
  const result = await query("SELECT * FROM evidence_pieces WHERE id = $1", [id]);
  return (result.rows[0] as EvidenceRow) ?? null;
}

export async function searchEvidence(
  query: QueryFunction,
  searchTerm: string,
  limit: number = 50,
): Promise<EvidenceRow[]> {
  const result = await query(
    `SELECT * FROM evidence_pieces
     WHERE title ILIKE $1 OR abstract ILIKE $1 OR source ILIKE $1
     ORDER BY confidence DESC
     LIMIT $2`,
    [`%${searchTerm}%`, limit],
  );
  return result.rows as EvidenceRow[];
}

export async function getEvidenceByTopic(
  query: QueryFunction,
  topicId: string,
  limit: number = 100,
): Promise<EvidenceRow[]> {
  const result = await query(
    `SELECT e.* FROM evidence_pieces e
     JOIN topic_evidence te ON e.id = te.evidence_id
     WHERE te.topic_id = $1
     ORDER BY te.relevance_score DESC, e.confidence DESC
     LIMIT $2`,
    [topicId, limit],
  );
  return result.rows as EvidenceRow[];
}

// ─── Topics ──────────────────────────────────────────────────────────────────

export interface TopicRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export async function upsertTopic(
  query: QueryFunction,
  topic: { id: string; name: string; description?: string },
): Promise<void> {
  await query(
    `INSERT INTO topics (id, name, description) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW()`,
    [topic.id, topic.name, topic.description ?? null],
  );
}

export async function getTopic(
  query: QueryFunction,
  id: string,
): Promise<TopicRow | null> {
  const result = await query("SELECT * FROM topics WHERE id = $1", [id]);
  return (result.rows[0] as TopicRow) ?? null;
}

// ─── Collections ─────────────────────────────────────────────────────────────

export interface CollectionRow {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export async function createCollection(
  query: QueryFunction,
  collection: { id: string; name: string; description?: string; color?: string },
): Promise<CollectionRow> {
  await query(
    `INSERT INTO collections (id, name, description, color) VALUES ($1, $2, $3, $4)`,
    [collection.id, collection.name, collection.description ?? "", collection.color ?? "#6366f1"],
  );
  return (await getCollection(query, collection.id))!;
}

export async function getCollection(
  query: QueryFunction,
  id: string,
): Promise<CollectionRow | null> {
  const result = await query("SELECT * FROM collections WHERE id = $1", [id]);
  return (result.rows[0] as CollectionRow) ?? null;
}

export async function listCollections(
  query: QueryFunction,
): Promise<CollectionRow[]> {
  const result = await query(
    "SELECT * FROM collections ORDER BY updated_at DESC",
  );
  return result.rows as CollectionRow[];
}

export async function deleteCollection(
  query: QueryFunction,
  id: string,
): Promise<boolean> {
  const result = await query("DELETE FROM collections WHERE id = $1", [id]);
  return result.rowCount > 0;
}

export async function addCollectionItem(
  query: QueryFunction,
  collectionId: string,
  evidenceId: string,
  notes?: string,
  tags?: string[],
  rating?: number,
): Promise<void> {
  await query(
    `INSERT INTO collection_items (collection_id, evidence_id, notes, tags, rating)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (collection_id, evidence_id) DO UPDATE SET
       notes = COALESCE(EXCLUDED.notes, collection_items.notes),
       tags = COALESCE(EXCLUDED.tags, collection_items.tags),
       rating = COALESCE(EXCLUDED.rating, collection_items.rating)`,
    [collectionId, evidenceId, notes ?? "", tags ?? [], rating ?? null],
  );
}

// ─── Annotations ─────────────────────────────────────────────────────────────

export interface AnnotationRow {
  id: string;
  evidence_id: string;
  author: string;
  category: string;
  content: string;
  parent_id: string | null;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

export async function createAnnotation(
  query: QueryFunction,
  annotation: {
    id: string;
    evidenceId: string;
    author: string;
    category: string;
    content: string;
    parentId?: string;
  },
): Promise<AnnotationRow> {
  await query(
    `INSERT INTO annotations (id, evidence_id, author, category, content, parent_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [annotation.id, annotation.evidenceId, annotation.author, annotation.category, annotation.content, annotation.parentId ?? null],
  );
  return (await query("SELECT * FROM annotations WHERE id = $1", [annotation.id]))
    .rows[0] as AnnotationRow;
}

export async function getAnnotationsForEvidence(
  query: QueryFunction,
  evidenceId: string,
): Promise<AnnotationRow[]> {
  const result = await query(
    "SELECT * FROM annotations WHERE evidence_id = $1 AND parent_id IS NULL ORDER BY created_at DESC",
    [evidenceId],
  );
  return result.rows as AnnotationRow[];
}

export async function getAnnotationReplies(
  query: QueryFunction,
  parentId: string,
): Promise<AnnotationRow[]> {
  const result = await query(
    "SELECT * FROM annotations WHERE parent_id = $1 ORDER BY created_at ASC",
    [parentId],
  );
  return result.rows as AnnotationRow[];
}

// ─── Workspaces ──────────────────────────────────────────────────────────────

export interface WorkspaceRow {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export async function createWorkspace(
  query: QueryFunction,
  workspace: { id: string; name: string; description?: string; color?: string },
): Promise<WorkspaceRow> {
  await query(
    `INSERT INTO workspaces (id, name, description, color) VALUES ($1, $2, $3, $4)`,
    [workspace.id, workspace.name, workspace.description ?? "", workspace.color ?? "#6366f1"],
  );
  // Add owner
  await query(
    `INSERT INTO workspace_members (workspace_id, name, role) VALUES ($1, $2, 'owner')`,
    [workspace.id, workspace.name],
  );
  return (await getWorkspace(query, workspace.id))!;
}

export async function getWorkspace(
  query: QueryFunction,
  id: string,
): Promise<WorkspaceRow | null> {
  const result = await query("SELECT * FROM workspaces WHERE id = $1", [id]);
  return (result.rows[0] as WorkspaceRow) ?? null;
}

export async function addWorkspaceMember(
  query: QueryFunction,
  workspaceId: string,
  name: string,
  role: string = "member",
): Promise<void> {
  await query(
    `INSERT INTO workspace_members (workspace_id, name, role) VALUES ($1, $2, $3)
     ON CONFLICT (workspace_id, name) DO UPDATE SET role = EXCLUDED.role`,
    [workspaceId, name, role],
  );
}

export async function logWorkspaceActivity(
  query: QueryFunction,
  workspaceId: string,
  type: string,
  actor: string,
  description: string,
  entityId?: string,
): Promise<void> {
  const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await query(
    `INSERT INTO workspace_activity (id, workspace_id, type, actor, description, entity_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, workspaceId, type, actor, description, entityId ?? null],
  );
}

// ─── Ingestion Jobs ─────────────────────────────────────────────────────────

export interface IngestionJobRow {
  id: string;
  status: string;
  queries: string[];
  total: number;
  completed: number;
  failed: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export async function createIngestionJob(
  query: QueryFunction,
  job: { id: string; queries: string[] },
): Promise<IngestionJobRow> {
  await query(
    `INSERT INTO ingestion_jobs (id, status, queries) VALUES ($1, 'pending', $2)`,
    [job.id, job.queries],
  );
  return (await getIngestionJob(query, job.id))!;
}

export async function getIngestionJob(
  query: QueryFunction,
  id: string,
): Promise<IngestionJobRow | null> {
  const result = await query("SELECT * FROM ingestion_jobs WHERE id = $1", [id]);
  return (result.rows[0] as IngestionJobRow) ?? null;
}

export async function updateIngestionJob(
  query: QueryFunction,
  id: string,
  updates: {
    status?: string;
    total?: number;
    completed?: number;
    failed?: number;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
  },
): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return;

  values.push(id);
  await query(
    `UPDATE ingestion_jobs SET ${setClauses.join(", ")} WHERE id = $${paramIndex}`,
    values,
  );
}

// ─── Error Log ───────────────────────────────────────────────────────────────

export interface ErrorLogRow {
  id: string;
  message: string;
  source: string;
  url: string | null;
  stack: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function logError(
  query: QueryFunction,
  error: {
    id: string;
    message: string;
    source: string;
    url?: string;
    stack?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await query(
    `INSERT INTO error_log (id, message, source, url, stack, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [error.id, error.message, error.source, error.url ?? null, error.stack ?? null, error.metadata ? JSON.stringify(error.metadata) : null],
  );
}

export async function getRecentErrors(
  query: QueryFunction,
  limit: number = 50,
): Promise<ErrorLogRow[]> {
  const result = await query(
    "SELECT * FROM error_log ORDER BY created_at DESC LIMIT $1",
    [limit],
  );
  return result.rows as ErrorLogRow[];
}

// ─── Rate Limit Stats ────────────────────────────────────────────────────────

export async function upsertRateLimitStats(
  query: QueryFunction,
  stats: {
    sourceId: string;
    totalRequests: number;
    throttledRequests: number;
    totalWaitMs: number;
    errorCount: number;
  },
): Promise<void> {
  await query(
    `INSERT INTO rate_limit_stats (source_id, total_requests, throttled_requests, total_wait_ms, error_count, last_request_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (source_id) DO UPDATE SET
       total_requests = EXCLUDED.total_requests,
       throttled_requests = EXCLUDED.throttled_requests,
       total_wait_ms = EXCLUDED.total_wait_ms,
       error_count = EXCLUDED.error_count,
       last_request_at = NOW(),
       updated_at = NOW()`,
    [stats.sourceId, stats.totalRequests, stats.throttledRequests, stats.totalWaitMs, stats.errorCount],
  );
}
