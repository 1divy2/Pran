import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import Navbar from "@/components/ui/navbar";
import { type ReactNode, useEffect, useState, useRef } from "react";

const SPOTLIGHTS = [
  { id: "hypertension", name: "Hypertension" },
  { id: "long-covid", name: "Long COVID" },
  { id: "alzheimers", name: "Alzheimer's" },
];

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
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  // Reset search when palette closes, restore focus to trigger
  useEffect(() => {
    if (!openPalette) {
      setSearchQuery("");
      triggerRef.current?.focus();
    }
  }, [openPalette]);

  const handleSelectTopic = (topicId: string) => {
    setOpenPalette(false);
    navigate({ to: "/topic/$topicId", params: { topicId } });
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-paper text-ink">
      {/* Floating top bar — Arc-style: no logo dominance, breadcrumb-led */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between px-5 pt-5">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-card/80 px-3 py-1.5 hairline-strong">
          <Link to="/" className="font-display text-lg leading-none">
            Pran
          </Link>
          <span className="h-3 w-px bg-rule-strong" />
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-3"
          >
            {trail?.map((t, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <span aria-hidden="true" className="text-ink-3/60">
                    /
                  </span>
                )}
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
            <span className="rounded-full bg-card/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3 hairline-strong">
              {scene}
            </span>
          )}
          <button
            ref={triggerRef}
            onClick={() => setOpenPalette(true)}
            aria-expanded={openPalette}
            aria-controls="command-palette"
            aria-label="Open command palette"
            className="flex items-center gap-2 rounded-full bg-card/80 px-3 py-1.5 hairline-strong"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              Search topics
            </span>
            <span
              aria-hidden="true"
              className="rounded-sm bg-paper-2 px-1.5 py-0.5 font-mono text-[9px] text-ink-3 hairline"
            >
              ⌘K
            </span>
          </button>
        </div>
      </header>

      {/* Main canvas — content owns the viewport */}
      <main id="main-content" className="relative min-h-screen">
        {children}
      </main>

      {/* Replaced floating dock with top navigation bar */}
      <Navbar />

      {/* Command palette — functional topic search */}
      {openPalette && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 px-4 pt-[12vh]"
          onClick={() => setOpenPalette(false)}
        >
          <div
            id="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Search topics"
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-card shadow-lift hairline-strong"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4">
              <span aria-hidden="true" className="font-display text-xl text-ink-3">
                ⌕
              </span>
              <input
                ref={paletteInputRef}
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    handleSelectTopic(searchQuery.toLowerCase().replace(/\s+/g, "-"));
                  }
                }}
                placeholder="Search any disease, condition, or topic…"
                aria-label="Search medical topics"
                className="w-full bg-transparent font-display text-2xl text-ink placeholder:text-ink-3 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="shrink-0 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 hover:bg-paper-2"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="border-t border-rule px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              {searchQuery.trim() ? "Live Search" : "Suggested topics"}
            </div>
            <div className="max-h-[360px] overflow-y-auto px-2 pb-3">
              {searchQuery.trim() ? (
                <div className="px-3 py-8 text-center">
                  <div className="font-display text-2xl text-ink-3">Search medical APIs</div>
                  <div className="mt-2 text-sm text-ink-3">
                    Analyze &ldquo;{searchQuery}&rdquo; across PubMed, ClinicalTrials.gov, and
                    OpenFDA
                  </div>
                  <button
                    onClick={() =>
                      handleSelectTopic(searchQuery.toLowerCase().replace(/\s+/g, "-"))
                    }
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm text-paper transition-colors hover:bg-ink-2"
                  >
                    Analyze topic{" "}
                    <span aria-hidden="true" className="font-display text-lg leading-none">
                      →
                    </span>
                  </button>
                </div>
              ) : (
                <>
                  {SPOTLIGHTS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTopic(t.id)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-paper-2"
                    >
                      <div className="flex-1">
                        <div className="font-display text-lg leading-tight">{t.name}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span aria-hidden="true" className="font-display text-lg text-ink-3">
                          →
                        </span>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
            <div className="border-t border-rule px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
              <span aria-hidden="true">↵</span> select · esc close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
