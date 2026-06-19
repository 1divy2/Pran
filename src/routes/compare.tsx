import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Workstation } from "@/components/pran/Workstation";
import { fetchTopicData } from "@/lib/api/topic-service";
import { useState, useEffect } from "react";
import type { LiveTopicData } from "@/lib/api/types";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [{ title: "Pran — Compare Topics" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    topics: (search.topics as string) ?? "",
  }),
  component: ComparePage,
});

function ComparePage() {
  const { topics: topicsParam } = Route.useSearch();
  const navigate = useNavigate();

  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");

  const parsedTopics = topicsParam ? topicsParam.split(",").filter(Boolean) : [];

  const topicA = parsedTopics[0] ?? "";
  const topicB = parsedTopics[1] ?? "";

  const handleCompare = () => {
    if (inputA.trim() && inputB.trim()) {
      const a = inputA.trim().toLowerCase().replace(/\s+/g, "-");
      const b = inputB.trim().toLowerCase().replace(/\s+/g, "-");
      navigate({ to: "/compare", search: { topics: `${a},${b}` } });
    }
  };

  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Compare" }]}
      scene="Side-by-side analysis"
    >
      <div className="mx-auto max-w-[1400px] px-10 pt-28 pb-32">
        {/* Header */}
        <section className="mb-16">
          <div className="mono-eyebrow mb-5">Cross-topic analysis</div>
          <h1 className="serif-display text-[clamp(48px,6vw,96px)] text-balance">
            Compare evidence landscapes
          </h1>
          <p className="mt-4 text-lg text-ink-2 max-w-2xl">
            Place two conditions, drugs, or topics side-by-side to compare evidence volume, trial
            activity, and FDA drug profiles.
          </p>
        </section>

        {/* Input row */}
        <section className="mb-16">
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label
                htmlFor="topic-a"
                className="block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-2"
              >
                Topic A
              </label>
              <input
                id="topic-a"
                type="text"
                value={inputA}
                onChange={(e) => setInputA(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCompare();
                }}
                placeholder="e.g. hypertension"
                className="w-full rounded-xl border border-rule bg-card px-5 py-4 font-display text-xl text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink-3"
              />
            </div>
            <div
              className="hidden sm:block pb-4 font-display text-2xl text-ink-3"
              aria-hidden="true"
            >
              vs
            </div>
            <div className="flex-1 w-full">
              <label
                htmlFor="topic-b"
                className="block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-2"
              >
                Topic B
              </label>
              <input
                id="topic-b"
                type="text"
                value={inputB}
                onChange={(e) => setInputB(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCompare();
                }}
                placeholder="e.g. diabetes"
                className="w-full rounded-xl border border-rule bg-card px-5 py-4 font-display text-xl text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink-3"
              />
            </div>
            <button
              onClick={handleCompare}
              disabled={!inputA.trim() || !inputB.trim()}
              className="shrink-0 rounded-full bg-ink px-6 py-4 text-sm font-medium text-paper transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              Compare →
            </button>
          </div>
        </section>

        {/* Results */}
        {topicA && topicB && <ComparisonResult topicA={topicA} topicB={topicB} />}

        {/* Empty state */}
        {!topicA && !topicB && (
          <section className="text-center py-20">
            <div className="font-display text-6xl text-ink-3 mb-4">⟷</div>
            <h2 className="font-display text-3xl mb-3">Enter two topics above</h2>
            <p className="text-ink-2 max-w-md mx-auto">
              Compare the evidence landscape of any two diseases, drugs, or medical conditions.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {[
                ["hypertension", "diabetes"],
                ["alzheimers", "parkinsons"],
                ["breast-cancer", "lung-cancer"],
              ].map(([a, b]) => (
                <button
                  key={`${a}-${b}`}
                  onClick={() => {
                    setInputA(a.replace(/-/g, " "));
                    setInputB(b.replace(/-/g, " "));
                    navigate({ to: "/compare", search: { topics: `${a},${b}` } });
                  }}
                  className="rounded-full border border-rule bg-card px-4 py-2 text-sm text-ink-2 hover:bg-paper-2 transition-colors"
                >
                  {a.replace(/-/g, " ")} vs {b.replace(/-/g, " ")}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </Workstation>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparison result component
// ─────────────────────────────────────────────────────────────────────────────

function ComparisonResult({ topicA, topicB }: { topicA: string; topicB: string }) {
  const [dataA, setDataA] = useState<LiveTopicData | null>(null);
  const [dataB, setDataB] = useState<LiveTopicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [a, b] = await Promise.all([fetchTopicData(topicA), fetchTopicData(topicB)]);
        if (!cancelled) {
          setDataA(a);
          setDataB(b);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to fetch data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [topicA, topicB]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="grid grid-cols-2 gap-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <div className="h-12 rounded bg-paper-2" />
              <div className="h-32 rounded bg-paper-2" />
              <div className="h-32 rounded bg-paper-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !dataA || !dataB) {
    return (
      <div className="text-center py-16">
        <div className="font-display text-5xl text-ink-3 mb-4">⚠</div>
        <h2 className="font-display text-2xl">Could not load comparison</h2>
        <p className="mt-2 text-ink-3">{error ?? "One or both topics failed to load."}</p>
      </div>
    );
  }

  const nameA = topicA.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const nameB = topicB.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-12">
      {/* Side-by-side headers */}
      <div className="grid grid-cols-2 gap-8">
        <TopicHeader name={nameA} data={dataA} />
        <TopicHeader name={nameB} data={dataB} />
      </div>

      {/* Evidence comparison */}
      <section>
        <div className="border-b border-rule pb-3 mb-8">
          <h2 className="font-display text-4xl">Evidence volume</h2>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <MetricBar label="Papers" valueA={dataA.papers.total} valueB={dataB.papers.total} />
          <MetricBar label="Trials" valueA={dataA.trials.total} valueB={dataB.trials.total} />
          <MetricBar label="Drugs" valueA={dataA.drugs.length} valueB={dataB.drugs.length} />
          <MetricBar
            label="Adverse events"
            valueA={dataA.adverseEventCount}
            valueB={dataB.adverseEventCount}
          />
        </div>
      </section>

      {/* Trials side by side */}
      <section>
        <div className="border-b border-rule pb-3 mb-8">
          <h2 className="font-display text-4xl">Top clinical trials</h2>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <TrialList trials={dataA.trials.items.slice(0, 5)} />
          <TrialList trials={dataB.trials.items.slice(0, 5)} />
        </div>
      </section>

      {/* Drugs side by side */}
      {dataA.drugs.length > 0 && dataB.drugs.length > 0 && (
        <section>
          <div className="border-b border-rule pb-3 mb-8">
            <h2 className="font-display text-4xl">FDA-labelled drugs</h2>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <DrugList drugs={dataA.drugs.slice(0, 4)} />
            <DrugList drugs={dataB.drugs.slice(0, 4)} />
          </div>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function TopicHeader({ name, data }: { name: string; data: LiveTopicData }) {
  return (
    <div className="border-b border-rule pb-6">
      <h2 className="font-display text-3xl">{name}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="chip">{data.papers.total.toLocaleString()} papers</span>
        <span className="chip">{data.trials.total.toLocaleString()} trials</span>
        <span className="chip">{data.drugs.length} drugs</span>
      </div>
    </div>
  );
}

function MetricBar({ label, valueA, valueB }: { label: string; valueA: number; valueB: number }) {
  const max = Math.max(valueA, valueB, 1);
  const pctA = (valueA / max) * 100;
  const pctB = (valueB / max) * 100;

  return (
    <div className="col-span-2 sm:col-span-1">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-2">
        {label}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-16 text-right font-mono text-xs text-ink-2">
            {valueA.toLocaleString()}
          </div>
          <div className="flex-1 overflow-hidden rounded-full bg-paper-2 h-5">
            <div
              role="progressbar"
              aria-valuenow={valueA}
              aria-valuemin={0}
              aria-valuemax={Math.max(valueA, valueB, 1)}
              aria-label={`Topic A ${label}: ${valueA.toLocaleString()}`}
              className="h-full rounded-full bg-ink/80 transition-all"
              style={{ width: `${pctA}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-16 text-right font-mono text-xs text-ink-2">
            {valueB.toLocaleString()}
          </div>
          <div className="flex-1 overflow-hidden rounded-full bg-paper-2 h-5">
            <div
              role="progressbar"
              aria-valuenow={valueB}
              aria-valuemin={0}
              aria-valuemax={Math.max(valueA, valueB, 1)}
              aria-label={`Topic B ${label}: ${valueB.toLocaleString()}`}
              className="h-full rounded-full bg-accent/80 transition-all"
              style={{ width: `${pctB}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrialList({ trials }: { trials: LiveTopicData["trials"]["items"] }) {
  if (trials.length === 0) {
    return <div className="text-sm text-ink-3 py-8">No trial data available</div>;
  }
  return (
    <div className="space-y-px overflow-hidden rounded-lg bg-rule-strong">
      {trials.map((trial) => (
        <a
          key={trial.nctId}
          href={trial.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-4 bg-card px-4 py-3 transition-colors hover:bg-paper-2"
        >
          <span
            className={`mt-1.5 size-2 shrink-0 rounded-full ${
              trial.status === "RECRUITING"
                ? "bg-green-500"
                : trial.status === "COMPLETED"
                  ? "bg-ink-3"
                  : "bg-blue-400"
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="font-display text-sm leading-snug truncate">{trial.title}</div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
              {trial.nctId}
              {trial.phase !== "N/A" && <> · {trial.phase.replace("PHASE", "Phase ")}</>}
              {trial.enrollment !== null && <> · n={trial.enrollment.toLocaleString()}</>}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function DrugList({ drugs }: { drugs: LiveTopicData["drugs"] }) {
  if (drugs.length === 0) {
    return <div className="text-sm text-ink-3 py-8">No drug data available</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-rule-strong">
      {drugs.map((drug, i) => (
        <div key={`${drug.generic}-${i}`} className="bg-card p-4">
          <div className="font-display text-lg">{drug.brand}</div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
            {drug.generic}
          </div>
        </div>
      ))}
    </div>
  );
}
