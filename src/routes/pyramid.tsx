import { createFileRoute } from "@tanstack/react-router";
import { Workstation } from "@/components/pran/Workstation";
import { evidence } from "@/lib/evidence";

export const Route = createFileRoute("/pyramid")({
  head: () => ({ meta: [{ title: "Pran — Evidence pyramid" }] }),
  component: PyramidPage,
});

const tiers = [
  {
    id: "meta",
    label: "Meta-analysis & Systematic Review",
    rank: 1,
    width: 32,
    desc: "Synthesis across primary studies — highest external validity, lowest novelty.",
    color: "var(--color-tier-meta)",
  },
  {
    id: "rct",
    label: "Randomized Controlled Trial",
    rank: 2,
    width: 50,
    desc: "Experimental, prospective, with random allocation — the causal benchmark.",
    color: "var(--color-tier-rct)",
  },
  {
    id: "cohort",
    label: "Cohort Study",
    rank: 3,
    width: 70,
    desc: "Observational, longitudinal — strong on real-world signal, weaker on causation.",
    color: "var(--color-tier-cohort)",
  },
  {
    id: "case-control",
    label: "Case-Control Study",
    rank: 4,
    width: 84,
    desc: "Retrospective — useful for rare outcomes, susceptible to bias.",
    color: "var(--color-tier-case)",
  },
  {
    id: "case-report",
    label: "Case Report · Expert Opinion",
    rank: 5,
    width: 100,
    desc: "Anecdotal, low generalizability — hypothesis-generating only.",
    color: "var(--color-tier-case)",
  },
] as const;

export function PyramidPage() {
  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Evidence pyramid" }]}
      scene="Hierarchy of certainty"
    >
      <div className="mx-auto max-w-[1280px] px-10 pt-28 pb-32">
        <header className="mb-14 max-w-3xl">
          <div className="mono-eyebrow mb-3">Why some evidence weighs more</div>
          <h1 className="font-display text-7xl text-balance">
            Not all evidence is <em>equal weight</em>.
          </h1>
        </header>

        <div className="grid grid-cols-12 gap-12">
          {/* Stacked tier bars — typographic, not pictogram */}
          <div className="col-span-12 lg:col-span-7">
            <ol className="space-y-3">
              {tiers.map((t) => {
                const count = evidence.filter(
                  (e) => (t.id === "case-report" && e.tier === "case") || t.id === e.tier,
                ).length;
                return (
                  <li
                    key={t.id}
                    className="relative h-20 cursor-default overflow-hidden rounded-md bg-card hairline-strong"
                  >
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{ width: `${t.width}%`, background: t.color, opacity: 0.14 }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ background: t.color }}
                    />
                    <div className="relative flex h-full items-center justify-between px-5">
                      <div className="flex items-baseline gap-4">
                        <span className="font-display text-4xl text-ink-3">0{t.rank}</span>
                        <div>
                          <div className="font-display text-2xl leading-tight">{t.label}</div>
                          <div className="text-xs leading-snug text-ink-3">{t.desc}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mono-eyebrow">In your stack</div>
                        <div className="font-display text-3xl leading-none">{count}</div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Editorial column */}
          <aside className="col-span-12 lg:col-span-5">
            <div className="sticky top-28 rounded-lg bg-paper-2 p-7">
              <div className="mono-eyebrow mb-3">Reading note</div>
              <p className="font-display text-2xl leading-snug text-balance">
                Pran ranks evidence so that a glance reveals what a paragraph used to require: not
                what was studied, but how <em>well</em>.
              </p>
              <div className="mt-6 h-px bg-rule" />
              <ul className="mt-5 space-y-3 text-sm text-ink-2">
                <li>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                    01
                  </span>{" "}
                  Higher tier ≠ better answer for your patient.
                </li>
                <li>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                    02
                  </span>{" "}
                  Confidence is per-piece, not per-tier.
                </li>
                <li>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                    03
                  </span>{" "}
                  Guidelines synthesize tiers — they do not sit on one.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </Workstation>
  );
}
