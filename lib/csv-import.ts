// lib/csv-import.ts
import { AetherData, OntologyNode, EntityType } from '@/types';

const VALID_TYPES: EntityType[] = [
  'Person', 'Project', 'Location', 'Metric', 'Insight', 'Event', 'Document',
];

// ─── Column mapping ────────────────────────────────────────────────────────────

export type MappedField = 'id' | 'label' | 'type' | 'skip' | string; // string = property key

export interface ColumnMapping {
  csvHeader: string;
  mappedTo: MappedField;
  sample: string[]; // first 3 sample values
}

// ─── Auto-detection heuristics ────────────────────────────────────────────────

const LABEL_PATTERNS = /^(name|label|title|entity|subject|display_?name)$/i;
const ID_PATTERNS    = /^(id|uuid|key|identifier|entity_?id)$/i;
const TYPE_PATTERNS  = /^(type|kind|category|entity_?type|class)$/i;

function detectField(header: string, samples: string[]): MappedField {
  if (ID_PATTERNS.test(header))    return 'id';
  if (LABEL_PATTERNS.test(header)) return 'label';
  if (TYPE_PATTERNS.test(header)) {
    const knownTypes = samples.filter(s => VALID_TYPES.includes(s as EntityType));
    if (knownTypes.length > 0) return 'type';
  }
  return header.toLowerCase().replace(/\s+/g, '_');
}

export function detectColumnMappings(headers: string[], rows: string[][]): ColumnMapping[] {
  return headers.map((header, colIdx) => {
    const samples = rows.slice(0, 3).map(r => r[colIdx] ?? '').filter(Boolean);
    return {
      csvHeader: header,
      mappedTo: detectField(header, samples),
      sample: samples,
    };
  });
}

// ─── CSV parser (RFC 4180 subset) ─────────────────────────────────────────────

export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  const parse = (line: string): string[] => {
    const cells: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQuote = false;
        else cur += ch;
      } else {
        if (ch === '"') inQuote = true;
        else if (ch === ',') { cells.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  };

  const headers = parse(nonEmpty[0]);
  const rows = nonEmpty.slice(1).map(parse);
  return { headers, rows };
}

// ─── Suggested entity type from sample data ───────────────────────────────────

export function suggestEntityType(rows: string[][], mappings: ColumnMapping[]): EntityType {
  const typeMapping = mappings.find(m => m.mappedTo === 'type');
  if (typeMapping) {
    const colIdx = mappings.indexOf(typeMapping);
    const firstType = rows[0]?.[colIdx];
    if (firstType && VALID_TYPES.includes(firstType as EntityType)) return firstType as EntityType;
  }

  // Heuristic by column names
  const headers = mappings.map(m => m.csvHeader.toLowerCase());
  if (headers.some(h => /email|phone|role|department/.test(h))) return 'Person';
  if (headers.some(h => /budget|deadline|milestone|status/.test(h))) return 'Project';
  if (headers.some(h => /lat|lng|country|city|address/.test(h))) return 'Location';
  if (headers.some(h => /value|unit|target|actual/.test(h))) return 'Metric';
  return 'Document';
}

// ─── Convert rows to nodes ────────────────────────────────────────────────────

export interface CSVImportResult {
  data: AetherData;
  nodeCount: number;
  skipped: number;
  warnings: string[];
}

export function csvRowsToNodes(
  rows: string[][],
  mappings: ColumnMapping[],
  defaultType: EntityType,
): CSVImportResult {
  const warnings: string[] = [];
  const nodes: OntologyNode[] = [];
  let skipped = 0;

  rows.forEach((row, rowIdx) => {
    const idMapping    = mappings.find(m => m.mappedTo === 'id');
    const labelMapping = mappings.find(m => m.mappedTo === 'label');
    const typeMapping  = mappings.find(m => m.mappedTo === 'type');

    const idIdx    = idMapping    ? mappings.indexOf(idMapping)    : -1;
    const labelIdx = labelMapping ? mappings.indexOf(labelMapping) : -1;
    const typeIdx  = typeMapping  ? mappings.indexOf(typeMapping)  : -1;

    const rawLabel = labelIdx >= 0 ? (row[labelIdx] ?? '') : '';
    if (!rawLabel.trim()) { skipped++; return; }

    const rawId   = idIdx >= 0 ? (row[idIdx] ?? '') : '';
    const rawType = typeIdx >= 0 ? (row[typeIdx] ?? '') : '';

    const nodeType: EntityType = VALID_TYPES.includes(rawType as EntityType)
      ? (rawType as EntityType)
      : defaultType;

    const properties: Record<string, string | number> = {};
    mappings.forEach((m, colIdx) => {
      if (m.mappedTo === 'id' || m.mappedTo === 'label' || m.mappedTo === 'type' || m.mappedTo === 'skip') return;
      const val = row[colIdx];
      if (val !== undefined && val !== '') {
        // Try to coerce numbers
        const num = Number(val);
        properties[m.mappedTo] = !isNaN(num) && val.trim() !== '' ? num : val;
      }
    });

    const id = rawId.trim() || `csv-${Date.now()}-${rowIdx}`;

    nodes.push({
      id,
      type: nodeType,
      label: rawLabel.trim(),
      properties,
      createdAt: new Date().toISOString(),
    });
  });

  if (skipped > 0) {
    warnings.push(`${skipped} row${skipped !== 1 ? 's' : ''} skipped — missing label/name value.`);
  }

  return {
    data: { nodes, relationships: [] },
    nodeCount: nodes.length,
    skipped,
    warnings,
  };
}
