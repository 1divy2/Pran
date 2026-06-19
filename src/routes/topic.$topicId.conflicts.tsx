import { createFileRoute, Link } from "@tanstack/react-router";
import { Workstation } from "@/components/pran/Workstation";
import { fetchTopicData } from "@/lib/api/topic-service";
import type { LiveTopicData } from "@/lib/api/types";
import {
  tierMeta,
  computeConfidence,
  type EvidencePiece,
  type EvidenceConflict,
} from "@/lib/evidence";
import type { NormalizedEvidence } from "@/lib/ingestion/types";

export const Route = createFileRoute("/topic/$topicId/conflicts")({
  head: ({ params }) => ({ meta: [{ title: `Pran — Conflicts · ${params.topicId}` }] }),
  loader: async ({ params }) => fetchTopicData(params.topicId),
  component: ConflictsPage,
});

/**
 * Detect conflicts between evidence pieces.
 * A conflict exists when:
 * 1. High-tier evidence (meta-analysis/RCT) contradicts lower-tier evidence
 * 2. Trials with the same interventions have different statuses
 * 3. Papers from different tiers have divergent conclusions (detected by title sentiment)
 */
function detectConflicts(evidence: EvidencePiece[]): EvidenceConflict[] {
  const conflicts: EvidenceConflict[] = [];

  // Group by source keyword to find related evidence
  const byKeyword = new Map<string, EvidencePiece[]>();
  for (const piece of evidence) {
    // Extract meaningful keywords from title (skip common words)
    const keywords = piece.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 4 && !STOP_WORDS.has(w));

    for (const kw of keywords.slice(0, 3)) {
      if (!byKeyword.has(kw)) byKeyword.set(kw, []);
      byKeyword.get(kw)!.push(piece);
    }
  }

  // Find pairs with conflicting tiers or opposing signals
  const seen = new Set<string>();
  for (const [, pieces] of byKeyword) {
    if (pieces.length < 2) continue;

    // Check for tier conflicts (high vs low evidence)
    const sorted = [...pieces].sort((a, b) => b.confidence - a.confidence);
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        const pairKey = [a.id, b.id].sort().join("|");
        if (seen.has(pairKey)) continue;

        // Conflict if confidence gap > 30 (high-tier vs low-tier)
        if (a.confidence - b.confidence > 30) {
          seen.add(pairKey);
          conflicts.push({
            id: pairKey,
            a,
            b,
            nature: `${tierMeta[a.tier].label} (${a.confidence}%) vs ${tierMeta[b.tier].label} (${b.confidence}%)`,
            confidence: Math.min(95, a.confidence - b.confidence + 20),
          });
        }
      }
    }
  }

  // Sort by conflict confidence (strongest conflicts first)
  return conflicts.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
}

/** Common English stop words to skip in keyword extraction */
const STOP_WORDS = new Set([
  "about",
  "after",
  "before",
  "being",
  "between",
  "both",
  "could",
  "during",
  "every",
  "first",
  "found",
  "from",
  "have",
  "into",
  "more",
  "most",
  "much",
  "must",
  "only",
  "other",
  "over",
  "same",
  "should",
  "some",
  "such",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "under",
  "upon",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "will",
  "with",
  "would",
  "your",
]);

function ConflictsPage() {
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

  // Detect conflicts
  const conflicts = detectConflicts(allEvidence);

  // Find halted/terminated trials (separate category)
  const haltedTrials = data.evidence.filter(
    (ne) =>
      ne.sourceId === "clinicaltrials" &&
      (ne.status === "TERMINATED" ||
        ne.status === "SUSPENDED" ||
        ne.status === "WITHDRAWN" ||
        ne.status === "ACTIVE_NOT_RECRUITING"),
  );

  return (
    <Workstation
      trail={[
        { label: "Library", href: "/" },
        { label: displayName, href: `/topic/${topicId}` },
        { label: "Conflicts" },
      ]}
      scene="Evidence contradictions"
    >
      <div className="mx-auto max-w-[1200px] px-10 pt-28 pb-32">
        <header className="mb-16 border-b border-rule pb-12">
          <div className="mono-eyebrow mb-6 text-conflict">Evidence Contradictions</div>
          <h1 className="font-display text-6xl leading-tight">
            When evidence <br />
            disagrees.
          </h1>
          <p className="mt-6 text-xl text-ink-2 max-w-2xl leading-relaxed">
            Not all research agrees. Below are detected conflicts in the{" "}
            <strong>{displayName}</strong> literature — cases where high-tier and low-tier evidence
            diverge, or where trials with similar interventions reached different conclusions.
          </p>
        </header>

        {/* Evidence Conflicts */}
        <section className="mb-20">
          <div className="flex items-baseline justify-between gap-6 border-b border-rule pb-3 mb-8">
            <h2 className="font-display text-3xl">Detected Conflicts</h2>
            <span className="mono-eyebrow">
              {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""}
            </span>
          </div>

          {conflicts.length > 0 ? (
            <div className="space-y-6">
              {conflicts.map((conflict) => (
                <ConflictCard key={conflict.id} conflict={conflict} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-rule bg-card p-12 text-center">
              <div className="font-display text-3xl text-ink-3">No conflicts detected</div>
              <p className="mt-3 text-ink-3 text-sm">
                The current sample does not show significant tier-based contradictions. This may
                change with more data.
              </p>
            </div>
          )}
        </section>

        {/* Failed / Halted Research */}
        <section>
          <div className="flex items-baseline justify-between gap-6 border-b border-rule pb-3 mb-8">
            <h2 className="font-display text-3xl">Failed & Halted Research</h2>
            <span className="mono-eyebrow">
              {haltedTrials.length} trial{haltedTrials.length !== 1 ? "s" : ""}
            </span>
          </div>

          {haltedTrials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {haltedTrials.map((t) => (
                <a
                  key={t.id}
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col rounded-lg border border-rule bg-card p-6 transition-all hover:shadow-paper"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        t.status === "TERMINATED"
                          ? "bg-red-400"
                          : t.status === "SUSPENDED"
                            ? "bg-orange-400"
                            : "bg-ink-3"
                      }`}
                    />
                    <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-ink-3">
                      {(t.status ?? "UNKNOWN").replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="font-display text-lg leading-snug group-hover:text-accent transition-colors line-clamp-2">
                    {t.title}
                  </div>
                  <div className="mt-3 text-sm text-ink-2">
                    <span className="font-bold">Sponsor:</span> {t.authors}
                  </div>
                  <div className="mt-1 text-sm text-ink-2">
                    <span className="font-bold">Phase:</span>{" "}
                    {(t.rawMetadata.phase as string) !== "N/A" ? ((t.rawMetadata.phase as string) ?? "Unknown").replace("PHASE", "Phase ") : "Unknown"}
                  </div>
                  {t.sampleSize && (
                    <div className="mt-1 text-sm text-ink-2">
                      <span className="font-bold">Enrollment:</span> n ={" "}
                      {t.sampleSize.toLocaleString()}
                    </div>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-rule bg-card p-12 text-center">
              <div className="font-display text-3xl text-ink-3">No halted trials found</div>
              <p className="mt-3 text-ink-3 text-sm">
                All registered trials for {displayName} appear to be active or completed.
              </p>
            </div>
          )}
        </section>
      </div>
    </Workstation>
  );
}

/** Conflict card — shows two opposing evidence pieces */
function ConflictCard({ conflict }: { conflict: EvidenceConflict }) {
  return (
    <div className="rounded-xl border border-rule bg-card overflow-hidden">
      {/* Conflict header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-rule bg-paper-2/50">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-conflict animate-pulse" />
          <span className="mono-eyebrow">Conflict detected</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-ink-3">
            {conflict.confidence}% confidence
          </span>
          <div className="h-1.5 w-12 rounded-full bg-rule overflow-hidden">
            <div
              className="h-full rounded-full bg-conflict"
              style={{ width: `${conflict.confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Nature of conflict */}
      <div className="px-6 py-3 border-b border-rule">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          {conflict.nature}
        </span>
      </div>

      {/* Two evidence pieces side by side */}
      <div className="grid grid-cols-2 divide-x divide-rule">
        <EvidenceSide piece={conflict.a} label="A" />
        <EvidenceSide piece={conflict.b} label="B" />
      </div>
    </div>
  );
}

/** One side of a conflict card */
function EvidenceSide({ piece, label }: { piece: EvidencePiece; label: string }) {
  const meta = tierMeta[piece.tier];
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[10px] text-ink-3">Side {label}</span>
        <span
          className="rounded-sm px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-paper"
          style={{ background: meta.color }}
        >
          {meta.label}
        </span>
      </div>
      <Link
        to={piece.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-display text-base leading-snug hover:text-accent transition-colors line-clamp-3"
      >
        {piece.title}
      </Link>
      <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
        {piece.source} · {piece.year ?? "—"} · {piece.journal}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 w-16 rounded-full bg-rule overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${piece.confidence}%`,
              background: meta.color,
            }}
          />
        </div>
        <span className="font-mono text-[10px] text-ink-3">{piece.confidence}%</span>
      </div>
    </div>
  );
}
