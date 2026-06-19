import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Workstation } from "@/components/pran/Workstation";
import { fetchTopicData } from "@/lib/api/topic-service";
import type { LiveTopicData } from "@/lib/api/types";
import { tierMeta, computeConfidence, type EvidencePiece } from "@/lib/evidence";

export const Route = createFileRoute("/topic/$topicId/canvas")({
  head: ({ params }) => ({
    meta: [{ title: `Pran — Canvas · ${params.topicId.replace(/-/g, " ")}` }],
  }),
  loader: async ({ params }) => fetchTopicData(params.topicId),
  component: CanvasPage,
});

/** Deterministic pseudo-random number generator based on string */
function seededRandom(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/** Canvas node — an evidence piece positioned in 2D space */
interface CanvasNode {
  evidence: EvidencePiece;
  x: number;
  y: number;
}

function CanvasPage() {
  const data = Route.useLoaderData() as LiveTopicData;
  const { topicId } = Route.useParams();
  const displayName = topicId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Use normalized evidence directly (avoids double-conversion)
  const nodes: CanvasNode[] = data.evidence.map((ne) => {
    const evidence: EvidencePiece = {
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
    };
    const rng = seededRandom(evidence.id);
    return {
      evidence,
      x: (rng() % 80) + 10,
      y: (ne.sourceId === "clinicaltrials" ? (rng() >> 8) % 40 + 10 : (rng() >> 8) % 30 + 50),
    };
  });

  const [activeId, setActiveId] = useState<string | null>(nodes[0]?.evidence.id ?? null);
  const activeNode = nodes.find((n) => n.evidence.id === activeId);

  return (
    <Workstation
      trail={[
        { label: "Library", href: "/" },
        { label: displayName, href: `/topic/${topicId}` },
        { label: "Canvas" },
      ]}
      scene="Spatial evidence board"
    >
      <div className="relative h-screen w-full overflow-hidden paper-grid">
        <div className="absolute inset-0">
          {/* Connector lines between adjacent nodes */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
          >
            {nodes.slice(0, 15).map((n, i) => {
              if (i === 0) return null;
              const prev = nodes[i - 1];
              return (
                <line
                  key={`line-${n.evidence.id}-${prev.evidence.id}`}
                  x1={`${n.x}%`}
                  y1={`${n.y}%`}
                  x2={`${prev.x}%`}
                  y2={`${prev.y}%`}
                  stroke="currentColor"
                  className="text-ink-3/20"
                  strokeWidth={0.5}
                  strokeDasharray="2 4"
                />
              );
            })}
          </svg>

          {/* Evidence pins — color-coded by tier */}
          {nodes.map((n) => {
            const meta = tierMeta[n.evidence.tier];
            const isActive = n.evidence.id === activeId;

            return (
              <button
                key={n.evidence.id}
                onClick={() => setActiveId(n.evidence.id)}
                className={[
                  "absolute flex w-64 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-center transition-all duration-500",
                  isActive
                    ? "z-30 scale-110 opacity-100"
                    : "z-10 opacity-60 hover:z-20 hover:opacity-100",
                ].join(" ")}
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
              >
                {/* Pin marker — colored by evidence tier */}
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full shadow-lift backdrop-blur-md hairline-strong"
                  style={{ background: meta.color, color: "var(--color-paper)" }}
                >
                  <span className="font-mono text-[9px] font-bold uppercase">
                    {meta.label.slice(0, 2)}
                  </span>
                </div>

                {/* Title card — shows on hover or active */}
                <div
                  className={[
                    "rounded-md bg-card/80 p-2 backdrop-blur-md hairline-strong transition-opacity",
                    isActive ? "opacity-100" : "opacity-0",
                  ].join(" ")}
                >
                  <div className="font-display text-sm leading-tight text-ink line-clamp-2">
                    {n.evidence.title}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
                      {n.evidence.source}
                    </span>
                    <span
                      className="rounded-sm px-1 py-0.5 font-mono text-[8px] uppercase text-paper"
                      style={{ background: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Drugs strip along the bottom */}
          {data.evidence.filter((ne) => ne.sourceId === "openfda").length > 0 && (
            <div className="absolute inset-x-0 bottom-24 px-12">
              <div className="mono-eyebrow mb-3">FDA Approved Interventions</div>
              <div className="flex gap-3 overflow-x-auto pb-4">
                {data.evidence.filter((ne) => ne.sourceId === "openfda").slice(0, 8).map((ne, i) => {
                  const brand = ne.title.split(" (")[0];
                  const generic = ne.title.includes("(") ? ne.title.split("(")[1].replace(")", "").trim() : ne.title;
                  return (
                    <div
                      key={i}
                      className="min-w-[200px] shrink-0 rounded-md bg-card/90 p-3 backdrop-blur hairline-strong"
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="font-display text-xl">{brand}</span>
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase text-ink-3 tracking-widest">
                        {generic}
                      </div>
                      <div className="mt-2 text-xs text-ink-3 line-clamp-2">{ne.effect ?? "—"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Inspector panel — shows evidence piece details */}
        {activeNode && (
          <div className="absolute inset-y-0 right-0 w-[420px] border-l border-rule bg-paper/95 p-8 shadow-2xl backdrop-blur-xl overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="mono-eyebrow">Inspector</div>
              <button
                onClick={() => setActiveId(null)}
                className="text-2xl text-ink-3 hover:text-ink"
              >
                ×
              </button>
            </div>

            {/* Tier badge */}
            <div className="flex items-center gap-2 mb-4">
              <span
                className="rounded-sm px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-paper"
                style={{ background: tierMeta[activeNode.evidence.tier].color }}
              >
                {tierMeta[activeNode.evidence.tier].label}
              </span>
              <span className="font-mono text-[10px] text-ink-3">
                {activeNode.evidence.confidence}% confidence
              </span>
            </div>

            <h2 className="font-display text-xl leading-snug text-balance">
              {activeNode.evidence.title}
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip">{activeNode.evidence.source}</span>
              {activeNode.evidence.year && <span className="chip">{activeNode.evidence.year}</span>}
              <span className="chip uppercase">{activeNode.evidence.id}</span>
            </div>

            {/* Metadata */}
            <div className="mt-8 space-y-4 text-sm text-ink-2 border-t border-rule pt-6">
              <div>
                <span className="font-bold">Source:</span> {activeNode.evidence.source}
              </div>
              <div>
                <span className="font-bold">Journal/Registry:</span> {activeNode.evidence.journal}
              </div>
              <div>
                <span className="font-bold">Authors:</span> {activeNode.evidence.authors}
              </div>
              {activeNode.evidence.n && (
                <div>
                  <span className="font-bold">Sample size:</span> n ={" "}
                  {activeNode.evidence.n.toLocaleString()}
                </div>
              )}
              <div>
                <span className="font-bold">Confidence:</span>{" "}
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-16 rounded-full bg-rule overflow-hidden">
                    <span
                      className="h-full rounded-full"
                      style={{
                        width: `${activeNode.evidence.confidence}%`,
                        background: tierMeta[activeNode.evidence.tier].color,
                      }}
                    />
                  </span>
                  {activeNode.evidence.confidence}%
                </span>
              </div>
            </div>

            {/* External link */}
            <a
              href={activeNode.evidence.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block text-accent underline text-sm hover:no-underline"
            >
              View on {activeNode.evidence.source} →
            </a>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 left-6 z-20">
          <div className="rounded-lg bg-card/80 p-3 backdrop-blur-xl hairline-strong">
            <div className="mono-eyebrow mb-2">Evidence Tiers</div>
            <div className="flex flex-wrap gap-2">
              {(["meta-analysis", "rct", "guideline", "cohort", "case-report"] as const).map(
                (tier) => {
                  const meta = tierMeta[tier];
                  return (
                    <div key={tier} className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: meta.color }}
                      />
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                        {meta.label}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </div>
      </div>
    </Workstation>
  );
}
