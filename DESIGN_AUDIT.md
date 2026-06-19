# DESIGN_AUDIT.md

## Last Updated: Phase 0 — Documentation

### Component Audit

| Component    | File                                   | Status | Notes                                         |
| ------------ | -------------------------------------- | ------ | --------------------------------------------- |
| Workstation  | `components/pran/Workstation.tsx`      | ✅     | Clean floating top bar, command palette       |
| EvidenceCard | `components/pran/EvidenceCard.tsx`     | ✅     | Uses evidence engine types properly           |
| Navbar       | `components/ui/navbar.tsx`             | ✅     | Uses PRAN design tokens                       |
| Landing Page | `routes/index.tsx`                     | ✅     | Editorial hero, curated spotlights            |
| Topic Detail | `routes/topic.$topicId.index.tsx`      | ✅     | Live data, stat cards, tables                 |
| Canvas       | `routes/topic.$topicId.canvas.tsx`     | ✅     | Spatial board with inspector                  |
| Timeline     | `routes/topic.$topicId.timeline.tsx`   | ✅     | Chronological feed                            |
| Courtroom    | `routes/topic.$topicId.courtroom.tsx`  | ⚠️     | Placeholder — needs LLM integration           |
| Guidelines   | `routes/topic.$topicId.guidelines.tsx` | ⚠️     | Basic filtering — needs proper ingestion      |
| Conflicts    | `routes/topic.$topicId.conflicts.tsx`  | ⚠️     | Shows halted trials — needs conflict engine   |
| Pyramid      | `routes/topic.$topicId.pyramid.tsx`    | ⚠️     | Basic classification — needs LLM tier sorting |
| Graph        | `routes/topic.$topicId.graph.tsx`      | ⚠️     | Placeholder — needs force-directed graph      |

### Design Token Audit

| Area                 | Status | Notes                                       |
| -------------------- | ------ | ------------------------------------------- |
| Color tokens (oklch) | ✅     | Properly defined in `:root` and `.dark`     |
| Typography           | ✅     | Instrument Serif + Inter + JetBrains Mono   |
| Shadows              | ✅     | paper, lift, dock hierarchy                 |
| Utility classes      | ✅     | chip, mono-eyebrow, serif-display, hairline |
| Dark mode            | ✅     | Full oklch-based dark theme                 |

### Anti-AI-Slop Check

| Criteria                      | Status |
| ----------------------------- | ------ |
| No generic dashboards         | ✅     |
| No generic sidebars           | ✅     |
| No ChatGPT/Copilot interfaces | ✅     |
| No medical cliché imagery     | ✅     |
| No generic card grids         | ✅     |
| No "AI-powered" badges        | ✅     |

### Issues Found

1. ~~`design-system.css` had conflicting HSL tokens~~ — Fixed
2. ~~`Navbar` used hardcoded `bg-white/70 text-black`~~ — Fixed
3. ~~`EvidenceCard` referenced non-existent `@/lib/evidence`~~ — Fixed
4. AGENTS.md was empty — Populated
