// lib/pdf-extract.ts
import { EntityType } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedEntity {
  id: string;
  type: EntityType;
  label: string;
  properties: Record<string, unknown>;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

export interface PDFParseResult {
  text: string;
  pageCount: number;
  wordCount: number;
}

// ─── PDF text extraction ──────────────────────────────────────────────────────

export async function extractTextFromPDF(file: File): Promise<PDFParseResult> {
  // Dynamic import so this never runs server-side
  const pdfjsLib = await import('pdfjs-dist');

  // Use CDN worker — avoids Next.js webpack bundling complications
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const pageParts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ');
    pageParts.push(pageText);
  }

  const text = pageParts.join('\n\n');
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return { text, pageCount: pdf.numPages, wordCount };
}

// ─── Entity extraction helpers ────────────────────────────────────────────────

function dedup(arr: ExtractedEntity[]): ExtractedEntity[] {
  const seen = new Set<string>();
  return arr.filter((e) => {
    const key = `${e.type}::${e.label.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Words that appear in title case but are NOT names
const SKIP_WORDS = new Set([
  'The', 'This', 'That', 'These', 'Those', 'When', 'Where', 'Which', 'What',
  'Some', 'Many', 'Each', 'Both', 'From', 'With', 'Into', 'Upon', 'Over',
  'Under', 'After', 'Before', 'During', 'Since', 'Until', 'About', 'Above',
  'Also', 'Such', 'More', 'Most', 'Less', 'Very', 'Just', 'Been', 'Have',
  'Will', 'Would', 'Could', 'Should', 'Must', 'Shall', 'May', 'Might',
  'Then', 'Than', 'Here', 'There', 'They', 'Their', 'Them', 'Your', 'Our',
  'His', 'Her', 'Its', 'All', 'Any', 'Not', 'But', 'And', 'For',
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
]);

// ─── Main extraction function ─────────────────────────────────────────────────

export function extractEntitiesFromText(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const ts = Date.now();
  let idx = 0;

  const nextId = () => `pdf-${ts}-${idx++}`;

  // ── 1. People with emails ──────────────────────────────────────────────────
  const emailPairRe = /([A-Za-z]+(?:[ \t]+[A-Za-z]+){1,3})\s*[<(]([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})[)>]/g;
  let m: RegExpExecArray | null;

  while ((m = emailPairRe.exec(text)) !== null) {
    const name = m[1].trim();
    if (name.split(' ').length < 2) continue;
    entities.push({
      id: nextId(),
      type: 'Person',
      label: name,
      properties: { email: m[2] },
      confidence: 'high',
      source: m[0],
    });
  }

  // ── 2. People with professional titles ────────────────────────────────────
  const titleRe = /\b(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g;
  while ((m = titleRe.exec(text)) !== null) {
    entities.push({
      id: nextId(),
      type: 'Person',
      label: `${m[1].replace('.', '')} ${m[2]}`.trim(),
      properties: {},
      confidence: 'medium',
      source: m[0],
    });
  }

  // ── 3. Standalone capitalized full names (2 parts, not sentence starts) ───
  const nameRe = /(?:^|[\s,;(])([A-Z][a-z]{1,14})\s+([A-Z][a-z]{1,14})(?=[\s,;.)]|$)/gm;
  while ((m = nameRe.exec(text)) !== null) {
    const first = m[1], last = m[2];
    if (SKIP_WORDS.has(first) || SKIP_WORDS.has(last)) continue;
    if (first === last) continue;
    entities.push({
      id: nextId(),
      type: 'Person',
      label: `${first} ${last}`,
      properties: {},
      confidence: 'low',
      source: `${first} ${last}`,
    });
  }

  // ── 4. Monetary amounts → Metric entities ─────────────────────────────────
  const moneyRe = /\$\s*(\d{1,3}(?:[,_]\d{3})*(?:\.\d{1,2})?)\s*([kKmMbB](?:illion|illion|rillion)?)?/g;
  const usedValues = new Set<number>();

  while ((m = moneyRe.exec(text)) !== null) {
    const raw = parseFloat(m[1].replace(/[,_]/g, ''));
    const suffix = m[2]?.toLowerCase()?.[0];
    const multiplier: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };
    const value = Math.round(raw * (multiplier[suffix ?? ''] ?? 1));
    if (value < 1000 || usedValues.has(value)) continue;
    usedValues.add(value);

    const pre = text.slice(Math.max(0, m.index - 45), m.index).trim();
    const labelMatch = pre.match(/([A-Z][a-zA-Z\s]{2,25})$/);
    const display = value >= 1_000_000
      ? `$${(value / 1_000_000).toFixed(1)}M`
      : `$${(value / 1000).toFixed(0)}k`;
    const label = labelMatch
      ? `${labelMatch[1].trim()} (${display})`
      : `Value: ${display}`;

    entities.push({
      id: nextId(),
      type: 'Metric',
      label,
      properties: { value, unit: 'CAD', trend: 'neutral' },
      confidence: 'medium',
      source: m[0],
    });
  }

  // ── 5. Dates + following context → Event entities ─────────────────────────
  const dateRe = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})\b/g;
  while ((m = dateRe.exec(text)) !== null) {
    const dateStr = m[1];
    const post = text.slice(m.index + m[0].length, m.index + m[0].length + 70).trim();
    const labelMatch = post.match(/^[:\-–—\s]*([A-Z][^.!?\n]{3,50})/);
    if (!labelMatch) continue;
    const eventLabel = labelMatch[1].trim().slice(0, 55);
    entities.push({
      id: nextId(),
      type: 'Event',
      label: eventLabel,
      properties: { date: dateStr, status: 'Upcoming' },
      confidence: 'medium',
      source: `${dateStr}: ${eventLabel}`,
    });
  }

  // ── 6. City, Province/State → Location entities ───────────────────────────
  const locationRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*,\s*(Ontario|Quebec|Alberta|British Columbia|Manitoba|Saskatchewan|Nova Scotia|New Brunswick|Newfoundland|California|New York|Texas|Florida|Washington|[A-Z]{2})\b/g;
  while ((m = locationRe.exec(text)) !== null) {
    entities.push({
      id: nextId(),
      type: 'Location',
      label: `${m[1]}, ${m[2]}`,
      properties: { city: m[1], province: m[2] },
      confidence: 'high',
      source: m[0],
    });
  }

  // ── 7. Keyword-anchored Project names ────────────────────────────────────
  const projectRe = /\b(?:Project|Initiative|Program|Launch|Campaign|Phase)\s*[:\-]?\s*([A-Z][A-Za-z0-9 \-]{2,40})/g;
  while ((m = projectRe.exec(text)) !== null) {
    const label = m[1].trim().replace(/\s+/g, ' ');
    if (label.length < 4) continue;
    entities.push({
      id: nextId(),
      type: 'Project',
      label,
      properties: { status: 'Planning', progress: 0 },
      confidence: 'medium',
      source: m[0],
    });
  }

  // ── Deduplicate, rank by confidence, cap at 25 ────────────────────────────
  const order: Record<ExtractedEntity['confidence'], number> = { high: 0, medium: 1, low: 2 };
  return dedup(entities)
    .sort((a, b) => order[a.confidence] - order[b.confidence])
    .slice(0, 25);
}

// ─── Human-readable extraction summary ───────────────────────────────────────

export function summarizeExtraction(entities: ExtractedEntity[]): string {
  const counts: Partial<Record<EntityType, number>> = {};
  entities.forEach((e) => { counts[e.type] = (counts[e.type] ?? 0) + 1; });

  const parts = (Object.entries(counts) as [EntityType, number][])
    .map(([t, n]) => `${n} ${t}${n !== 1 ? 's' : ''}`);

  if (parts.length === 0) return 'No entities detected in this document.';
  return `Detected ${parts.join(', ')} — select which to add to your intelligence graph.`;
}
