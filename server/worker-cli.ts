// ─────────────────────────────────────────────────────────────────────────────
// Worker CLI — starts the background ingestion worker.
// Usage: npx tsx server/worker-cli.ts start
// ─────────────────────────────────────────────────────────────────────────────

import { getConnectionString } from "./db/connection";
import { createWorker } from "./workers/ingestion-worker";

async function main() {
  const command = process.argv[2] || "start";

  const { Client } = await import("pg");
  const client = new Client({ connectionString: getConnectionString() });
  await client.connect();

  const queryFn = async (sql: string, params?: unknown[]) => {
    const result = await client.query(sql, params);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  };

  if (command === "start") {
    const worker = createWorker(queryFn, async (job, onProgress) => {
      console.log(`Processing job ${job.id} with ${job.queries.length} queries`);

      const { getFreeAdapters } = await import("../src/lib/ingestion/registry");
      const adapters = getFreeAdapters();

      let completed = 0;
      let failed = 0;

      for (const queryText of job.queries) {
        for (const adapter of adapters) {
          try {
            const result = await adapter.search({ term: queryText, limit: 10 });
            console.log(`[${adapter.sourceId}] Found ${result.items.length} items for "${queryText}"`);
            completed += result.items.length;
          } catch (error) {
            console.error(`[${adapter.sourceId}] Failed for "${queryText}":`, error);
            failed++;
          }
          await onProgress(completed, failed);
        }
      }

      console.log(`Job ${job.id} completed: ${completed} items, ${failed} failures`);
    });

    worker.start();
    console.log("Worker running. Press Ctrl+C to stop.");

    // Keep alive
    process.on("SIGINT", () => {
      console.log("Shutting down worker...");
      worker.stop();
      client.end();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      worker.stop();
      client.end();
      process.exit(0);
    });
  } else {
    console.error(`Unknown command: ${command}`);
    console.log("Usage: start");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
