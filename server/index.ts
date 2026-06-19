// ─────────────────────────────────────────────────────────────────────────────
// Server Entry Point — configures and starts the PRAN server.
// Handles database connection, migrations, workers, and API routes.
// ─────────────────────────────────────────────────────────────────────────────

import { getConnectionString } from "./db/connection";
import { createMigrationRunner } from "./db/migrator";
import { createWorker } from "./workers/ingestion-worker";
import type { QueryFunction } from "./db/dal";

export interface ServerConfig {
  port: number;
  host: string;
  enableWorkers: boolean;
  enableMigrations: boolean;
}

const DEFAULT_CONFIG: ServerConfig = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  host: process.env.HOST ?? "0.0.0.0",
  enableWorkers: process.env.ENABLE_WORKERS === "true",
  enableMigrations: process.env.ENABLE_MIGRATIONS !== "false",
};

export async function createServer(
  queryFn: QueryFunction,
  config: Partial<ServerConfig> = {},
) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Run migrations
  if (cfg.enableMigrations) {
    const migrator = createMigrationRunner(queryFn);
    const applied = await migrator.runPending();
    if (applied.length > 0) {
      console.log(`Applied ${applied.length} migration(s)`);
    }
  }

  // Start worker if enabled
  let worker = null;
  if (cfg.enableWorkers) {
    worker = createWorker(queryFn, async (job, onProgress) => {
      // Import and run the batch ingestion processor
      const { executeBatch } = await import(
        "../src/lib/ingestion/batch"
      );
      // Process each query
      let completed = 0;
      let failed = 0;
      for (const query of job.queries) {
        try {
          // Import adapters dynamically
          const { getFreeAdapters } = await import(
            "../src/lib/ingestion/registry"
          );
          const adapters = getFreeAdapters();
          for (const adapter of adapters) {
            try {
              await adapter.search({ term: query, limit: 10 });
              completed++;
            } catch {
              failed++;
            }
          }
        } catch {
          failed++;
        }
        await onProgress(completed, failed);
      }
    });
    worker.start();
    console.log("Background worker started");
  }

  return {
    config: cfg,
    worker,
    async shutdown() {
      worker?.stop();
      console.log("Server shut down");
    },
  };
}
