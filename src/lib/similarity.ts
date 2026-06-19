// ─────────────────────────────────────────────────────────────────────────────
// Cross-Topic Similarity — discovers related medical topics using text
// similarity on conditions, interventions, and terminology. Enables
// serendipitous discovery of connected research areas.
// ─────────────────────────────────────────────────────────────────────────────

export interface TopicProfile {
  id: string;
  name: string;
  terms: Map<string, number>;
  conditions: string[];
  interventions: string[];
}

export interface SimilarTopic {
  topicId: string;
  topicName: string;
  score: number;
  sharedTerms: string[];
  sharedConditions: string[];
  sharedInterventions: string[];
}

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "was",
  "are",
  "were",
  "been",
  "be",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "need",
  "dare",
  "ought",
  "used",
  "this",
  "that",
  "these",
  "those",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "he",
  "him",
  "his",
  "she",
  "her",
  "it",
  "its",
  "they",
  "them",
  "their",
  "what",
  "which",
  "who",
  "whom",
  "where",
  "when",
  "why",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "because",
  "if",
  "then",
  "about",
  "up",
  "out",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "under",
  "again",
  "further",
  "once",
  "study",
  "studies",
  "trial",
  "trials",
  "patients",
  "patient",
  "group",
  "groups",
  "results",
  "result",
  "conclusion",
  "conclusions",
  "background",
  "methods",
  "method",
  "objective",
  "objectives",
  "purpose",
  "aim",
  "analysis",
  "data",
  "effect",
  "effects",
  "showed",
  "found",
  "were",
]);

export function buildTopicProfile(
  id: string,
  name: string,
  conditions: string[],
  interventions: string[],
  evidenceTitles: string[],
): TopicProfile {
  const terms = new Map<string, number>();

  addTermsFromText(terms, name, 3);
  for (const c of conditions) addTermsFromText(terms, c, 2);
  for (const i of interventions) addTermsFromText(terms, i, 2);
  for (const title of evidenceTitles) addTermsFromText(terms, title, 1);

  return { id, name, terms, conditions, interventions };
}

export function computeSimilarity(
  a: TopicProfile,
  b: TopicProfile,
): {
  score: number;
  sharedTerms: string[];
  sharedConditions: string[];
  sharedInterventions: string[];
} {
  const sharedTerms = findSharedTerms(a.terms, b.terms);
  const sharedConditions = findSharedItems(a.conditions, b.conditions);
  const sharedInterventions = findSharedItems(a.interventions, b.interventions);

  const cosineScore = computeCosineSimilarity(a.terms, b.terms);
  const jaccardScore = computeJaccardSimilarity(a.terms, b.terms);
  const conditionScore = computeSetSimilarity(a.conditions, b.conditions);
  const interventionScore = computeSetSimilarity(a.interventions, b.interventions);

  const score = Math.round(
    cosineScore * 0.3 + jaccardScore * 0.2 + conditionScore * 0.25 + interventionScore * 0.25,
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    sharedTerms: sharedTerms.slice(0, 20),
    sharedConditions,
    sharedInterventions,
  };
}

export function findSimilarTopics(
  target: TopicProfile,
  candidates: TopicProfile[],
  minScore: number = 20,
): SimilarTopic[] {
  const results: SimilarTopic[] = [];

  for (const candidate of candidates) {
    if (candidate.id === target.id) continue;

    const similarity = computeSimilarity(target, candidate);
    if (similarity.score >= minScore) {
      results.push({
        topicId: candidate.id,
        topicName: candidate.name,
        score: similarity.score,
        sharedTerms: similarity.sharedTerms,
        sharedConditions: similarity.sharedConditions,
        sharedInterventions: similarity.sharedInterventions,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function buildTopicGraph(
  profiles: TopicProfile[],
  minScore: number = 25,
): Array<{ source: string; target: string; weight: number; sharedTerms: string[] }> {
  const edges: Array<{ source: string; target: string; weight: number; sharedTerms: string[] }> =
    [];

  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const similarity = computeSimilarity(profiles[i], profiles[j]);
      if (similarity.score >= minScore) {
        edges.push({
          source: profiles[i].id,
          target: profiles[j].id,
          weight: similarity.score,
          sharedTerms: similarity.sharedTerms.slice(0, 10),
        });
      }
    }
  }

  return edges.sort((a, b) => b.weight - a.weight);
}

function addTermsFromText(terms: Map<string, number>, text: string, weight: number): void {
  const words = tokenize(text);
  for (const word of words) {
    terms.set(word, (terms.get(word) ?? 0) + weight);
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function findSharedTerms(a: Map<string, number>, b: Map<string, number>): string[] {
  const shared: Array<{ term: string; weight: number }> = [];

  for (const [term, weightA] of a) {
    const weightB = b.get(term);
    if (weightB !== undefined) {
      shared.push({ term, weight: weightA + weightB });
    }
  }

  return shared.sort((a, b) => b.weight - a.weight).map((s) => s.term);
}

function findSharedItems(a: string[], b: string[]): string[] {
  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));
  const shared: string[] = [];

  for (const item of a) {
    if (setB.has(item.toLowerCase())) {
      shared.push(item);
    }
  }

  return shared;
}

function computeCosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, weightA] of a) {
    normA += weightA * weightA;
    const weightB = b.get(term);
    if (weightB !== undefined) {
      dotProduct += weightA * weightB;
    }
  }

  for (const [, weightB] of b) {
    normB += weightB * weightB;
  }

  if (normA === 0 || normB === 0) return 0;
  return (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))) * 100;
}

function computeJaccardSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let intersection = 0;
  const union = new Set<string>();

  for (const [term] of a) {
    union.add(term);
    if (b.has(term)) intersection++;
  }
  for (const [term] of b) {
    union.add(term);
  }

  if (union.size === 0) return 0;
  return (intersection / union.size) * 100;
}

function computeSetSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0 || b.length === 0) return 0;

  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = new Set([...setA, ...setB]);
  return (intersection / union.size) * 100;
}
