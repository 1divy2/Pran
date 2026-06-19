# VISUAL_LANGUAGE.md

## Aesthetic

PRAN's visual language is inspired by **academic publishing** and **archival documents**. The interface should feel like a well-organized research library, not a software dashboard.

## Core Principles

1. **Scholarly warmth** — The palette evokes aged paper and ink, not sterile white surfaces
2. **Typographic hierarchy** — Serif for display, mono for metadata, sans for body
3. **Information density** — Show data, don't decorate around it
4. **Restraint** — Use minimal color, let whitespace and type do the work
5. **Provenance** — Every element should feel grounded, sourced, citable

## Visual Elements

### Typography

- **Instrument Serif** — Display headings, topic titles, section headers
- **Inter** — Body text, descriptions, UI labels
- **JetBrains Mono** — Metadata, timestamps, IDs, technical labels

### Borders & Rules

- Thin rules (1px) separate sections
- Strong rules (1px, higher opacity) for emphasis
- Hairline inset borders on cards and interactive elements

### Cards & Surfaces

- Cards use `--card` background with subtle shadow
- Hover states lift with `--shadow-paper`
- Active/focused elements use `--shadow-lift`

### Data Visualization

- Evidence tiers use distinct oklch colors (ember, ink, slate, warm grey, moss)
- Trial status uses traffic-light dot indicators
- Conflict indicators use `--conflict` (warm red)
- Consensus indicators use `--consensus` (muted green)

### Spacing & Layout

- Generous padding (6-8 per section)
- Grid-based stat cards (4-column on desktop)
- Full-width data tables for trials and papers

## Forbidden Elements

- Stethoscopes, caduceus, heartbeat lines
- Generic blue healthcare gradients
- Floating action buttons
- Card grids with icons and short labels
- Chat interfaces
- "AI-powered" badges or sparkle effects
- Dashboard widgets with charts that serve no analytical purpose
