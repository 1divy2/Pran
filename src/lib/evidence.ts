// Mock evidence intelligence layer for PRAN.
// All data is seeded for the frontend phase. Future backends can replace
// these functions without touching component code.

export type EvidenceTier = "meta" | "rct" | "cohort" | "case" | "guideline";

export type Organization =
  | "WHO"
  | "NICE"
  | "CDC"
  | "AHA"
  | "ESC"
  | "ACC"
  | "Cochrane"
  | "NEJM"
  | "Lancet"
  | "BMJ"
  | "JAMA";

export interface EvidencePiece {
  id: string;
  title: string;
  authors: string;
  source: Organization | string;
  year: number;
  tier: EvidenceTier;
  n?: number;
  effect?: string; // e.g. "HR 0.75 (0.64–0.89)"
  pValue?: string;
  confidence: number; // 0–100
  topicId: string;
  abstract: string;
  influences: string[]; // guideline ids
  // spatial canvas position (0–1 normalized)
  x: number;
  y: number;
}

export interface Guideline {
  id: string;
  org: Organization;
  title: string;
  year: number;
  recommendation: string;
  threshold?: string;
  strength: "Strong" | "Moderate" | "Conditional";
  evidenceGrade: "A" | "B" | "C";
  topicId: string;
  conflictsWith?: string[]; // guideline ids
}

export interface TimelinePoint {
  year: number;
  kind: "trial" | "guideline" | "shift";
  title: string;
  detail: string;
  refId?: string;
}

export interface Topic {
  id: string;
  name: string;
  subtitle: string;
  prevalence: string;
  evidenceCount: number;
  activeConflicts: number;
  lastSignal: string;
}

export interface CourtroomCase {
  id: string;
  question: string;
  topicId: string;
  treatmentA: string;
  treatmentB: string;
  defense: { lead: string; argument: string; cites: string[] }[];
  prosecution: { lead: string; argument: string; cites: string[] }[];
  verdict: { lean: "A" | "B" | "split"; confidence: number; reasoning: string };
}

export interface GraphNode {
  id: string;
  label: string;
  kind: "disease" | "treatment" | "trial" | "guideline" | "org";
  x: number;
  y: number;
}
export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

export const topics: Topic[] = [
  {
    id: "hypertension",
    name: "Hypertension",
    subtitle: "Primary, essential — adults",
    prevalence: "1.28 billion adults worldwide",
    evidenceCount: 2481,
    activeConflicts: 3,
    lastSignal: "ESC/ESH 2024 update — relaxed Stage-1 threshold",
  },
  {
    id: "t2dm",
    name: "Type 2 Diabetes",
    subtitle: "Glycemic control & cardiometabolic",
    prevalence: "537 million adults",
    evidenceCount: 1842,
    activeConflicts: 2,
    lastSignal: "GLP-1 cardiovascular benefit consolidates",
  },
  {
    id: "afib",
    name: "Atrial Fibrillation",
    subtitle: "Rhythm vs. rate, anticoagulation",
    prevalence: "33.5 million adults",
    evidenceCount: 1124,
    activeConflicts: 4,
    lastSignal: "EAST-AFNET 4 — early rhythm control",
  },
  {
    id: "depression",
    name: "Major Depression",
    subtitle: "First-line pharmacotherapy",
    prevalence: "280 million adults",
    evidenceCount: 1976,
    activeConflicts: 5,
    lastSignal: "Cipriani 2018 network meta — escitalopram lead",
  },
];

export const evidence: EvidencePiece[] = [
  {
    id: "sprint-2015",
    title: "A Randomized Trial of Intensive versus Standard Blood-Pressure Control",
    authors: "SPRINT Research Group · Wright JT et al.",
    source: "NEJM",
    year: 2015,
    tier: "rct",
    n: 9361,
    effect: "HR 0.75 (0.64–0.89)",
    pValue: "P < 0.001",
    confidence: 92,
    topicId: "hypertension",
    abstract:
      "Among adults at high cardiovascular risk without diabetes, targeting systolic <120 mmHg resulted in lower rates of fatal and nonfatal major cardiovascular events versus <140 mmHg. Trial was stopped early for efficacy.",
    influences: ["acc-aha-2017", "nice-ng136"],
    x: 0.22,
    y: 0.32,
  },
  {
    id: "cochrane-2020",
    title: "First-line drugs for hypertension: a network meta-analysis",
    authors: "Wright JM, Musini VM, Gill R · Cochrane Hypertension Group",
    source: "Cochrane",
    year: 2020,
    tier: "meta",
    n: 58403,
    effect: "Thiazides vs ACEi — RR 0.92 (CV events)",
    confidence: 88,
    topicId: "hypertension",
    abstract:
      "Low-dose thiazides remain the best-supported first-line agent for uncomplicated primary hypertension across mortality and cardiovascular endpoints, with ACE inhibitors a defensible alternative.",
    influences: ["nice-ng136", "who-2021"],
    x: 0.56,
    y: 0.18,
  },
  {
    id: "stepup-2024",
    title: "Single-pill triple therapy in early-stage hypertension (STEP-UP)",
    authors: "Liu H et al.",
    source: "Lancet",
    year: 2024,
    tier: "rct",
    n: 4128,
    effect: "ΔSBP −6.2 mmHg vs dual",
    pValue: "P = 0.004",
    confidence: 71,
    topicId: "hypertension",
    abstract:
      "A fixed low-dose triple combination outperformed sequential dual therapy on blood-pressure control at 12 months, with comparable adverse-event rates.",
    influences: ["esc-esh-2024"],
    x: 0.78,
    y: 0.42,
  },
  {
    id: "accord-bp-2010",
    title: "Effects of intensive blood-pressure control in type 2 diabetes (ACCORD-BP)",
    authors: "ACCORD Study Group",
    source: "NEJM",
    year: 2010,
    tier: "rct",
    n: 4733,
    effect: "HR 0.88 (0.73–1.06)",
    confidence: 58,
    topicId: "hypertension",
    abstract:
      "In adults with type 2 diabetes, targeting systolic <120 mmHg did not significantly reduce a composite of fatal and nonfatal major cardiovascular events compared with <140 mmHg.",
    influences: ["acc-aha-2017"],
    x: 0.34,
    y: 0.7,
  },
  {
    id: "ontarget-2008",
    title: "Telmisartan, ramipril, or both in patients at high cardiovascular risk (ONTARGET)",
    authors: "Yusuf S et al.",
    source: "NEJM",
    year: 2008,
    tier: "rct",
    n: 25620,
    confidence: 80,
    topicId: "hypertension",
    abstract:
      "Telmisartan was equivalent to ramipril in patients with vascular disease or high-risk diabetes; the combination increased adverse events without additional benefit.",
    influences: ["esc-esh-2018"],
    x: 0.66,
    y: 0.74,
  },
  {
    id: "patel-2023-cohort",
    title: "Real-world adherence and outcomes on single-pill antihypertensives",
    authors: "Patel R et al.",
    source: "JAMA",
    year: 2023,
    tier: "cohort",
    n: 312488,
    confidence: 64,
    topicId: "hypertension",
    abstract:
      "Single-pill combinations correlated with 28% higher 12-month adherence and a 14% reduction in composite cardiovascular events versus multi-pill regimens.",
    influences: ["esc-esh-2024"],
    x: 0.12,
    y: 0.58,
  },
];

export const guidelines: Guideline[] = [
  {
    id: "acc-aha-2017",
    org: "AHA",
    title:
      "ACC/AHA Guideline for Prevention, Detection, Evaluation, and Management of High Blood Pressure",
    year: 2017,
    recommendation:
      "Diagnose Stage 1 hypertension at ≥130/80 mmHg; initiate pharmacotherapy in high-risk adults.",
    threshold: "≥130/80 mmHg",
    strength: "Strong",
    evidenceGrade: "A",
    topicId: "hypertension",
    conflictsWith: ["esc-esh-2018"],
  },
  {
    id: "esc-esh-2018",
    org: "ESC",
    title: "2018 ESC/ESH Guidelines for the management of arterial hypertension",
    year: 2018,
    recommendation:
      "Diagnose hypertension at ≥140/90 mmHg in office; initiate therapy by cardiovascular risk strata.",
    threshold: "≥140/90 mmHg",
    strength: "Strong",
    evidenceGrade: "A",
    topicId: "hypertension",
    conflictsWith: ["acc-aha-2017"],
  },
  {
    id: "nice-ng136",
    org: "NICE",
    title: "NG136 Hypertension in adults: diagnosis and management",
    year: 2019,
    recommendation: "Confirm with ABPM ≥135/85; treat Stage 1 below 80y with QRISK ≥10%.",
    threshold: "≥140/90 office · ≥135/85 ABPM",
    strength: "Strong",
    evidenceGrade: "A",
    topicId: "hypertension",
  },
  {
    id: "who-2021",
    org: "WHO",
    title: "WHO Guideline for the pharmacological treatment of hypertension in adults",
    year: 2021,
    recommendation:
      "Initiate pharmacotherapy at ≥140/90; thiazides, ACEi/ARB, or long-acting CCBs as first-line.",
    threshold: "≥140/90 mmHg",
    strength: "Strong",
    evidenceGrade: "A",
    topicId: "hypertension",
  },
  {
    id: "cdc-2022",
    org: "CDC",
    title: "CDC Hypertension Control Change Package",
    year: 2022,
    recommendation:
      "Operationalize self-measured BP monitoring with clinical support as standard of care.",
    strength: "Moderate",
    evidenceGrade: "B",
    topicId: "hypertension",
  },
  {
    id: "esc-esh-2024",
    org: "ESC",
    title: "2024 ESC/ESH update — Elevated BP & first-line single-pill combinations",
    year: 2024,
    recommendation:
      "Introduce 'Elevated BP' (120–139 / 70–89) as risk-stratifying band; favor single-pill combinations.",
    threshold: "Elevated 120–139 / 70–89 mmHg",
    strength: "Conditional",
    evidenceGrade: "B",
    topicId: "hypertension",
  },
];

export const timeline: TimelinePoint[] = [
  {
    year: 2003,
    kind: "guideline",
    title: "JNC 7",
    detail: "Defines pre-hypertension; emphasizes thiazide first-line.",
    refId: "jnc7",
  },
  {
    year: 2008,
    kind: "trial",
    title: "ONTARGET",
    detail: "ARB vs ACEi equivalence; combination harm signal.",
    refId: "ontarget-2008",
  },
  {
    year: 2010,
    kind: "trial",
    title: "ACCORD-BP",
    detail: "No CV benefit of intensive control in T2DM.",
    refId: "accord-bp-2010",
  },
  {
    year: 2015,
    kind: "trial",
    title: "SPRINT",
    detail: "Intensive <120 reduces CV events; trial halted early.",
    refId: "sprint-2015",
  },
  {
    year: 2017,
    kind: "shift",
    title: "ACC/AHA lowers threshold to 130/80",
    detail: "U.S. hypertension prevalence rises from 32% → 46%.",
    refId: "acc-aha-2017",
  },
  {
    year: 2018,
    kind: "guideline",
    title: "ESC/ESH retains 140/90",
    detail: "Europe diverges from U.S. — major transatlantic conflict.",
    refId: "esc-esh-2018",
  },
  {
    year: 2019,
    kind: "guideline",
    title: "NICE NG136",
    detail: "Anchors ABPM in diagnosis; QRISK gate for treatment.",
    refId: "nice-ng136",
  },
  {
    year: 2020,
    kind: "trial",
    title: "Cochrane network meta",
    detail: "Reaffirms low-dose thiazide as best first-line.",
    refId: "cochrane-2020",
  },
  {
    year: 2021,
    kind: "guideline",
    title: "WHO global guideline",
    detail: "Aligns global threshold at 140/90 — equity-led.",
    refId: "who-2021",
  },
  {
    year: 2023,
    kind: "trial",
    title: "Real-world SPC cohort",
    detail: "Single-pill combinations lift adherence +28%.",
    refId: "patel-2023-cohort",
  },
  {
    year: 2024,
    kind: "shift",
    title: "ESC/ESH 'Elevated BP'",
    detail: "New risk-stratifying band; SPC-first prescribing.",
    refId: "esc-esh-2024",
  },
];

export const courtroom: CourtroomCase = {
  id: "case-thiazide-vs-acei",
  question:
    "First-line monotherapy for uncomplicated primary hypertension: low-dose thiazide vs. ACE inhibitor.",
  topicId: "hypertension",
  treatmentA: "Low-dose thiazide diuretic",
  treatmentB: "ACE inhibitor",
  defense: [
    {
      lead: "Cochrane 2020 network meta",
      argument:
        "Across 58,403 patients, low-dose thiazides reduced total mortality and cardiovascular events more than any comparator. The signal is consistent across age strata and decades of evidence.",
      cites: ["cochrane-2020"],
    },
    {
      lead: "ALLHAT primary endpoint",
      argument:
        "Chlorthalidone matched or exceeded ACE inhibitors on combined CHD outcomes while costing a fraction — a fact disproportionately under-weighted by industry-sponsored reviews.",
      cites: [],
    },
  ],
  prosecution: [
    {
      lead: "ONTARGET & metabolic profile",
      argument:
        "ACE inhibitors carry a cleaner metabolic profile — no new-onset diabetes signal, favorable renal outcomes in proteinuric disease, and tolerability advantages in younger adults.",
      cites: ["ontarget-2008"],
    },
    {
      lead: "Patel 2023 real-world",
      argument:
        "Real-world adherence to ACEi-based single-pill combinations exceeds thiazide monotherapy by 28%. Adherence beats theoretical efficacy.",
      cites: ["patel-2023-cohort"],
    },
  ],
  verdict: {
    lean: "split",
    confidence: 58,
    reasoning:
      "Low-dose thiazide retains the strongest population-level evidence; ACE inhibitor wins on tolerability and combination-therapy patterns. The defensible answer is patient-specific, not categorical.",
  },
};

export const graph: { nodes: GraphNode[]; edges: GraphEdge[] } = {
  nodes: [
    { id: "htn", label: "Hypertension", kind: "disease", x: 0.5, y: 0.5 },
    { id: "thiazide", label: "Thiazide", kind: "treatment", x: 0.22, y: 0.35 },
    { id: "acei", label: "ACE inhibitor", kind: "treatment", x: 0.78, y: 0.35 },
    { id: "ccb", label: "CCB", kind: "treatment", x: 0.5, y: 0.22 },
    { id: "arb", label: "ARB", kind: "treatment", x: 0.82, y: 0.6 },
    { id: "sprint", label: "SPRINT 2015", kind: "trial", x: 0.32, y: 0.78 },
    { id: "cochrane", label: "Cochrane 2020", kind: "trial", x: 0.18, y: 0.6 },
    { id: "accord", label: "ACCORD-BP", kind: "trial", x: 0.6, y: 0.82 },
    { id: "aha", label: "AHA / ACC", kind: "org", x: 0.42, y: 0.12 },
    { id: "esc", label: "ESC / ESH", kind: "org", x: 0.7, y: 0.14 },
    { id: "who", label: "WHO", kind: "org", x: 0.12, y: 0.18 },
    { id: "nice", label: "NICE", kind: "org", x: 0.86, y: 0.18 },
  ],
  edges: [
    { from: "htn", to: "thiazide", weight: 3 },
    { from: "htn", to: "acei", weight: 3 },
    { from: "htn", to: "ccb", weight: 2 },
    { from: "htn", to: "arb", weight: 2 },
    { from: "sprint", to: "htn", weight: 3 },
    { from: "cochrane", to: "thiazide", weight: 3 },
    { from: "accord", to: "htn", weight: 2 },
    { from: "aha", to: "sprint", weight: 2 },
    { from: "esc", to: "acei", weight: 2 },
    { from: "who", to: "thiazide", weight: 2 },
    { from: "nice", to: "thiazide", weight: 2 },
    { from: "aha", to: "esc", weight: 1 },
  ],
};

export const tierMeta: Record<EvidenceTier, { label: string; rank: number; token: string }> = {
  meta: { label: "Meta-analysis", rank: 1, token: "tier-meta" },
  rct: { label: "Randomized trial", rank: 2, token: "tier-rct" },
  cohort: { label: "Cohort study", rank: 3, token: "tier-cohort" },
  case: { label: "Case report", rank: 5, token: "tier-case" },
  guideline: { label: "Guideline", rank: 0, token: "tier-guide" },
};

// Mock API surface — future backends replace these without UI churn.
export const api = {
  listTopics: async () => topics,
  getTopic: async (id: string) => topics.find((t) => t.id === id),
  listEvidence: async (topicId: string) => evidence.filter((e) => e.topicId === topicId),
  listGuidelines: async (topicId: string) => guidelines.filter((g) => g.topicId === topicId),
  getTimeline: async (topicId: string) => (topicId === "hypertension" ? timeline : []),
  getCourtroom: async () => courtroom,
  getGraph: async () => graph,
};
