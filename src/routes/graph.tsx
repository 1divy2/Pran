import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Workstation } from "@/components/pran/Workstation";
import { graph } from "@/lib/evidence";

export const Route = createFileRoute("/graph")({
  head: () => ({ meta: [{ title: "Pran — Knowledge graph" }] }),
  component: GraphPage,
});

const kindStyle: Record<string, { fill: string; ring: string; label: string }> = {
  disease: { fill: "var(--color-ink)", ring: "var(--color-ink)", label: "Disease" },
  treatment: { fill: "var(--color-tier-meta)", ring: "var(--color-tier-meta)", label: "Treatment" },
  trial: { fill: "var(--color-tier-rct)", ring: "var(--color-tier-rct)", label: "Trial" },
  guideline: {
    fill: "var(--color-tier-guide)",
    ring: "var(--color-tier-guide)",
    label: "Guideline",
  },
  org: { fill: "var(--color-tier-cohort)", ring: "var(--color-tier-cohort)", label: "Body" },
};

export function GraphPage() {
  const [hover, setHover] = useState<string | null>("htn");
  const focus = graph.nodes.find((n) => n.id === hover) ?? graph.nodes[0];
  const neighbors = new Set(
    graph.edges
      .filter((e) => e.from === focus.id || e.to === focus.id)
      .flatMap((e) => [e.from, e.to]),
  );

  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Hypertension" }, { label: "Graph" }]}
      scene="Knowledge network"
    >
      <div className="relative h-screen w-full overflow-hidden">
        {/* Quiet textured backdrop */}
        <div className="absolute inset-0 paper-grid opacity-60" />

        {/* Graph surface */}
        <svg
          viewBox="0 0 1000 700"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* edges */}
          {graph.edges.map((e, i) => {
            const a = graph.nodes.find((n) => n.id === e.from)!;
            const b = graph.nodes.find((n) => n.id === e.to)!;
            const active = neighbors.has(e.from) && neighbors.has(e.to);
            return (
              <line
                key={i}
                x1={a.x * 1000}
                y1={a.y * 700}
                x2={b.x * 1000}
                y2={b.y * 700}
                stroke="currentColor"
                className={active ? "text-accent" : "text-ink/20"}
                strokeWidth={active ? 1.2 : 0.6}
              />
            );
          })}

          {/* nodes */}
          {graph.nodes.map((n) => {
            const s = kindStyle[n.kind];
            const isFocus = focus.id === n.id;
            const r = n.kind === "disease" ? 14 : 8;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x * 1000} ${n.y * 700})`}
                onMouseEnter={() => setHover(n.id)}
                className="cursor-pointer"
              >
                <circle r={r + 8} fill="var(--color-paper)" opacity={isFocus ? 1 : 0.6} />
                <circle r={r} fill={s.fill} />
                {isFocus && (
                  <circle r={r + 4} fill="none" stroke="var(--color-accent)" strokeWidth={1} />
                )}
                <text
                  y={r + 18}
                  textAnchor="middle"
                  className="fill-ink"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: n.kind === "disease" ? 22 : 13,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend — floating, Arc-style */}
        <div className="pointer-events-auto absolute left-6 top-24 z-20 w-[220px] rounded-2xl bg-card/90 p-4 backdrop-blur-xl hairline-strong">
          <div className="mono-eyebrow mb-3">Node legend</div>
          <ul className="space-y-2">
            {Object.entries(kindStyle).map(([k, s]) => (
              <li key={k} className="flex items-center gap-3 text-xs">
                <span className="size-3 rounded-full" style={{ background: s.fill }} />
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Focus card */}
        <div className="pointer-events-auto absolute right-6 top-24 z-20 w-[320px] rounded-2xl bg-card/95 p-5 backdrop-blur-xl shadow-lift hairline-strong">
          <div className="mono-eyebrow">{kindStyle[focus.kind].label}</div>
          <div className="mt-2 font-display text-4xl leading-none">{focus.label}</div>
          <div className="mt-4 border-t border-rule pt-4">
            <div className="mono-eyebrow mb-2">Connected ({neighbors.size - 1})</div>
            <ul className="flex flex-wrap gap-1.5">
              {[...neighbors]
                .filter((id) => id !== focus.id)
                .map((id) => {
                  const n = graph.nodes.find((x) => x.id === id);
                  if (!n) return null;
                  return (
                    <li key={id}>
                      <button onClick={() => setHover(id)} className="chip hover:bg-paper-2">
                        {n.label}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      </div>
    </Workstation>
  );
}
