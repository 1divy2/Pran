import { createFileRoute, Link } from "@tanstack/react-router";
import { Workstation } from "@/components/pran/Workstation";
import { fetchTopicData } from "@/lib/api/topic-service";
import type { LiveTopicData } from "@/lib/api/types";
import { tierMeta, computeConfidence, type EvidencePiece } from "@/lib/evidence";

export const Route = createFileRoute("/topic/$topicId/timeline")({
  head: ({ params }) => ({
    meta: [{ title: `Pran — Timeline · ${params.topicId.replace(/-/g, " ")}` }],
  }),
  loader: async ({ params }) => fetchTopicData(params.topicId),
  component: TimelinePage,
});

/** Timeline event — enriched evidence piece with year */
interface TimelineEvent {
  evidence: EvidencePiece;
  year: number;
}

function TimelinePage() {
  const data = Route.useLoaderData() as LiveTopicData;
  const { topicId } = Route.useParams();
  const displayName = topicId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Use normalized evidence directly (avoids double-conversion)
  const allEvidence: EvidencePiece[] = data.evidence.map((ne) => ({
    id: ne.id,
    title: ne.title,
    tier: ne.tier,
    year: ne.year,
    source: ne.sourceName,
    authors: ne.authors,
    journal: ne.journal,
    n: ne.sampleSize,
    effect: ne.effect,
    confidence: computeConfidence({ tier: ne.tier, year: ne.year, n: ne.sampleSize }),
    url: ne.url,
    abstract: ne.abstract,
  }));

  // Create timeline events (only those with valid years)
  const events: TimelineEvent[] = allEvidence
    .filter((e) => e.year && e.year > 1900)
    .map((e) => ({ evidence: e, year: e.year! }))
    .sort((a, b) => b.year - a.year); // Newest first

  // Group by year for year markers
  const years = [...new Set(events.map((e) => e.year))].sort((a, b) => b - a);

  // Stats
  const oldestYear = years.length > 0 ? years[years.length - 1] : null;
  const newestYear = years.length > 0 ? years[0] : null;
  const timeSpan = oldestYear && newestYear ? newestYear - oldestYear : 0;

  return (
    <Workstation
      trail={[
        { label: "Library", href: "/" },
        { label: displayName, href: `/topic/${topicId}` },
        { label: "Timeline" },
      ]}
      scene="Chronological progression"
    >
      <div className="mx-auto max-w-[900px] px-10 py-24">
        <div className="mb-20 text-center">
          <div className="mono-eyebrow mb-6">Historical Record</div>
          <h1 className="font-display text-5xl leading-tight">Timeline of {displayName}</h1>
          <p className="mt-6 text-xl text-ink-2">
            The chronological evolution of clinical evidence across <strong>{events.length}</strong>{" "}
            publications and trials
            {timeSpan > 0 && (
              <>
                {" "}
                spanning <strong>{timeSpan} years</strong> ({oldestYear}–{newestYear})
              </>
            )}
            .
          </p>
        </div>

        {/* Year summary strip */}
        {years.length > 1 && (
          <div className="mb-12 flex flex-wrap justify-center gap-2">
            {years.map((year) => {
              const count = events.filter((e) => e.year === year).length;
              return (
                <a
                  key={year}
                  href={`#year-${year}`}
                  className="flex items-center gap-1.5 rounded-full bg-paper-2 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 transition-colors hover:bg-card hairline"
                >
                  <span>{year}</span>
                  <span className="text-ink-3/60">({count})</span>
                </a>
              );
            })}
          </div>
        )}

        {/* Timeline */}
        <div className="relative before:absolute before:inset-y-0 before:left-[100px] before:w-px before:bg-rule">
          {events.length === 0 && (
            <div className="text-center text-ink-3 py-20">
              No chronologically identifiable events found.
            </div>
          )}

          {events.map((event, index) => {
            const isFirstOfYear = index === 0 || events[index - 1].year !== event.year;
            const meta = tierMeta[event.evidence.tier];
            const confidence = event.evidence.confidence;

            return (
              <div
                key={`${event.evidence.id}`}
                id={isFirstOfYear ? `year-${event.year}` : undefined}
                className="relative mb-12 pl-[160px]"
              >
                {/* Year Marker */}
                {isFirstOfYear && (
                  <div className="absolute left-0 top-0 font-display text-3xl tabular-nums text-ink">
                    {event.year}
                  </div>
                )}

                {/* Node dot — colored by tier */}
                <div
                  className="absolute left-[96px] top-3 h-3 w-3 rounded-full ring-4 ring-paper"
                  style={{ background: meta.color }}
                />

                {/* Event card */}
                <div className="rounded-xl border border-rule/50 bg-card p-6 shadow-sm transition-all hover:shadow-paper group">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-sm px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.15em] text-paper"
                        style={{ background: meta.color }}
                      >
                        {meta.label}
                      </span>
                      <span className="mono-eyebrow">{event.evidence.source}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 rounded-full bg-rule overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${confidence}%`,
                            background: meta.color,
                          }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-ink-3">{confidence}%</span>
                    </div>
                  </div>

                  <Link
                    to={event.evidence.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display text-xl leading-snug group-hover:text-accent transition-colors line-clamp-2"
                  >
                    {event.evidence.title}
                  </Link>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                    <span>{event.evidence.journal}</span>
                    {event.evidence.authors && (
                      <span>
                        {event.evidence.authors.split("; ").slice(0, 2).join(", ")}
                        {event.evidence.authors.split("; ").length > 2 && " et al."}
                      </span>
                    )}
                  </div>

                  {/* Chips for sample size */}
                  {event.evidence.n && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="chip">n={event.evidence.n.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-16 border-t border-rule pt-10">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="font-display text-3xl">{events.length}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Total events
              </div>
            </div>
            <div>
              <div className="font-display text-3xl">{years.length}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Distinct years
              </div>
            </div>
            <div>
              <div className="font-display text-3xl">
                {Math.round(
                  events.reduce((sum, e) => sum + e.evidence.confidence, 0) / events.length,
                )}
                %
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Avg confidence
              </div>
            </div>
          </div>
        </div>
      </div>
    </Workstation>
  );
}
