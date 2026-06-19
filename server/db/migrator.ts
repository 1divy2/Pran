// ─────────────────────────────────────────────────────────────────────────────
// Migration Runner — applies and tracks database migrations.
// Uses a migrations table to track applied migrations.
// ─────────────────────────────────────────────────────────────────────────────

import { getMigrations, getMigration, type Migration } from "./migrations";

export interface MigrationRunner {
  runPending(): Promise<string[]>;
  rollbackLast(): Promise<string | null>;
  getStatus(): Promise<MigrationStatus[]>;
}

export interface MigrationStatus {
  id: string;
  name: string;
  applied: boolean;
  appliedAt?: string;
}

/**
 * Create a migration runner with a query function.
 * The queryFn should execute raw SQL and return results.
 */
export function createMigrationRunner(
  queryFn: (sql: string) => Promise<{ rows: unknown[] }>,
): MigrationRunner {
  async function ensureMigrationsTable(): Promise<void> {
    await queryFn(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW(),
        checksum TEXT NOT NULL
      );
    `);
  }

  async function getAppliedMigrations(): Promise<Map<string, string>> {
    await ensureMigrationsTable();
    const result = await queryFn(
      "SELECT id, applied_at FROM _migrations ORDER BY id",
    );
    const applied = new Map<string, string>();
    for (const row of result.rows as Array<{ id: string; applied_at: string }>) {
      applied.set(row.id, row.applied_at);
    }
    return applied;
  }

  function computeChecksum(migration: Migration): string {
    // Simple checksum — in production use crypto.createHash
    let hash = 0;
    const str = migration.up + migration.down;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash.toString(16);
  }

  return {
    async runPending(): Promise<string[]> {
      await ensureMigrationsTable();
      const applied = await getAppliedMigrations();
      const allMigrations = getMigrations();
      const ran: string[] = [];

      for (const migration of allMigrations) {
        if (applied.has(migration.id)) continue;

        console.log(`Running migration ${migration.id}: ${migration.name}`);
        await queryFn(migration.up);

        const checksum = computeChecksum(migration);
        await queryFn(
          `INSERT INTO _migrations (id, name, checksum) VALUES ('${migration.id}', '${migration.name}', '${checksum}')`,
        );

        ran.push(migration.id);
        console.log(`Migration ${migration.id} applied successfully`);
      }

      return ran;
    },

    async rollbackLast(): Promise<string | null> {
      await ensureMigrationsTable();
      const result = await queryFn(
        "SELECT id FROM _migrations ORDER BY id DESC LIMIT 1",
      );

      const rows = result.rows as Array<{ id: string }>;
      if (rows.length === 0) return null;

      const lastId = rows[0].id;
      const migration = getMigration(lastId);
      if (!migration) return null;

      console.log(`Rolling back migration ${lastId}: ${migration.name}`);
      await queryFn(migration.down);
      await queryFn(`DELETE FROM _migrations WHERE id = '${lastId}'`);

      console.log(`Migration ${lastId} rolled back`);
      return lastId;
    },

    async getStatus(): Promise<MigrationStatus[]> {
      await ensureMigrationsTable();
      const applied = await getAppliedMigrations();
      const allMigrations = getMigrations();

      return allMigrations.map((m) => ({
        id: m.id,
        name: m.name,
        applied: applied.has(m.id),
        appliedAt: applied.get(m.id),
      }));
    },
  };
}
