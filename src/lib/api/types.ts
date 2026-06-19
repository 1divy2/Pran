// ─────────────────────────────────────────────────────────────────────────────
// Shared types for the live medical API layer.
// These replace the hardcoded TopicDetail from topics-data.ts.
// Designed so an LLM enrichment layer can be added later without breaking
// the existing contract — just fill in the optional fields it provides.
// ─────────────────────────────────────────────────────────────────────────────

/** A clinical trial from ClinicalTrials.gov APIv2 */
export interface Trial {
  nctId: string;
  title: string;
  /** "RECRUITING" | "COMPLETED" | "ACTIVE_NOT_RECRUITING" | etc. */
  status: string;
  /** "PHASE1" | "PHASE2" | "PHASE3" | "PHASE4" | "NA" */
  phase: string;
  enrollment: number | null;
  sponsor: string;
  startDate: string | null;
  completionDate: string | null;
  conditions: string[];
  interventions: string[];
  /** Direct link to clinicaltrials.gov listing */
  url: string;
}

/** A research paper from PubMed */
export interface Paper {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  year: number | null;
  abstract: string;
  /** Direct link to PubMed record */
  url: string;
}

/** A drug from OpenFDA */
export interface Drug {
  brand: string;
  generic: string;
  /** Truncated indication text from the drug label */
  indication: string;
  manufacturer: string;
}

/** The unified shape returned by topic-service.ts for any medical query */
export interface LiveTopicData {
  /** The raw search query used (e.g. "hypertension", "long-covid") */
  query: string;

  trials: {
    /** Total registered trials for this condition */
    total: number;
    /** Top results sorted by enrollment */
    items: Trial[];
  };

  papers: {
    /** Total papers in PubMed for this condition */
    total: number;
    /** Most recent papers */
    items: Paper[];
  };

  drugs: Drug[];

  /** Adverse event report count from FAERS */
  adverseEventCount: number;

  /** Unix ms timestamp of when this was fetched */
  fetchedAt: number;
}

/** Possible states of an async API fetch */
export type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };
