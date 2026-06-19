# DESIGN_SYSTEM.md

## Color System

PRAN uses **oklch** color space for perceptually uniform colors. All tokens are defined in `src/styles.css` using CSS custom properties.

### Core Palette

| Token           | Usage             | Light                     | Dark            |
| --------------- | ----------------- | ------------------------- | --------------- |
| `--paper`       | Background        | Warm archival cream       | Deep cool slate |
| `--paper-2`     | Elevated surfaces | Slightly darker cream     | Lighter slate   |
| `--ink`         | Primary text      | Near-black with cool tilt | Warm off-white  |
| `--ink-2`       | Secondary text    | Medium grey               | Lighter grey    |
| `--ink-3`       | Tertiary/muted    | Muted grey                | Dimmed warm     |
| `--rule`        | Borders/dividers  | 8% ink opacity            | 10% ink opacity |
| `--rule-strong` | Strong borders    | 18% ink opacity           | 22% ink opacity |

### Accent

| Token           | Usage                  | Value                 |
| --------------- | ---------------------- | --------------------- |
| `--accent`      | Primary accent (ember) | `oklch(0.55 0.16 38)` |
| `--destructive` | Error/danger           | `oklch(0.55 0.2 25)`  |

### Evidence Tier Colors

| Token           | Tier             | Hue       |
| --------------- | ---------------- | --------- |
| `--tier-meta`   | Meta-Analysis    | Ember     |
| `--tier-rct`    | Randomized Trial | Ink       |
| `--tier-cohort` | Cohort           | Slate     |
| `--tier-case`   | Case Report      | Warm grey |
| `--tier-guide`  | Guideline        | Moss      |

### Semantic Colors

| Token         | Usage                |
| ------------- | -------------------- |
| `--conflict`  | Conflict indicators  |
| `--consensus` | Consensus indicators |

## Typography

| Font             | Role             | CSS Variable     |
| ---------------- | ---------------- | ---------------- |
| Instrument Serif | Display headings | `--font-display` |
| Inter            | Body text        | `--font-sans`    |
| JetBrains Mono   | Metadata, labels | `--font-mono`    |

## Shadows

| Token            | Usage            |
| ---------------- | ---------------- |
| `--shadow-paper` | Subtle card lift |
| `--shadow-lift`  | Elevated panels  |
| `--shadow-dock`  | Dock/navigation  |

## Utility Classes

| Class              | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `.hairline`        | 1px inset border using `--rule`          |
| `.hairline-strong` | 1px inset border using `--rule-strong`   |
| `.chip`            | Metadata tag (mono, uppercase, bordered) |
| `.mono-eyebrow`    | Small uppercase label                    |
| `.serif-display`   | Large serif heading                      |
| `.paper-grid`      | Dot grid background                      |
| `.paper-lines`     | Ruled line background                    |

## Anti-Patterns (Never Do)

- Never use hardcoded colors in components (use CSS variables)
- Never use `bg-white`, `text-black` (use `bg-card`, `text-ink`)
- Never use HSL colors (use oklch)
- Never use generic healthcare icons or imagery
- Never break the scholarly paper aesthetic
