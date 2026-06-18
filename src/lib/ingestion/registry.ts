// ─────────────────────────────────────────────────────────────────────────────
// Adapter Registry — central registry of all data source adapters.
// New sources are registered here. The ingestion layer queries all registered
// adapters in parallel and merges results.
// ─────────────────────────────────────────────────────────────────────────────

import type { DataSourceAdapter } from "./adapter";
import { pubmedAdapter } from "./adapters/pubmed-adapter";
import { clinicaltrialsAdapter } from "./adapters/clinicaltrials-adapter";
import { openfdaAdapter } from "./adapters/openfda-adapter";
import { whoAdapter } from "./adapters/who-adapter";
import { niceAdapter } from "./adapters/nice-adapter";
import { cdcAdapter } from "./adapters/cdc-adapter";

/** All registered adapters */
const adapters: Map<string, DataSourceAdapter> = new Map();

/** Register the built-in adapters */
function registerBuiltins() {
  adapters.set(pubmedAdapter.id, pubmedAdapter);
  adapters.set(clinicaltrialsAdapter.id, clinicaltrialsAdapter);
  adapters.set(openfdaAdapter.id, openfdaAdapter);
  adapters.set(whoAdapter.id, whoAdapter);
  adapters.set(niceAdapter.id, niceAdapter);
  adapters.set(cdcAdapter.id, cdcAdapter);
}

// Initialize on module load
registerBuiltins();

/**
 * Get an adapter by ID.
 * Returns undefined if not found.
 */
export function getAdapter(id: string): DataSourceAdapter | undefined {
  return adapters.get(id);
}

/**
 * Get all registered adapters.
 */
export function getAllAdapters(): DataSourceAdapter[] {
  return Array.from(adapters.values());
}

/**
 * Get adapter IDs that don't require an API key.
 */
export function getFreeAdapters(): DataSourceAdapter[] {
  return getAllAdapters().filter((a) => !a.requiresApiKey);
}

/**
 * Register a new adapter at runtime.
 * Useful for plugins or future data sources.
 */
export function registerAdapter(adapter: DataSourceAdapter): void {
  adapters.set(adapter.id, adapter);
}

/**
 * Health check all adapters.
 * Returns a map of adapter ID → healthy status.
 */
export async function healthCheckAll(): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  const checks = getAllAdapters().map(async (adapter) => {
    try {
      const healthy = await adapter.healthCheck();
      results.set(adapter.id, healthy);
    } catch {
      results.set(adapter.id, false);
    }
  });
  await Promise.allSettled(checks);
  return results;
}
