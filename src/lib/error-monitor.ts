// ─────────────────────────────────────────────────────────────────────────────
// Error Monitor — structured error logging with context.
// Captures API errors, route errors, and unhandled errors with metadata.
// Stores recent errors in sessionStorage for debugging.
// ─────────────────────────────────────────────────────────────────────────────

export type ErrorSource = "api" | "route" | "component" | "global" | "ingestion";

export interface ErrorRecord {
  id: string;
  message: string;
  source: ErrorSource;
  timestamp: number;
  url?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = "pran-error-log";
const MAX_ERRORS = 25;
let errorCount = 0;

function generateId(): string {
  return `err-${Date.now()}-${++errorCount}`;
}

function storeError(record: ErrorRecord): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const existing: ErrorRecord[] = raw ? JSON.parse(raw) : [];
    const updated = [record, ...existing].slice(0, MAX_ERRORS);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage full or unavailable
  }
}

/**
 * Log an error with structured context.
 * Returns the error record for chaining.
 */
export function logError(
  error: unknown,
  source: ErrorSource,
  metadata?: Record<string, unknown>,
): ErrorRecord {
  const err = error instanceof Error ? error : new Error(String(error));
  const record: ErrorRecord = {
    id: generateId(),
    message: err.message,
    source,
    timestamp: Date.now(),
    url: typeof window !== "undefined" ? window.location.href : undefined,
    stack: err.stack,
    metadata,
  };

  // Console output with context
  const prefix = `[PRAN:${source}]`;
  console.error(prefix, err.message, metadata ?? "", err.stack ?? "");

  // Persist for debugging
  storeError(record);

  return record;
}

/**
 * Get recent errors from sessionStorage.
 */
export function getRecentErrors(): ErrorRecord[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear error log.
 */
export function clearErrorLog(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // fail silently
  }
}

/**
 * Wrap an async function with error logging.
 * Returns undefined on error instead of throwing.
 */
export async function withErrorLogging<T>(
  fn: () => Promise<T>,
  source: ErrorSource,
  metadata?: Record<string, unknown>,
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    logError(error, source, metadata);
    return undefined;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Global error handlers — initialize once on app load
// ─────────────────────────────────────────────────────────────────────────────

let initialized = false;

export function initErrorMonitoring(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Catch unhandled errors
  window.addEventListener("error", (event) => {
    logError(event.error ?? event.message, "global", {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Catch unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    logError(event.reason, "global", {
      type: "unhandledrejection",
    });
  });
}
