// ─────────────────────────────────────────────────────────────────────────────
// Abstract Parser v2 — comprehensive NLP extraction from medical abstracts.
// Extracts: sample size, effect size, p-value, conclusion, methodology,
// interventions, outcomes, populations, and study quality indicators.
// ─────────────────────────────────────────────────────────────────────────────

import type { EvidenceTier } from "./evidence";

export interface ParsedAbstract {
  /** Extracted sample size (total or per-arm) */
  sampleSize: number | null;
  /** Effect size summary (e.g. "OR 2.3, 95% CI 1.1–4.5") */
  effectSize: string | null;
  /** P-value if reported */
  pValue: string | null;
  /** Key conclusion sentence */
  conclusion: string | null;
  /** Detected study methodology */
  methodology: MethodologyResult | null;
  /** Extracted interventions/treatments studied */
  interventions: string[];
  /** Extracted outcome measures */
  outcomes: string[];
  /** Population description */
  population: string | null;
  /** Study duration if mentioned */
  duration: string | null;
  /** Number of treatment arms */
  arms: number | null;
  /** Funding source if mentioned */
  funding: string | null;
}

export interface MethodologyResult {
  tier: EvidenceTier;
  confidence: number;
  indicators: string[];
}

/**
 * Parse a medical abstract to extract comprehensive structured data.
 * Uses regex heuristics tuned for biomedical writing conventions.
 */
export function parseAbstract(abstract: string): ParsedAbstract {
  if (!abstract || abstract.trim().length === 0) {
    return emptyResult();
  }

  return {
    sampleSize: extractSampleSize(abstract),
    effectSize: extractEffectSize(abstract),
    pValue: extractPValue(abstract),
    conclusion: extractConclusion(abstract),
    methodology: detectMethodology(abstract),
    interventions: extractInterventions(abstract),
    outcomes: extractOutcomes(abstract),
    population: extractPopulation(abstract),
    duration: extractDuration(abstract),
    arms: extractArms(abstract),
    funding: extractFunding(abstract),
  };
}

function emptyResult(): ParsedAbstract {
  return {
    sampleSize: null,
    effectSize: null,
    pValue: null,
    conclusion: null,
    methodology: null,
    interventions: [],
    outcomes: [],
    population: null,
    duration: null,
    arms: null,
    funding: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample size extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractSampleSize(text: string): number | null {
  const lower = text.toLowerCase();

  const nEquals = text.match(/\b[nN]\s*=\s*([\d,]+)/);
  if (nEquals) {
    const parsed = parseInt(nEquals[1].replace(/,/g, ""), 10);
    if (parsed > 0 && parsed < 10_000_000) return parsed;
  }

  const enrolled = lower.match(
    /enroll(?:ed|ing)?\s+([\d,]+)\s+(?:participants?|patients?|subjects?|individuals?|adults?|children|subjects?)/,
  );
  if (enrolled) {
    const parsed = parseInt(enrolled[1].replace(/,/g, ""), 10);
    if (parsed > 0 && parsed < 10_000_000) return parsed;
  }

  const patientsWere = lower.match(
    /([\d,]+)\s+(?:participants?|patients?|subjects?|individuals?|adults?)\s+(?:were|who|with|in|from|enrolled|aged)/,
  );
  if (patientsWere) {
    const parsed = parseInt(patientsWere[1].replace(/,/g, ""), 10);
    if (parsed > 0 && parsed < 10_000_000) return parsed;
  }

  // Pattern 3b: "among 850 adults aged..."
  const among = lower.match(
    /among\s+([\d,]+)\s+(?:participants?|patients?|subjects?|individuals?|adults?)/,
  );
  if (among) {
    const parsed = parseInt(among[1].replace(/,/g, ""), 10);
    if (parsed > 0 && parsed < 10_000_000) return parsed;
  }

  const totalOf = lower.match(/(?:a\s+)?total\s+of\s+([\d,]+)/);
  if (totalOf) {
    const parsed = parseInt(totalOf[1].replace(/,/g, ""), 10);
    if (parsed > 0 && parsed < 10_000_000) return parsed;
  }

  const sampleOf = lower.match(
    /sample\s+(?:size\s+(?:of\s+)?)?([\d,]+)\s+(?:participants?|patients?|subjects?)/,
  );
  if (sampleOf) {
    const parsed = parseInt(sampleOf[1].replace(/,/g, ""), 10);
    if (parsed > 0 && parsed < 10_000_000) return parsed;
  }

  const randomized = lower.match(
    /([\d,]+)\s+(?:participants?|patients?|subjects?)\s+were\s+randomized/,
  );
  if (randomized) {
    const parsed = parseInt(randomized[1].replace(/,/g, ""), 10);
    if (parsed > 0 && parsed < 10_000_000) return parsed;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Effect size extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractEffectSize(text: string): string | null {
  const orMatch = text.match(
    /\b(OR|odds\s+ratio)\s*[:=]?\s*([\d.]+)\s*,?\s*(?:9[55]%?\s*(?:CI|confidence\s+interval)\s*[:=]?\s*)?([\d.]+)\s*[–\-—to]+\s*([\d.]+)/i,
  );
  if (orMatch) {
    return `OR ${orMatch[2]}, 95% CI ${orMatch[3]}–${orMatch[4]}`;
  }

  const hrMatch = text.match(
    /\b(HR|hazard\s+ratio)\s*[:=]?\s*([\d.]+)\s*,?\s*\(?\s*(?:9[55]%?\s*CI\s*[:=]?\s*)?([\d.]+)\s*[–\-—to]+\s*([\d.]+)/i,
  );
  if (hrMatch) {
    return `HR ${hrMatch[2]}, 95% CI ${hrMatch[3]}–${hrMatch[4]}`;
  }

  const rrMatch = text.match(
    /\b(RR|risk\s+ratio|relative\s+risk)\s+(?:was\s+)?[:=]?\s*([\d.]+)\s*\(?\s*([\d.]+)\s*[–\-—to]+\s*([\d.]+)/i,
  );
  if (rrMatch) {
    return `RR ${rrMatch[2]}, 95% CI ${rrMatch[3]}–${rrMatch[4]}`;
  }

  const mdMatch = text.match(
    /\b(MD|mean\s+difference|SMD|weighted\s+mean\s+difference)\s*[:=]?\s*([-+]?[\d.]+)\s*,?\s*(?:9[55]%?\s*CI\s*[:=]?\s*)?([-+]?[\d.]+)\s*[–\-—to]+\s*([-+]?[\d.]+)/i,
  );
  if (mdMatch) {
    return `${mdMatch[1]} ${mdMatch[2]}, 95% CI ${mdMatch[3]} to ${mdMatch[4]}`;
  }

  const reductionMatch = text.match(
    /(?:reduced|increased|decreased)\s+by\s+(\d+)%\s*\(?\s*(OR|RR|HR)\s*[:=]?\s*([\d.]+)\s*[),]/i,
  );
  if (reductionMatch) {
    return `${reductionMatch[2]} ${reductionMatch[3]} (${reductionMatch[1]}% ${reductionMatch[0].split(" ")[0]})`;
  }

  const ciOnly = text.match(
    /9[55]%?\s*(?:CI|confidence\s+interval)\s*[:=]?\s*([\d.]+)\s*[–\-—to]+\s*([\d.]+)/i,
  );
  if (ciOnly) {
    const upper = ciOnly[2].replace(/\.+$/, "");
    return `95% CI ${ciOnly[1]}–${upper}`;
  }

  const pOnly = text.match(/\bp\s*[<>=]\s*([\d.]+)/i);
  if (pOnly) {
    return `p ${text.match(/\bp\s*([<>=])\s*/i)?.[1] ?? "<"} ${pOnly[1]}`;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// P-value extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractPValue(text: string): string | null {
  const match = text.match(/\b[pP](?:[\s-]*value)?\s*(?:([<>=]+)\s*)?([\d.]+)/);
  if (match) {
    const op = match[1] ?? "=";
    return `p ${op} ${match[2]}`;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conclusion extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractConclusion(text: string): string | null {
  const labelMatch = text.match(
    /(?:CONCLUSIONS?|CONCLUSION|INTERPRETATION)\s*[:.]\s*(.+?)(?:\s*$|\.\s*\n|\.\s{2,})/is,
  );
  if (labelMatch) {
    const raw = labelMatch[1].trim().replace(/\.\s*$/, "");
    return raw.length > 300 ? raw.slice(0, 297) + "..." : raw;
  }

  const sentences = text
    .replace(/\s+/g, " ")
    .split(/\.\s+/)
    .filter((s) => s.trim().length > 20);

  if (sentences.length >= 2) {
    const candidate = sentences[sentences.length - 1] || sentences[sentences.length - 2];
    return candidate.length > 300 ? candidate.slice(0, 297) + "..." : candidate;
  }

  if (sentences.length === 1) {
    return sentences[0].length > 300 ? sentences[0].slice(0, 297) + "..." : sentences[0];
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Methodology detection — infers study design from abstract text
// ─────────────────────────────────────────────────────────────────────────────

interface MethodPattern {
  pattern: RegExp;
  tier: EvidenceTier;
  weight: number;
  name: string;
}

const METHOD_PATTERNS: MethodPattern[] = [
  // Meta-analysis
  { pattern: /\bmeta[\s-]?analysis\b/i, tier: "meta-analysis", weight: 10, name: "meta-analysis" },
  {
    pattern: /\bsystematic\s+review\b/i,
    tier: "meta-analysis",
    weight: 9,
    name: "systematic review",
  },
  {
    pattern: /\bpooled\s+(analysis|estimate)\b/i,
    tier: "meta-analysis",
    weight: 7,
    name: "pooled analysis",
  },
  { pattern: /\bforest\s+plot\b/i, tier: "meta-analysis", weight: 8, name: "forest plot" },
  { pattern: /\bprisma\b/i, tier: "meta-analysis", weight: 8, name: "PRISMA" },

  // RCT
  {
    pattern: /\brandomized\s+(controlled|placebo[\s-]?controlled)\s+trial\b/i,
    tier: "rct",
    weight: 10,
    name: "RCT",
  },
  {
    pattern: /\brandomly\s+(assigned|allocated)\b/i,
    tier: "rct",
    weight: 8,
    name: "random allocation",
  },
  { pattern: /\bdouble[\s-]?blind\b/i, tier: "rct", weight: 7, name: "double-blind" },
  { pattern: /\bplacebo[\s-]?controlled\b/i, tier: "rct", weight: 6, name: "placebo-controlled" },
  { pattern: /\bconsort\b/i, tier: "rct", weight: 7, name: "CONSORT" },
  { pattern: /\bphase\s+[1-4]\b/i, tier: "rct", weight: 7, name: "phase trial" },
  { pattern: /\bcrossover\b/i, tier: "rct", weight: 7, name: "crossover" },

  // Guideline
  { pattern: /\bclinical\s+practice\s+guideline\b/i, tier: "guideline", weight: 10, name: "CPG" },
  {
    pattern: /\bconsensus\s+(statement|recommendation)\b/i,
    tier: "guideline",
    weight: 7,
    name: "consensus",
  },
  { pattern: /\bgrading\s+of\s+recommendations\b/i, tier: "guideline", weight: 7, name: "GRADE" },

  // Cohort
  { pattern: /\bcohort\s+(study|analysis)\b/i, tier: "cohort", weight: 8, name: "cohort study" },
  { pattern: /\bprospective\s+(study|cohort)\b/i, tier: "cohort", weight: 8, name: "prospective" },
  {
    pattern: /\bretrospective\s+(study|analysis)\b/i,
    tier: "cohort",
    weight: 7,
    name: "retrospective",
  },
  { pattern: /\bcross[\s-]?sectional\b/i, tier: "cohort", weight: 7, name: "cross-sectional" },
  {
    pattern: /\bobservational\s+(study|design)\b/i,
    tier: "cohort",
    weight: 6,
    name: "observational",
  },
  {
    pattern: /\bsurvival\s+(analysis|curve)\b/i,
    tier: "cohort",
    weight: 5,
    name: "survival analysis",
  },
  {
    pattern: /\bincidence\s+(and|&)\s+mortality\b/i,
    tier: "cohort",
    weight: 5,
    name: "incidence/mortality",
  },

  // Case report
  { pattern: /\bcase\s+report\b/i, tier: "case-report", weight: 8, name: "case report" },
  { pattern: /\bcase\s+series\b/i, tier: "case-report", weight: 7, name: "case series" },
  { pattern: /\ba\s+case\s+of\b/i, tier: "case-report", weight: 6, name: "a case of" },
  {
    pattern: /\bhere\s+we\s+(report|describe)\s+a\s+(case|patient)\b/i,
    tier: "case-report",
    weight: 6,
    name: "here we report",
  },

  // Expert opinion
  { pattern: /\beditorial\b/i, tier: "expert-opinion", weight: 6, name: "editorial" },
  { pattern: /\bcommentary\b/i, tier: "expert-opinion", weight: 5, name: "commentary" },
];

function detectMethodology(text: string): MethodologyResult | null {
  const scores: Record<EvidenceTier, number> = {
    "meta-analysis": 0,
    rct: 0,
    cohort: 0,
    guideline: 0,
    "case-report": 0,
    "expert-opinion": 0,
  };
  const indicators: string[] = [];

  for (const rule of METHOD_PATTERNS) {
    if (rule.pattern.test(text)) {
      scores[rule.tier] += rule.weight;
      indicators.push(rule.name);
    }
  }

  let bestTier: EvidenceTier = "cohort";
  let bestScore = 0;
  let totalScore = 0;

  for (const [tier, score] of Object.entries(scores) as [EvidenceTier, number][]) {
    totalScore += score;
    if (score > bestScore) {
      bestScore = score;
      bestTier = tier;
    }
  }

  if (indicators.length === 0) return null;

  const confidence =
    totalScore > 0
      ? Math.min(100, Math.round((bestScore / totalScore) * 100 * Math.min(1, bestScore / 8)))
      : 40;

  return { tier: bestTier, confidence, indicators };
}

// ─────────────────────────────────────────────────────────────────────────────
// Intervention extraction — identifies treatments/drugs being studied
// ─────────────────────────────────────────────────────────────────────────────

function extractInterventions(text: string): string[] {
  const interventions: string[] = [];
  const lower = text.toLowerCase();

  // Pattern 1: "treated with X", "received X", "administered X"
  const treatedWith = text.match(
    /(?:treated|received|administered|given|prescribed|underwent)\s+(?:with\s+)?([A-Za-z][\w\s-]{2,40})/g,
  );
  if (treatedWith) {
    for (const match of treatedWith) {
      const cleaned = match
        .replace(
          /^(?:treated|received|administered|given|prescribed|underwent)\s+(?:with\s+)?/i,
          "",
        )
        .trim()
        .replace(/[.,;]$/, "");
      if (cleaned.length > 2 && cleaned.length < 50) interventions.push(cleaned);
    }
  }

  // Pattern 2: "X vs Y", "X compared to Y", "X compared with Y"
  // Capture only the last 1-3 words before the connector
  const vsMatch = text.match(
    /(\b[\w][\w -]{0,28}[\w]\b)\s+(?:vs\.?|versus|compared\s+(?:to|with))\s+(\b[\w][\w -]{0,28}[\w]\b)/g,
  );
  if (vsMatch) {
    for (const match of vsMatch) {
      const parts = match.split(/(?:vs\.?|versus|compared\s+(?:to|with))/i);
      for (const part of parts) {
        const cleaned = part
          .trim()
          .replace(/[.,;]$/, "")
          .replace(/\s+(?:was|is|are|were|be|been)\s*$/, "");
        if (cleaned.length > 2 && cleaned.length < 50) interventions.push(cleaned);
      }
    }
  }

  // Pattern 3: Drug names near "drug", "medication", "therapy"
  const drugContext = text.match(
    /(?:drug|medication|therapy|treatment|agent)\s+(?:of\s+interest\s+(?:was|is|are)|of|with|was|is)\s+(?:the\s+)?([A-Za-z][\w-]{2,30})/g,
  );
  if (drugContext) {
    for (const match of drugContext) {
      const cleaned = match
        .replace(/^(?:drug|medication|therapy|treatment|agent)\s+(?:of|with|was)\s+/i, "")
        .trim()
        .replace(/[.,;]$/, "");
      if (cleaned.length > 2 && cleaned.length < 50) interventions.push(cleaned);
    }
  }

  // Deduplicate and clean — remove substrings of longer entries
  const seen = new Set<string>();
  const unique = interventions.filter((i) => {
    const key = i.toLowerCase();
    if (seen.has(key)) return false;
    for (const existing of seen) {
      if (existing.includes(key) || key.includes(existing)) {
        if (key.length > existing.length) {
          seen.delete(existing);
          seen.add(key);
          return true;
        }
        return false;
      }
    }
    seen.add(key);
    return true;
  });
  return unique;
}

// ─────────────────────────────────────────────────────────────────────────────
// Outcome extraction — identifies what is being measured
// ─────────────────────────────────────────────────────────────────────────────

function extractOutcomes(text: string): string[] {
  const outcomes: string[] = [];

  // Pattern 1: "primary endpoint: X", "primary outcome: X"
  const primary = text.match(
    /(?:primary|secondary|main)\s+(?:endpoint|outcome|objective|measure)\s*(?:of|was|were|:)?\s*([^.]{5,80})/gi,
  );
  if (primary) {
    for (const match of primary) {
      const cleaned = match
        .replace(
          /^(?:primary|secondary|main)\s+(?:endpoint|outcome|objective|measure)\s*(?:of|was|were|:)?\s*/i,
          "",
        )
        .trim()
        .replace(/[.,;]$/, "");
      if (cleaned.length > 3 && cleaned.length < 100) outcomes.push(cleaned);
    }
  }

  // Pattern 2: "measured X", "assessed X", "evaluated X"
  const measured = text.match(
    /(?:measured|assessed|evaluated|examined|determined)\s+([^.]{5,60})/gi,
  );
  if (measured) {
    for (const match of measured) {
      const cleaned = match
        .replace(/^(?:measured|assessed|evaluated|examined|determined)\s+/i, "")
        .trim()
        .replace(/[.,;]$/, "");
      if (cleaned.length > 3 && cleaned.length < 80) outcomes.push(cleaned);
    }
  }

  // Pattern 3: Common outcome phrases
  const outcomePatterns = [
    /(?:all[\s-]?cause|mortality|morbidity|survival|progression[\s-]?free|event[\s-]?free|disease[\s-]?free)\s+(?:survival|rate|outcome)/gi,
    /(?:blood\s+pressure|cholesterol|HbA1c|BMI|weight\s+loss|quality\s+of\s+life|pain\s+score)/gi,
    /(?:adverse\s+(?:events?|effects?|reactions?)|side\s+effects?|tolerability|safety)/gi,
  ];

  for (const pattern of outcomePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        outcomes.push(match.trim());
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return outcomes.filter((o) => {
    const key = o.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Population extraction — who is being studied
// ─────────────────────────────────────────────────────────────────────────────

function extractPopulation(text: string): string | null {
  // Pattern: "in patients with X", "among adults with X", "in children diagnosed with X"
  const populationMatch = text.match(
    /\b(?:in|among|of)\s+(?:children|adults?|elderly|patients?|subjects?|participants?|women|men|individuals?)\s+(?:with|who|diagnosed|having|suffering)\s+([^.]{5,60})/i,
  );
  if (populationMatch) {
    const prefix =
      text.match(
        /\b(?:in|among|of)\s+(?:children|adults?|elderly|patients?|subjects?|participants?|women|men|individuals?)/i,
      )?.[0] ?? "";
    return `${prefix} with ${populationMatch[1]}`.trim();
  }

  // Pattern: "patients with X" at the start
  const startPop = text.match(
    /^(?:In|Among|Of)\s+(?:children|adults?|elderly|patients?|subjects?|participants?)\s+(?:with|who|having)\s+([^.]{5,60})/i,
  );
  if (startPop) {
    return startPop[0].trim().replace(/\.\s*$/, "");
  }

  // Pattern: demographic descriptors
  const demoMatch = text.match(
    /\b(aged?\s+\d+[\s–-]+\d+|mean\s+age\s+\d+|≥\s*\d+\s+years?|\d+\s+years?\s+(?:or|and)\s+(?:older|younger))/i,
  );
  if (demoMatch) {
    return demoMatch[0].trim();
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Duration extraction — how long the study ran
// ─────────────────────────────────────────────────────────────────────────────

function extractDuration(text: string): string | null {
  // "over 12 months", "during a 6-month period", "median follow-up of 24 months"
  const durationMatch = text.match(
    /(?:over|during|for|median\s+follow[\s-]?up\s+(?:of|was)?)\s+(?:a\s+)?(\d+[\s-]?(?:month|week|day|year|hour)s?)/i,
  );
  if (durationMatch) {
    return durationMatch[1].trim();
  }

  // "12-month follow-up", "6-week trial"
  const dashDuration = text.match(
    /\b(\d+[\s-]?(?:month|week|day|year|hour)s?)\s+(?:follow[\s-]?up|period|trial|study)/i,
  );
  if (dashDuration) {
    return dashDuration[1].trim();
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Arms extraction — number of treatment groups
// ─────────────────────────────────────────────────────────────────────────────

function extractArms(text: string): number | null {
  // "two-arm study", "3-arm trial", "four groups"
  const armMatch = text.match(
    /\b(\d+|two|three|four|five|six)\s*[-\s]?\s*(?:arm|group|arm|arm)s?\b/i,
  );
  if (armMatch) {
    const wordToNum: Record<string, number> = {
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
    };
    const val = armMatch[1].toLowerCase();
    return wordToNum[val] ?? (parseInt(val, 10) || null);
  }

  // Count "versus" / "vs" / "compared to" occurrences + 1
  const versusCount = (text.match(/\b(?:vs\.?|versus|compared\s+(?:to|with))\b/gi) ?? []).length;
  if (versusCount > 0) return versusCount + 1;

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Funding extraction — who paid for the study
// ─────────────────────────────────────────────────────────────────────────────

function extractFunding(text: string): string | null {
  // "Funding: This study was supported by X", "Funded by X"
  const fundingMatch = text.match(
    /(?:fund(?:ed|ing)|supported\s+by|sponsor(?:ed|ship)?(?:\s+of)?)\s*(?:by|from|:)?\s*([^.]{5,80})/i,
  );
  if (fundingMatch) {
    const cleaned = fundingMatch[1]
      .trim()
      .replace(/\.\s*$/, "")
      .replace(/(?:\.?\s*The\s+authors?|\.?\s*No\s+conflict)/i, "");
    return cleaned.length > 5 && cleaned.length < 100 ? cleaned : null;
  }

  return null;
}
