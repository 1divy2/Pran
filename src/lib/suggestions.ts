// ─────────────────────────────────────────────────────────────────────────────
// Curated Suggestions — predefined medical topics for search autocomplete.
// Grouped by category for organized display in suggestion dropdowns.
// ─────────────────────────────────────────────────────────────────────────────

export interface TopicSuggestion {
  id: string;
  name: string;
  category: string;
}

export const CURATED_SUGGESTIONS: TopicSuggestion[] = [
  // Cardiovascular
  { id: "hypertension", name: "Hypertension", category: "Cardiovascular" },
  { id: "heart-failure", name: "Heart Failure", category: "Cardiovascular" },
  { id: "atrial-fibrillation", name: "Atrial Fibrillation", category: "Cardiovascular" },
  { id: "coronary-artery-disease", name: "Coronary Artery Disease", category: "Cardiovascular" },

  // Metabolic
  { id: "type-2-diabetes", name: "Type 2 Diabetes", category: "Metabolic" },
  { id: "obesity", name: "Obesity", category: "Metabolic" },
  { id: "hyperlipidemia", name: "Hyperlipidemia", category: "Metabolic" },

  // Neurological
  { id: "alzheimers", name: "Alzheimer's Disease", category: "Neurological" },
  { id: "parkinsons", name: "Parkinson's Disease", category: "Neurological" },
  { id: "epilepsy", name: "Epilepsy", category: "Neurological" },
  { id: "multiple-sclerosis", name: "Multiple Sclerosis", category: "Neurological" },

  // Oncology
  { id: "breast-cancer", name: "Breast Cancer", category: "Oncology" },
  { id: "lung-cancer", name: "Lung Cancer", category: "Oncology" },
  { id: "colorectal-cancer", name: "Colorectal Cancer", category: "Oncology" },
  { id: "melanoma", name: "Melanoma", category: "Oncology" },

  // Respiratory
  { id: "asthma", name: "Asthma", category: "Pulmonary" },
  { id: "copd", name: "COPD", category: "Pulmonary" },

  // Psychiatric
  { id: "depression", name: "Major Depression", category: "Psychiatric" },
  { id: "anxiety", name: "Generalized Anxiety", category: "Psychiatric" },
  { id: "schizophrenia", name: "Schizophrenia", category: "Psychiatric" },

  // Autoimmune
  { id: "rheumatoid-arthritis", name: "Rheumatoid Arthritis", category: "Autoimmune" },
  { id: "lupus", name: "Lupus (SLE)", category: "Autoimmune" },
  { id: "crohns-disease", name: "Crohn's Disease", category: "Autoimmune" },

  // Infectious
  { id: "long-covid", name: "Long COVID", category: "Infectious" },
  { id: "hiv", name: "HIV/AIDS", category: "Infectious" },
  { id: "tuberculosis", name: "Tuberculosis", category: "Infectious" },

  // Pharmacology
  { id: "glp-1-agonists", name: "GLP-1 Agonists", category: "Pharmacology" },
  { id: "statins", name: "Statins", category: "Pharmacology" },
  { id: "metformin", name: "Metformin", category: "Pharmacology" },
];

/**
 * Filter suggestions based on a search query.
 * Matches against name, category, and id.
 */
export function filterSuggestions(query: string): TopicSuggestion[] {
  if (!query.trim()) return CURATED_SUGGESTIONS.slice(0, 8);

  const lower = query.toLowerCase();
  return CURATED_SUGGESTIONS.filter(
    (s) =>
      s.name.toLowerCase().includes(lower) ||
      s.category.toLowerCase().includes(lower) ||
      s.id.includes(lower),
  ).slice(0, 8);
}

/**
 * Get unique categories from suggestions.
 */
export function getSuggestionCategories(): string[] {
  return [...new Set(CURATED_SUGGESTIONS.map((s) => s.category))];
}
