import { Link, useLocation } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";

const workspaces = [
  { to: "/", label: "Library", glyph: "◍" },
  { to: "/canvas", label: "Canvas", glyph: "▦" },
  { to: "/guidelines", label: "Guidelines", glyph: "❘❘❘❘" },
  { to: "/conflicts", label: "Conflicts", glyph: "⟷" },
  { to: "/timeline", label: "Timeline", glyph: "—" },
  { to: "/pyramid", label: "Pyramid", glyph: "△" },
  { to: "/courtroom", label: "Courtroom", glyph: "§" },
  { to: "/graph", label: "Graph", glyph: "✦" },
] as const;

interface Props {
  children: ReactNode;
  /** Editorial breadcrumb shown in floating top bar */
  trail?: { label: string; href?: string }[];
  /** Subtle scene name shown beside the trail */
  scene?: string;
  /** Hide the bottom dock (rare — used on full-immersion screens) */
  hideDock?: boolean;
}

export function Workstation({ children, trail, scene, hideDock }: Props) {
  const { pathname } = useLocation();
  const [openPalette, setOpenPalette] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenPalette((v) => !v);
      }
      if (e.key === "Escape") setOpenPalette(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-paper text-ink">
      {/* Floating top bar — Arc-style: no logo dominance, breadcrumb-led */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between px-5 pt-5">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-card/80 px-3 py-1.5 backdrop-blur-xl hairline-strong">
          <Link to="/" className="font-display text-lg leading-none">
            Pran
          </Link>
          <span className="h-3 w-px bg-rule-strong" />
          <nav className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-3">
            {trail?.map((t, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-ink-3/60">/</span>}
                {t.href ? (
                  <Link to={t.href as string} className="hover:text-ink">
                    {t.label}
                  </Link>
                ) : (
                  <span className="text-ink">{t.label}</span>
                )}
              </span>
            ))}
          </nav>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {scene && (
            <span className="rounded-full bg-card/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3 backdrop-blur-xl hairline-strong">
              {scene}
            </span>
          )}
          <button
            onClick={() => setOpenPalette(true)}
            className="flex items-center gap-2 rounded-full bg-card/80 px-3 py-1.5 backdrop-blur-xl hairline-strong"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              Search evidence
            </span>
            <span className="rounded-sm bg-paper-2 px-1.5 py-0.5 font-mono text-[9px] text-ink-3 hairline">
              ⌘K
            </span>
          </button>
        </div>
      </header>

      {/* Main canvas — content owns the viewport */}
      <main className="relative min-h-screen">{children}</main>

      {/* Arc-style floating dock — spatial workspace switcher, not a sidebar */}
      {!hideDock && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-1 rounded-2xl bg-ink/[0.92] p-1.5 text-paper backdrop-blur-xl shadow-dock">
            {workspaces.map((w) => {
              const active = w.to === "/" ? pathname === "/" : pathname.startsWith(w.to);
              return (
                <Link
                  key={w.to}
                  to={w.to}
                  className={[
                    "group flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] transition-all",
                    active
                      ? "bg-paper text-ink"
                      : "text-paper/70 hover:bg-paper/10 hover:text-paper",
                  ].join(" ")}
                >
                  <span className="text-[13px] leading-none">{w.glyph}</span>
                  <span>{w.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Command palette — Linear-precise */}
      {openPalette && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpenPalette(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-card shadow-lift hairline-strong"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              placeholder="Search evidence, guidelines, trials, courtroom cases…"
              className="w-full bg-transparent px-5 py-4 font-display text-2xl text-ink placeholder:text-ink-3 focus:outline-none"
            />
            <div className="border-t border-rule px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              Suggested
            </div>
            <div className="px-2 pb-3">
              {[
                { k: "Open SPRINT 2015 in Canvas", l: "Randomized trial" },
                { k: "Compare ACC/AHA vs ESC/ESH thresholds", l: "Guidelines" },
                { k: "Courtroom — Thiazide vs ACE inhibitor", l: "Active case" },
                { k: "Hypertension knowledge graph", l: "Graph" },
              ].map((row) => (
                <button
                  key={row.k}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-paper-2"
                >
                  <span className="text-sm text-ink">{row.k}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                    {row.l}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
