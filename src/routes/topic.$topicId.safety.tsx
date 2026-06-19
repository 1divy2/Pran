import { createFileRoute, Link } from "@tanstack/react-router";
import { Workstation } from "@/components/pran/Workstation";
import { fetchTopicData } from "@/lib/api/topic-service";
import {
  fetchAdverseEventReports,
  getTopReactions,
  type AdverseEventReport,
} from "@/lib/api/openfda";
import type { LiveTopicData } from "@/lib/api/types";
import { useState } from "react";

interface SafetyLoaderData {
  topicData: LiveTopicData;
  eventData: { total: number; reports: AdverseEventReport[] };
  reactions: { term: string; count: number }[];
}

export const Route = createFileRoute("/topic/$topicId/safety")({
  head: ({ params }) => ({
    meta: [
      {
        title: `Pran — ${params.topicId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Safety`,
      },
    ],
  }),
  loader: async ({ params }): Promise<SafetyLoaderData> => {
    const topicData = await fetchTopicData(params.topicId);
    const [eventData, reactions] = await Promise.all([
      fetchAdverseEventReports(params.topicId, 30),
      getTopReactions(params.topicId, 12),
    ]);
    return { topicData, eventData, reactions };
  },
  pendingComponent: SafetyLoading,
  errorComponent: SafetyError,
  component: SafetyPage,
});

function SafetyLoading() {
  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Loading…" }]}
      scene="Fetching safety data"
    >
      <div className="mx-auto max-w-[1320px] px-10 pt-28 pb-32">
        <div className="animate-pulse space-y-8">
          <div className="h-6 w-48 rounded bg-paper-2" />
          <div className="h-24 w-96 rounded bg-paper-2" />
          <div className="mt-12 grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-rule-strong">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card p-8">
                <div className="h-3 w-20 rounded bg-paper-2" />
                <div className="mt-4 h-8 w-24 rounded bg-paper-2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Workstation>
  );
}

function SafetyError({ error }: { error: Error }) {
  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Error" }]}
      scene="Network error"
    >
      <div className="mx-auto max-w-[1320px] px-10 pt-28 pb-32 text-center">
        <div aria-hidden="true" className="font-display text-8xl text-ink-3">
          ⚠
        </div>
        <h1 className="mt-6 font-display text-4xl">Could not load safety data</h1>
        <p className="mt-4 text-lg text-ink-3">
          {error?.message ?? "The OpenFDA API may be temporarily unavailable."}
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm text-paper"
        >
          ← Back to Library
        </Link>
      </div>
    </Workstation>
  );
}

function SafetyPage() {
  const { topicData, eventData, reactions } = Route.useLoaderData() as SafetyLoaderData;
  const { topicId } = Route.useParams();
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const displayName = topicId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const seriousCount = eventData.reports.filter((r) => r.serious).length;

  // Group reactions by term for the bar chart
  const maxReactionCount = reactions.length > 0 ? reactions[0].count : 1;

  return (
    <Workstation
      trail={[
        { label: "Library", href: "/" },
        { label: displayName, href: `/topic/${topicId}` },
        { label: "Safety" },
      ]}
      scene="Pharmacovigilance"
    >
      <div className="mx-auto max-w-[1320px] px-10 pt-28 pb-32">
        {/* Hero */}
        <section className="border-b border-rule pb-16">
          <div className="mono-eyebrow mb-5">Pharmacovigilance · OpenFDA FAERS</div>
          <h1 className="serif-display text-[clamp(56px,8vw,128px)] text-balance">{displayName}</h1>
          <p className="mt-2 font-display text-2xl italic text-ink-3">
            Adverse event reports, drug safety signals, and patient outcomes
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="chip">{eventData.total.toLocaleString()} total reports</span>
            <span className="chip">
              {topicData.drugs.length} drug{topicData.drugs.length !== 1 ? "s" : ""} identified
            </span>
            {seriousCount > 0 && (
              <span className="chip">
                {seriousCount} serious event{seriousCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </section>

        {/* Stats row */}
        <section className="mt-16">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-rule-strong lg:grid-cols-4">
            <StatCard
              label="Total reports"
              value={eventData.total.toLocaleString()}
              detail="FAERS database"
            />
            <StatCard
              label="Serious events"
              value={seriousCount.toLocaleString()}
              detail="Hospitalization, death, disability"
            />
            <StatCard
              label="Reported reactions"
              value={reactions.length.toLocaleString()}
              detail="Unique reaction terms"
            />
            <StatCard
              label="Drugs flagged"
              value={topicData.drugs.length.toLocaleString()}
              detail="FDA-labelled drugs"
            />
          </div>
        </section>

        {/* Top reactions bar chart */}
        {reactions.length > 0 && (
          <section className="mt-20">
            <div className="flex items-baseline justify-between border-b border-rule pb-3 mb-8">
              <h2 className="font-display text-4xl">Most reported reactions</h2>
              <span className="mono-eyebrow">Top {reactions.length}</span>
            </div>
            <div className="space-y-3" role="img" aria-label="Bar chart of most reported reactions">
              {reactions.map((r) => (
                <div key={r.term} className="flex items-center gap-4">
                  <div className="w-48 shrink-0 text-right font-mono text-xs text-ink-2 truncate">
                    {r.term}
                  </div>
                  <div className="flex-1 overflow-hidden rounded-full bg-paper-2 h-6">
                    <div
                      role="progressbar"
                      aria-valuenow={r.count}
                      aria-valuemin={0}
                      aria-valuemax={maxReactionCount}
                      aria-label={`${r.term}: ${r.count} reports`}
                      className="h-full rounded-full bg-accent/80 transition-all"
                      style={{ width: `${(r.count / maxReactionCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 font-mono text-xs text-ink-3 text-right">
                    {r.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Individual reports */}
        {eventData.reports.length > 0 && (
          <section className="mt-20">
            <div className="flex items-baseline justify-between border-b border-rule pb-3 mb-8">
              <h2 className="font-display text-4xl">Recent reports</h2>
              <span className="mono-eyebrow">
                Showing {eventData.reports.length} of {eventData.total.toLocaleString()}
              </span>
            </div>
            <div className="space-y-px overflow-hidden rounded-lg bg-rule-strong">
              {eventData.reports.map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  isExpanded={expandedReport === report.id}
                  onToggle={() =>
                    setExpandedReport((prev) => (prev === report.id ? null : report.id))
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {eventData.reports.length === 0 && (
          <section className="mt-20 text-center py-20">
            <div aria-hidden="true" className="font-display text-6xl text-ink-3 mb-4">
              ⊘
            </div>
            <h2 className="font-display text-3xl mb-3">No adverse event data found</h2>
            <p className="text-ink-2">
              The OpenFDA FAERS database may not have reports for this condition yet, or the API may
              be temporarily unavailable.
            </p>
          </section>
        )}

        {/* Data provenance */}
        <section className="mt-20 border-t border-rule pt-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mono-eyebrow mb-2">Data source</div>
              <div className="space-y-1 text-sm text-ink-3">
                <div>
                  <a
                    href="https://open.fda.gov/apis/drug/event/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    OpenFDA FAERS
                  </a>{" "}
                  — {eventData.total.toLocaleString()} adverse event reports
                </div>
                <div className="mt-2 max-w-lg text-xs leading-relaxed text-ink-3">
                  ⚠ FAERS data is based on voluntary reports and does not establish causation.
                  Report counts may be duplicated. Always consult a healthcare professional for
                  medical decisions.
                </div>
              </div>
            </div>
            <Link
              to="/topic/$topicId"
              params={{ topicId }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-ink hairline-strong hover:bg-paper-2"
            >
              <span className="font-display text-base">←</span> Overview
            </Link>
          </div>
        </section>
      </div>
    </Workstation>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex flex-col justify-between bg-card p-6">
      <div className="mono-eyebrow">{label}</div>
      <div className="mt-4 font-display text-4xl">{value}</div>
      <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
        {detail}
      </div>
    </div>
  );
}

function ReportRow({
  report,
  isExpanded,
  onToggle,
}: {
  report: AdverseEventReport;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const outcomeMap: Record<string, string> = {
    "1": "Death",
    "2": "Life-threatening",
    "3": "Hospitalization",
    "4": "Disability",
    "5": "Congenital anomaly",
    "6": "Required intervention",
  };

  return (
    <div className="bg-card">
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-start gap-5 px-6 py-5 text-left transition-colors hover:bg-paper-2"
      >
        {/* Serious badge */}
        <div className="mt-1 flex shrink-0 flex-col items-center gap-1">
          <span
            aria-hidden="true"
            className={`size-2.5 rounded-full ${report.serious ? "bg-red-400" : "bg-ink-3"}`}
          />
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-3">
            {report.serious ? "serious" : "non-s"}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Reactions */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {report.reactions.slice(0, 5).map((rx, i) => (
              <span key={i} className="chip">
                {rx.term}
              </span>
            ))}
            {report.reactions.length > 5 && (
              <span className="chip">+{report.reactions.length - 5} more</span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
            {report.patientAge && <span>Age: {report.patientAge}</span>}
            {report.patientSex && (
              <span>
                Sex:{" "}
                {report.patientSex === "1"
                  ? "Male"
                  : report.patientSex === "2"
                    ? "Female"
                    : report.patientSex}
              </span>
            )}
            {report.country && <span>{report.country}</span>}
            {report.reportDate && <span>{report.reportDate}</span>}
          </div>
        </div>

        {/* Expand indicator */}
        <span
          aria-hidden="true"
          className="mt-2 shrink-0 font-display text-xl text-ink-3 transition-transform"
        >
          {isExpanded ? "−" : "+"}
        </span>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-rule px-6 py-5 bg-paper-2/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Drugs */}
            <div>
              <div className="mono-eyebrow mb-3">Drugs involved</div>
              <div className="space-y-2">
                {report.drugs.map((drug, i) => (
                  <div key={i} className="rounded-lg bg-card p-3">
                    <div className="font-display text-sm">{drug.name}</div>
                    {drug.indication && (
                      <div className="mt-1 text-xs text-ink-3">{drug.indication}</div>
                    )}
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
                      {drug.role}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Outcome & details */}
            <div>
              <div className="mono-eyebrow mb-3">Report details</div>
              <div className="space-y-2 text-sm text-ink-2">
                <div>
                  <span className="text-ink-3">Report ID:</span> {report.id}
                </div>
                {report.outcome && (
                  <div>
                    <span className="text-ink-3">Outcome:</span>{" "}
                    {outcomeMap[report.outcome] ?? report.outcome}
                  </div>
                )}
                <div>
                  <span className="text-ink-3">Serious:</span> {report.serious ? "Yes" : "No"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
