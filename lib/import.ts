// lib/import.ts
import { AetherData, OntologyNode, Relationship, EntityType } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_TYPES: EntityType[] = [
  'Person', 'Project', 'Location', 'Metric', 'Insight', 'Event', 'Document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

// ─── Result type ─────────────────────────────────────────────────────────────

export interface ImportResult {
  data: AetherData;
  nodeCount: number;
  relationshipCount: number;
  warnings: string[];
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function importFromJSON(file: File): Promise<ImportResult> {
  // ── File-level checks ──────────────────────────────────────────────────────
  if (!file.name.toLowerCase().endsWith('.json')) {
    throw new Error('File must have a .json extension. Export your data first to get the correct format.');
  }

  if (file.size === 0) {
    throw new Error('The file is empty.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 10 MB.`);
  }

  // ── Parse ──────────────────────────────────────────────────────────────────
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const msg = e instanceof SyntaxError ? e.message : 'unknown parse error';
    throw new Error(`Invalid JSON — could not parse the file (${msg}). Open it in a text editor to verify syntax.`);
  }

  // ── Shape checks ───────────────────────────────────────────────────────────
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      'Unrecognised format. Expected a JSON object with "nodes" and "relationships" arrays. ' +
      'Use Export JSON on the dashboard to generate a compatible file.'
    );
  }

  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.nodes)) {
    throw new Error(
      '"nodes" array not found. Make sure you\'re importing an Aether JSON backup — ' +
      'other JSON files are not supported.'
    );
  }

  if (!Array.isArray(obj.relationships)) {
    throw new Error(
      '"relationships" array not found. The file may be truncated or exported from an incompatible version.'
    );
  }

  // ── Validate individual items ──────────────────────────────────────────────
  const warnings: string[] = [];

  const rawNodes: unknown[] = obj.nodes;
  const rawRels:  unknown[] = obj.relationships;

  const validNodes = rawNodes.filter(isValidNode);
  const invalidNodeCount = rawNodes.length - validNodes.length;

  if (invalidNodeCount > 0) {
    if (validNodes.length === 0) {
      throw new Error(
        `All ${rawNodes.length} entries in "nodes" are invalid. Each node requires: id (string), ` +
        `type (one of: ${VALID_TYPES.join(', ')}), label (string), and properties (object).`
      );
    }
    warnings.push(
      `${invalidNodeCount} node${invalidNodeCount !== 1 ? 's' : ''} skipped — missing or invalid required fields (id, type, label, properties).`
    );
  }

  const validRels = rawRels.filter(isValidRelationship);
  const invalidRelCount = rawRels.length - validRels.length;

  if (invalidRelCount > 0) {
    warnings.push(
      `${invalidRelCount} relationship${invalidRelCount !== 1 ? 's' : ''} skipped — missing required fields (id, from, to, type).`
    );
  }

  if (validNodes.length === 0) {
    throw new Error('No valid entities found. The file must contain at least one valid node.');
  }

  // ── Referential integrity (soft check) ────────────────────────────────────
  const nodeIds = new Set(validNodes.map((n) => n.id));
  const dangling = validRels.filter((r) => !nodeIds.has(r.from) || !nodeIds.has(r.to));
  if (dangling.length > 0) {
    warnings.push(
      `${dangling.length} relationship${dangling.length !== 1 ? 's' : ''} reference node IDs not present in this file — they will still be imported.`
    );
  }

  return {
    data: { nodes: validNodes, relationships: validRels },
    nodeCount: validNodes.length,
    relationshipCount: validRels.length,
    warnings,
  };
}
