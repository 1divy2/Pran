// ─────────────────────────────────────────────────────────────────────────────
// CLI — command-line interface for database operations.
// Usage: npx tsx server/cli.ts [migrate|rollback|status]
// ─────────────────────────────────────────────────────────────────────────────

import { getConnectionString } from "./db/connection";
import { createMigrationRunner } from "./db/migrator";

async function main() {
  const command = process.argv[2] || "status";

  // Simple PostgreSQL query function using pg
  const { Client } = await import("pg");
  const client = new Client({ connectionString: getConnectionString() });
  await client.connect();

  const queryFn = async (sql: string) => {
    const result = await client.query(sql);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  };

  const migrator = createMigrationRunner(queryFn);

  try {
    switch (command) {
      case "migrate": {
        const applied = await migrator.runPending();
        if (applied.length === 0) {
          console.log("No pending migrations");
        } else {
          console.log(`Applied ${applied.length} migration(s): ${applied.join(", ")}`);
        }
        break;
      }
      case "rollback": {
        const rolled = await migrator.rollbackLast();
        if (rolled) {
          console.log(`Rolled back migration ${rolled}`);
        } else {
          console.log("No migrations to rollback");
        }
        break;
      }
      case "status": {
        const status = await migrator.getStatus();
        console.log("Migration Status:");
        for (const s of status) {
          const icon = s.applied ? "✓" : "○";
          const date = s.appliedAt ? ` (${s.appliedAt})` : "";
          console.log(`  ${icon} ${s.id} — ${s.name}${date}`);
        }
        break;
      }
      default:
        console.error(`Unknown command: ${command}`);
        console.log("Usage: migrate | rollback | status");
        process.exit(1);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
