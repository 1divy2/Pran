import { createFileRoute, Link } from "@tanstack/react-router";
import { Workstation } from "@/components/pran/Workstation";
import { fetchTopicData } from "@/lib/api/topic-service";
import type { LiveTopicData } from "@/lib/api/types";
import { computeConfidence, type EvidencePiece } from "@/lib/evidence";

export const Route = createFileRoute("/topic/$topicId/graph")({
  head: ({ params }) => ({ meta: [{ title: `Pran — Graph · ${params.topicId}` }] }),
  loader: async ({ params }) => fetchTopicData(params.topicId),
  component: GraphPage,
});

// ─────────────────────────────────────────────────────────────────────────────
// Entity types for the knowledge graph
// ─────────────────────────────────────────────────────────────────────────────

type EntityType = "condition" | "drug" | "trial" | "paper" | "sponsor" | "journal" | "intervention";

interface GraphNode {
  id: string;
  type: EntityType;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  evidence?: EvidencePiece;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractEntities(
  data: LiveTopicData,
  topicId: string,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();

  const addNode = (id: string, type: EntityType, label: string, evidence?: EvidencePiece) => {
    if (nodeIds.has(id)) return;
    nodeIds.add(id);
    nodes.push({
      id,
      type,
      label,
      x: 0.5 + (Math.random() - 0.5) * 0.6,
      y: 0.5 + (Math.random() - 0.5) * 0.6,
      vx: 0,
      vy: 0,
      evidence,
    });
  };

  const addEdge = (source: string, target: string, type: string) => {
    const key = [source, target].sort().join("|");
    if (edges.some((e) => [e.source, e.target].sort().join("|") === key)) return;
    edges.push({ source, target, type });
  };

  // Central condition node
  const conditionId = `condition:${topicId}`;
  addNode(
    conditionId,
    "condition",
    topicId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  );

  const papers = data.evidence.filter((ne) => ne.sourceId === "pubmed");
  const trials = data.evidence.filter((ne) => ne.sourceId === "clinicaltrials");
  const drugs = data.evidence.filter((ne) => ne.sourceId === "openfda");

  // Papers → condition
  for (const ne of papers.slice(0, 15)) {
    const evidence: EvidencePiece = {
      id: ne.id,
      title: ne.title,
      tier: ne.tier,
      year: ne.year,
      source: ne.sourceName,
      authors: ne.authors,
      journal: ne.journal,
      n: ne.sampleSize,
      effect: ne.effect,
      confidence: computeConfidence({ tier: ne.tier, year: ne.year, n: ne.sampleSize }),
      url: ne.url,
      abstract: ne.abstract,
    };
    const paperId = `paper:${ne.id}`;
    addNode(paperId, "paper", ne.title, evidence);
    addEdge(paperId, conditionId, "studies");

    // Journal nodes
    const journalId = `journal:${ne.journal}`;
    addNode(journalId, "journal", ne.journal);
    addEdge(paperId, journalId, "published-in");

    // Author → sponsor nodes (first author as proxy)
    const author = ne.authors.split("; ")[0];
    if (author) {
      const sponsorId = `sponsor:${author}`;
      addNode(sponsorId, "sponsor", author);
      addEdge(paperId, sponsorId, "authored-by");
    }
  }

  // Trials → condition
  for (const ne of trials.slice(0, 15)) {
    const evidence: EvidencePiece = {
      id: ne.id,
      title: ne.title,
      tier: ne.tier,
      year: ne.year,
      source: ne.sourceName,
      authors: ne.authors,
      journal: ne.journal,
      n: ne.sampleSize,
      effect: ne.effect,
      confidence: computeConfidence({ tier: ne.tier, year: ne.year, n: ne.sampleSize }),
      url: ne.url,
      abstract: ne.abstract,
    };
    const trialId = `trial:${ne.id}`;
    addNode(trialId, "trial", ne.title, evidence);
    addEdge(trialId, conditionId, "investigates");

    // Sponsor nodes
    const sponsorId = `sponsor:${ne.authors}`;
    addNode(sponsorId, "sponsor", ne.authors);
    addEdge(trialId, sponsorId, "sponsored-by");

    // Intervention nodes
    for (const intervention of ne.interventions.slice(0, 3)) {
      const interventionId = `intervention:${intervention}`;
      addNode(interventionId, "intervention", intervention);
      addEdge(trialId, interventionId, "tests");
      addEdge(interventionId, conditionId, "treats");
    }
  }

  // Drug nodes
  for (const ne of drugs.slice(0, 8)) {
    const generic = ne.title.includes("(") ? ne.title.split("(")[1].replace(")", "").trim() : ne.title;
    const drugId = `drug:${generic}`;
    addNode(drugId, "drug", ne.title);
    addEdge(drugId, conditionId, "indicated-for");
  }

  return { nodes, edges };
}

// ─────────────────────────────────────────────────────────────────────────────
// Force-directed layout simulation
// ─────────────────────────────────────────────────────────────────────────────

function simulateForces(nodes: GraphNode[], edges: GraphEdge[], iterations = 120): void {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;

    // Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;

        const force = (0.005 * alpha) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;

      const force = 0.01 * dist * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Center gravity
    for (const node of nodes) {
      node.vx += (0.5 - node.x) * 0.002 * alpha;
      node.vy += (0.5 - node.y) * 0.002 * alpha;
    }

    // Apply velocities with damping
    for (const node of nodes) {
      node.vx *= 0.85;
      node.vy *= 0.85;
      node.x += node.vx;
      node.y += node.vy;
      // Keep in bounds
      node.x = Math.max(0.05, Math.min(0.95, node.x));
      node.y = Math.max(0.05, Math.min(0.95, node.y));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const NODE_COLORS: Record<EntityType, string> = {
  condition: "var(--color-accent)",
  drug: "var(--color-tier-guide)",
  trial: "var(--color-tier-rct)",
  paper: "var(--color-tier-cohort)",
  sponsor: "var(--color-tier-case)",
  journal: "var(--color-tier-meta)",
  intervention: "var(--color-consensus)",
};

const NODE_SIZES: Record<EntityType, number> = {
  condition: 18,
  drug: 10,
  trial: 8,
  paper: 6,
  sponsor: 7,
  journal: 7,
  intervention: 8,
};

function GraphPage() {
  const data = Route.useLoaderData() as LiveTopicData;
  const { topicId } = Route.useParams();
  const displayName = topicId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const { nodes, edges } = extractEntities(data, topicId);

  // Run force simulation
  simulateForces(nodes, edges);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = nodes.find((n) => n.id === selectedId);

  // Connected nodes to selected
  const connectedIds = new Set<string>();
  if (selectedId) {
    for (const edge of edges) {
      if (edge.source === selectedId) connectedIds.add(edge.target);
      if (edge.target === selectedId) connectedIds.add(edge.source);
    }
  }

  // Stats
  const sponsors = new Set(
    data.evidence.filter((ne) => ne.sourceId === "clinicaltrials").map((ne) => ne.authors),
  );
  const journals = new Set(
    data.evidence.filter((ne) => ne.sourceId === "pubmed").map((ne) => ne.journal),
  );

  return (
    <Workstation
      trail={[
        { label: "Library", href: "/" },
        { label: displayName, href: `/topic/${topicId}` },
        { label: "Knowledge Graph" },
      ]}
      scene="Entity network"
    >
      <div className="relative h-screen w-full overflow-hidden">
        {/* SVG Graph */}
        <svg className="absolute inset-0 h-full w-full">
          {/* Edges */}
          {edges.map((edge, i) => {
            const source = nodes.find((n) => n.id === edge.source);
            const target = nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;

            const isHighlighted =
              selectedId && (edge.source === selectedId || edge.target === selectedId);

            return (
              <line
                key={i}
                x1={`${source.x * 100}%`}
                y1={`${source.y * 100}%`}
                x2={`${target.x * 100}%`}
                y2={`${target.y * 100}%`}
                stroke="currentColor"
                className={isHighlighted ? "text-ink-3/50" : "text-ink-3/10"}
                strokeWidth={isHighlighted ? 1.5 : 0.5}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isSelected = node.id === selectedId;
            const isConnected = connectedIds.has(node.id);
            const isDimmed = selectedId && !isSelected && !isConnected;
            const size = NODE_SIZES[node.type];
            const color = NODE_COLORS[node.type];

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => setSelectedId(isSelected ? null : node.id)}
              >
                <circle
                  cx={`${node.x * 100}%`}
                  cy={`${node.y * 100}%`}
                  r={isSelected ? size * 1.5 : size}
                  fill={color}
                  className={`transition-all duration-300 ${
                    isDimmed ? "opacity-20" : "opacity-80"
                  }`}
                />
                {(isSelected || isConnected || node.type === "condition") && (
                  <text
                    x={`${node.x * 100}%`}
                    y={`${node.y * 100 + ((size + 8) / 100) * 100}%`}
                    textAnchor="middle"
                    className="fill-ink text-[10px] font-mono uppercase tracking-wider pointer-events-none"
                    style={{ fontSize: "10px" }}
                  >
                    {node.label.length > 20 ? node.label.slice(0, 20) + "..." : node.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Inspector Panel */}
        {selectedNode && (
          <div className="absolute inset-y-0 right-0 w-[380px] border-l border-rule bg-paper/95 p-8 shadow-2xl backdrop-blur-xl overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="mono-eyebrow">Entity Inspector</div>
              <button
                onClick={() => setSelectedId(null)}
                className="text-2xl text-ink-3 hover:text-ink"
              >
                ×
              </button>
            </div>

            <div
              className="inline-block rounded-sm px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-paper mb-3"
              style={{ background: NODE_COLORS[selectedNode.type] }}
            >
              {selectedNode.type}
            </div>

            <h2 className="font-display text-xl leading-snug text-balance">{selectedNode.label}</h2>

            {selectedNode.evidence && (
              <div className="mt-6 space-y-4 text-sm text-ink-2 border-t border-rule pt-6">
                <div>
                  <span className="font-bold">Source:</span> {selectedNode.evidence.source}
                </div>
                {selectedNode.evidence.year && (
                  <div>
                    <span className="font-bold">Year:</span> {selectedNode.evidence.year}
                  </div>
                )}
                <div>
                  <span className="font-bold">Confidence:</span> {selectedNode.evidence.confidence}%
                </div>
                <a
                  href={selectedNode.evidence.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-accent underline text-sm hover:no-underline"
                >
                  View source →
                </a>
              </div>
            )}

            {/* Connected entities */}
            <div className="mt-6 border-t border-rule pt-6">
              <div className="mono-eyebrow mb-3">Connected ({connectedIds.size})</div>
              <div className="space-y-2">
                {Array.from(connectedIds)
                  .map((id) => nodes.find((n) => n.id === id))
                  .filter(Boolean)
                  .slice(0, 10)
                  .map((node) => (
                    <button
                      key={node!.id}
                      onClick={() => setSelectedId(node!.id)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-paper-2"
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: NODE_COLORS[node!.type] }}
                      />
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 shrink-0 w-16">
                        {node!.type}
                      </span>
                      <span className="font-display text-sm truncate">
                        {node!.label.length > 30 ? node!.label.slice(0, 30) + "..." : node!.label}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 left-6 z-20">
          <div className="rounded-lg bg-card/80 p-3 backdrop-blur-xl hairline-strong">
            <div className="mono-eyebrow mb-2">Entity Types</div>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  "condition",
                  "drug",
                  "trial",
                  "paper",
                  "sponsor",
                  "journal",
                  "intervention",
                ] as EntityType[]
              ).map((type) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: NODE_COLORS[type] }}
                  />
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                    {type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="absolute top-6 left-6 z-20">
          <div className="rounded-lg bg-card/80 p-3 backdrop-blur-xl hairline-strong">
            <div className="mono-eyebrow mb-2">Network Stats</div>
            <div className="space-y-1 font-mono text-[10px] text-ink-3">
              <div>{nodes.length} nodes</div>
              <div>{edges.length} edges</div>
              <div>{sponsors.size} sponsors</div>
              <div>{journals.size} journals</div>
            </div>
          </div>
        </div>
      </div>
    </Workstation>
  );
}

// Need useState
import { useState } from "react";
