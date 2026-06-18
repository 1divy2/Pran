import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Workstation } from "@/components/pran/Workstation";
import { evidence, guidelines, tierMeta, type EvidencePiece } from "@/lib/evidence";

export const Route = createFileRoute("/canvas")({
  head: () => ({
    meta: [{ title: "Pran — Canvas · Hypertension" }],
  }),
  component: CanvasPage,
});

function CanvasPage() {
  const [activeId, setActiveId] = useState<string | null>("sprint-2015");
  const pieces = useMemo(() => evidence.filter((e) => e.topicId === "hypertension"), []);
  const active = pieces.find((p) => p.id === activeId) ?? pieces[0];

  // edges from active → influenced guidelines (positioned across the strip)
  const guidelineRow = guidelines.filter((g) => g.topicId === "hypertension");

  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Hypertension" }, { label: "Canvas" }]}
      scene="Spatial evidence board"
    >
      <div className="relative h-screen w-full overflow-hidden paper-grid">
        {/* Spatial board */}
        <div className="absolute inset-0">
          {/* SVG connector layer */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <marker
                id="arr"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor" className="text-ink-3" />
              </marker>
            </defs>
            {pieces.flatMap((p) =>
              p.influences.map((gid) => {
                const g = guidelineRow.find((x) => x.id === gid);
                if (!g) return null;
                const gi = guidelineRow.indexOf(g);
                const gx = ((gi + 0.5) / guidelineRow.length) * 100;
                const gy = 92;
                const sx = p.x * 100;
                const sy = p.y * 100;
                const isActive = p.id === active.id;
                return (
                  <line
                    key={p.id + gid}
                    x1={`${sx}%`}
                    y1={`${sy}%`}
                    x2={`${gx}%`}
                    y2={`${gy}%`}
                    stroke="currentColor"
                    className={isActive ? "text-accent" : "text-ink-3/30"}
                    strokeWidth={isActive ? 1.2 : 0.6}
                    strokeDasharray={isActive ? "0" : "3 4"}
                  />
                );
              }),
            )}
          </svg>

          {/* Evidence pins */}
          {pieces.map((p) => (
            <CanvasPin
              key={p.id}
              p={p}
              active={p.id === active.id}
              onClick={() => setActiveId(p.id)}
            />
          ))}

          {/* Guideline strip along the bottom */}
          <div className="absolute inset-x-0 bottom-24 px-12">
            <div className="mono-eyebrow mb-3">Guideline landscape · downstream of evidence</div>
            <div className="grid grid-cols-6 gap-3">
              {guidelineRow.map((g) => (
                <div key={g.id} className="rounded-md bg-card/90 p-3 backdrop-blur hairline-strong">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-xl">{g.org}</span>
                    <span className="font-mono text-[10px] text-ink-3">{g.year}</span>
                  </div>
                  <div className="mt-2 text-[11px] leading-snug text-ink-2">
                    {g.threshold ?? g.recommendation.slice(0, 64) + "…"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inspector — Figma-style right rail, floating */}
        <aside className="absolute right-6 top-24 bottom-32 z-30 hidden w-[360px] flex-col overflow-hidden rounded-2xl bg-card/95 backdrop-blur-xl shadow-lift hairline-strong xl:flex">
          <div className="flex items-center justify-between border-b border-rule px-5 py-3">
            <span className="mono-eyebrow">Inspector</span>
            <span
              className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-paper"
              style={{ background: `var(--color-${tierMeta[active.tier].token})` }}
            >
              {tierMeta[active.tier].label}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
              {active.source} · {active.year}
            </div>
            <h3 className="mt-2 font-display text-3xl leading-[1.02] text-balance">
              {active.title}
            </h3>
            <div className="mt-3 font-mono text-[10px] text-ink-3">{active.authors}</div>

            <p className="mt-5 text-sm leading-relaxed text-ink-2">{active.abstract}</p>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-rule pt-4">
              {active.n && <Field k="Sample" v={active.n.toLocaleString()} />}
              <Field k="Confidence" v={`${active.confidence}%`} />
              {active.effect && <Field k="Effect" v={active.effect} wide />}
              {active.pValue && <Field k="Significance" v={active.pValue} />}
            </div>

            <div className="mt-6">
              <div className="mono-eyebrow mb-2">Influences</div>
              <ul className="space-y-1.5">
                {active.influences.map((id) => {
                  const g = guidelines.find((x) => x.id === id);
                  if (!g) return null;
                  return (
                    <li key={id} className="flex items-center justify-between text-xs">
                      <span>
                        {g.org} · {g.year}
                      </span>
                      <span className="font-mono text-[10px] text-ink-3">{g.strength}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <div className="border-t border-rule px-5 py-3">
            <button className="w-full rounded-lg bg-ink py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-paper">
              Pin to a board
            </button>
          </div>
        </aside>

        {/* Floating canvas controls — Figma vibe */}
        <div className="pointer-events-auto absolute left-6 top-24 z-20 rounded-2xl bg-card/90 p-1.5 backdrop-blur-xl hairline-strong">
          <div className="flex flex-col gap-1">
            {["Arrange by tier", "Arrange by year", "Free"].map((m, i) => (
              <button
                key={m}
                className={[
                  "rounded-lg px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.14em]",
                  i === 2 ? "bg-ink text-paper" : "text-ink-3 hover:bg-paper-2",
                ].join(" ")}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Workstation>
  );
}

function CanvasPin({
  p,
  active,
  onClick,
}: {
  p: EvidencePiece;
  active: boolean;
  onClick: () => void;
}) {
  const token = tierMeta[p.tier].token;
  return (
    <button
      onClick={onClick}
      style={{
        left: `${p.x * 100}%`,
        top: `${p.y * 100}%`,
        transform: "translate(-50%, -50%)",
      }}
      className={[
        "absolute z-10 max-w-[260px] rounded-md bg-card p-3 text-left backdrop-blur-sm transition-all",
        active
          ? "shadow-lift ring-2 ring-accent"
          : "shadow-paper hover:-translate-y-0.5 hairline-strong",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: `var(--color-${token})` }} />
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
          {p.source} · {p.year}
        </span>
      </div>
      <div className="mt-1.5 font-display text-base leading-[1.05] text-balance">{p.title}</div>
      {p.effect && <div className="mt-1.5 font-mono text-[10px] text-ink-3">{p.effect}</div>}
    </button>
  );
}

function Field({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <div className="mono-eyebrow">{k}</div>
      <div className="mt-1 text-sm">{v}</div>
    </div>
  );
}
