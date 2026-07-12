// lib/import.ts — single-graph + multi-workspace JSON import
import {
  AetherData,
  OntologyNode,
  Relationship,
  EntityType,
  Workspace,
} from '@/types';
import type { WorkspacesBundle } from '@/lib/export';

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_TYPES: EntityType[] = [
  'Person', 'Project', 'Location', 'Metric', 'Insight', 'Event', 'Document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const WORKSPACES_FORMAT = 'aether-workspaces-v1' as const;

// ─── Validators ───────────────────────────────────────────────────────────────

function isValidNode(n: unknown): n is OntologyNode {
  if (typeof n !== 'object' || n === null || Array.isArray(n)) return false;
  const o = n as Record<string, unknown>;
  return (
    typeof o.id === 'string' && o.id.trim().length > 0 &&
    typeof o.type === 'string' && (VALID_TYPES as string[]).includes(o.type) &&
    typeof o.label === 'string' && o.label.trim().length > 0 &&
    typeof o.properties === 'object' && o.properties !== null && !Array.isArray(o.properties)
  );
}

function isValidRelationship(r: unknown): r is Relationship {
  if (typeof r !== 'object' || r === null || Array.isArray(r)) return false;
  const o = r as Record<string, unknown>;
  return (
    typeof o.id === 'string' && o.id.trim().length > 0 &&
    typeof o.from === 'string' && o.from.trim().length > 0 &&
    typeof o.to === 'string' && o.to.trim().length > 0 &&
    typeof o.type === 'string' && o.type.trim().length > 0
  );
}

function normalizeWorkspace(raw: unknown, index: number, warnings: string[]): Workspace | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    warnings.push(`Workspace entry #${index + 1} is not an object — skipped.`);
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id.trim()) {
    warnings.push(`Workspace entry #${index + 1} missing id — skipped.`);
    return null;
  }
  if (typeof o.name !== 'string' || !o.name.trim()) {
    warnings.push(`Workspace "${o.id}" missing name — using fallback.`);
  }
  const members = Array.isArray(o.members)
    ? o.members.filter((m): m is string => typeof m === 'string')
    : [];
  const sharedNodes = Array.isArray(o.sharedNodes)
    ? o.sharedNodes.filter((m): m is string => typeof m === 'string')
    : [];
  const sharedRelationships = Array.isArray(o.sharedRelationships)
    ? o.sharedRelationships.filter((m): m is string => typeof m === 'string')
    : [];

  return {
    id: o.id.trim(),
    name: typeof o.name === 'string' && o.name.trim() ? o.name.trim() : `Workspace ${index + 1}`,
    owner: typeof o.owner === 'string' ? o.owner : 'Imported',
    members,
    createdAt:
      typeof o.createdAt === 'string' && o.createdAt
        ? o.createdAt
        : new Date().toISOString(),
    sharedNodes,
    sharedRelationships,
  };
}

// ─── Graph parse (shared) ─────────────────────────────────────────────────────

export interface GraphParseResult {
  data: AetherData;
  nodeCount: number;
  relationshipCount: number;
  warnings: string[];
}

/** Parse a single { nodes, relationships } object. allowEmpty for blank workspaces. */
export function parseGraphObject(
  obj: Record<string, unknown>,
  options: { allowEmpty?: boolean; label?: string } = {}
): GraphParseResult {
  const { allowEmpty = false, label = 'graph' } = options;
  const warnings: string[] = [];
  const prefix = label !== 'graph' ? `[${label}] ` : '';

  if (!Array.isArray(obj.nodes)) {
    throw new Error(
      `${prefix}"nodes" array not found. Expected an Aether graph or workspaces backup.`
    );
  }
  if (!Array.isArray(obj.relationships)) {
    throw new Error(
      `${prefix}"relationships" array not found. The file may be truncated or incompatible.`
    );
  }

  const rawNodes: unknown[] = obj.nodes;
  const rawRels: unknown[] = obj.relationships;

  const validNodes = rawNodes.filter(isValidNode);
  const invalidNodeCount = rawNodes.length - validNodes.length;

  if (invalidNodeCount > 0) {
    if (validNodes.length === 0 && rawNodes.length > 0) {
      throw new Error(
        `${prefix}All ${rawNodes.length} nodes are invalid. Each needs id, type, label, properties.`
      );
    }
    warnings.push(
      `${prefix}${invalidNodeCount} node${invalidNodeCount !== 1 ? 's' : ''} skipped — invalid fields.`
    );
  }

  const validRels = rawRels.filter(isValidRelationship);
  const invalidRelCount = rawRels.length - validRels.length;
  if (invalidRelCount > 0) {
    warnings.push(
      `${prefix}${invalidRelCount} relationship${invalidRelCount !== 1 ? 's' : ''} skipped — invalid fields.`
    );
  }

  if (!allowEmpty && validNodes.length === 0) {
    throw new Error(
      `${prefix}No valid entities found. The file must contain at least one valid node.`
    );
  }

  const nodeIds = new Set(validNodes.map((n) => n.id));
  const dangling = validRels.filter((r) => !nodeIds.has(r.from) || !nodeIds.has(r.to));
  if (dangling.length > 0) {
    warnings.push(
      `${prefix}${dangling.length} relationship${dangling.length !== 1 ? 's' : ''} reference missing node IDs — still imported.`
    );
  }

  return {
    data: { nodes: validNodes, relationships: validRels },
    nodeCount: validNodes.length,
    relationshipCount: validRels.length,
    warnings,
  };
}

// ─── Result types ─────────────────────────────────────────────────────────────

export interface GraphImportResult {
  kind: 'graph';
  data: AetherData;
  nodeCount: number;
  relationshipCount: number;
  warnings: string[];
}

export interface WorkspacesImportResult {
  kind: 'workspaces';
  workspaces: Workspace[];
  workspaceData: Record<string, AetherData>;
  currentWorkspaceId: string;
  workspaceCount: number;
  totalNodes: number;
  totalRels: number;
  warnings: string[];
  /** Summary lines for the confirm dialog */
  workspaceSummaries: Array<{ id: string; name: string; nodes: number; rels: number }>;
}

/** @deprecated use GraphImportResult — kept as alias for existing call sites */
export type ImportResult = GraphImportResult;

export type AnyImportResult = GraphImportResult | WorkspacesImportResult;

// ─── Workspaces bundle parse ──────────────────────────────────────────────────

export function parseWorkspacesBundle(obj: Record<string, unknown>): WorkspacesImportResult {
  const warnings: string[] = [];

  if (obj.format !== WORKSPACES_FORMAT) {
    throw new Error(
      `Unsupported workspaces format "${String(obj.format)}". Expected "${WORKSPACES_FORMAT}".`
    );
  }

  if (!Array.isArray(obj.workspaces) || obj.workspaces.length === 0) {
    throw new Error('Workspaces backup has no workspaces array (or it is empty).');
  }

  if (
    typeof obj.workspaceData !== 'object' ||
    obj.workspaceData === null ||
    Array.isArray(obj.workspaceData)
  ) {
    throw new Error('Workspaces backup missing workspaceData object.');
  }

  const rawData = obj.workspaceData as Record<string, unknown>;
  const workspaces: Workspace[] = [];
  const seenIds = new Set<string>();

  obj.workspaces.forEach((raw, i) => {
    const ws = normalizeWorkspace(raw, i, warnings);
    if (!ws) return;
    if (seenIds.has(ws.id)) {
      warnings.push(`Duplicate workspace id "${ws.id}" — keeping first only.`);
      return;
    }
    seenIds.add(ws.id);
    workspaces.push(ws);
  });

  if (workspaces.length === 0) {
    throw new Error('No valid workspaces found in the backup.');
  }

  const workspaceData: Record<string, AetherData> = {};
  let totalNodes = 0;
  let totalRels = 0;
  const workspaceSummaries: WorkspacesImportResult['workspaceSummaries'] = [];

  for (const ws of workspaces) {
    const rawGraph = rawData[ws.id];
    if (rawGraph === undefined) {
      warnings.push(`No graph data for workspace "${ws.name}" — importing empty graph.`);
      workspaceData[ws.id] = { nodes: [], relationships: [] };
      workspaceSummaries.push({ id: ws.id, name: ws.name, nodes: 0, rels: 0 });
      continue;
    }
    if (typeof rawGraph !== 'object' || rawGraph === null || Array.isArray(rawGraph)) {
      warnings.push(`Invalid graph for "${ws.name}" — importing empty graph.`);
      workspaceData[ws.id] = { nodes: [], relationships: [] };
      workspaceSummaries.push({ id: ws.id, name: ws.name, nodes: 0, rels: 0 });
      continue;
    }
    try {
      const parsed = parseGraphObject(rawGraph as Record<string, unknown>, {
        allowEmpty: true,
        label: ws.name,
      });
      workspaceData[ws.id] = parsed.data;
      totalNodes += parsed.nodeCount;
      totalRels += parsed.relationshipCount;
      warnings.push(...parsed.warnings);
      workspaceSummaries.push({
        id: ws.id,
        name: ws.name,
        nodes: parsed.nodeCount,
        rels: parsed.relationshipCount,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'parse error';
      warnings.push(`Failed to parse graph for "${ws.name}": ${msg} — empty graph used.`);
      workspaceData[ws.id] = { nodes: [], relationships: [] };
      workspaceSummaries.push({ id: ws.id, name: ws.name, nodes: 0, rels: 0 });
    }
  }

  let currentWorkspaceId =
    typeof obj.currentWorkspaceId === 'string' ? obj.currentWorkspaceId : workspaces[0].id;
  if (!workspaceData[currentWorkspaceId]) {
    warnings.push(
      `currentWorkspaceId "${currentWorkspaceId}" not in backup — using "${workspaces[0].name}".`
    );
    currentWorkspaceId = workspaces[0].id;
  }

  return {
    kind: 'workspaces',
    workspaces,
    workspaceData,
    currentWorkspaceId,
    workspaceCount: workspaces.length,
    totalNodes,
    totalRels,
    warnings,
    workspaceSummaries,
  };
}

// ─── File entry point ─────────────────────────────────────────────────────────

function assertJsonFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.json')) {
    throw new Error(
      'File must have a .json extension. Export your data first to get the correct format.'
    );
  }
  if (file.size === 0) {
    throw new Error('The file is empty.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 10 MB.`
    );
  }
}

/**
 * Import either a single-graph backup or an aether-workspaces-v1 bundle.
 */
export async function importFromJSON(file: File): Promise<AnyImportResult> {
  assertJsonFile(file);

  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const msg = e instanceof SyntaxError ? e.message : 'unknown parse error';
    throw new Error(
      `Invalid JSON — could not parse the file (${msg}). Open it in a text editor to verify syntax.`
    );
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      'Unrecognised format. Expected a graph { nodes, relationships } or workspaces bundle. ' +
        'Use Export on the dashboard or Settings → Export all workspaces.'
    );
  }

  const obj = parsed as Record<string, unknown>;

  // Multi-workspace bundle
  if (obj.format === WORKSPACES_FORMAT || (obj.workspaces && obj.workspaceData)) {
    if (obj.format && obj.format !== WORKSPACES_FORMAT) {
      throw new Error(
        `Unsupported format field "${String(obj.format)}". Expected "${WORKSPACES_FORMAT}" or a single graph.`
      );
    }
    // If they have workspaces+workspaceData without format, treat as bundle
    if (!obj.format) {
      obj.format = WORKSPACES_FORMAT;
    }
    return parseWorkspacesBundle(obj);
  }

  // Single graph
  const graph = parseGraphObject(obj);
  return {
    kind: 'graph',
    data: graph.data,
    nodeCount: graph.nodeCount,
    relationshipCount: graph.relationshipCount,
    warnings: graph.warnings,
  };
}

/** Detect kind without full parse (for UI labels). */
export function isWorkspacesBundle(parsed: unknown): boolean {
  if (typeof parsed !== 'object' || parsed === null) return false;
  const o = parsed as Record<string, unknown>;
  return o.format === WORKSPACES_FORMAT || (Array.isArray(o.workspaces) && !!o.workspaceData);
}

export type { WorkspacesBundle };
