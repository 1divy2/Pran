# ROADMAP.md

## Phase 0 — Documentation & Cleanup ✅
- [x] Remove all Lovable artifacts
- [x] Create AUDIT.md, ARCHITECTURE.md, TECHNICAL_DEBT.md
- [x] Establish CI workflow
- [x] Document product identity and design system

## Phase 1 — Evidence Engine ✅
- [x] Live API integration (PubMed, ClinicalTrials.gov, OpenFDA)
- [x] Caching layer (in-memory + sessionStorage)
- [x] Topic service orchestration
- [x] Evidence tier classification (`lib/evidence.ts`)
- [x] Confidence scoring with tier + recency + sample size
- [x] Abstract parsing — sample size, effect size, p-value, conclusion extraction

## Phase 2 — Ingestion Architecture ✅
- [x] Data source abstraction layer (adapter pattern)
- [x] Normalization layer for cross-source uniformity
- [x] Deduplication engine (ID-based + title + fuzzy matching)
- [x] Rate limiting (token bucket) and retry logic (exponential backoff)
- [x] PubMed, ClinicalTrials.gov, OpenFDA adapters

## Phase 3 — Guideline Engine ✅
- [x] Guideline extraction from PubMed keyword filtering
- [x] Guideline comparison across institutions
- [x] Guideline conflict detection
- [x] Guideline evolution tracking timeline

## Phase 4 — Conflict Engine ✅
- [x] Recommendation conflict detection (high-tier vs low-tier divergence)
- [x] Research disagreement identification
- [x] Conflicting conclusions as first-class objects
- [x] Conflict resolution scoring with confidence bars

## Phase 5 — Knowledge Graph ✅
- [x] Entity extraction (diseases, treatments, drugs, organizations, trials, papers)
- [x] Relationship mapping between entities
- [x] Force-directed graph visualization (120-iteration simulation)
- [x] Inspector panel with connected entity navigation

## Phase 6 — Medical Courtroom ✅
- [x] Adversarial debate structure (Defense vs Prosecution)
- [x] Evidence citation in arguments
- [x] Judge verdict with confidence-based scoring
- [x] Treatment comparison framework

## Phase 7 — Search ✅
- [x] Full-text search across all entity types
- [x] Faceted search (by tier, source)
- [x] Search suggestions and autocomplete (30 curated topics)
- [x] Recent searches (localStorage persistence)

## Phase 8 — Production Readiness ✅
- [x] Performance budgets and code splitting (22KB gzipped initial load)
- [x] Route-level lazy loading (13 route chunks)
- [x] Unit and integration tests (68 tests, Vitest)
- [x] Accessibility audit (skip-to-content, ARIA, focus-visible, reduced motion)
- [x] Error monitoring and observability (structured logging, API error capture)

---

## Future Roadmap

### Phase 9 — Data Enrichment
- [x] Batch ingestion pipeline (concurrency control, progress tracking, error resilience)
- [ ] WHO, NICE, CDC, AHA guideline repository adapters
- [ ] LLM-powered evidence tier classification (replacing keyword heuristics)
- [ ] Full abstract NLP (sample size extraction from tables, methodology classification)

### Phase 10 — Collaboration
- [ ] Evidence collections — save, organize, and export evidence sets
- [ ] Shareable topic reports (export to PDF/Markdown)
- [ ] Annotation and notes on evidence pieces
- [ ] Team workspaces with shared collections

### Phase 11 — Intelligence
- [ ] LLM-powered Medical Courtroom debates (GPT-4 / Claude integration)
- [ ] Automated evidence gap detection
- [ ] Treatment recommendation engine with confidence intervals
- [ ] Cross-topic similarity scoring

### Phase 12 — Scale
- [ ] Server-side rendering for SEO
- [ ] Background ingestion workers
- [ ] Database persistence (PostgreSQL + pgvector)
- [ ] API rate limit dashboard
