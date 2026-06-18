import { createFileRoute } from "@tanstack/react-router";
import { Workstation } from "@/components/pran/Workstation";
import { timeline } from "@/lib/evidence";

export const Route = createFileRoute("/timeline")({
  head: () => ({ meta: [{ title: "Pran — Clinical timeline" }] }),
  component: TimelinePage,
});

const kindColor: Record<string, string> = {
  trial: "var(--color-tier-rct)",
  guideline: "var(--color-tier-guide)",
  shift: "var(--color-tier-meta)",
};

const kindLabel: Record<string, string> = {
  trial: "Trial",
  guideline: "Guideline",
  shift: "Shift",
};

export function TimelinePage() {
  const minYear = Math.min(...timeline.map((p) => p.year));
  const maxYear = Math.max(...timeline.map((p) => p.year));
  const span = maxYear - minYear;

  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Hypertension" }, { label: "Timeline" }]}
      scene="Two decades of recommendation"
    >
      <div className="mx-auto max-w-[1440px] px-10 pt-28 pb-32">
        <header className="mb-14 max-w-3xl">
          <div className="mono-eyebrow mb-3">
            {minYear}–{maxYear} · 21 years · 11 inflection points
          </div>
          <h1 className="font-display text-7xl text-balance">
            How the field <em>changed its mind</em> about a number.
          </h1>
        </header>

        {/* Horizontal river timeline */}
        <div className="relative overflow-x-auto pb-12">
          <div className="relative h-[560px] min-w-[1400px]">
            {/* Year ruler */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-ink/20" />
            {Array.from({ length: span + 1 }).map((_, i) => {
              const y = minYear + i;
              const left = (i / span) * 100;
              const major = y % 5 === 0;
              return (
                <div
                  key={y}
                  className="absolute top-1/2 -translate-x-1/2"
                  style={{ left: `${left}%` }}
                >
                  <div
                    className={major ? "h-3 w-px bg-ink" : "h-1.5 w-px bg-ink/40"}
                    style={{ marginTop: major ? -6 : -3 }}
                  />
                  {major && (
                    <div className="mt-3 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                      {y}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Points — alternate above/below */}
            {timeline.map((p, i) => {
              const left = ((p.year - minYear) / span) * 100;
              const above = i % 2 === 0;
              return (
                <div
                  key={p.year + p.title}
                  className="absolute"
                  style={{
                    left: `${left}%`,
                    top: above ? "8%" : "62%",
                    transform: "translateX(-50%)",
                  }}
                >
                  {/* connector */}
                  <div
                    className="absolute left-1/2 w-px"
                    style={{
                      background: kindColor[p.kind],
                      top: above ? "100%" : -150,
                      height: 150,
                    }}
                  />
                  <div
                    className="absolute left-1/2 -translate-x-1/2 size-2 rounded-full"
                    style={{
                      background: kindColor[p.kind],
                      top: above ? "calc(100% + 150px - 4px)" : "-154px",
                    }}
                  />
                  <div className="w-[200px] rounded-md bg-card p-3 shadow-paper hairline-strong">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3">
                        {kindLabel[p.kind]}
                      </span>
                      <span className="font-mono text-[10px] text-ink-3">{p.year}</span>
                    </div>
                    <div className="mt-2 font-display text-lg leading-tight text-balance">
                      {p.title}
                    </div>
                    <div className="mt-1 text-[11px] leading-snug text-ink-3">{p.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Narrative epilogue */}
        <section className="mt-12 grid grid-cols-12 gap-10 border-t border-rule pt-12">
          <div className="col-span-12 lg:col-span-6">
            <h2 className="font-display text-4xl">
              From <em>numbers</em> to <em>bands</em>.
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-ink-2">
              The arc bends from a single cutoff (140/90) to layered risk-stratifying bands. The
              shift is not just clinical — it is epistemological. Evidence moved from defining
              disease by a number to defining intervention by a trajectory.
            </p>
          </div>
        </section>
      </div>
    </Workstation>
  );
}
