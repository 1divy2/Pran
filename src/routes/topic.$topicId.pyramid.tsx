import { createFileRoute, Link } from "@tanstack/react-router";
import { Workstation } from "@/components/pran/Workstation";
import { fetchTopicData } from "@/lib/api/topic-service";
import type { LiveTopicData } from "@/lib/api/types";
import {
  tierMeta,
  computeConfidence,
  type EvidencePiece,
  type EvidenceTier,
} from "@/lib/evidence";

export const Route = createFileRoute("/topic/$topicId/pyramid")({
  head: ({ params }) => ({ meta: [{ title: `Pran — Pyramid · ${params.topicId}` }] }),
  loader: async ({ params }) => fetchTopicData(params.topicId),
  component: PyramidPage,
});

/** Pyramid level definitions with tier ordering (apex → base) */
const PYRAMID_LEVELS: {
  tier: EvidenceTier;
  label: string;
  sublabel: string;
  maxWidth: string;
  opacity: number;
}[] = [
  {
    tier: "meta-analysis",
    label: "Meta-Analyses & Systematic Reviews",
    sublabel: "Highest quality — pooled data across multiple studies",
    maxWidth: "max-w-sm",
    opacity: 1,
  },
  {
    tier: "rct",
    label: "Randomized Controlled Trials",
    sublabel: "Gold standard — controlled experimental design",
    maxWidth: "max-w-md",
    opacity: 0.95,
  },
  {
    tier: "guideline",
    label: "Clinical Guidelines & Recommendations",
    sublabel: "Institutional consensus from expert panels",
    maxWidth: "max-w-lg",
    opacity: 0.85,
  },
  {
    tier: "cohort",
    label: "Observational & Cohort Studies",
    sublabel: "Population-level associations and trends",
    maxWidth: "max-w-xl",
    opacity: 0.7,
  },
  {
    tier: "case-report",
    label: "Case Reports & Expert Opinion",
    sublabel: "Individual observations and clinical experience",
    maxWidth: "max-w-2xl",
    opacity: 0.55,
  },
];

function PyramidPage() {
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

  // Group by tier
  const byTier = (tier: EvidenceTier) => allEvidence.filter((e) => e.tier === tier);

  // Compute average confidence per tier
  const avgConfidence = (pieces: EvidencePiece[]) =>
    pieces.length > 0
      ? Math.round(pieces.reduce((sum, p) => sum + p.confidence, 0) / pieces.length)
      : 0;

  // Total evidence count for the subtitle
  const totalEvidence = allEvidence.length;

  return (
    <Workstation
      trail={[
        { label: "Library", href: "/" },
        { label: displayName, href: `/topic/${topicId}` },
        { label: "Evidence Pyramid" },
      ]}
      scene="Quality hierarchy"
    >
      <div className="mx-auto max-w-[1200px] px-10 pt-28 pb-32">
        <header className="mb-16 text-center border-b border-rule pb-12">
          <div className="mono-eyebrow mb-6">Hierarchy of Evidence</div>
          <h1 className="font-display text-6xl leading-tight">
            The {displayName} <br /> Pyramid.
          </h1>
          <p className="mt-6 mx-auto text-xl text-ink-2 max-w-2xl leading-relaxed">
            Sorting {totalEvidence} evidence pieces into their respective levels of empirical
            quality. Each piece classified by title heuristics and assigned a confidence score based
            on tier, recency, and sample size.
          </p>
        </header>

        {/* Pyramid visualization */}
        <div className="flex flex-col items-center gap-4">
          {PYRAMID_LEVELS.map((level) => {
            const pieces = byTier(level.tier);
            const meta = tierMeta[level.tier];
            const conf = avgConfidence(pieces);

            return (
              <div
                key={level.tier}
                className={`w-full ${level.maxWidth} border border-rule bg-card p-6 transition-all`}
                style={{
                  opacity: level.opacity,
                  borderTopColor: pieces.length > 0 ? meta.color : undefined,
                  borderTopWidth: pieces.length > 0 ? "2px" : undefined,
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span
                        className="rounded-sm px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-paper"
                        style={{ background: meta.color }}
                      >
                        {meta.label}
                      </span>
                      <div className="font-mono text-[10px] uppercase text-ink-3 tracking-widest">
                        {level.sublabel}
                      </div>
                    </div>
                    <div className="mt-3 font-display text-2xl">{level.label}</div>
                  </div>

                  <div className="text-right">
                    <div className="font-display text-4xl tabular-nums">{pieces.length}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                      identified
                    </div>
                    {pieces.length > 0 && (
                      <div className="mt-1 font-mono text-[10px] text-ink-3">
                        avg confidence: {conf}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Evidence pieces in this tier */}
                {pieces.length > 0 && (
                  <div className="mt-4 border-t border-rule pt-4 space-y-2">
                    {pieces.slice(0, 5).map((piece) => (
                      <Link
                        key={piece.id}
                        to={piece.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start justify-between gap-4 rounded-md px-3 py-2 transition-colors hover:bg-paper-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-display text-sm leading-snug truncate">
                            {piece.title}
                          </div>
                          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                            {piece.source} · {piece.year ?? "—"} · {piece.journal}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {piece.n && <span className="chip">n={piece.n.toLocaleString()}</span>}
                          <span className="font-mono text-[10px] text-ink-3">
                            {piece.confidence}%
                          </span>
                        </div>
                      </Link>
                    ))}
                    {pieces.length > 5 && (
                      <div className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 pt-2">
                        +{pieces.length - 5} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="mt-16 border-t border-rule pt-10">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="font-display text-3xl">{totalEvidence}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Total evidence pieces
              </div>
            </div>
            <div>
              <div className="font-display text-3xl">{avgConfidence(allEvidence)}%</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Average confidence
              </div>
            </div>
            <div>
              <div className="font-display text-3xl">
                {new Set(allEvidence.map((e) => e.source)).size}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Data sources
              </div>
            </div>
          </div>
        </div>
      </div>
    </Workstation>
  );
}
