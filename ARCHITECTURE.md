# ARCHITECTURE.md

## High‑Level Overview
Pran is a **single‑page web application** built with **React** and **TanStack Router**. It uses Vite as the build tool and Bun for dependency management.

```
+-------------------+      +-------------------+      +-------------------+
|  Browser (SPA)   | ---> |   Vite dev server | ---> |  Bun runtime      |
+-------------------+      +-------------------+      +-------------------+
           ^                         ^                         ^
           |                         |                         |
         UI      <-- React components <-- TanStack Router <-- Routes
```

### Primary Modules
- **src/components/** – Re‑usable UI components (cards, tables, charts). Each component follows a presentational‑container pattern and is styled with vanilla CSS.
- **src/hooks/** – Custom React hooks for data fetching, state management, and UI interactions.
- **src/lib/** – Core business logic (evidence processing, API wrappers). Pure TypeScript, no UI concerns.
- **src/routes/** – Page definitions for TanStack Router. Each route composes components and hooks to render a view.
- **src/styles.css** – Global stylesheet (CSS variables, dark mode, glass‑morphism utilities).

### Data Flow
1. **Router** parses the URL and loads the matching route component.
2. **Route component** invokes hooks to fetch data (future API integration).
3. **Hooks** call utility functions from `src/lib/` to process the data.
4. Processed data is passed to presentational components for rendering.

### Build Pipeline
- `bun install` → installs dependencies.
- `bun run build` → Vite bundles the app for production.
- CI runs lint, type‑check, and build verification on every push.

## Notable Architectural Decisions
- **Framework‑agnostic**: No Lovable or proprietary scaffolding; pure React/TanStack.
- **Type‑safe**: All public APIs are typed; lint and TypeScript enforce contracts.
- **Modular**: Clear separation of UI, hooks, and business logic for easier replacement of data sources.

Future work will introduce a **domain‑driven data layer** (e.g., GraphQL/REST services) while preserving this clean separation.

