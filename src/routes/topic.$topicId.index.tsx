import { createFileRoute, Link } from "@tanstack/react-router";
import { Workstation } from "@/components/pran/Workstation";
import { fetchTopicData } from "@/lib/api/topic-service";
import type { LiveTopicData, Trial, Paper, Drug } from "@/lib/api/types";

export const Route = createFileRoute("/topic/$topicId/")({
  head: ({ params }) => ({
    meta: [
      {
        title: `Pran — ${params.topicId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`,
      },
    ],
  }),
  loader: async ({ params }) => {
    return fetchTopicData(params.topicId);
  },
  pendingComponent: TopicLoading,
  errorComponent: TopicError,
  component: TopicDetailPage,
});

/* ─────────────────────────── Loading state ─────────────────────────── */

function TopicLoading() {
  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Loading…" }]}
      scene="Fetching data"
    >
      <div className="mx-auto max-w-[1320px] px-10 pt-28 pb-32">
        <div className="animate-pulse space-y-8">
          <div className="h-6 w-48 rounded bg-paper-2" />
          <div className="h-24 w-96 rounded bg-paper-2" />
          <div className="h-4 w-64 rounded bg-paper-2" />
          <div className="mt-12 grid grid-cols-4 gap-px overflow-hidden rounded-lg bg-rule-strong">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card p-8">
                <div className="h-3 w-20 rounded bg-paper-2" />
                <div className="mt-4 h-8 w-24 rounded bg-paper-2" />
              </div>
            ))}
          </div>
          <div className="mt-12 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded bg-paper-2" />
            ))}
          </div>
        </div>
      </div>
    </Workstation>
  );
}

/* ─────────────────────────── Error state ──────────────────────────── */

function TopicError({ error }: { error: Error }) {
  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Error" }]}
      scene="Network error"
    >
      <div className="mx-auto max-w-[1320px] px-10 pt-28 pb-32 text-center">
        <div className="font-display text-8xl text-ink-3">⚠</div>
        <h1 className="mt-6 font-display text-4xl">Could not fetch data</h1>
        <p className="mt-4 text-lg text-ink-3">
          {error?.message ?? "The medical APIs may be temporarily unavailable."}
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

/* ─────────────────────────── Page ─────────────────────────────────── */

function TopicDetailPage() {
  const data = Route.useLoaderData() as LiveTopicData;
  const { topicId } = Route.useParams();

  const displayName = topicId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const fetchedTime = new Date(data.fetchedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: displayName }, { label: "Live Analysis" }]}
      scene="Evidence workstation"
    >
      <div className="mx-auto max-w-[1320px] px-10 pt-28 pb-32">
        {/* ── 1. Hero ──────────────────────────────────────────────── */}
        <section className="border-b border-rule pb-16">
          <div className="mono-eyebrow mb-5">Live data · fetched {fetchedTime}</div>
          <h1 className="serif-display text-[clamp(56px,8vw,128px)] text-balance">{displayName}</h1>
          <p className="mt-2 font-display text-2xl italic text-ink-3">
            Real-time evidence from PubMed, ClinicalTrials.gov, and OpenFDA
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="chip">{data.papers.total.toLocaleString()} papers</span>
            <span className="chip">{data.trials.total.toLocaleString()} trials</span>
            <span className="chip">{data.drugs.length} drugs found</span>
            {data.adverseEventCount > 0 && (
              <span className="chip">
                {data.adverseEventCount.toLocaleString()} adverse event reports
              </span>
            )}
          </div>
        </section>

        {/* ── 2. Evidence Counts — 4 stat cards ────────────────────── */}
        <section className="mt-16">
          <SectionHeader eyebrow="Live counts" title="Evidence landscape" />
          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-rule-strong lg:grid-cols-4">
            <StatCard
              label="PubMed papers"
              value={data.papers.total.toLocaleString()}
              source="pubmed.ncbi.nlm.nih.gov"
            />
            <StatCard
              label="Clinical trials"
              value={data.trials.total.toLocaleString()}
              source="clinicaltrials.gov"
            />
            <StatCard label="FDA drugs" value={String(data.drugs.length)} source="api.fda.gov" />
            <Link
              to="/topic/$topicId/safety"
              params={{ topicId }}
              className="flex flex-col justify-between bg-card p-6 transition-colors hover:bg-paper-2"
            >
              <div className="mono-eyebrow">FAERS reports</div>
              <div className="mt-4 font-display text-4xl">
                {data.adverseEventCount.toLocaleString()}
              </div>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
                openFDA adverse events · View safety →
              </div>
            </Link>
          </div>
        </section>

        {/* ── 3. Clinical Trials ───────────────────────────────────── */}
        {data.trials.items.length > 0 && (
          <section className="mt-20">
            <SectionHeader
              eyebrow={`${data.trials.total.toLocaleString()} registered`}
              title="Clinical trials"
            />
            <div className="mt-8 space-y-px overflow-hidden rounded-lg bg-rule-strong">
              {data.trials.items.map((trial) => (
                <TrialRow key={trial.nctId} trial={trial} />
              ))}
            </div>
          </section>
        )}

        {/* ── 4. Research Papers ───────────────────────────────────── */}
        {data.papers.items.length > 0 && (
          <section className="mt-20">
            <SectionHeader
              eyebrow={`${data.papers.total.toLocaleString()} in PubMed`}
              title="Research papers"
            />
            <ul className="mt-8 divide-y divide-rule">
              {data.papers.items.map((paper) => (
                <PaperRow key={paper.pmid} paper={paper} />
              ))}
            </ul>
          </section>
        )}

        {/* ── 5. FDA-Approved Drugs ────────────────────────────────── */}
        {data.drugs.length > 0 && (
          <section className="mt-20">
            <SectionHeader eyebrow={`${data.drugs.length} found`} title="FDA-labelled drugs" />
            <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-rule-strong sm:grid-cols-2 lg:grid-cols-4">
              {data.drugs.map((drug, i) => (
                <DrugCard key={`${drug.generic}-${i}`} drug={drug} />
              ))}
            </div>
          </section>
        )}

        {/* ── 6. Data Provenance ───────────────────────────────────── */}
        <section className="mt-20 border-t border-rule pt-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mono-eyebrow mb-2">Data sources</div>
              <div className="space-y-1 text-sm text-ink-3">
                <div>
                  <a
                    href="https://pubmed.ncbi.nlm.nih.gov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    PubMed / NCBI E-utilities
                  </a>{" "}
                  — {data.papers.total.toLocaleString()} papers
                </div>
                <div>
                  <a
                    href="https://clinicaltrials.gov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    ClinicalTrials.gov APIv2
                  </a>{" "}
                  — {data.trials.total.toLocaleString()} trials
                </div>
                <div>
                  <a
                    href="https://open.fda.gov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    OpenFDA
                  </a>{" "}
                  — {data.drugs.length} drugs, {data.adverseEventCount.toLocaleString()} adverse
                  event reports
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-ink hairline-strong hover:bg-paper-2"
              >
                <span className="font-display text-base">←</span> Library
              </Link>
            </div>
          </div>
        </section>
      </div>
    </Workstation>
  );
}

/* ─────────────────────────── Sub-components ───────────────────────── */

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-rule pb-3">
      <h2 className="font-display text-4xl">{title}</h2>
      <span className="mono-eyebrow">{eyebrow}</span>
    </div>
  );
}

function StatCard({ label, value, source }: { label: string; value: string; source: string }) {
  return (
    <div className="flex flex-col justify-between bg-card p-6">
      <div className="mono-eyebrow">{label}</div>
      <div className="mt-4 font-display text-4xl">{value}</div>
      <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
        {source}
      </div>
    </div>
  );
}

const statusColors: Record<string, string> = {
  RECRUITING: "bg-green-500",
  "ACTIVE, NOT YET RECRUITING": "bg-blue-400",
  ACTIVE_NOT_RECRUITING: "bg-blue-400",
  COMPLETED: "bg-ink-3",
  TERMINATED: "bg-red-400",
  WITHDRAWN: "bg-red-400",
  ENROLLING_BY_INVITATION: "bg-yellow-500",
  NOT_YET_RECRUITING: "bg-yellow-500",
  SUSPENDED: "bg-orange-400",
  UNKNOWN: "bg-ink-3",
};

function TrialRow({ trial }: { trial: Trial }) {
  const dotColor = statusColors[trial.status] ?? "bg-ink-3";
  return (
    <a
      href={trial.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-5 bg-card px-6 py-5 transition-colors hover:bg-paper-2"
    >
      <div className="mt-2 flex shrink-0 flex-col items-center gap-1">
        <span className={`size-2.5 rounded-full ${dotColor}`} />
        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-3">
          {trial.status.replace(/_/g, " ").toLowerCase()}
        </span>
      </div>
      <div className="flex-1">
        <div className="font-display text-lg leading-snug">{trial.title}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          <span>{trial.nctId}</span>
          {trial.phase !== "N/A" && <span>{trial.phase.replace("PHASE", "Phase ")}</span>}
          {trial.enrollment !== null && <span>n={trial.enrollment.toLocaleString()}</span>}
          <span>{trial.sponsor}</span>
        </div>
        {trial.interventions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {trial.interventions.slice(0, 4).map((int, i) => (
              <span key={i} className="chip">
                {int}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="mt-2 shrink-0 font-display text-xl text-ink-3 transition-transform group-hover:translate-x-1">
        ↗
      </span>
    </a>
  );
}

function PaperRow({ paper }: { paper: Paper }) {
  return (
    <li className="flex items-start gap-6 py-5">
      <span className="mt-1 w-12 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        {paper.year ?? "—"}
      </span>
      <div className="flex-1">
        <a
          href={paper.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display text-xl leading-tight text-balance hover:italic"
        >
          {paper.title}
        </a>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          {paper.journal}
          {paper.authors.length > 0 && <> · {paper.authors.join(", ")}</>}
        </div>
      </div>
      <a
        href={paper.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 shrink-0 rounded-sm bg-paper-2 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3 hairline hover:text-ink"
      >
        PMID {paper.pmid}
      </a>
    </li>
  );
}

function DrugCard({ drug }: { drug: Drug }) {
  return (
    <div className="flex flex-col justify-between bg-card p-5">
      <div>
        <div className="font-display text-2xl">{drug.brand}</div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          {drug.generic}
        </div>
      </div>
      <div className="mt-4">
        <div className="text-xs leading-relaxed text-ink-3 line-clamp-3">
          {drug.indication || "—"}
        </div>
        <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
          {drug.manufacturer}
        </div>
      </div>
    </div>
  );
}
