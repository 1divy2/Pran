import type { EvidencePiece } from "@/lib/evidence";
import { tierMeta } from "@/lib/evidence";

interface Props {
  e: EvidencePiece;
  onOpen?: (id: string) => void;
  compact?: boolean;
}

export function EvidenceCard({ e, onOpen, compact }: Props) {
  const meta = tierMeta[e.tier];
  return (
    <button
      onClick={() => onOpen?.(e.id)}
      className="group block w-full rounded-lg bg-card p-4 text-left transition-all hover:bg-card hover:shadow-paper hairline-strong"
      style={{ borderTopColor: `var(--color-${meta.token})` }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-paper"
          style={{ background: `var(--color-${meta.token})` }}
        >
          {meta.label}
        </span>
        <span className="font-mono text-[10px] text-ink-3">{e.year}</span>
      </div>
      <h4
        className={`mt-3 font-display ${compact ? "text-base" : "text-lg"} leading-[1.05] text-balance`}
      >
        {e.title}
      </h4>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
        {e.source} · {e.authors.split(" · ")[0]}
      </div>
      {!compact && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {e.n && <span className="chip">n = {e.n.toLocaleString()}</span>}
          {e.effect && <span className="chip">{e.effect}</span>}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <div className="h-px flex-1 bg-rule" />
        <span className="font-mono text-[10px] text-ink-3">{e.confidence}% conf.</span>
      </div>
    </button>
  );
}
