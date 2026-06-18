import { createFileRoute } from "@tanstack/react-router";
import { Workstation } from "@/components/pran/Workstation";
import { guidelines } from "@/lib/evidence";

export const Route = createFileRoute("/guidelines")({
  head: () => ({ meta: [{ title: "Pran — Guideline landscape" }] }),
  component: GuidelinesPage,
});

const dimensions = [
  { id: "threshold", label: "Diagnostic threshold" },
  { id: "first", label: "First-line therapy" },
  { id: "monitor", label: "Monitoring" },
  { id: "target", label: "Treatment target" },
] as const;

const matrix: Record<string, Record<string, string>> = {
  "acc-aha-2017": {
    threshold: "≥130 / 80 mmHg",
    first: "Thiazide · ACEi · ARB · CCB",
    monitor: "Home BP encouraged",
    target: "<130 / 80 mmHg",
  },
  "esc-esh-2018": {
    threshold: "≥140 / 90 mmHg",
    first: "ACEi/ARB + CCB or thiazide (SPC)",
    monitor: "ABPM preferred for diagnosis",
    target: "<130 / 80 if tolerated",
  },
  "nice-ng136": {
    threshold: "≥140/90 office · ≥135/85 ABPM",
    first: "ACEi/ARB if <55 non-Black · CCB otherwise",
    monitor: "ABPM mandatory before Rx",
    target: "<140 / 90 (<150/90 if >80y)",
  },
  "who-2021": {
    threshold: "≥140 / 90 mmHg",
    first: "Thiazide · ACEi/ARB · long-acting CCB",
    monitor: "Office BP, equity-weighted",
    target: "<140 / 90 mmHg",
  },
  "cdc-2022": {
    threshold: "≥130 / 80 (aligned ACC/AHA)",
    first: "Standard treatment algorithms",
    monitor: "Self-measured BP as standard",
    target: "Population control rate ≥80%",
  },
  "esc-esh-2024": {
    threshold: "Elevated 120–139 / 70–89",
    first: "Single-pill combination preferred",
    monitor: "ABPM + home, risk-stratified",
    target: "<130 / 80 mmHg",
  },
};

const conflictTones: Record<string, string> = {
  "≥130 / 80 mmHg": "var(--color-tier-meta)",
  "≥140 / 90 mmHg": "var(--color-tier-guide)",
};

export function GuidelinesPage() {
  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Hypertension" }, { label: "Guidelines" }]}
      scene="Guideline landscape"
    >
      <div className="mx-auto max-w-[1440px] px-10 pt-28 pb-32">
        <header className="mb-12 flex items-end justify-between border-b border-rule pb-6">
          <div>
            <div className="mono-eyebrow mb-3">
              Comparative reading · 6 institutions · 2017–2024
            </div>
            <h1 className="font-display text-7xl">
              When the guidelines
              <br />
              <em>disagree</em>.
            </h1>
          </div>
          <div className="hidden gap-6 text-right md:flex">
            <Legend swatch="var(--color-tier-meta)" label="130/80 camp" />
            <Legend swatch="var(--color-tier-guide)" label="140/90 camp" />
          </div>
        </header>

        {/* Landscape table — read as a topographic comparison, not a CRUD table */}
        <div className="grid grid-cols-[200px_repeat(6,minmax(0,1fr))] gap-px overflow-hidden rounded-xl bg-rule-strong">
          {/* Column heads */}
          <div className="bg-paper-2 p-4">
            <div className="mono-eyebrow">Dimension</div>
          </div>
          {guidelines.map((g) => (
            <div key={g.id} className="flex flex-col gap-2 bg-paper-2 p-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                {g.year}
              </span>
              <span className="font-display text-3xl leading-none">{g.org}</span>
              <span className="text-[11px] leading-snug text-ink-2">
                {g.title.split(" — ")[0].slice(0, 48)}
              </span>
            </div>
          ))}

          {dimensions.map((d) => (
            <Row key={d.id} d={d} />
          ))}
        </div>

        {/* Narrative footer */}
        <section className="mt-16 grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-7">
            <h2 className="font-display text-4xl">
              The transatlantic split, in <em>one sentence</em>.
            </h2>
            <p className="mt-5 text-pretty text-lg leading-relaxed text-ink-2">
              In 2017, ACC/AHA reframed Stage-1 hypertension at 130/80, expanding U.S. diagnosis
              from 32% to 46% of adults overnight. ESC/ESH held 140/90, citing over-treatment risk
              in low-risk strata. The 2024 ESC/ESH update did not concede — it invented a new band,
              “Elevated BP,” and shifted the lever toward single-pill combinations instead of
              redrawing the line.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-5">
            <div className="rounded-lg bg-card p-6 shadow-paper hairline-strong">
              <div className="mono-eyebrow mb-2">Anchor evidence</div>
              <div className="font-display text-2xl">SPRINT (2015) is the seam.</div>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                Every guideline above reads SPRINT differently — confirming the U.S. shift,
                qualifying it in Europe, contextualizing it under ABPM in the U.K.
              </p>
            </div>
          </div>
        </section>
      </div>
    </Workstation>
  );
}

function Row({ d }: { d: { id: string; label: string } }) {
  return (
    <>
      <div className="bg-paper p-4">
        <div className="font-display text-xl leading-tight">{d.label}</div>
      </div>
      {guidelines.map((g) => {
        const val = matrix[g.id]?.[d.id] ?? "—";
        const tone = d.id === "threshold" ? conflictTones[val] : undefined;
        return (
          <div key={g.id + d.id} className="relative bg-card p-4">
            {tone && (
              <span className="absolute left-0 top-4 h-6 w-0.5" style={{ background: tone }} />
            )}
            <div className="text-sm leading-snug">{val}</div>
          </div>
        );
      })}
    </>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-ink-3">
      <span className="h-3 w-0.5" style={{ background: swatch }} />
      <span className="font-mono uppercase tracking-[0.14em]">{label}</span>
    </div>
  );
}
