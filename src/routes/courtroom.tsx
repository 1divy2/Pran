import { createFileRoute } from "@tanstack/react-router";
import { Workstation } from "@/components/pran/Workstation";
import { courtroom, evidence } from "@/lib/evidence";

export const Route = createFileRoute("/courtroom")({
  head: () => ({ meta: [{ title: "Pran — Courtroom" }] }),
  component: CourtroomPage,
});

export function CourtroomPage() {
  const c = courtroom;
  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Hypertension" }, { label: "Courtroom" }]}
      scene="Adversarial reading"
    >
      <div className="mx-auto max-w-[1400px] px-10 pt-28 pb-32">
        {/* Docket header */}
        <header className="grid grid-cols-12 gap-8 border-b border-ink/30 pb-10">
          <div className="col-span-12 lg:col-span-9">
            <div className="mono-eyebrow mb-3">Case · {c.id.toUpperCase()} · in deliberation</div>
            <h1 className="font-display text-6xl leading-[1.02] text-balance">
              On the matter of <em>{c.treatmentA}</em> versus <em>{c.treatmentB}</em>.
            </h1>
            <p className="mt-5 max-w-3xl text-pretty text-lg leading-relaxed text-ink-2">
              {c.question}
            </p>
          </div>
          <div className="col-span-12 lg:col-span-3">
            <div className="rounded-lg bg-paper-2 p-5">
              <div className="mono-eyebrow mb-3">Bench</div>
              <BenchRow label="Defense" subtle="Argues for A" />
              <BenchRow label="Prosecution" subtle="Argues for B" />
              <BenchRow label="Judge" subtle="Weighs the evidence" />
            </div>
          </div>
        </header>

        {/* Adversarial floor — two columns, alternating exchanges */}
        <section className="mt-12 grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-5">
            <ColumnHead side="Defense" treatment={c.treatmentA} tone="ink" />
            <ol className="mt-6 space-y-6">
              {c.defense.map((d, i) => (
                <Argument key={i} number={i + 1} d={d} align="left" />
              ))}
            </ol>
          </div>

          {/* Center seam — judge's lean */}
          <div className="col-span-12 lg:col-span-2">
            <div className="sticky top-28 flex flex-col items-center gap-6">
              <div className="mono-eyebrow">Judge’s lean</div>
              <div className="relative h-64 w-2 rounded-full bg-rule-strong">
                <div
                  className="absolute left-1/2 size-4 -translate-x-1/2 rounded-full bg-accent"
                  style={{ top: `${100 - c.verdict.confidence}%` }}
                />
              </div>
              <div className="text-center">
                <div className="font-display text-5xl leading-none">{c.verdict.confidence}%</div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                  {c.verdict.lean === "split"
                    ? "Split verdict"
                    : c.verdict.lean === "A"
                      ? "Leans defense"
                      : "Leans prosecution"}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <ColumnHead side="Prosecution" treatment={c.treatmentB} tone="accent" />
            <ol className="mt-6 space-y-6">
              {c.prosecution.map((d, i) => (
                <Argument key={i} number={i + 1} d={d} align="right" />
              ))}
            </ol>
          </div>
        </section>

        {/* Verdict scroll */}
        <section className="mt-20 rounded-2xl bg-ink p-10 text-paper">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/60">
                The bench
              </div>
              <div className="mt-3 font-display text-5xl">Verdict</div>
            </div>
            <p className="col-span-12 font-display text-3xl leading-snug text-balance text-paper lg:col-span-9">
              “{c.verdict.reasoning}”
            </p>
          </div>
        </section>
      </div>
    </Workstation>
  );
}

function BenchRow({ label, subtle }: { label: string; subtle: string }) {
  return (
    <div className="flex items-baseline justify-between border-t border-rule py-2 first:border-t-0">
      <span className="font-display text-lg">{label}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{subtle}</span>
    </div>
  );
}

function ColumnHead({
  side,
  treatment,
  tone,
}: {
  side: string;
  treatment: string;
  tone: "ink" | "accent";
}) {
  return (
    <div className="border-b border-rule pb-4">
      <div
        className="mono-eyebrow"
        style={{ color: tone === "accent" ? "var(--color-accent)" : undefined }}
      >
        {side}
      </div>
      <div className="mt-2 font-display text-4xl text-balance">{treatment}</div>
    </div>
  );
}

function Argument({
  number,
  d,
  align,
}: {
  number: number;
  d: { lead: string; argument: string; cites: string[] };
  align: "left" | "right";
}) {
  return (
    <li
      className={`relative rounded-md bg-card p-5 hairline-strong ${align === "right" ? "text-left" : ""}`}
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          Exhibit {String(number).padStart(2, "0")}
        </span>
        <span className="font-display text-sm italic text-ink-3">{d.lead}</span>
      </div>
      <p className="mt-3 font-display text-xl leading-snug text-balance">“{d.argument}”</p>
      {d.cites.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-rule pt-3">
          {d.cites.map((id) => {
            const e = evidence.find((x) => x.id === id);
            if (!e) return null;
            return (
              <span key={id} className="chip">
                {e.source} · {e.year}
              </span>
            );
          })}
        </div>
      )}
    </li>
  );
}
