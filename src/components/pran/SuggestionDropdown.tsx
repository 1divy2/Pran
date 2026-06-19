// ─────────────────────────────────────────────────────────────────────────────
// Suggestion Dropdown — shows recent searches and curated topic suggestions
// with keyboard navigation (arrow keys + Enter).
// ─────────────────────────────────────────────────────────────────────────────

import { type TopicSuggestion, filterSuggestions } from "@/lib/suggestions";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";

interface Props {
  query: string;
  recentSearches: string[];
  onSelect: (term: string) => void;
  onRemoveRecent: (term: string) => void;
  onClearRecent: () => void;
  visible: boolean;
}

export function SuggestionDropdown({
  query,
  recentSearches,
  onSelect,
  onRemoveRecent,
  onClearRecent,
  visible,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const suggestions = filterSuggestions(query);

  // Build flat list of items for keyboard navigation
  const items = useMemo(() => {
    const result: { type: "recent" | "suggestion"; label: string; sublabel?: string }[] = [];
    if (!query.trim() && recentSearches.length > 0) {
      recentSearches.forEach((s) => result.push({ type: "recent", label: s }));
    }
    suggestions.forEach((s) =>
      result.push({ type: "suggestion", label: s.name, sublabel: s.category }),
    );
    return result;
  }, [query, recentSearches, suggestions]);

  // Reset active index when items change
  useEffect(() => {
    setActiveIndex(-1);
  }, [items.length, query]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        onSelect(items[activeIndex].label);
      }
    },
    [activeIndex, items, onSelect],
  );

  if (!visible || items.length === 0) return null;

  return (
    <div
      className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-rule bg-card shadow-lift"
      role="listbox"
      aria-label="Search suggestions"
    >
      <div ref={listRef} className="max-h-[400px] overflow-y-auto">
        {/* Recent searches section */}
        {!query.trim() && recentSearches.length > 0 && (
          <>
            <div className="flex items-center justify-between border-b border-rule px-4 py-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
                Recent searches
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearRecent();
                }}
                className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3 hover:text-ink transition-colors"
              >
                Clear
              </button>
            </div>
            {recentSearches.map((term, i) => (
              <button
                key={term}
                onClick={() => onSelect(term)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === activeIndex ? "bg-paper-2" : "hover:bg-paper-2"
                }`}
                role="option"
                aria-selected={i === activeIndex}
              >
                <span className="font-display text-base text-ink-3">⌕</span>
                <span className="flex-1 font-display text-base">{term}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveRecent(term);
                  }}
                  className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] text-ink-3 hover:bg-paper-2 transition-colors"
                  aria-label={`Remove ${term} from recent searches`}
                >
                  ✕
                </button>
              </button>
            ))}
            {suggestions.length > 0 && <div className="border-t border-rule" />}
          </>
        )}

        {/* Curated suggestions */}
        {suggestions.length > 0 && (
          <>
            {!query.trim() && (
              <div className="px-4 py-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
                  Suggested topics
                </span>
              </div>
            )}
            {suggestions.map((s, i) => {
              const flatIndex = (!query.trim() ? recentSearches.length : 0) + i;
              return (
                <button
                  key={s.id}
                  onClick={() => onSelect(s.name)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    flatIndex === activeIndex ? "bg-paper-2" : "hover:bg-paper-2"
                  }`}
                  role="option"
                  aria-selected={flatIndex === activeIndex}
                >
                  <span className="font-display text-base text-ink-3">→</span>
                  <div className="flex-1">
                    <span className="font-display text-base">{s.name}</span>
                    <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                      {s.category}
                    </span>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="border-t border-rule px-4 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
        ↑↓ navigate · ↵ select
      </div>
    </div>
  );
}
