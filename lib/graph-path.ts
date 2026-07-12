// lib/graph-path.ts — pure graph algorithms for path finding & neighborhood focus
import type { AetherData, OntologyNode, Relationship } from '@/types';

export interface GraphPath {
  /** Ordered node ids from source → target (inclusive). */
  nodeIds: string[];
  /** Edge ids used on that path (length = nodeIds.length - 1). */
  edgeIds: string[];
  /** Human-readable hops: "worksOn → Project X → locatedAt" */
  hops: Array<{
    fromId: string;
    toId: string;
    edgeId: string;
    relType: string;
  }>;
}

export interface Neighborhood {
  nodeIds: string[];
  edgeIds: string[];
  depth: number;
  /** Distance from center, 0 = center */
  distance: Record<string, number>;
}

type AdjEdge = { neighbor: string; edgeId: string; relType: string };

/** Undirected adjacency: each relationship is usable in both directions. */
export function buildAdjacency(data: AetherData): Map<string, AdjEdge[]> {
  const adj = new Map<string, AdjEdge[]>();
  const ensure = (id: string) => {
    if (!adj.has(id)) adj.set(id, []);
    return adj.get(id)!;
  };
  // Isolate node entries even with degree 0
  for (const n of data.nodes) ensure(n.id);

  for (const r of data.relationships) {
    ensure(r.from).push({ neighbor: r.to, edgeId: r.id, relType: r.type });
    ensure(r.to).push({ neighbor: r.from, edgeId: r.id, relType: r.type });
  }
  return adj;
}

/**
 * Shortest path (fewest hops) between two nodes, undirected BFS.
 * Returns null if no path exists or either id is missing.
 */
export function findShortestPath(
  data: AetherData,
  fromId: string,
  toId: string
): GraphPath | null {
  if (fromId === toId) {
    if (!data.nodes.some((n) => n.id === fromId)) return null;
    return { nodeIds: [fromId], edgeIds: [], hops: [] };
  }

  const nodeSet = new Set(data.nodes.map((n) => n.id));
  if (!nodeSet.has(fromId) || !nodeSet.has(toId)) return null;

  const adj = buildAdjacency(data);
  const prev = new Map<string, { from: string; edgeId: string; relType: string }>();
  const visited = new Set<string>([fromId]);
  const queue: string[] = [fromId];

  let found = false;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur === toId) {
      found = true;
      break;
    }
    for (const edge of adj.get(cur) ?? []) {
      if (visited.has(edge.neighbor)) continue;
      visited.add(edge.neighbor);
      prev.set(edge.neighbor, {
        from: cur,
        edgeId: edge.edgeId,
        relType: edge.relType,
      });
      queue.push(edge.neighbor);
    }
  }

  if (!found) return null;

  // Reconstruct path
  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  const hops: GraphPath['hops'] = [];
  let cursor = toId;
  while (cursor !== fromId) {
    const step = prev.get(cursor);
    if (!step) return null;
    nodeIds.push(cursor);
    edgeIds.push(step.edgeId);
    hops.push({
      fromId: step.from,
      toId: cursor,
      edgeId: step.edgeId,
      relType: step.relType,
    });
    cursor = step.from;
  }
  nodeIds.push(fromId);
  nodeIds.reverse();
  edgeIds.reverse();
  hops.reverse();

  return { nodeIds, edgeIds, hops };
}

/**
 * All nodes and edges within `depth` hops of `centerId` (undirected).
 * Depth 1 = center + direct neighbors. Depth 0 = center only.
 */
export function findNeighborhood(
  data: AetherData,
  centerId: string,
  depth = 1
): Neighborhood | null {
  if (!data.nodes.some((n) => n.id === centerId)) return null;
  const d = Math.max(0, Math.floor(depth));

  const adj = buildAdjacency(data);
  const distance: Record<string, number> = { [centerId]: 0 };
  const nodeIds = new Set<string>([centerId]);
  const edgeIds = new Set<string>();
  const queue: string[] = [centerId];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const dist = distance[cur];
    if (dist >= d) continue;

    for (const edge of adj.get(cur) ?? []) {
      edgeIds.add(edge.edgeId);
      if (distance[edge.neighbor] === undefined) {
        distance[edge.neighbor] = dist + 1;
        nodeIds.add(edge.neighbor);
        queue.push(edge.neighbor);
      }
    }
  }

  // Include only edges whose both ends are in the neighborhood
  const finalEdges = [...edgeIds].filter((eid) => {
    const rel = data.relationships.find((r) => r.id === eid);
    if (!rel) return false;
    return nodeIds.has(rel.from) && nodeIds.has(rel.to);
  });

  return {
    nodeIds: [...nodeIds],
    edgeIds: finalEdges,
    depth: d,
    distance,
  };
}

/** Degree of each node (undirected). Useful for hub detection later. */
export function nodeDegrees(data: AetherData): Record<string, number> {
  const deg: Record<string, number> = {};
  for (const n of data.nodes) deg[n.id] = 0;
  for (const r of data.relationships) {
    deg[r.from] = (deg[r.from] ?? 0) + 1;
    deg[r.to] = (deg[r.to] ?? 0) + 1;
  }
  return deg;
}

export function labelPath(
  data: AetherData,
  path: GraphPath
): string {
  const labelOf = (id: string) =>
    data.nodes.find((n) => n.id === id)?.label ?? id;
  if (path.nodeIds.length === 1) return labelOf(path.nodeIds[0]);
  const parts: string[] = [labelOf(path.nodeIds[0])];
  for (const hop of path.hops) {
    parts.push(`—${hop.relType}→`, labelOf(hop.toId));
  }
  return parts.join(' ');
}

export function formatPathSummary(
  data: AetherData,
  path: GraphPath
): string {
  const hops = path.hops.length;
  if (hops === 0) return 'Same entity';
  return `${hops} hop${hops === 1 ? '' : 's'}`;
}

/** Resolve a node by id from data. */
export function getNode(data: AetherData, id: string): OntologyNode | undefined {
  return data.nodes.find((n) => n.id === id);
}

export function getRelationship(
  data: AetherData,
  id: string
): Relationship | undefined {
  return data.relationships.find((r) => r.id === id);
}
