// ─────────────────────────────────────────────────────────────────────────────
// Abstract Parser — extracts structured data from medical paper abstracts.
// Pulls sample sizes, effect sizes, confidence intervals, and key findings
// from free-text abstracts using regex heuristics.
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedAbstract {
  /** Extracted sample size (total or per-arm) */
  sampleSize: number | null;
  /** Effect size summary (e.g. "OR 2.3, 95% CI 1.1–4.5") */
  effectSize: string | null;
  /** P-value if reported */
  pValue: string | null;
  /** Key conclusion sentence */
  conclusion: string | null;
}

/**
 * Parse a medical abstract to extract structured evidence data.
 * Uses regex heuristics tuned for biomedical writing conventions.
 */
export function parseAbstract(abstract: string): ParsedAbstract {
  if (!abstract || abstract.trim().length === 0) {
    return { sampleSize: null, effectSize: null, pValue: null, conclusion: null };
  }

  return {
    sampleSize: extractSampleSize(abstract),
    effectSize: extractEffectSize(abstract),
    pValue: extractPValue(abstract),
    conclusion: extractConclusion(abstract),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample size extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract sample size from abstract text.
 * Handles patterns like:
 *   "n = 234", "N=1,234", "234 patients", "enrolled 1200 participants",
 *   "150 subjects were randomized", "total of 3,456 individuals"
 */
function extractSampleSize(text: string): number | null {
  const lower = text.toLowerCase();

  // Pattern 1: "n = 1234" or "N = 1,234" (most common in structured abstracts)
  const nEquals = text.match(/\b[nN]\s*=\s*([\d,]+)/);
  if (nEquals) {
    const parsed = parseInt(nEquals[1].replace(/,/g, ""), 10);
    if (parsed > 0 && parsed < 10_000_000) return parsed;
  }

  // Pattern 2: "enrolled 1234 participants/patients/subjects"
  const enrolled = lower.match(
    /enroll(?:ed|ing)?\s+([\d,]+)\s+(?:participants?|patients?|subjects?|individuals?|adults?|children|subjects?)/,
  );
  if (enrolled) {
    const parsed = parseInt(enrolled[1].replace(/,/g, ""), 10);
    if (parsed > 0 && parsed < 10_000_000) return parsed;
  }

  // Pattern 3: "1234 patients were/who were/with..."
  const patientsWere = lower.match(
    /([\d,]+)\s+(?:participants?|patients?|subjects?|individuals?)\s+(?:were|who|with|in|from|enrolled)/,
  );
  if (patientsWere) {
    const parsed = parseInt(patientsWere[1].replace(/,/g, ""), 10);
    if (parsed > 0 && parsed < 10_000_000) return parsed;
  }

  // Pattern 4: "a total of 1234"
  const totalOf = lower.match(/(?:a\s+)?total\s+of\s+([\d,]+)/);
  if (totalOf) {
    const parsed = parseInt(totalOf[1].replace(/,/g, ""), 10);
    if (parsed > 0 && parsed < 10_000_000) return parsed;
  }

  // Pattern 5: "sample of 1234"
  const sampleOf = lower.match(
    /sample\s+(?:size\s+(?:of\s+)?)?([\d,]+)\s+(?:participants?|patients?|subjects?)/,
  );
  if (sampleOf) {
    const parsed = parseInt(sampleOf[1].replace(/,/g, ""), 10);
    if (parsed > 0 && parsed < 10_000_000) return parsed;
  }

  // Pattern 6: "150 subjects were randomized"
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

/**
 * Extract effect size and confidence intervals from abstract text.
 * Handles: OR, RR, HR, HR, SMD, MD, AUC, with 95% CI ranges.
 */
function extractEffectSize(text: string): string | null {
  // Pattern 1: "OR 2.34, 95% CI 1.12–4.56" (or with en-dash, hyphen, or "to")
  const orMatch = text.match(
    /\b(OR|odds\s+ratio)\s*[:=]?\s*([\d.]+)\s*,?\s*(?:9[55]%?\s*(?:CI|confidence\s+interval)\s*[:=]?\s*)?([\d.]+)\s*[–\-—to]+\s*([\d.]+)/i,
  );
  if (orMatch) {
    return `OR ${orMatch[2]}, 95% CI ${orMatch[3]}–${orMatch[4]}`;
  }

  // Pattern 2: "HR 0.72 (95% CI 0.55–0.94)"
  const hrMatch = text.match(
    /\b(HR|hazard\s+ratio)\s*[:=]?\s*([\d.]+)\s*\(?\s*(?:9[55]%?\s*CI\s*[:=]?\s*)?([\d.]+)\s*[–\-—to]+\s*([\d.]+)/i,
  );
  if (hrMatch) {
    return `HR ${hrMatch[2]}, 95% CI ${hrMatch[3]}–${hrMatch[4]}`;
  }

  // Pattern 3: "RR 1.23 (1.05-1.44)" or "risk ratio was 1.23 (1.05-1.44)"
  const rrMatch = text.match(
    /\b(RR|risk\s+ratio|relative\s+risk)\s+(?:was\s+)?[:=]?\s*([\d.]+)\s*\(?\s*([\d.]+)\s*[–\-—to]+\s*([\d.]+)/i,
  );
  if (rrMatch) {
    return `RR ${rrMatch[2]}, 95% CI ${rrMatch[3]}–${rrMatch[4]}`;
  }

  // Pattern 4: "MD -5.2, 95% CI -8.1 to -2.3"
  const mdMatch = text.match(
    /\b(MD|mean\s+difference|SMD|weighted\s+mean\s+difference)\s*[:=]?\s*([-+]?[\d.]+)\s*,?\s*(?:9[55]%?\s*CI\s*[:=]?\s*)?([-+]?[\d.]+)\s*[–\-—to]+\s*([-+]?[\d.]+)/i,
  );
  if (mdMatch) {
    return `${mdMatch[1]} ${mdMatch[2]}, 95% CI ${mdMatch[3]} to ${mdMatch[4]}`;
  }

  // Pattern 5: "reduced by 34% (RR 0.66, 95% CI 0.50–0.88)"
  const reductionMatch = text.match(
    /(?:reduced|increased|decreased)\s+by\s+(\d+)%\s*\(?\s*(OR|RR|HR)\s*[:=]?\s*([\d.]+)\s*[),]/i,
  );
  if (reductionMatch) {
    return `${reductionMatch[2]} ${reductionMatch[3]} (${reductionMatch[1]}% ${reductionMatch[0].split(" ")[0]})`;
  }

  // Pattern 6: Standalone "95% CI 1.23–4.56" (strip trailing period)
  const ciOnly = text.match(
    /9[55]%?\s*(?:CI|confidence\s+interval)\s*[:=]?\s*([\d.]+)\s*[–\-—to]+\s*([\d.]+)/i,
  );
  if (ciOnly) {
    const upper = ciOnly[2].replace(/\.+$/, "");
    return `95% CI ${ciOnly[1]}–${upper}`;
  }

  // Pattern 7: "p < 0.001" as a fallback indicator of significance
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
  // "p < 0.001", "p = 0.023", "P-value 0.04", "P value 0.04"
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

/**
 * Extract the conclusion sentence from an abstract.
 * Looks for "CONCLUSION:", "CONCLUSIONS:", or the last sentence.
 */
function extractConclusion(text: string): string | null {
  // Pattern 1: Explicit "CONCLUSION:" or "CONCLUSIONS:"
  const labelMatch = text.match(
    /(?:CONCLUSIONS?|CONCLUSION|INTERPRETATION)\s*[:.]\s*(.+?)(?:\s*$|\.\s*\n|\.\s{2,})/is,
  );
  if (labelMatch) {
    const raw = labelMatch[1].trim().replace(/\.\s*$/, "");
    return raw.length > 300 ? raw.slice(0, 297) + "..." : raw;
  }

  // Pattern 2: Last sentence (often the conclusion in unstructured abstracts)
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/\.\s+/)
    .filter((s) => s.trim().length > 20);

  if (sentences.length >= 2) {
    // Use second-to-last or last sentence (last is often just funding info)
    const candidate = sentences[sentences.length - 1] || sentences[sentences.length - 2];
    return candidate.length > 300 ? candidate.slice(0, 297) + "..." : candidate;
  }

  if (sentences.length === 1) {
    return sentences[0].length > 300 ? sentences[0].slice(0, 297) + "..." : sentences[0];
  }

  return null;
}
