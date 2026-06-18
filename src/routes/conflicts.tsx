import { createFileRoute } from "@tanstack/react-router";
import { Workstation } from "@/components/pran/Workstation";
import { guidelines } from "@/lib/evidence";

export const Route = createFileRoute("/conflicts")({
  head: () => ({ meta: [{ title: "Pran — Conflicts" }] }),
  component: ConflictsPage,
});

interface Conflict {
  id: string;
  topic: string;
  left: { id: string; label: string; stance: string };
  right: { id: string; label: string; stance: string };
  severity: number; // 0–100
  resolution: string;
}

const conflicts: Conflict[] = [
  {
    id: "threshold-split",
    topic: "Diagnostic threshold",
    left: { id: "acc-aha-2017", label: "ACC / AHA", stance: "≥130 / 80 mmHg" },
    right: { id: "esc-esh-2018", label: "ESC / ESH", stance: "≥140 / 90 mmHg" },
    severity: 86,
    resolution:
      "Unresolved. ESC/ESH 2024 introduced an 'Elevated BP' band but kept 140/90 as the diagnostic line.",
  },
  {
    id: "first-line-monotherapy",
    topic: "First-line monotherapy",
    left: { id: "who-2021", label: "WHO 2021", stance: "Low-dose thiazide preferred" },
    right: {
      id: "esc-esh-2024",
      label: "ESC/ESH 2024",
      stance: "Single-pill combination from outset",
    },
    severity: 54,
    resolution:
      "Partial. Evidence supports SPC for adherence; thiazide retains population-level mortality data.",
  },
  {
    id: "intensive-control-dm",
    topic: "Intensive control in T2DM",
    left: { id: "sprint-2015", label: "SPRINT extrapolation", stance: "<120 systolic benefit" },
    right: { id: "accord-bp-2010", label: "ACCORD-BP", stance: "No CV benefit in diabetes" },
    severity: 68,
    resolution:
      "Active. Sub-group reanalyses ongoing; guidelines diverge on transferability of SPRINT to diabetic cohorts.",
  },
];

export function ConflictsPage() {
  return (
    <Workstation
      trail={[{ label: "Library", href: "/" }, { label: "Hypertension" }, { label: "Conflicts" }]}
      scene="Disagreement map"
    >
      <div className="mx-auto max-w-[1280px] px-10 pt-28 pb-32">
        <header className="mb-14 max-w-3xl">
          <div className="mono-eyebrow mb-3">3 unresolved frictions · hypertension</div>
          <h1 className="font-display text-7xl text-balance">
            Where the evidence <em>pulls in two directions.</em>
          </h1>
        </header>

        <ul className="space-y-10">
          {conflicts.map((c) => (
            <li key={c.id} className="grid grid-cols-12 gap-6 border-t border-rule pt-8">
              <div className="col-span-12 lg:col-span-3">
                <div className="mono-eyebrow">{c.topic}</div>
                <div className="mt-3 font-display text-5xl leading-none">
                  {c.severity}
                  <span className="text-ink-3">/100</span>
                </div>
                <div className="mt-2 text-xs text-ink-3">Friction severity</div>
                <div className="mt-6 h-1 w-full rounded-full bg-rule-strong">
                  <div
                    className="h-1 rounded-full"
                    style={{ width: `${c.severity}%`, background: "var(--color-conflict)" }}
                  />
                </div>
              </div>

              <div className="col-span-12 lg:col-span-9">
                <div className="grid grid-cols-2 overflow-hidden rounded-lg hairline-strong">
                  <div className="bg-paper-2 p-6">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                      {c.left.label}
                    </div>
                    <div className="mt-2 font-display text-3xl text-balance">{c.left.stance}</div>
                  </div>
                  <div className="bg-card p-6">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                      {c.right.label}
                    </div>
                    <div className="mt-2 font-display text-3xl text-balance">{c.right.stance}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink-2">{c.resolution}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[c.left.id, c.right.id]
                    .map((id) => guidelines.find((g) => g.id === id))
                    .filter(Boolean)
                    .map((g) => (
                      <span key={g!.id} className="chip">
                        {g!.org} {g!.year} · grade {g!.evidenceGrade}
                      </span>
                    ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Workstation>
  );
}
