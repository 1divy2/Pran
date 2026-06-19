// ─────────────────────────────────────────────────────────────────────────────
// Recent Searches — localStorage-backed persistence for search history.
// Stores up to 10 recent searches, most recent first.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";

const STORAGE_KEY = "pran-recent-searches";
const MAX_ITEMS = 10;

function readStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function writeStorage(items: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>(readStorage);

  const addSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...filtered].slice(0, MAX_ITEMS);
      writeStorage(next);
      return next;
    });
  }, []);

  const removeSearch = useCallback((term: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== term);
      writeStorage(next);
      return next;
    });
  }, []);

  const clearSearches = useCallback(() => {
    setRecentSearches([]);
    writeStorage([]);
  }, []);

  return { recentSearches, addSearch, removeSearch, clearSearches };
}
