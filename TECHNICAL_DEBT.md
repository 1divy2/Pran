# TECHNICAL_DEBT.md

## Identified Technical Debt

1. **Large Monolithic Components**
   - `src/components/EvidenceTable.tsx` contains >500 lines with mixed UI and data processing logic.
   - Recommendation: Split into smaller presentational components and a hook for data handling.

2. **Styling Inconsistencies**
   - Mix of CSS variables and hard‑coded colors across components.
   - Recommendation: Consolidate colors into a design‑system CSS file and use CSS custom properties.

3. **Unused Imports / Dead Code**
   - Lint currently reports a few unused imports in utility files.
   - Will be cleaned in the next iteration.

4. **Bundle Size / Performance**
   - No explicit code‑splitting; all components are bundled together.
   - Recommendation: Enable Vite dynamic imports for heavy routes (e.g., `EvidenceDetail`).

5. **Testing Coverage**
   - No unit or integration tests present.
   - Recommendation: Introduce Vitest tests for critical business‑logic utilities.

## Risk Assessment

- **High**: Monolithic UI components may hinder future scalability.
- **Medium**: Styling inconsistencies could affect brand consistency.
- **Low**: Current CI ensures type safety; no immediate breaking risk.

## Action Plan

- Refactor large components into smaller units (next sprint).
- Create a design‑system stylesheet (`src/styles/design-system.css`).
- Add Vitest tests for `src/lib/evidence.ts` and routing logic.
- Evaluate bundle size using `vite build --mode production` and set performance budgets.
