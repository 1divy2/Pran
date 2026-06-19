import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Workstation } from "@/components/pran/Workstation";
import {
  getRecentErrors,
  clearErrorLog,
  type ErrorRecord,
  type ErrorSource,
} from "@/lib/error-monitor";

export const Route = createFileRoute("/admin/errors")({
  head: () => ({ meta: [{ title: "Pran — Error Monitor" }] }),
  component: ErrorDashboard,
});

const SOURCE_COLORS: Record<ErrorSource, string> = {
  api: "#dc2626",
  route: "#d97706",
  component: "#7c3aed",
  global: "#ef4444",
  ingestion: "#0891b2",
};

function ErrorDashboard() {
  const [errors, setErrors] = useState<ErrorRecord[]>(getRecentErrors());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ErrorSource | "all">("all");

  const handleRefresh = () => {
    setErrors(getRecentErrors());
  };

  const handleClear = () => {
    clearErrorLog();
    setErrors([]);
  };

  const filtered = filter === "all" ? errors : errors.filter((e) => e.source === filter);

  const bySource = errors.reduce(
    (acc, e) => {
      acc[e.source] = (acc[e.source] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const lastHour = errors.filter((e) => Date.now() - e.timestamp < 60 * 60 * 1000).length;
  const lastDay = errors.filter((e) => Date.now() - e.timestamp < 24 * 60 * 60 * 1000).length;

  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Admin" }, { label: "Errors" }]}
      scene="Error monitoring"
    >
      <div className="mx-auto max-w-[1400px] px-10 pt-28 pb-32">
        {/* Header */}
        <header className="border-b border-rule pb-10">
          <div className="mono-eyebrow mb-3 text-accent">Observability</div>
          <h1 className="font-display text-5xl leading-[1.05]">
            Error
            <br />
            monitor.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-2">
            Structured error capture across API calls, route loading, component rendering, and
            ingestion pipelines. Errors persist in session storage for debugging.
          </p>
        </header>

        {/* Summary */}
        <section className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-lg bg-rule">
          <SummaryCard label="Total Errors" value={errors.length} />
          <SummaryCard label="Last Hour" value={lastHour} accent={lastHour > 5} />
          <SummaryCard label="Last 24h" value={lastDay} accent={lastDay > 10} />
          <SummaryCard label="Sources" value={Object.keys(bySource).length} />
        </section>

        {/* Source breakdown */}
        <section className="mt-8">
          <h2 className="font-display text-lg mb-4">By Source</h2>
          <div className="flex flex-wrap gap-3">
            <FilterButton
              label={`All (${errors.length})`}
              active={filter === "all"}
              onClick={() => setFilter("all")}
            />
            {(["api", "route", "component", "global", "ingestion"] as const).map((src) => (
              <FilterButton
                key={src}
                label={`${src} (${bySource[src] ?? 0})`}
                active={filter === src}
                onClick={() => setFilter(src)}
                color={SOURCE_COLORS[src]}
              />
            ))}
          </div>
        </section>

        {/* Controls */}
        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={handleRefresh}
            className="rounded-md bg-ink px-4 py-2 font-mono text-xs text-paper transition-colors hover:bg-ink-2"
          >
            Refresh
          </button>
          <button
            onClick={handleClear}
            className="rounded-md border border-rule px-4 py-2 font-mono text-xs text-ink-2 transition-colors hover:bg-paper-2"
          >
            Clear Log
          </button>
          <span className="ml-auto font-mono text-[10px] text-ink-3">
            Max 25 errors · Session storage
          </span>
        </div>

        {/* Error list */}
        <section className="mt-10">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-rule bg-card/50 p-16 text-center">
              <div className="font-display text-3xl text-ink-3 mb-3">No Errors</div>
              <p className="text-ink-2 max-w-md mx-auto">
                {errors.length === 0
                  ? "No errors have been captured in this session. This is a good sign."
                  : `No errors match the "${filter}" filter.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((error) => (
                <ErrorCard
                  key={error.id}
                  error={error}
                  expanded={expandedId === error.id}
                  onToggle={() => setExpandedId(expandedId === error.id ? null : error.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </Workstation>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-card p-6">
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3 mb-2">
        {label}
      </div>
      <div
        className={`font-display text-3xl tabular-nums ${accent ? "text-[var(--color-tier-case)]" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all ${
        active ? "bg-ink text-paper" : "border border-rule text-ink-2 hover:bg-paper-2"
      }`}
      style={active && color ? { background: color } : undefined}
    >
      {label}
    </button>
  );
}

function ErrorCard({
  error,
  expanded,
  onToggle,
}: {
  error: ErrorRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const timeAgo = formatTimeAgo(error.timestamp);
  const color = SOURCE_COLORS[error.source];

  return (
    <div className="rounded-lg border border-rule bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start gap-4 hover:bg-paper-2/50 transition-colors"
      >
        <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm leading-snug line-clamp-1">{error.message}</div>
          <div className="mt-1 flex items-center gap-3 font-mono text-[9px] text-ink-3">
            <span
              className="rounded-sm px-1 py-0.5 uppercase tracking-wider text-paper"
              style={{ background: color }}
            >
              {error.source}
            </span>
            <span>{timeAgo}</span>
            {error.url && <span className="truncate max-w-[200px]">{error.url}</span>}
          </div>
        </div>
        <span className="font-mono text-[10px] text-ink-3 shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-rule/50 bg-paper-2/30 p-4">
          {error.metadata && Object.keys(error.metadata).length > 0 && (
            <div className="mb-4">
              <div className="font-mono text-[9px] uppercase tracking-wider text-ink-3 mb-2">
                Metadata
              </div>
              <pre className="rounded-md bg-paper p-3 font-mono text-[10px] text-ink overflow-x-auto">
                {JSON.stringify(error.metadata, null, 2)}
              </pre>
            </div>
          )}

          {error.stack && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-ink-3 mb-2">
                Stack Trace
              </div>
              <pre className="rounded-md bg-paper p-3 font-mono text-[10px] text-ink overflow-x-auto max-h-48 overflow-y-auto">
                {error.stack}
              </pre>
            </div>
          )}

          <div className="mt-3 font-mono text-[9px] text-ink-3">
            ID: {error.id} · {new Date(error.timestamp).toISOString()}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
