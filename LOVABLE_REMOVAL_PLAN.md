# LOVABLE_REMOVAL_PLAN.md

## Lovable Artifacts Removed
- **.lovable/** directory – deleted (no Lovable config files remain).
- **bunfig.toml** entry `minimumReleaseAgeExcludes` referencing `@lovable.dev/*` packages – cleaned.
- **src/lib/lovable-error-reporting.ts** – removed (no longer needed).
- **vite.config.ts** – stripped of `@lovable.dev/vite-tanstack-config` plugin; now a minimal Vite config.
- **package.json** – removed `@lovable.dev/vite-tanstack-config` devDependency.
- **AGENTS.md** – Lovable metadata block removed.
- Any remaining import statements referencing Lovable modules were eliminated.

## Rationale
All Lovable‑specific code and configuration have been eliminated to make the project framework‑independent and ready for a custom architecture. Remaining functionality is unchanged; UI continues to work as before.

## Migration Notes
- No runtime impact observed after removals.
- CI workflow added to ensure future builds remain stable.

