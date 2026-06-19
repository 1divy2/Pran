PRAN — ANTIGRAVITY → OPENCODE HANDOFF

IMPORTANT

This repository has already passed through:
Lovable → Antigravity → OpenCode

OpenCode is NOT starting a new project.
OpenCode is continuing an existing product.

Before writing code: Read all documentation.

- AUDIT.md
- ARCHITECTURE.md
- TECHNICAL_DEBT.md
- LOVABLE_REMOVAL_PLAN.md
- DESIGN_AUDIT.md
- DESIGN_SYSTEM.md
- VISUAL_LANGUAGE.md
- PRODUCT_IDENTITY.md
- ROADMAP.md

Assume these documents are the source of truth.

====================================================
PRIMARY OBJECTIVE
Continue execution. Do not restart. Do not redesign from scratch.
Do not generate a new architecture. Do not replace existing systems
unless there is a documented reason. Extend the existing platform.

====================================================
PROJECT IDENTITY
PRAN is: Medical Evidence Intelligence Platform
PRAN is NOT: Medical chatbot, Symptom checker, Healthcare CRM,
PDF chat, RAG wrapper, Medical dashboard, Hospital ERP

====================================================
ANTI-AI-SLOP RULES
Reject: Generic dashboards, sidebars, card grids, widgets,
healthcare software, AI product layouts, SaaS patterns.
Do not introduce: ChatGPT interfaces, Copilot interfaces, Perplexity clones.

====================================================
UI/UX PRO MAX
ui-ux-pro-max remains active.
Every major implementation must pass design review.
Review: Visual hierarchy, Typography, Motion, Interaction quality,
Information density, Consistency with PRAN identity.

====================================================
DATA SOURCES
Primary: PubMed, ClinicalTrials.gov, OpenFDA
Future: WHO, NICE, CDC, AHA, Medical guideline repositories

====================================================
INGESTION ARCHITECTURE
Data Sources → Ingestion Layer → Normalization Layer → Evidence Layer
→ Knowledge Layer → Recommendation Layer → Visualization Layer
Maintain strict separation.

====================================================
EVIDENCE ENGINE
Evidence is the primary object. Everything derives from evidence.
Evidence must contain: Source, Citation, Confidence, Metadata, Relationships.
Nothing should exist without provenance.

====================================================
CODE QUALITY
Prioritize: Type safety, Testability, Maintainability,
Scalability, Separation of concerns.
Avoid: Monolith files, Massive components, Tight coupling, Duplicate logic.

====================================================
GITHUB WORKFLOW
Commit frequently. One major change = one meaningful commit.
Document: Architectural decisions, Breaking changes, Migration steps.
