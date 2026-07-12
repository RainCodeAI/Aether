// lib/ai-context.ts — top-k graph selection for LLM analysis prompts
import type { AetherData, OntologyNode, Relationship } from '@/types';
import type { AnalysisIntent } from '@/lib/ai-search';

/** Preferred entity types per analysis intent (empty = no type filter boost). */
export const INTENT_NODE_TYPES: Record<AnalysisIntent, string[]> = {
  financial: ['Project', 'Metric'],
  risk: ['Project', 'Person'],
  team: ['Person', 'Project'],
  projects: ['Project'],
  location: ['Location', 'Project'],
  opportunity: ['Metric', 'Project', 'Location'],
  summary: [],
  connection_discovery: [],
  scenario_projection: ['Metric', 'Project'],
  search: [],
};

export interface ContextSelectOptions {
  /** Max nodes to send to the model (default 40). */
  maxNodes?: number;
  /** Max relationships among selected nodes (default 80). */
  maxRels?: number;
  /** Include 1-hop neighbors of top-scoring seeds (default true). */
  expandNeighbors?: boolean;
}

export interface ContextSelection {
  data: AetherData;
  intent: AnalysisIntent;
  /** Ordered by descending relevance (seed ranking; neighbors may follow). */
  selectedNodeIds: string[];
  totalNodes: number;
  totalRels: number;
  truncated: boolean;
  /** Human-readable note for the prompt. */
  selectionNote: string;
}

const DEFAULT_MAX_NODES = 40;
const DEFAULT_MAX_RELS = 80;

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function nodeDegree(data: AetherData): Map<string, number> {
  const deg = new Map<string, number>();
  for (const n of data.nodes) deg.set(n.id, 0);
  for (const r of data.relationships) {
    deg.set(r.from, (deg.get(r.from) ?? 0) + 1);
    deg.set(r.to, (deg.get(r.to) ?? 0) + 1);
  }
  return deg;
}

function nodeSearchText(node: OntologyNode): string {
  const propBits = Object.values(node.properties)
    .filter((v) => v !== null && v !== undefined && typeof v !== 'object')
    .map(String);
  return [
    node.label,
    node.type,
    ...(node.tags ?? []),
    ...propBits,
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * Score a node for inclusion in LLM context.
 * Higher = more relevant to the query + intent.
 */
export function scoreNodeForContext(
  node: OntologyNode,
  tokens: string[],
  intent: AnalysisIntent,
  degree: number
): number {
  let score = 0;
  const focusTypes = INTENT_NODE_TYPES[intent];
  if (focusTypes.length > 0 && focusTypes.includes(node.type)) {
    score += 12;
  } else if (focusTypes.length === 0) {
    score += 2; // mild prior so ranking still has signal
  }

  const label = node.label.toLowerCase();
  const text = nodeSearchText(node);

  for (const t of tokens) {
    if (label === t) score += 25;
    else if (label.startsWith(t) || label.includes(t)) score += 14;
    if (node.type.toLowerCase().includes(t)) score += 6;
    if ((node.tags ?? []).some((tag) => tag.toLowerCase().includes(t))) score += 8;
    if (text.includes(t)) score += 4;
  }

  // Prefer connected hubs slightly (caps so isolates still win on text match)
  score += Math.min(degree, 8) * 0.6;

  // Prefer entities with richer property bags for financial/project intents
  if (
    (intent === 'financial' || intent === 'projects' || intent === 'risk') &&
    (node.properties.budget !== undefined ||
      node.properties.progress !== undefined ||
      node.properties.value !== undefined ||
      node.properties.status !== undefined)
  ) {
    score += 5;
  }

  return score;
}

function adjacency(data: AetherData): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  const add = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push(b);
  };
  for (const r of data.relationships) {
    add(r.from, r.to);
    add(r.to, r.from);
  }
  return adj;
}

/**
 * Select a compact subgraph for the LLM: intent filter + query ranking + optional neighbors.
 */
export function selectAnalysisContext(
  data: AetherData,
  query: string,
  intent: AnalysisIntent,
  options: ContextSelectOptions = {}
): ContextSelection {
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;
  const maxRels = options.maxRels ?? DEFAULT_MAX_RELS;
  const expandNeighbors = options.expandNeighbors !== false;

  const totalNodes = data.nodes.length;
  const totalRels = data.relationships.length;
  const tokens = tokenize(query);
  const deg = nodeDegree(data);

  if (totalNodes === 0) {
    return {
      data: { nodes: [], relationships: [] },
      intent,
      selectedNodeIds: [],
      totalNodes: 0,
      totalRels: 0,
      truncated: false,
      selectionNote: 'Empty graph — no entities available.',
    };
  }

  // Rank all nodes
  const ranked = data.nodes
    .map((n) => ({
      node: n,
      score: scoreNodeForContext(n, tokens, intent, deg.get(n.id) ?? 0),
    }))
    .sort((a, b) => b.score - a.score || a.node.label.localeCompare(b.node.label));

  // Seed: take top-k, but if intent has type focus, ensure we pull some of those types
  const seedBudget = expandNeighbors
    ? Math.max(8, Math.floor(maxNodes * 0.65))
    : maxNodes;

  const selected = new Set<string>();
  for (const { node } of ranked) {
    if (selected.size >= seedBudget) break;
    selected.add(node.id);
  }

  // Guarantee at least a few intent-typed nodes if they exist
  const focusTypes = INTENT_NODE_TYPES[intent];
  if (focusTypes.length > 0) {
    const typed = ranked.filter((r) => focusTypes.includes(r.node.type));
    for (const { node } of typed.slice(0, Math.min(12, seedBudget))) {
      if (selected.size >= maxNodes) break;
      selected.add(node.id);
    }
  }

  // Expand 1-hop neighbors of seeds
  if (expandNeighbors) {
    const adj = adjacency(data);
    const seeds = [...selected];
    for (const id of seeds) {
      for (const nb of adj.get(id) ?? []) {
        if (selected.size >= maxNodes) break;
        selected.add(nb);
      }
      if (selected.size >= maxNodes) break;
    }
  }

  // If still under budget (tiny graph or weak scores), fill by rank
  if (selected.size < Math.min(maxNodes, totalNodes)) {
    for (const { node } of ranked) {
      if (selected.size >= maxNodes) break;
      selected.add(node.id);
    }
  }

  const nodes = data.nodes.filter((n) => selected.has(n.id));
  // Prefer higher-score order in output for the model
  const scoreById = new Map(ranked.map((r) => [r.node.id, r.score]));
  nodes.sort(
    (a, b) => (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0)
  );

  let relationships = data.relationships.filter(
    (r) => selected.has(r.from) && selected.has(r.to)
  );

  // Cap relationships: prefer those touching highest-scoring endpoints
  if (relationships.length > maxRels) {
    relationships = [...relationships]
      .sort((a, b) => {
        const sa =
          (scoreById.get(a.from) ?? 0) + (scoreById.get(a.to) ?? 0);
        const sb =
          (scoreById.get(b.from) ?? 0) + (scoreById.get(b.to) ?? 0);
        return sb - sa;
      })
      .slice(0, maxRels);
  }

  const truncated =
    nodes.length < totalNodes || relationships.length < totalRels;

  const selectionNote = truncated
    ? `Context is a relevance-ranked subgraph: ${nodes.length}/${totalNodes} entities and ${relationships.length}/${totalRels} relationships (intent=${intent}).`
    : `Full graph included: ${nodes.length} entities and ${relationships.length} relationships.`;

  return {
    data: { nodes, relationships },
    intent,
    selectedNodeIds: nodes.map((n) => n.id),
    totalNodes,
    totalRels,
    truncated,
    selectionNote,
  };
}

/** Compact JSON payload for the LLM user message. */
export function serializeContextForPrompt(selection: ContextSelection): string {
  const nodes = selection.data.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    label: n.label,
    createdAt: n.createdAt,
    properties: n.properties,
    tags: n.tags ?? [],
  }));
  const relationships = selection.data.relationships.map((r: Relationship) => ({
    id: r.id,
    type: r.type,
    from: r.from,
    to: r.to,
  }));
  return JSON.stringify(
    {
      selectionNote: selection.selectionNote,
      nodes,
      relationships,
    },
    null,
    0
  );
}
