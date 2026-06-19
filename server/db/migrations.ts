// ─────────────────────────────────────────────────────────────────────────────
// Migration System — tracks and applies database schema changes.
// Each migration is a numbered SQL file with up/down functions.
// ─────────────────────────────────────────────────────────────────────────────

export interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
}

export interface MigrationRecord {
  id: string;
  name: string;
  applied_at: string;
  checksum: string;
}

const MIGRATIONS: Migration[] = [
  {
    id: "001",
    name: "create_core_tables",
    up: `
      -- Enable pgvector for embedding similarity search
      CREATE EXTENSION IF NOT EXISTS vector;

      -- Evidence pieces — the core data unit
      CREATE TABLE IF NOT EXISTS evidence_pieces (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        tier TEXT NOT NULL CHECK (tier IN ('meta-analysis', 'rct', 'cohort', 'case-report', 'guideline', 'expert-opinion')),
        year INTEGER,
        source TEXT NOT NULL,
        authors TEXT,
        journal TEXT,
        n INTEGER,
        effect TEXT,
        confidence INTEGER NOT NULL DEFAULT 0,
        url TEXT,
        abstract TEXT,
        conditions TEXT[] DEFAULT '{}',
        interventions TEXT[] DEFAULT '{}',
        embedding vector(384),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_evidence_tier ON evidence_pieces(tier);
      CREATE INDEX IF NOT EXISTS idx_evidence_year ON evidence_pieces(year);
      CREATE INDEX IF NOT EXISTS idx_evidence_source ON evidence_pieces(source);
      CREATE INDEX IF NOT EXISTS idx_evidence_conditions ON evidence_pieces USING GIN(conditions);
      CREATE INDEX IF NOT EXISTS idx_evidence_interventions ON evidence_pieces USING GIN(interventions);

      -- Topics — medical conditions or research areas
      CREATE TABLE IF NOT EXISTS topics (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Topic-evidence relationships
      CREATE TABLE IF NOT EXISTS topic_evidence (
        topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
        evidence_id TEXT NOT NULL REFERENCES evidence_pieces(id) ON DELETE CASCADE,
        relevance_score REAL DEFAULT 1.0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (topic_id, evidence_id)
      );

      -- Collections — user-curated evidence sets
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        color TEXT DEFAULT '#6366f1',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Collection items
      CREATE TABLE IF NOT EXISTS collection_items (
        collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        evidence_id TEXT NOT NULL REFERENCES evidence_pieces(id) ON DELETE CASCADE,
        notes TEXT DEFAULT '',
        tags TEXT[] DEFAULT '{}',
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (collection_id, evidence_id)
      );

      -- Annotations — threaded notes on evidence
      CREATE TABLE IF NOT EXISTS annotations (
        id TEXT PRIMARY KEY,
        evidence_id TEXT NOT NULL REFERENCES evidence_pieces(id) ON DELETE CASCADE,
        author TEXT NOT NULL DEFAULT 'Anonymous',
        category TEXT NOT NULL CHECK (category IN ('note', 'critique', 'question', 'comparison', 'clinical-relevance', 'methodology', 'limitation', 'follow-up')),
        content TEXT NOT NULL,
        parent_id TEXT REFERENCES annotations(id) ON DELETE CASCADE,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_annotations_evidence ON annotations(evidence_id);
      CREATE INDEX IF NOT EXISTS idx_annotations_parent ON annotations(parent_id);

      -- Team workspaces
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        color TEXT DEFAULT '#6366f1',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Workspace members
      CREATE TABLE IF NOT EXISTS workspace_members (
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        color TEXT DEFAULT '#6366f1',
        PRIMARY KEY (workspace_id, name)
      );

      -- Shared collections
      CREATE TABLE IF NOT EXISTS workspace_shared_collections (
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        shared_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (workspace_id, collection_id)
      );

      -- Activity log
      CREATE TABLE IF NOT EXISTS workspace_activity (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        actor TEXT NOT NULL,
        description TEXT NOT NULL,
        entity_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_activity_workspace ON workspace_activity(workspace_id, created_at DESC);

      -- Background jobs for ingestion
      CREATE TABLE IF NOT EXISTS ingestion_jobs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
        queries TEXT[] NOT NULL,
        total INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        failed INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ
      );

      -- Ingestion results
      CREATE TABLE IF NOT EXISTS ingestion_results (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
        source_id TEXT NOT NULL,
        evidence_id TEXT NOT NULL REFERENCES evidence_pieces(id) ON DELETE CASCADE,
        ingested_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_results_job ON ingestion_results(job_id);

      -- Error log (persistent, replaces sessionStorage)
      CREATE TABLE IF NOT EXISTS error_log (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        source TEXT NOT NULL,
        url TEXT,
        stack TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_error_log_source ON error_log(source, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_error_log_time ON error_log(created_at DESC);

      -- Rate limit stats (persistent)
      CREATE TABLE IF NOT EXISTS rate_limit_stats (
        source_id TEXT PRIMARY KEY,
        total_requests INTEGER DEFAULT 0,
        throttled_requests INTEGER DEFAULT 0,
        total_wait_ms INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        last_request_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
    down: `
      DROP TABLE IF EXISTS rate_limit_stats CASCADE;
      DROP TABLE IF EXISTS error_log CASCADE;
      DROP TABLE IF EXISTS ingestion_results CASCADE;
      DROP TABLE IF EXISTS ingestion_jobs CASCADE;
      DROP TABLE IF EXISTS workspace_activity CASCADE;
      DROP TABLE IF EXISTS workspace_shared_collections CASCADE;
      DROP TABLE IF EXISTS workspace_members CASCADE;
      DROP TABLE IF EXISTS workspaces CASCADE;
      DROP TABLE IF EXISTS annotations CASCADE;
      DROP TABLE IF EXISTS collection_items CASCADE;
      DROP TABLE IF EXISTS collections CASCADE;
      DROP TABLE IF EXISTS topic_evidence CASCADE;
      DROP TABLE IF EXISTS topics CASCADE;
      DROP TABLE IF EXISTS evidence_pieces CASCADE;
      DROP EXTENSION IF EXISTS vector;
    `,
  },
];

export function getMigrations(): Migration[] {
  return MIGRATIONS;
}

export function getMigration(id: string): Migration | undefined {
  return MIGRATIONS.find((m) => m.id === id);
}
