// ─────────────────────────────────────────────────────────────────────────────
// Data Export/Import — persistence portability for collections, annotations,
// workspaces, and recent searches. Enables backup, migration, and sharing.
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportBundle {
  version: "1.0";
  exportedAt: string;
  source: "pran";
  data: {
    collections: unknown[];
    annotations: unknown[];
    workspaces: unknown[];
    recentSearches: string[];
    settings: Record<string, unknown>;
  };
}

const STORAGE_KEYS = {
  collections: "pran-evidence-collections",
  annotations: "pran-annotations",
  workspaces: "pran-workspaces",
  recentSearches: "pran-recent-searches",
  llmConfig: "pran-llm-config",
} as const;

/**
 * Export all user data as a JSON bundle.
 */
export function exportAllData(): ExportBundle {
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    source: "pran",
    data: {
      collections: readJsonArray(STORAGE_KEYS.collections),
      annotations: readJsonArray(STORAGE_KEYS.annotations),
      workspaces: readJsonArray(STORAGE_KEYS.workspaces),
      recentSearches: (readJson(STORAGE_KEYS.recentSearches) as string[]) ?? [],
      settings: {
        llmConfig: readJson(STORAGE_KEYS.llmConfig),
      },
    },
  };
}

/**
 * Import data from a bundle. Merges with existing data.
 * Returns counts of imported items.
 */
export function importData(bundle: ExportBundle): {
  collections: number;
  annotations: number;
  workspaces: number;
  searches: number;
} {
  if (bundle.source !== "pran") {
    throw new Error("Invalid export bundle: not a PRAN export");
  }

  if (bundle.version !== "1.0") {
    throw new Error(`Unsupported export version: ${bundle.version}`);
  }

  const mergeArrays = <T>(existing: T[], incoming: T[], keyField?: string): T[] => {
    if (!keyField) return [...existing, ...incoming];
    const existingIds = new Set(
      existing.map((item) => (item as Record<string, unknown>)[keyField]),
    );
    const newItems = incoming.filter(
      (item) => !existingIds.has((item as Record<string, unknown>)[keyField]),
    );
    return [...existing, ...newItems];
  };

  const existingCollections = readJsonArray(STORAGE_KEYS.collections) as Record<string, unknown>[];
  const existingAnnotations = readJsonArray(STORAGE_KEYS.annotations) as Record<string, unknown>[];
  const existingWorkspaces = readJsonArray(STORAGE_KEYS.workspaces) as Record<string, unknown>[];
  const existingSearches = (readJson(STORAGE_KEYS.recentSearches) as string[]) ?? [];

  const mergedCollections = mergeArrays(
    existingCollections,
    bundle.data.collections as Record<string, unknown>[],
    "id",
  );
  const mergedAnnotations = mergeArrays(
    existingAnnotations,
    bundle.data.annotations as Record<string, unknown>[],
    "id",
  );
  const mergedWorkspaces = mergeArrays(
    existingWorkspaces,
    bundle.data.workspaces as Record<string, unknown>[],
    "id",
  );
  const mergedSearches = [
    ...new Set([...existingSearches, ...(bundle.data.recentSearches ?? [])]),
  ].slice(0, 50);

  writeJson(STORAGE_KEYS.collections, mergedCollections);
  writeJson(STORAGE_KEYS.annotations, mergedAnnotations);
  writeJson(STORAGE_KEYS.workspaces, mergedWorkspaces);
  writeJson(STORAGE_KEYS.recentSearches, mergedSearches);

  if (bundle.data.settings?.llmConfig) {
    writeJson(STORAGE_KEYS.llmConfig, bundle.data.settings.llmConfig);
  }

  return {
    collections: mergedCollections.length - existingCollections.length,
    annotations: mergedAnnotations.length - existingAnnotations.length,
    workspaces: mergedWorkspaces.length - existingWorkspaces.length,
    searches: mergedSearches.length - existingSearches.length,
  };
}

/**
 * Export data as a downloadable JSON file.
 */
export function downloadExport(): void {
  const bundle = exportAllData();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pran-export-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse an imported JSON file.
 */
export function parseImportFile(file: File): Promise<ExportBundle> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (parsed.source !== "pran") {
          reject(new Error("Not a PRAN export file"));
          return;
        }
        resolve(parsed as ExportBundle);
      } catch {
        reject(new Error("Invalid JSON file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Get storage usage statistics.
 */
export function getStorageStats(): {
  collections: number;
  annotations: number;
  workspaces: number;
  searches: number;
  totalSizeBytes: number;
} {
  const collections = readJsonArray(STORAGE_KEYS.collections);
  const annotations = readJsonArray(STORAGE_KEYS.annotations);
  const workspaces = readJsonArray(STORAGE_KEYS.workspaces);
  const searches = readJsonArray(STORAGE_KEYS.recentSearches);

  let totalSize = 0;
  for (const key of Object.values(STORAGE_KEYS)) {
    const raw = localStorage.getItem(key);
    if (raw) totalSize += raw.length * 2; // UTF-16
  }

  return {
    collections: collections.length,
    annotations: annotations.length,
    workspaces: workspaces.length,
    searches: searches.length,
    totalSizeBytes: totalSize,
  };
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readJsonArray(key: string): unknown[] {
  const result = readJson(key);
  return Array.isArray(result) ? result : [];
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full
  }
}
