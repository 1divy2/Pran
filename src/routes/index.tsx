import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Workstation } from "@/components/pran/Workstation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pran — Medical Evidence Intelligence" },
      {
        name: "description",
        content:
          "Analyze any medical condition using real-time API data from PubMed, ClinicalTrials.gov, and OpenFDA.",
      },
    ],
  }),
  component: LandingPage,
});

const SPOTLIGHTS = [
  { id: "hypertension", name: "Hypertension", category: "Cardiovascular", evidence: "High" },
  { id: "long-covid", name: "Long COVID", category: "Infectious", evidence: "Growing" },
  {
    id: "alzheimers",
    name: "Alzheimer's Disease",
    category: "Neurological",
    evidence: "Extensive",
  },
  { id: "type-2-diabetes", name: "Type 2 Diabetes", category: "Metabolic", evidence: "Extensive" },
  {
    id: "rheumatoid-arthritis",
    name: "Rheumatoid Arthritis",
    category: "Autoimmune",
    evidence: "High",
  },
  { id: "glp-1-agonists", name: "GLP-1 Agonists", category: "Pharmacology", evidence: "Growing" },
  { id: "breast-cancer", name: "Breast Cancer", category: "Oncology", evidence: "Extensive" },
  { id: "asthma", name: "Asthma", category: "Pulmonary", evidence: "High" },
  { id: "depression", name: "Major Depression", category: "Psychiatric", evidence: "Extensive" },
  { id: "copd", name: "COPD", category: "Pulmonary", evidence: "High" },
  { id: "heart-failure", name: "Heart Failure", category: "Cardiovascular", evidence: "Extensive" },
  { id: "obesity", name: "Obesity", category: "Metabolic", evidence: "High" },
];

const DATA_SOURCES = [
  {
    name: "PubMed",
    description: "36M+ biomedical literature citations",
    icon: "📚",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
  },
  {
    name: "ClinicalTrials.gov",
    description: "500K+ clinical study registrations",
    icon: "🔬",
    url: "https://clinicaltrials.gov/",
  },
  {
    name: "OpenFDA",
    description: "Drug labels, adverse events, device data",
    icon: "💊",
    url: "https://open.fda.gov/",
  },
];

function LandingPage() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (search.trim()) {
      const topicId = search.toLowerCase().replace(/\s+/g, "-");
      navigate({ to: "/topic/$topicId", params: { topicId } });
    }
  };

  return (
    <Workstation trail={[{ label: "Library" }]} scene="Global Search">
      <div className="mx-auto min-h-screen max-w-[1200px] px-10 py-32">
        {/* Editorial hero */}
        <section className="text-center mb-20">
          <div className="mono-eyebrow mb-6 text-accent">Medical Evidence Engine</div>
          <h1 className="font-display text-7xl leading-tight text-balance">
            Evidence, <br />
            <em className="text-ink-2">arranged for thinking.</em>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-ink-2">
            Pran synthesizes millions of data points from <strong>PubMed</strong>,{" "}
            <strong>ClinicalTrials.gov</strong>, and <strong>OpenFDA</strong> into chronological
            timelines, spatial canvases, and adversarial debates.
          </p>
        </section>

        {/* Global Search Bar */}
        <section className="relative mx-auto w-full max-w-3xl mb-24">
          <div className="relative overflow-hidden rounded-2xl bg-card shadow-lift hairline-strong transition-shadow focus-within:shadow-2xl">
            <span className="absolute inset-y-0 left-6 flex items-center font-display text-2xl text-ink-3">
              ⌕
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Search any disease, drug, or condition..."
              className="w-full bg-transparent py-6 pl-16 pr-32 font-display text-3xl text-ink placeholder:text-ink-3 focus:outline-none"
              autoFocus
            />
            <div className="absolute inset-y-0 right-4 flex items-center gap-2">
              <span className="hidden sm:block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3 mr-2">
                ↵
              </span>
              <button
                onClick={handleSearch}
                disabled={!search.trim()}
                className="rounded-full bg-ink px-6 py-3 font-mono text-[11px] uppercase tracking-widest text-paper transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                Analyze
              </button>
            </div>
          </div>
          <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Query across 3 data sources · Real-time evidence synthesis
          </div>
        </section>

        {/* Curated Spotlights */}
        <section className="mb-24">
          <div className="flex items-baseline justify-between border-b border-rule pb-3 mb-8">
            <h2 className="font-display text-3xl">Curated Spotlights</h2>
            <span className="mono-eyebrow">{SPOTLIGHTS.length} topics</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {SPOTLIGHTS.map((topic) => (
              <Link
                key={topic.id}
                to="/topic/$topicId"
                params={{ topicId: topic.id }}
                className="group flex flex-col rounded-xl border border-rule bg-card/50 p-5 transition-all hover:bg-card hover:shadow-paper"
              >
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3 group-hover:text-accent">
                  {topic.category}
                </span>
                <span className="mt-2 font-display text-xl text-ink">{topic.name}</span>
                <span className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                  Evidence: {topic.evidence}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-24">
          <div className="flex items-baseline justify-between border-b border-rule pb-3 mb-8">
            <h2 className="font-display text-3xl">How it works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl border border-rule bg-card p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent mb-3">
                Step 1
              </div>
              <div className="font-display text-xl mb-2">Query</div>
              <p className="text-sm text-ink-2 leading-relaxed">
                Search for any disease, drug, or medical condition. PRAN queries PubMed,
                ClinicalTrials.gov, and OpenFDA simultaneously.
              </p>
            </div>
            <div className="rounded-xl border border-rule bg-card p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent mb-3">
                Step 2
              </div>
              <div className="font-display text-xl mb-2">Synthesize</div>
              <p className="text-sm text-ink-2 leading-relaxed">
                Evidence is classified by tier (meta-analysis, RCT, cohort, etc.) and assigned
                confidence scores based on quality, recency, and sample size.
              </p>
            </div>
            <div className="rounded-xl border border-rule bg-card p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent mb-3">
                Step 3
              </div>
              <div className="font-display text-xl mb-2">Explore</div>
              <p className="text-sm text-ink-2 leading-relaxed">
                Visualize evidence across timelines, spatial canvases, knowledge graphs, and
                adversarial courtroom debates.
              </p>
            </div>
          </div>
        </section>

        {/* Data Sources */}
        <section className="mb-16">
          <div className="flex items-baseline justify-between border-b border-rule pb-3 mb-8">
            <h2 className="font-display text-3xl">Data Sources</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DATA_SOURCES.map((source) => (
              <a
                key={source.name}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-4 rounded-xl border border-rule bg-card p-6 transition-all hover:shadow-paper"
              >
                <span className="text-3xl">{source.icon}</span>
                <div>
                  <div className="font-display text-xl group-hover:text-accent transition-colors">
                    {source.name}
                  </div>
                  <div className="mt-1 text-sm text-ink-2">{source.description}</div>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </Workstation>
  );
}
