import { createFileRoute, Link } from "@tanstack/react-router";
import { Workstation } from "@/components/pran/Workstation";
import { fetchTopicData } from "@/lib/api/topic-service";
import type { LiveTopicData } from "@/lib/api/types";
import { paperToEvidence, tierMeta, type EvidencePiece } from "@/lib/evidence";

export const Route = createFileRoute("/topic/$topicId/guidelines")({
  head: ({ params }) => ({ meta: [{ title: `Pran — Guidelines · ${params.topicId}` }] }),
  loader: async ({ params }) => fetchTopicData(params.topicId),
  component: GuidelinesPage,
});

/** Guideline extracted from literature */
interface Guideline {
  evidence: EvidencePiece;
  institution: string;
  year: number | null;
  type: "guideline" | "recommendation" | "consensus" | "review";
}

/** Conflict between two guidelines */
interface GuidelineConflict {
  a: Guideline;
  b: Guideline;
  nature: string;
}

/**
 * Extract guidelines from evidence pieces.
 * Looks for papers with guideline/recommendation/consensus in title,
 * plus papers from known guideline-producing journals.
 */
function extractGuidelines(evidence: EvidencePiece[]): Guideline[] {
  const guidelines: Guideline[] = [];

  for (const piece of evidence) {
    const title = piece.title.toLowerCase();
    const isGuideline =
      title.includes("guideline") ||
      title.includes("recommendation") ||
      title.includes("consensus") ||
      title.includes("practice parameter") ||
      title.includes("position statement");

    if (isGuideline || piece.tier === "guideline") {
      // Extract institution from journal or authors
      const institution = extractInstitution(piece);

      let type: Guideline["type"] = "guideline";
      if (title.includes("recommendation")) type = "recommendation";
      else if (title.includes("consensus")) type = "consensus";
      else if (title.includes("review") || title.includes("systematic")) type = "review";

      guidelines.push({
        evidence: piece,
        institution,
        year: piece.year,
        type,
      });
    }
  }

  return guidelines.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

/**
 * Extract institution name from evidence metadata.
 */
function extractInstitution(piece: EvidencePiece): string {
  // Try to infer from journal name
  const journal = piece.journal.toLowerCase();

  if (journal.includes("american heart")) return "AHA";
  if (journal.includes("american college of cardiology")) return "ACC";
  if (journal.includes("european society of cardiology")) return "ESC";
  if (journal.includes("nice")) return "NICE";
  if (journal.includes("who")) return "WHO";
  if (journal.includes("american diabetes")) return "ADA";
  if (journal.includes("american college of physicians")) return "ACP";
  if (journal.includes("british medical")) return "BMJ";
  if (journal.includes("lancet")) return "The Lancet";
  if (journal.includes("jama")) return "JAMA";
  if (journal.includes("new england")) return "NEJM";

  // Fall back to first author affiliation or source
  return piece.authors.split("; ")[0] ?? "Unknown";
}

/**
 * Detect conflicts between guidelines.
 * Two guidelines conflict if they're from different institutions
 * and have significantly different confidence scores.
 */
function detectGuidelineConflicts(guidelines: Guideline[]): GuidelineConflict[] {
  const conflicts: GuidelineConflict[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < guidelines.length; i++) {
    for (let j = i + 1; j < guidelines.length; j++) {
      const a = guidelines[i];
      const b = guidelines[j];

      // Skip if same institution
      if (a.institution === b.institution) continue;

      // Check for confidence divergence (>25 points)
      const confDiff = Math.abs(a.evidence.confidence - b.evidence.confidence);
      if (confDiff > 25) {
        const key = [a.evidence.id, b.evidence.id].sort().join("|");
        if (seen.has(key)) continue;
        seen.add(key);

        conflicts.push({
          a,
          b,
          nature: `${a.institution} (${a.evidence.confidence}%) vs ${b.institution} (${b.evidence.confidence}%)`,
        });
      }
    }
  }

  return conflicts.sort((a, b) => {
    const diffA = Math.abs(a.a.evidence.confidence - a.b.evidence.confidence);
    const diffB = Math.abs(b.a.evidence.confidence - b.b.evidence.confidence);
    return diffB - diffA;
  });
}

function GuidelinesPage() {
  const data = Route.useLoaderData() as LiveTopicData;
  const { topicId } = Route.useParams();
  const displayName = topicId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Convert all papers to evidence and extract guidelines
  const allEvidence = data.papers.items.map(paperToEvidence);
  const guidelines = extractGuidelines(allEvidence);
  const conflicts = detectGuidelineConflicts(guidelines);

  // Group by institution for comparison
  const byInstitution = new Map<string, Guideline[]>();
  for (const g of guidelines) {
    if (!byInstitution.has(g.institution)) byInstitution.set(g.institution, []);
    byInstitution.get(g.institution)!.push(g);
  }

  // Timeline data — guidelines sorted by year
  const timeline = guidelines.filter((g) => g.year).sort((a, b) => (a.year ?? 0) - (b.year ?? 0));

  return (
    <Workstation
      trail={[
        { label: "Library", href: "/" },
        { label: displayName, href: `/topic/${topicId}` },
        { label: "Guidelines" },
      ]}
      scene="Guideline landscape"
    >
      <div className="mx-auto max-w-[1200px] px-10 pt-28 pb-32">
        <header className="mb-16 border-b border-rule pb-12">
          <div className="mono-eyebrow mb-6">Comparative Synthesis</div>
          <h1 className="font-display text-6xl leading-tight">
            Guidelines & <br />
            Recommendations
          </h1>
          <p className="mt-6 text-xl text-ink-2 max-w-2xl leading-relaxed">
            Extracted {guidelines.length} guideline documents from {data.papers.total} publications
            on <strong>{displayName}</strong>. Compared across {byInstitution.size} institutions.{" "}
            {conflicts.length > 0 && (
              <>
                Detected{" "}
                <span className="text-conflict font-semibold">
                  {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""}
                </span>{" "}
                between institutions.
              </>
            )}
          </p>
        </header>

        {/* Summary Stats */}
        <section className="mb-16">
          <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg bg-rule-strong">
            <StatBox label="Guidelines found" value={String(guidelines.length)} />
            <StatBox label="Institutions" value={String(byInstitution.size)} />
            <StatBox
              label="Conflicts"
              value={String(conflicts.length)}
              accent={conflicts.length > 0}
            />
            <StatBox
              label="Time span"
              value={
                timeline.length > 1
                  ? `${timeline[0].year}–${timeline[timeline.length - 1].year}`
                  : timeline.length === 1
                    ? String(timeline[0].year)
                    : "—"
              }
            />
          </div>
        </section>

        {/* Guideline Conflicts */}
        {conflicts.length > 0 && (
          <section className="mb-20">
            <div className="flex items-baseline justify-between gap-6 border-b border-rule pb-3 mb-8">
              <h2 className="font-display text-3xl">Institutional Conflicts</h2>
              <span className="mono-eyebrow text-conflict">
                {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-4">
              {conflicts.slice(0, 5).map((conflict, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-rule-strong"
                >
                  <GuidelineSide guideline={conflict.a} label="A" />
                  <GuidelineSide guideline={conflict.b} label="B" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Guidelines by Institution */}
        <section className="mb-20">
          <div className="flex items-baseline justify-between gap-6 border-b border-rule pb-3 mb-8">
            <h2 className="font-display text-3xl">By Institution</h2>
            <span className="mono-eyebrow">{byInstitution.size} sources</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from(byInstitution.entries()).map(([institution, items]) => (
              <div key={institution} className="rounded-lg border border-rule bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-display text-xl">{institution}</div>
                  <span className="chip">
                    {items.length} document{items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-3">
                  {items.slice(0, 3).map((g) => (
                    <Link
                      key={g.evidence.id}
                      to={g.evidence.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-md px-3 py-2 transition-colors hover:bg-paper-2"
                    >
                      <div className="font-display text-sm leading-snug line-clamp-2">
                        {g.evidence.title}
                      </div>
                      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                        {g.year ?? "—"} · {g.type} · {g.evidence.confidence}%
                      </div>
                    </Link>
                  ))}
                  {items.length > 3 && (
                    <div className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                      +{items.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        {timeline.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between gap-6 border-b border-rule pb-3 mb-8">
              <h2 className="font-display text-3xl">Guideline Evolution</h2>
              <span className="mono-eyebrow">{timeline.length} dated</span>
            </div>
            <div className="relative before:absolute before:inset-y-0 before:left-[80px] before:w-px before:bg-rule">
              {timeline.map((g) => (
                <div key={g.evidence.id} className="relative mb-8 pl-[140px]">
                  <div className="absolute left-0 top-0 font-display text-2xl tabular-nums text-ink">
                    {g.year}
                  </div>
                  <div
                    className="absolute left-[76px] top-2.5 h-2.5 w-2.5 rounded-full ring-4 ring-paper"
                    style={{ background: tierMeta.guideline.color }}
                  />
                  <Link
                    to={g.evidence.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-rule bg-card p-5 transition-all hover:shadow-paper"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="chip">{g.institution}</span>
                      <span className="chip">{g.type}</span>
                    </div>
                    <div className="font-display text-lg leading-snug hover:text-accent transition-colors line-clamp-2">
                      {g.evidence.title}
                    </div>
                    <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                      {g.evidence.authors.split("; ")[0]} · {g.evidence.confidence}% confidence
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {guidelines.length === 0 && (
          <div className="rounded-xl border border-rule bg-card p-12 text-center">
            <div className="font-display text-3xl text-ink-3">No guidelines detected</div>
            <p className="mt-3 text-ink-3 text-sm max-w-md mx-auto">
              No papers with "guideline", "recommendation", or "consensus" keywords were found in
              the current sample. Try a broader search term.
            </p>
          </div>
        )}
      </div>
    </Workstation>
  );
}

/** Stat box for summary */
function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col justify-between bg-card p-6">
      <div className="mono-eyebrow">{label}</div>
      <div className={`mt-4 font-display text-3xl ${accent ? "text-conflict" : ""}`}>{value}</div>
    </div>
  );
}

/** One side of a guideline conflict */
function GuidelineSide({ guideline, label }: { guideline: Guideline; label: string }) {
  return (
    <div className="bg-card p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[10px] text-ink-3">Side {label}</span>
        <span className="chip">{guideline.institution}</span>
        <span className="chip">{guideline.type}</span>
      </div>
      <Link
        to={guideline.evidence.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-display text-base leading-snug hover:text-accent transition-colors line-clamp-3"
      >
        {guideline.evidence.title}
      </Link>
      <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
        {guideline.year ?? "—"} · {guideline.evidence.confidence}% confidence
      </div>
    </div>
  );
}
