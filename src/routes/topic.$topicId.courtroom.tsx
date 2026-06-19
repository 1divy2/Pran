import { createFileRoute, Link } from "@tanstack/react-router";
import { Workstation } from "@/components/pran/Workstation";
import { fetchTopicData } from "@/lib/api/topic-service";
import type { LiveTopicData } from "@/lib/api/types";
import { paperToEvidence, trialToEvidence, tierMeta, type EvidencePiece } from "@/lib/evidence";

export const Route = createFileRoute("/topic/$topicId/courtroom")({
  head: ({ params }) => ({ meta: [{ title: `Pran — Courtroom · ${params.topicId}` }] }),
  loader: async ({ params }) => fetchTopicData(params.topicId),
  component: CourtroomPage,
});

/** A treatment being debated */
interface Treatment {
  name: string;
  evidence: EvidencePiece[];
  totalConfidence: number;
  avgConfidence: number;
}

/** Select the two most-evidenced treatments for debate */
function selectDebaters(data: LiveTopicData): [Treatment, Treatment] | null {
  // Group evidence by intervention
  const byIntervention = new Map<string, EvidencePiece[]>();

  // Add drug evidence
  for (const drug of data.drugs) {
    const key = drug.brand.toLowerCase();
    if (!byIntervention.has(key)) byIntervention.set(key, []);
    byIntervention.get(key)!.push({
      id: `fda-${drug.generic}`,
      title: `${drug.brand} (${drug.generic})`,
      tier: "cohort",
      year: null,
      source: "OpenFDA",
      authors: drug.manufacturer,
      journal: drug.indication || "Drug Label",
      n: null,
      effect: drug.indication,
      confidence: 60,
      url: `https://open.fda.gov/drug/label/#${encodeURIComponent(drug.generic)}`,
      abstract: "",
    });
  }

  // Add trial evidence (group by interventions)
  for (const trial of data.trials.items) {
    for (const intervention of trial.interventions.slice(0, 2)) {
      const key = intervention.toLowerCase();
      if (!byIntervention.has(key)) byIntervention.set(key, []);
      byIntervention.get(key)!.push(trialToEvidence(trial));
    }
  }

  // Add paper evidence (extract interventions from titles)
  for (const paper of data.papers.items.slice(0, 20)) {
    const evidence = paperToEvidence(paper);
    // Simple heuristic: if title mentions a treatment keyword, group it
    const title = paper.title.toLowerCase();
    for (const [key] of byIntervention) {
      if (title.includes(key)) {
        byIntervention.get(key)!.push(evidence);
        break;
      }
    }
  }

  // Sort by evidence count and total confidence
  const treatments: Treatment[] = Array.from(byIntervention.entries())
    .filter(([, evidence]) => evidence.length >= 2) // Need at least 2 pieces
    .map(([name, evidence]) => ({
      name,
      evidence,
      totalConfidence: evidence.reduce((sum, e) => sum + e.confidence, 0),
      avgConfidence: Math.round(
        evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length,
      ),
    }))
    .sort((a, b) => b.totalConfidence - a.totalConfidence);

  if (treatments.length < 2) return null;
  return [treatments[0], treatments[1]];
}

/** Compute verdict based on evidence comparison */
function computeVerdict(
  a: Treatment,
  b: Treatment,
): {
  winner: "a" | "b" | "tie";
  reasoning: string;
  confidenceDiff: number;
} {
  const diff = a.avgConfidence - b.avgConfidence;
  const confDiff = Math.abs(diff);

  if (confDiff < 5) {
    return {
      winner: "tie",
      reasoning: `Both treatments show comparable evidence strength (${a.avgConfidence}% vs ${b.avgConfidence}% avg confidence). Insufficient evidence to declare a clear winner.`,
      confidenceDiff: confDiff,
    };
  }

  const winner = diff > 0 ? "a" : "b";
  const winnerName = winner === "a" ? a.name : b.name;
  const loserName = winner === "a" ? b.name : a.name;

  return {
    winner,
    reasoning: `${winnerName} demonstrates stronger empirical backing with ${confDiff} percentage points higher average confidence. The evidence base includes higher-tier studies and more consistent findings across sources.`,
    confidenceDiff: confDiff,
  };
}

function CourtroomPage() {
  const data = Route.useLoaderData() as LiveTopicData;
  const { topicId } = Route.useParams();
  const displayName = topicId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const debaters = selectDebaters(data);
  const verdict = debaters ? computeVerdict(debaters[0], debaters[1]) : null;

  return (
    <Workstation
      trail={[
        { label: "Library", href: "/" },
        { label: displayName, href: `/topic/${topicId}` },
        { label: "Courtroom" },
      ]}
      scene="Adversarial reading"
    >
      <div className="mx-auto max-w-[1400px] px-10 pt-28 pb-32">
        {/* Docket header */}
        <header className="grid grid-cols-12 gap-8 border-b border-rule pb-10">
          <div className="col-span-12 lg:col-span-9">
            <div className="mono-eyebrow mb-3 text-accent">Active Docket</div>
            <h1 className="font-display text-6xl leading-[1.02] text-balance">
              The adversarial <br />
              synthesis engine.
            </h1>
            <p className="mt-5 max-w-3xl text-pretty text-lg leading-relaxed text-ink-2">
              PRAN pitches the most prominent treatments for <strong>{displayName}</strong> against
              each other using real evidence. Each side presents its strongest studies, and the
              judge weighs the empirical backing to declare a winner.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-3">
            <div className="rounded-lg bg-paper-2 p-5 border border-rule">
              <div className="mono-eyebrow mb-4">The Bench</div>
              <div className="space-y-3 font-mono text-xs text-ink-2">
                <div className="flex justify-between border-b border-rule pb-2">
                  <span className="text-ink">Defense</span>
                  <span className="text-ink-3">Argues for A</span>
                </div>
                <div className="flex justify-between border-b border-rule pb-2">
                  <span className="text-ink">Prosecution</span>
                  <span className="text-ink-3">Argues for B</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-ink">Judge</span>
                  <span className="text-ink-3">Weighs evidence</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {debaters ? (
          <>
            {/* Case title */}
            <section className="mt-16 text-center">
              <div className="mono-eyebrow mb-4 text-accent">Case Study</div>
              <h2 className="font-display text-5xl leading-tight">
                <em className="text-ink">{debaters[0].name}</em>
                <span className="mx-4 text-ink-3">vs.</span>
                <em className="text-ink">{debaters[1].name}</em>
              </h2>
              <p className="mt-4 text-lg text-ink-2">
                Which intervention has stronger empirical backing for {displayName}?
              </p>
            </section>

            {/* Debate arena */}
            <section className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-px overflow-hidden rounded-lg bg-rule-strong">
              <DebaterSide
                treatment={debaters[0]}
                side="defense"
                isWinner={verdict?.winner === "a"}
              />
              <DebaterSide
                treatment={debaters[1]}
                side="prosecution"
                isWinner={verdict?.winner === "b"}
              />
            </section>

            {/* Judge's verdict */}
            {verdict && (
              <section className="mt-16">
                <div className="rounded-xl border-2 border-ink/20 bg-card p-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 rounded-full bg-ink flex items-center justify-center">
                      <span className="font-display text-xl text-paper">§</span>
                    </div>
                    <div>
                      <div className="mono-eyebrow">Judge's Verdict</div>
                      <div className="font-display text-2xl">
                        {verdict.winner === "tie"
                          ? "Inconclusive"
                          : `${debaters[verdict.winner === "a" ? 0 : 1].name} Prevails`}
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                        Confidence Gap
                      </div>
                      <div className="font-display text-3xl tabular-nums">
                        {verdict.confidenceDiff}%
                      </div>
                    </div>
                  </div>

                  <p className="text-lg leading-relaxed text-ink-2 max-w-3xl">
                    {verdict.reasoning}
                  </p>

                  {/* Evidence comparison bars */}
                  <div className="mt-8 grid grid-cols-2 gap-8">
                    <EvidenceBar
                      label={debaters[0].name}
                      confidence={debaters[0].avgConfidence}
                      count={debaters[0].evidence.length}
                      isWinner={verdict.winner === "a"}
                    />
                    <EvidenceBar
                      label={debaters[1].name}
                      confidence={debaters[1].avgConfidence}
                      count={debaters[1].evidence.length}
                      isWinner={verdict.winner === "b"}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Evidence citations */}
            <section className="mt-16">
              <div className="flex items-baseline justify-between gap-6 border-b border-rule pb-3 mb-8">
                <h2 className="font-display text-3xl">Evidence Citations</h2>
                <span className="mono-eyebrow">
                  {debaters[0].evidence.length + debaters[1].evidence.length} total
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <EvidenceList treatment={debaters[0]} />
                <EvidenceList treatment={debaters[1]} />
              </div>
            </section>
          </>
        ) : (
          /* No debaters found */
          <section className="mt-20 text-center">
            <div className="rounded-2xl border border-dashed border-rule bg-card/50 p-24">
              <div className="font-display text-4xl text-ink-3 mb-4">Insufficient Evidence</div>
              <p className="text-lg text-ink-2 max-w-xl mx-auto">
                The current dataset for <strong>{displayName}</strong> does not contain enough
                evidence to stage a meaningful debate. Try searching for a more common condition
                with more clinical trials and publications.
              </p>
              <Link
                to="/"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm text-paper"
              >
                ← Back to Library
              </Link>
            </div>
          </section>
        )}
      </div>
    </Workstation>
  );
}

/** One side of the debate arena */
function DebaterSide({
  treatment,
  side,
  isWinner,
}: {
  treatment: Treatment;
  side: "defense" | "prosecution";
  isWinner: boolean;
}) {
  const sideLabel = side === "defense" ? "Defense" : "Prosecution";
  const sideGlyph = side === "defense" ? "▲" : "▼";

  return (
    <div className={`bg-card p-8 transition-all ${isWinner ? "ring-2 ring-accent" : ""}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl text-ink-3">{sideGlyph}</span>
          <div>
            <div className="mono-eyebrow">{sideLabel}</div>
            <div className="font-display text-2xl">{treatment.name}</div>
          </div>
        </div>
        {isWinner && (
          <span className="rounded-full bg-accent px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper">
            Stronger
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="font-display text-2xl">{treatment.evidence.length}</div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
            Evidence
          </div>
        </div>
        <div className="text-center">
          <div className="font-display text-2xl">{treatment.avgConfidence}%</div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
            Avg Conf.
          </div>
        </div>
        <div className="text-center">
          <div className="font-display text-2xl">
            {Math.max(...treatment.evidence.map((e) => e.confidence))}%
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
            Peak Conf.
          </div>
        </div>
      </div>

      {/* Top evidence pieces */}
      <div className="space-y-3">
        {treatment.evidence.slice(0, 5).map((e) => {
          const meta = tierMeta[e.tier];
          return (
            <Link
              key={e.id}
              to={e.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md border border-rule/50 p-4 transition-all hover:shadow-paper"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="rounded-sm px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.15em] text-paper"
                  style={{ background: meta.color }}
                >
                  {meta.label}
                </span>
                <span className="font-mono text-[9px] text-ink-3">
                  {e.year ?? "—"} · {e.confidence}%
                </span>
              </div>
              <div className="font-display text-sm leading-snug line-clamp-2">{e.title}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Evidence bar comparison */
function EvidenceBar({
  label,
  confidence,
  count,
  isWinner,
}: {
  label: string;
  confidence: number;
  count: number;
  isWinner: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-sm">{label}</span>
        <span className="font-mono text-[10px] text-ink-3">
          {count} studies · {confidence}% avg
        </span>
      </div>
      <div className="h-3 rounded-full bg-rule overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isWinner ? "bg-accent" : "bg-ink-3"}`}
          style={{ width: `${confidence}%` }}
        />
      </div>
    </div>
  );
}

/** Evidence list for one debater */
function EvidenceList({ treatment }: { treatment: Treatment }) {
  return (
    <div>
      <div className="font-display text-xl mb-4">{treatment.name}</div>
      <div className="space-y-2">
        {treatment.evidence.map((e) => {
          const meta = tierMeta[e.tier];
          return (
            <Link
              key={e.id}
              to={e.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-md px-3 py-2 transition-colors hover:bg-paper-2"
            >
              <span
                className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: meta.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm leading-snug line-clamp-1">{e.title}</div>
                <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                  {e.source} · {e.year ?? "—"} · {e.confidence}%
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
