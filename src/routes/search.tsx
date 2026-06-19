import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Workstation } from "@/components/pran/Workstation";
import { ingestAll } from "@/lib/ingestion/normalizer";
import type { NormalizedEvidence } from "@/lib/ingestion/types";
import { tierMeta, computeConfidence, type EvidenceTier } from "@/lib/evidence";
import { cacheGet, cacheSet, cacheKey } from "@/lib/api/cache";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { SuggestionDropdown } from "@/components/pran/SuggestionDropdown";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Pran — Search" },
      {
        name: "description",
        content: "Search across PubMed, ClinicalTrials.gov, and OpenFDA for medical evidence.",
      },
    ],
  }),
  component: SearchPage,
});

type SourceFilter = "all" | "pubmed" | "clinicaltrials" | "openfda";
type TierFilter = "all" | EvidenceTier;

function SearchPage() {
  const navigate = useNavigate();
  const { recentSearches, addSearch, removeSearch, clearSearches } = useRecentSearches();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [results, setResults] = useState<NormalizedEvidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        setResults([]);
        setActiveQuery("");
        setTotalCount(0);
        return;
      }

      setActiveQuery(term);
      setQuery(term);
      setShowSuggestions(false);
      addSearch(term);
      setLoading(true);

      // Check cache
      const cacheK = cacheKey("search", term);
      const cached = cacheGet<NormalizedEvidence[]>(cacheK);

      if (cached) {
        setResults(cached);
        setTotalCount(cached.length);
        setLoading(false);
        return;
      }

      try {
        const result = await ingestAll({ term, limit: 20 });
        setResults(result.items);
        setTotalCount(result.totalCount);
        cacheSet(cacheK, result.items);
      } catch {
        setResults([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    [addSearch],
  );

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Apply filters
  const filtered = useMemo(() => {
    return results.filter((item) => {
      if (sourceFilter !== "all" && item.sourceId !== sourceFilter) return false;
      if (tierFilter !== "all" && item.tier !== tierFilter) return false;
      return true;
    });
  }, [results, sourceFilter, tierFilter]);

  // Source counts
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: results.length };
    for (const item of results) {
      counts[item.sourceId] = (counts[item.sourceId] || 0) + 1;
    }
    return counts;
  }, [results]);

  // Tier counts
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { all: results.length };
    for (const item of results) {
      counts[item.tier] = (counts[item.tier] || 0) + 1;
    }
    return counts;
  }, [results]);

  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Search" }]}
      scene="Evidence search"
    >
      <div className="mx-auto max-w-[1200px] px-10 pt-28 pb-32">
        {/* Search Header */}
        <header className="mb-12">
          <h1 className="font-display text-5xl leading-tight">Search</h1>
          <p className="mt-3 text-lg text-ink-2">
            Query across PubMed, ClinicalTrials.gov, and OpenFDA simultaneously.
          </p>
        </header>

        {/* Search Bar with Suggestions */}
        <div className="mb-10 relative" ref={searchRef}>
          <div className="relative overflow-hidden rounded-2xl bg-card hairline-strong" style={{ boxShadow: "var(--shadow-lift)" }}>
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-6 flex items-center font-display text-2xl text-ink-3"
            >
              ⌕
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !showSuggestions) {
                  handleSearch(query);
                } else if (e.key === "Escape") {
                  setShowSuggestions(false);
                }
              }}
              placeholder="Search any disease, drug, condition, or treatment..."
              className="w-full bg-transparent py-5 pl-16 pr-8 font-display text-2xl text-ink placeholder:text-ink-3 focus:outline-none"
              role="combobox"
              aria-expanded={showSuggestions}
              aria-autocomplete="list"
              aria-controls="search-suggestions"
            />
            <div className="absolute inset-y-0 right-4 flex items-center">
              <button
                onClick={() => handleSearch(query)}
                disabled={!query.trim() || loading}
                className="rounded-full bg-ink px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {/* Suggestion dropdown */}
          <SuggestionDropdown
            query={query}
            recentSearches={recentSearches}
            onSelect={(term) => {
              setQuery(term);
              handleSearch(term);
            }}
            onRemoveRecent={removeSearch}
            onClearRecent={clearSearches}
            visible={showSuggestions && !loading}
          />
        </div>

        {/* Results */}
        {activeQuery && (
          <div>
            {/* Live region for screen readers */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{activeQuery}
              &rdquo;
            </div>
            {/* Results header with filters */}
            <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl">{filtered.length}</span>
                <span className="text-ink-2">
                  result{filtered.length !== 1 ? "s" : ""} for "{activeQuery}"
                </span>
              </div>

              {/* Source filter */}
              <div className="flex gap-2" role="group" aria-label="Filter by source">
                {(["all", "pubmed", "clinicaltrials", "openfda"] as SourceFilter[]).map((src) => (
                  <button
                    key={src}
                    onClick={() => setSourceFilter(src)}
                    aria-pressed={sourceFilter === src}
                    className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                      sourceFilter === src
                        ? "bg-ink text-paper"
                        : "bg-paper-2 text-ink-3 hover:bg-card hairline"
                    }`}
                  >
                    {src === "all"
                      ? "All"
                      : src === "pubmed"
                        ? "PubMed"
                        : src === "clinicaltrials"
                          ? "Trials"
                          : "FDA"}
                    {sourceCounts[src] !== undefined && ` (${sourceCounts[src]})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Tier filter */}
            <div
              className="flex gap-2 mb-8 flex-wrap"
              role="group"
              aria-label="Filter by evidence tier"
            >
              {(
                [
                  "all",
                  "meta-analysis",
                  "rct",
                  "guideline",
                  "cohort",
                  "case-report",
                ] as TierFilter[]
              ).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setTierFilter(tier)}
                  aria-pressed={tierFilter === tier}
                  className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                    tierFilter === tier
                      ? "bg-ink text-paper"
                      : "bg-paper-2 text-ink-3 hover:bg-card hairline"
                  }`}
                >
                  {tier === "all" ? "All tiers" : tierMeta[tier].label}
                  {tierCounts[tier] !== undefined && ` (${tierCounts[tier]})`}
                </button>
              ))}
            </div>

            {/* Results list */}
            {filtered.length > 0 ? (
              <div className="space-y-3">
                {filtered.map((item) => (
                  <SearchResultCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-rule bg-card p-12 text-center">
                <div className="font-display text-3xl text-ink-3">No results</div>
                <p className="mt-3 text-ink-3 text-sm">
                  {results.length > 0
                    ? "No results match the current filters. Try adjusting your filter selection."
                    : `No evidence found for "${activeQuery}". Try a broader search term.`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!activeQuery && (
          <div className="mt-20 text-center">
            <div aria-hidden="true" className="font-display text-6xl text-ink-3 mb-6">
              ⌕
            </div>
            <div className="font-display text-2xl text-ink-2 mb-3">Start typing to search</div>
            <div className="text-ink-3">
              Search across {sourceCounts.pubmed ?? 0} papers, {sourceCounts.clinicaltrials ?? 0}{" "}
              trials, and {sourceCounts.openfda ?? 0} FDA records.
            </div>
          </div>
        )}
      </div>
    </Workstation>
  );
}

/** Search result card */
function SearchResultCard({ item }: { item: NormalizedEvidence }) {
  const meta = tierMeta[item.tier];

  return (
    <Link
      to={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border border-rule bg-card p-5 transition-all hover:shadow-paper"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="rounded-sm px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.15em] text-paper"
              style={{ background: meta.color }}
            >
              {meta.label}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
              {item.sourceName}
            </span>
            {item.year && <span className="font-mono text-[9px] text-ink-3">{item.year}</span>}
          </div>

          <h3 className="font-display text-lg leading-snug group-hover:text-accent transition-colors line-clamp-2">
            {item.title}
          </h3>

          <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
            {item.authors.split("; ").slice(0, 3).join(", ")}
            {item.authors.split("; ").length > 3 && " et al."}
            {item.journal && ` · ${item.journal}`}
          </div>

          {item.effect && <div className="mt-2 text-sm text-ink-2 line-clamp-2">{item.effect}</div>}
        </div>

        <div className="shrink-0 text-right">
          <div className="font-display text-2xl tabular-nums">
            {computeConfidence({ tier: item.tier, year: item.year, n: item.sampleSize })}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">conf.</div>
        </div>
      </div>

      {/* Chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.conditions.slice(0, 3).map((c) => (
          <span key={c} className="chip">
            {c}
          </span>
        ))}
        {item.interventions.slice(0, 3).map((i) => (
          <span key={i} className="chip">
            {i}
          </span>
        ))}
        {item.sampleSize && <span className="chip">n={item.sampleSize.toLocaleString()}</span>}
      </div>
    </Link>
  );
}
