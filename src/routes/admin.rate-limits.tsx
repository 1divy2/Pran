import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Workstation } from "@/components/pran/Workstation";
import { getAllRateLimitStats, resetAllStats, type RateLimitStats } from "@/lib/api/rate-limiter";

export const Route = createFileRoute("/admin/rate-limits")({
  head: () => ({ meta: [{ title: "Pran — Rate Limit Dashboard" }] }),
  component: RateLimitDashboard,
});

const SOURCE_LABELS: Record<string, string> = {
  pubmed: "PubMed",
  clinicaltrials: "ClinicalTrials.gov",
  openfda: "OpenFDA",
  who: "WHO (GHO)",
  nice: "NICE",
  cdc: "CDC (WONDER)",
  "cdc-mmwr": "CDC (MMWR)",
};

const SOURCE_COLORS: Record<string, string> = {
  pubmed: "#2563eb",
  clinicaltrials: "#7c3aed",
  openfda: "#dc2626",
  who: "#059669",
  nice: "#d97706",
  cdc: "#0891b2",
  "cdc-mmwr": "#0e7490",
};

function RateLimitDashboard() {
  const [stats, setStats] = useState<RateLimitStats[]>(getAllRateLimitStats());
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setStats(getAllRateLimitStats());
    setRefreshKey((k) => k + 1);
  };

  const handleReset = () => {
    resetAllStats();
    setStats([]);
    setRefreshKey((k) => k + 1);
  };

  const totalRequests = stats.reduce((sum, s) => sum + s.totalRequests, 0);
  const totalThrottled = stats.reduce((sum, s) => sum + s.throttledRequests, 0);
  const totalErrors = stats.reduce((sum, s) => sum + s.errorCount, 0);
  const totalWait = stats.reduce((sum, s) => sum + s.totalWaitMs, 0);
  const throttleRate = totalRequests > 0 ? Math.round((totalThrottled / totalRequests) * 100) : 0;

  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Admin" }, { label: "Rate Limits" }]}
      scene="Infrastructure monitoring"
    >
      <div className="mx-auto max-w-[1400px] px-10 pt-28 pb-32">
        {/* Header */}
        <header className="border-b border-rule pb-10">
          <div className="mono-eyebrow mb-3 text-accent">Infrastructure</div>
          <h1 className="font-display text-5xl leading-[1.05]">
            Rate limit
            <br />
            dashboard.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-2">
            Real-time visibility into API consumption across all data sources. Token bucket rate
            limiting ensures respectful API usage while maximizing throughput.
          </p>
        </header>

        {/* Summary stats */}
        <section className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-lg bg-rule">
          <SummaryCard
            label="Total Requests"
            value={totalRequests.toLocaleString()}
            sub="across all sources"
          />
          <SummaryCard
            label="Throttled"
            value={`${totalThrottled.toLocaleString()}`}
            sub={`${throttleRate}% throttle rate`}
            accent={totalThrottled > 0}
          />
          <SummaryCard
            label="Total Wait"
            value={`${(totalWait / 1000).toFixed(1)}s`}
            sub="cumulative wait time"
          />
          <SummaryCard
            label="Errors"
            value={totalErrors.toLocaleString()}
            sub="failed requests"
            accent={totalErrors > 0}
          />
        </section>

        {/* Controls */}
        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={handleRefresh}
            className="rounded-md bg-ink px-4 py-2 font-mono text-xs text-paper transition-colors hover:bg-ink-2"
          >
            Refresh Stats
          </button>
          <button
            onClick={handleReset}
            className="rounded-md border border-rule px-4 py-2 font-mono text-xs text-ink-2 transition-colors hover:bg-paper-2"
          >
            Reset All
          </button>
          <span className="ml-auto font-mono text-[10px] text-ink-3">
            Session {refreshKey > 0 ? `refreshed ${refreshKey}x` : "fresh"}
          </span>
        </div>

        {/* Source cards */}
        <section className="mt-10">
          <div className="flex items-baseline justify-between border-b border-rule pb-3 mb-6">
            <h2 className="font-display text-2xl">Source Breakdown</h2>
            <span className="mono-eyebrow">{stats.length} sources</span>
          </div>

          {stats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-rule bg-card/50 p-16 text-center">
              <div className="font-display text-3xl text-ink-3 mb-3">No Data Yet</div>
              <p className="text-ink-2 max-w-md mx-auto">
                API requests will appear here once you search for topics or browse evidence. Each
                data source has its own rate limiter.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm text-paper"
              >
                ← Start Exploring
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stats.map((s) => (
                <SourceCard key={s.sourceId} stats={s} />
              ))}
            </div>
          )}
        </section>

        {/* Rate limit config reference */}
        <section className="mt-16 border-t border-rule pt-10">
          <h2 className="font-display text-2xl mb-6">Configuration Reference</h2>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-rule text-left text-ink-3">
                  <th className="pb-3 pr-4">Source</th>
                  <th className="pb-3 pr-4">Rate (req/s)</th>
                  <th className="pb-3 pr-4">Burst</th>
                  <th className="pb-3">Notes</th>
                </tr>
              </thead>
              <tbody className="text-ink-2">
                <tr className="border-b border-rule/50">
                  <td className="py-3 pr-4">PubMed (E-utilities)</td>
                  <td className="py-3 pr-4">3</td>
                  <td className="py-3 pr-4">3</td>
                  <td className="py-3">NCBI requires ≤3 req/s without API key</td>
                </tr>
                <tr className="border-b border-rule/50">
                  <td className="py-3 pr-4">ClinicalTrials.gov</td>
                  <td className="py-3 pr-4">5</td>
                  <td className="py-3 pr-4">5</td>
                  <td className="py-3">Generous limits for public API</td>
                </tr>
                <tr className="border-b border-rule/50">
                  <td className="py-3 pr-4">OpenFDA</td>
                  <td className="py-3 pr-4">5</td>
                  <td className="py-3 pr-4">5</td>
                  <td className="py-3">240 req/min limit</td>
                </tr>
                <tr className="border-b border-rule/50">
                  <td className="py-3 pr-4">WHO (GHO)</td>
                  <td className="py-3 pr-4">5</td>
                  <td className="py-3 pr-4">5</td>
                  <td className="py-3">No official limit documented</td>
                </tr>
                <tr className="border-b border-rule/50">
                  <td className="py-3 pr-4">NICE</td>
                  <td className="py-3 pr-4">5</td>
                  <td className="py-3 pr-4">5</td>
                  <td className="py-3">Open API, respectful usage expected</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">CDC (WONDER/MMWR)</td>
                  <td className="py-3 pr-4">3</td>
                  <td className="py-3 pr-4">3</td>
                  <td className="py-3">Government API, conservative limits</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Workstation>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card p-6">
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3 mb-2">
        {label}
      </div>
      <div className={`font-display text-3xl tabular-nums ${accent ? "text-accent" : ""}`}>
        {value}
      </div>
      <div className="mt-1 font-mono text-[9px] text-ink-3">{sub}</div>
    </div>
  );
}

function SourceCard({ stats }: { stats: RateLimitStats }) {
  const label = SOURCE_LABELS[stats.sourceId] ?? stats.sourceId;
  const color = SOURCE_COLORS[stats.sourceId] ?? "#6b7280";
  const tokenPct =
    stats.maxTokens > 0 ? Math.round((stats.currentTokens / stats.maxTokens) * 100) : 0;
  const throttlePct =
    stats.totalRequests > 0 ? Math.round((stats.throttledRequests / stats.totalRequests) * 100) : 0;

  return (
    <div className="rounded-lg border border-rule bg-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-3 w-3 rounded-full" style={{ background: color }} />
        <div className="font-display text-sm">{label}</div>
      </div>

      {/* Token bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[9px] text-ink-3">Available Tokens</span>
          <span className="font-mono text-[9px] text-ink-3">
            {stats.currentTokens}/{stats.maxTokens}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-rule overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${tokenPct}%`,
              background: tokenPct > 50 ? "#22c55e" : tokenPct > 20 ? "#eab308" : "#ef4444",
            }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="font-display text-lg tabular-nums">{stats.totalRequests}</div>
          <div className="font-mono text-[8px] uppercase tracking-wider text-ink-3">Requests</div>
        </div>
        <div>
          <div className="font-display text-lg tabular-nums text-ink-2">{throttlePct}%</div>
          <div className="font-mono text-[8px] uppercase tracking-wider text-ink-3">Throttled</div>
        </div>
        <div>
          <div className="font-display text-lg tabular-nums text-ink-2">{stats.avgWaitMs}ms</div>
          <div className="font-mono text-[8px] uppercase tracking-wider text-ink-3">Avg Wait</div>
        </div>
        <div>
          <div
            className={`font-display text-lg tabular-nums ${stats.errorCount > 0 ? "text-[var(--color-tier-case)]" : "text-ink-2"}`}
          >
            {stats.errorCount}
          </div>
          <div className="font-mono text-[8px] uppercase tracking-wider text-ink-3">Errors</div>
        </div>
      </div>

      {/* Rate info */}
      <div className="mt-4 border-t border-rule/50 pt-3">
        <div className="flex items-center justify-between font-mono text-[9px] text-ink-3">
          <span>Rate: {stats.refillRate} req/s</span>
          <span>
            {stats.lastRequestAt
              ? `${Math.round((Date.now() - stats.lastRequestAt) / 1000)}s ago`
              : "Never"}
          </span>
        </div>
      </div>
    </div>
  );
}
