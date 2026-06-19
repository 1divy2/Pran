import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMigrationRunner } from "../../server/db/migrator";
import { getMigrations } from "../../server/db/migrations";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryFn = (sql: string) => Promise<{ rows: any[]; rowCount: number }>;

describe("Migration Runner", () => {
  let mockQuery: ReturnType<typeof vi.fn>;
  let runner: ReturnType<typeof createMigrationRunner>;

  beforeEach(() => {
    mockQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    runner = createMigrationRunner(mockQuery as unknown as QueryFn);
  });

  it("creates migrations table on first run", async () => {
    // First call returns empty (no migrations table)
    // Second call returns empty (no applied migrations)
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await runner.runPending();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS _migrations"),
    );
  });

  it("applies pending migrations", async () => {
    // ensureMigrationsTable
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // getAppliedMigrations
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // Run migration up
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // Record migration
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const ran = await runner.runPending();

    expect(ran).toContain("001");
  });

  it("skips already applied migrations", async () => {
    // ensureMigrationsTable (from runPending)
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // ensureMigrationsTable (from getAppliedMigrations)
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // getAppliedMigrations query - return 001 as already applied
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "001", applied_at: "2024-01-01T00:00:00Z" }],
      rowCount: 1,
    });

    const ran = await runner.runPending();

    expect(ran).toHaveLength(0);
  });

  it("returns status of all migrations", async () => {
    // ensureMigrationsTable (from getStatus)
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // ensureMigrationsTable (from getAppliedMigrations)
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // getAppliedMigrations query - return 001 as applied
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "001", applied_at: "2024-01-01T00:00:00Z" }],
      rowCount: 1,
    });

    const status = await runner.getStatus();

    expect(status).toHaveLength(getMigrations().length);
    expect(status.find((s) => s.id === "001")?.applied).toBe(true);
  });

  it("rolls back the last migration", async () => {
    // ensureMigrationsTable
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // getLastMigration
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "001" }],
      rowCount: 1,
    });
    // Run migration down
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // Delete migration record
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const rolled = await runner.rollbackLast();

    expect(rolled).toBe("001");
  });

  it("returns null when no migrations to rollback", async () => {
    // ensureMigrationsTable
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // getLastMigration - empty
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const rolled = await runner.rollbackLast();

    expect(rolled).toBeNull();
  });
});
