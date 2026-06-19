// ─────────────────────────────────────────────────────────────────────────────
// Courtroom Debate Engine — LLM-powered adversarial synthesis.
// Generates structured arguments for Defense and Prosecution based on evidence.
// Falls back to heuristic arguments when no LLM is available.
// ─────────────────────────────────────────────────────────────────────────────

import type { EvidencePiece, EvidenceTier } from "@/lib/evidence";
import { tierMeta } from "@/lib/evidence";
import type { LLMAdapter, LLMMessage } from "@/lib/llm/types";

export interface DebateSide {
  treatment: string;
  arguments: DebateArgument[];
  summary: string;
}

export interface DebateArgument {
  claim: string;
  evidence: EvidencePiece[];
  strength: "strong" | "moderate" | "weak";
  rebuttalTarget?: string;
}

export interface DebateResult {
  defense: DebateSide;
  prosecution: DebateSide;
  verdict: {
    winner: "defense" | "prosecution" | "tie";
    reasoning: string;
    confidenceGap: number;
    keyFactor: string;
  };
  metadata: {
    generatedWith: "llm" | "heuristic";
    model?: string;
    tokensUsed?: number;
  };
}

export async function runDebate(
  treatmentA: { name: string; evidence: EvidencePiece[] },
  treatmentB: { name: string; evidence: EvidencePiece[] },
  topicName: string,
  llm: LLMAdapter | null,
): Promise<DebateResult> {
  if (llm) {
    return runLLMDebate(treatmentA, treatmentB, topicName, llm);
  }
  return runHeuristicDebate(treatmentA, treatmentB, topicName);
}

async function runLLMDebate(
  treatmentA: { name: string; evidence: EvidencePiece[] },
  treatmentB: { name: string; evidence: EvidencePiece[] },
  topicName: string,
  llm: LLMAdapter,
): Promise<DebateResult> {
  const evidenceSummaryA = formatEvidenceForLLM(treatmentA.evidence);
  const evidenceSummaryB = formatEvidenceForLLM(treatmentB.evidence);

  const systemPrompt = `You are a medical evidence analyst staging an adversarial debate.
You must argue FOR one treatment and AGAINST another, citing specific evidence.
Be precise, cite study details, and acknowledge limitations.
Respond in structured JSON format.`;

  const debatePrompt = `TOPIC: ${topicName}

TREATMENT A: ${treatmentA.name}
Evidence (${treatmentA.evidence.length} pieces):
${evidenceSummaryA}

TREATMENT B: ${treatmentB.name}
Evidence (${treatmentB.evidence.length} pieces):
${evidenceSummaryB}

Stage a structured debate. For each side, provide:
1. 3-4 arguments with claims, citing specific evidence pieces
2. A summary of the strongest points
3. A verdict explaining which treatment has stronger evidence

Respond as JSON:
{
  "defense": {
    "treatment": "A or B name",
    "arguments": [{"claim": "...", "evidenceIndices": [0,1], "strength": "strong|moderate|weak"}],
    "summary": "..."
  },
  "prosecution": {
    "treatment": "A or B name",
    "arguments": [{"claim": "...", "evidenceIndices": [0,1], "strength": "strong|moderate|weak"}],
    "summary": "..."
  },
  "verdict": {
    "winner": "defense|prosecution|tie",
    "reasoning": "...",
    "keyFactor": "..."
  }
}`;

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: debatePrompt },
  ];

  const response = await llm.complete({
    messages,
    maxTokens: 4096,
    temperature: 0.7,
  });

  try {
    const parsed = JSON.parse(response.content);
    const confA = avgConfidence(treatmentA.evidence);
    const confB = avgConfidence(treatmentB.evidence);

    const mapArgs = (
      args: Array<{ claim: string; evidenceIndices: number[]; strength: string }>,
      evidence: EvidencePiece[],
    ): DebateArgument[] =>
      args.map((a) => ({
        claim: a.claim,
        evidence: (a.evidenceIndices ?? [])
          .filter((i) => i < evidence.length)
          .map((i) => evidence[i]),
        strength: ["strong", "moderate", "weak"].includes(a.strength)
          ? (a.strength as "strong" | "moderate" | "weak")
          : "moderate",
      }));

    return {
      defense: {
        treatment: parsed.defense.treatment,
        arguments: mapArgs(parsed.defense.arguments, treatmentA.evidence),
        summary: parsed.defense.summary,
      },
      prosecution: {
        treatment: parsed.prosecution.treatment,
        arguments: mapArgs(parsed.prosecution.arguments, treatmentB.evidence),
        summary: parsed.prosecution.summary,
      },
      verdict: {
        winner: parsed.verdict.winner,
        reasoning: parsed.verdict.reasoning,
        confidenceGap: Math.abs(confA - confB),
        keyFactor: parsed.verdict.keyFactor,
      },
      metadata: {
        generatedWith: "llm",
        model: response.model,
        tokensUsed: response.usage.totalTokens,
      },
    };
  } catch {
    // If LLM response is not valid JSON, fall back to heuristic
    return runHeuristicDebate(treatmentA, treatmentB, topicName);
  }
}

function runHeuristicDebate(
  treatmentA: { name: string; evidence: EvidencePiece[] },
  treatmentB: { name: string; evidence: EvidencePiece[] },
  topicName: string,
): DebateResult {
  const confA = avgConfidence(treatmentA.evidence);
  const confB = avgConfidence(treatmentB.evidence);
  const diff = confA - confB;

  const topEvidenceA = [...treatmentA.evidence]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
  const topEvidenceB = [...treatmentB.evidence]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  const tierCountsA = countByTier(treatmentA.evidence);
  const tierCountsB = countByTier(treatmentB.evidence);

  const defenseArgs = buildHeuristicArgs(
    treatmentA.name,
    topEvidenceA,
    tierCountsA,
    confA,
    "defense",
  );
  const prosecutionArgs = buildHeuristicArgs(
    treatmentB.name,
    topEvidenceB,
    tierCountsB,
    confB,
    "prosecution",
  );

  const winner = Math.abs(diff) < 5 ? "tie" : diff > 0 ? "defense" : "prosecution";

  const winnerName =
    winner === "tie" ? "Neither" : winner === "defense" ? treatmentA.name : treatmentB.name;

  return {
    defense: {
      treatment: treatmentA.name,
      arguments: defenseArgs,
      summary: generateSummary(treatmentA.name, topEvidenceA, confA),
    },
    prosecution: {
      treatment: treatmentB.name,
      arguments: prosecutionArgs,
      summary: generateSummary(treatmentB.name, topEvidenceB, confB),
    },
    verdict: {
      winner: winner as "defense" | "prosecution" | "tie",
      reasoning:
        winner === "tie"
          ? `Both ${treatmentA.name} and ${treatmentB.name} show comparable evidence strength. Insufficient differential to declare a clear winner.`
          : `${winnerName} demonstrates stronger empirical backing with ${Math.abs(Math.round(diff))} percentage points higher average confidence.`,
      confidenceGap: Math.abs(Math.round(diff)),
      keyFactor: Math.abs(diff) < 5 ? "Evidence parity" : tierDifference(tierCountsA, tierCountsB),
    },
    metadata: {
      generatedWith: "heuristic",
    },
  };
}

function buildHeuristicArgs(
  name: string,
  topEvidence: EvidencePiece[],
  tierCounts: Record<EvidenceTier, number>,
  avgConf: number,
  side: "defense" | "prosecution",
): DebateArgument[] {
  const args: DebateArgument[] = [];

  const metaCount = tierCounts["meta-analysis"] ?? 0;
  const rctCount = tierCounts.rct ?? 0;

  if (metaCount > 0) {
    args.push({
      claim: `${name} is supported by ${metaCount} meta-analysis${metaCount > 1 ? "es" : ""}, the highest tier of clinical evidence.`,
      evidence: topEvidence.filter((e) => e.tier === "meta-analysis"),
      strength: "strong",
    });
  }

  if (rctCount > 0) {
    args.push({
      claim: `${rctCount} randomized controlled trial${rctCount > 1 ? "s" : ""} provide${rctCount === 1 ? "s" : ""} direct experimental evidence for ${name}.`,
      evidence: topEvidence.filter((e) => e.tier === "rct"),
      strength: "strong",
    });
  }

  if (avgConf >= 70) {
    args.push({
      claim: `Overall evidence quality is high (${Math.round(avgConf)}% average confidence).`,
      evidence: topEvidence.slice(0, 2),
      strength: avgConf >= 80 ? "strong" : "moderate",
    });
  } else if (avgConf >= 50) {
    args.push({
      claim: `Evidence quality is moderate (${Math.round(avgConf)}% average confidence), suggesting reasonable but not definitive support.`,
      evidence: topEvidence.slice(0, 2),
      strength: "moderate",
    });
  } else {
    args.push({
      claim: `Evidence quality is limited (${Math.round(avgConf)}% average confidence), indicating need for further research.`,
      evidence: topEvidence.slice(0, 2),
      strength: "weak",
    });
  }

  const recentEvidence = topEvidence.filter(
    (e) => e.year && e.year >= new Date().getFullYear() - 5,
  );
  if (recentEvidence.length > 0) {
    args.push({
      claim: `${recentEvidence.length} recent publication${recentEvidence.length > 1 ? "s" : ""} (last 5 years) demonstrate ongoing research interest.`,
      evidence: recentEvidence,
      strength: "moderate",
    });
  }

  return args;
}

function generateSummary(name: string, topEvidence: EvidencePiece[], avgConf: number): string {
  const parts: string[] = [];
  parts.push(`${name} has an average evidence confidence of ${Math.round(avgConf)}%.`);

  if (topEvidence.length > 0) {
    const best = topEvidence[0];
    const tierLabel = tierMeta[best.tier]?.label ?? best.tier;
    parts.push(
      `The strongest piece is a ${tierLabel} (${best.year ?? "undated"}) with ${best.confidence}% confidence.`,
    );
  }

  return parts.join(" ");
}

function formatEvidenceForLLM(evidence: EvidencePiece[]): string {
  return evidence
    .slice(0, 15)
    .map((e, i) => {
      const tier = tierMeta[e.tier]?.label ?? e.tier;
      return `[${i}] ${tier} (${e.year ?? "n.d."}) — ${e.title} (confidence: ${e.confidence}%, n=${e.n ?? "unknown"})`;
    })
    .join("\n");
}

function avgConfidence(evidence: EvidencePiece[]): number {
  if (evidence.length === 0) return 0;
  return Math.round(evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length);
}

function countByTier(evidence: EvidencePiece[]): Record<EvidenceTier, number> {
  const counts = {
    "meta-analysis": 0,
    rct: 0,
    cohort: 0,
    "case-report": 0,
    guideline: 0,
    "expert-opinion": 0,
  };
  for (const e of evidence) {
    counts[e.tier] = (counts[e.tier] ?? 0) + 1;
  }
  return counts;
}

function tierDifference(a: Record<EvidenceTier, number>, b: Record<EvidenceTier, number>): string {
  const aHigh = (a["meta-analysis"] ?? 0) + (a.rct ?? 0);
  const bHigh = (b["meta-analysis"] ?? 0) + (b.rct ?? 0);
  if (aHigh > bHigh) return "Higher-tier evidence concentration";
  if (bHigh > aHigh) return "Opponent has higher-tier evidence";
  return "Comparable evidence tier distribution";
}
