// ─────────────────────────────────────────────────────────────────────────────
// Ingestion Layer — public API
// ─────────────────────────────────────────────────────────────────────────────

export type { DataSourceAdapter } from "./adapter";
export type { NormalizedEvidence, IngestionResult, IngestionQuery } from "./types";
export {
  getAdapter,
  getAllAdapters,
  getFreeAdapters,
  registerAdapter,
  healthCheckAll,
} from "./registry";
export { ingestAll, ingestFrom } from "./normalizer";
