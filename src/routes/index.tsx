import { createFileRoute, Link } from "@tanstack/react-router";
import { Workstation } from "@/components/pran/Workstation";
import { topics, evidence, timeline } from "@/lib/evidence";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pran — Library" },
      {
        name: "description",
        content:
          "Your reading room of medical evidence — topics, recent signals, and open canvases.",
      },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const featured = topics[0];
  const recent = evidence.slice(0, 3);
  const lastShifts = timeline.slice(-4).reverse();

  return (
    <Workstation trail={[{ label: "Library" }]} scene="Reading room">
      <div className="mx-auto max-w-[1320px] px-10 pt-28 pb-32">
        {/* Editorial hero — no KPI cards, no widgets */}
        <section className="grid grid-cols-12 gap-10 border-b border-rule pb-16">
          <div className="col-span-12 lg:col-span-7">
            <div className="mono-eyebrow mb-6">Volume xii · Session 42-xj9 · Mount Sinai</div>
            <h1 className="serif-display text-[clamp(56px,8vw,128px)] text-balance">
              Evidence,
              <br />
              <em className="text-accent">arranged</em> for thinking.
            </h1>
            <p className="mt-8 max-w-[52ch] text-pretty text-lg leading-relaxed text-ink-2">
              Pran is a workstation for clinical evidence. Trials, meta-analyses and guidelines are
              not chat replies — they are objects you arrange, compare, cross-examine, and watch
              evolve.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                to="/canvas"
                className="group inline-flex items-center gap-3 rounded-full bg-ink px-5 py-2.5 text-sm text-paper transition-transform hover:-translate-y-0.5"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Open</span>
                <span>Hypertension canvas</span>
                <span className="font-display text-xl leading-none">→</span>
              </Link>
              <Link
                to="/courtroom"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-ink hairline-strong"
              >
                <span>Enter the courtroom</span>
              </Link>
            </div>
          </div>

          {/* Index card — featured topic */}
          <div className="col-span-12 lg:col-span-5">
            <div className="relative rotate-[0.6deg] rounded-md bg-card p-6 shadow-paper hairline-strong">
              <div className="absolute -top-3 left-6 bg-paper px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                Active topic
              </div>
              <div className="font-display text-5xl leading-none">{featured.name}</div>
              <div className="mt-2 text-sm italic text-ink-3">{featured.subtitle}</div>

              <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Stat k="Indexed pieces" v={featured.evidenceCount.toLocaleString()} />
                <Stat k="Active conflicts" v={String(featured.activeConflicts)} />
                <Stat k="Burden" v={featured.prevalence} wide />
              </dl>

              <div className="mt-6 border-t border-rule pt-4">
                <div className="mono-eyebrow mb-2">Latest signal</div>
                <p className="font-display text-lg italic leading-tight text-balance">
                  “{featured.lastSignal}.”
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* All topics — index cards, not a dashboard grid */}
        <section className="mt-16">
          <Header eyebrow="Open topics" title="On the desk" />
          <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-rule-strong sm:grid-cols-2 lg:grid-cols-4">
            {topics.map((t) => (
              <Link
                key={t.id}
                to="/canvas"
                className="group flex flex-col justify-between bg-card p-5 transition-colors hover:bg-paper-2"
              >
                <div>
                  <div className="mono-eyebrow">{t.subtitle}</div>
                  <div className="mt-2 font-display text-3xl">{t.name}</div>
                </div>
                <div className="mt-8 flex items-end justify-between gap-3">
                  <div className="text-xs text-ink-3">
                    <div>{t.evidenceCount.toLocaleString()} pieces</div>
                    <div>{t.activeConflicts} conflicts</div>
                  </div>
                  <span className="font-display text-2xl text-ink-3 transition-transform group-hover:translate-x-1 group-hover:text-ink">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Two-column reading list */}
        <section className="mt-20 grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-7">
            <Header eyebrow="Recently read" title="From your stack" />
            <ul className="mt-6 divide-y divide-rule">
              {recent.map((e) => (
                <li key={e.id} className="flex items-start gap-6 py-5">
                  <span className="mt-1 w-12 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                    {e.year}
                  </span>
                  <div className="flex-1">
                    <Link
                      to="/canvas"
                      className="font-display text-2xl leading-tight text-balance hover:italic"
                    >
                      {e.title}
                    </Link>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                      {e.source} · {e.authors}
                    </div>
                  </div>
                  <span
                    className="mt-2 size-2 shrink-0 rounded-full"
                    style={{
                      background: `var(--color-tier-${e.tier === "meta" ? "meta" : e.tier === "rct" ? "rct" : "cohort"})`,
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <Header eyebrow="The field moved" title="Last four shifts" />
            <ol className="mt-6 space-y-5">
              {lastShifts.map((p) => (
                <li key={p.year + p.title} className="grid grid-cols-[56px_1fr] gap-4">
                  <span className="font-display text-3xl leading-none text-ink-3">{p.year}</span>
                  <div>
                    <div className="text-sm font-medium">{p.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-ink-3">{p.detail}</div>
                  </div>
                </li>
              ))}
            </ol>
            <Link
              to="/timeline"
              className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink"
            >
              Open the timeline <span className="font-display text-base">→</span>
            </Link>
          </div>
        </section>
      </div>
    </Workstation>
  );
}

function Stat({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="mono-eyebrow">{k}</dt>
      <dd className="mt-1 text-sm text-ink">{v}</dd>
    </div>
  );
}

function Header({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-rule pb-3">
      <h2 className="font-display text-4xl">{title}</h2>
      <span className="mono-eyebrow">{eyebrow}</span>
    </div>
  );
}
