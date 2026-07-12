// lib/command-palette.ts — command definitions + fuzzy ranking for ⌘K palette
import type { EntityType, OntologyNode } from '@/types';
import type { LucideIcon } from 'lucide-react';
import {
  Home, Search, Users, Table2, FolderOpen, Columns2, Clock, Map as MapIcon,
  BarChart3, Database, CalendarDays, Plus, FileText, Upload,
  Sparkles, BookOpen, Keyboard, Shuffle, Network, Download, Route, Focus,
  Layers, Undo2, Redo2, Settings,
} from 'lucide-react';
import { starterTemplates } from '@/lib/workspace-templates';

export type CommandSection =
  | 'Navigate'
  | 'Actions'
  | 'Intelligence'
  | 'Entities';

export interface PaletteCommand {
  id: string;
  label: string;
  /** Secondary line under the label */
  hint?: string;
  section: CommandSection;
  /** Free-text keywords for matching beyond the label */
  keywords?: string[];
  icon: LucideIcon;
  /** Optional kbd hint shown on the right, e.g. "⌘⇧G" */
  shortcut?: string;
  /** When set, this command jumps to an entity */
  entityId?: string;
  entityType?: EntityType;
  run: () => void;
}

export interface PaletteHandlers {
  go: (view: string) => void;
  newEntity: () => void;
  openAI: (query?: string) => void;
  openPDF: () => void;
  openReport: () => void;
  openShortcuts: () => void;
  importJSON: () => void;
  exportJSON: () => void;
  surprise: () => void;
  selectEntity: (node: OntologyNode) => void;
  openPathFinder: () => void;
  focusSelectedNeighborhood: () => void;
  applyTemplate: (templateId: string) => void;
  undo: () => void;
  redo: () => void;
  openSettings: () => void;
}

/** Static navigation + action commands (entities are appended at runtime). */
export function buildStaticCommands(h: PaletteHandlers): PaletteCommand[] {
  return [
    // Navigate
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      hint: 'Command Center graph',
      section: 'Navigate',
      keywords: ['home', 'graph', 'command center'],
      icon: Home,
      shortcut: '⌘⇧G',
      run: () => h.go('dashboard'),
    },
    {
      id: 'nav-search',
      label: 'Go to Search',
      hint: 'Ontology-wide search',
      section: 'Navigate',
      keywords: ['find'],
      icon: Search,
      run: () => h.go('search'),
    },
    {
      id: 'nav-entities',
      label: 'Go to Entities',
      hint: 'All nodes in the graph',
      section: 'Navigate',
      keywords: ['nodes', 'people', 'list'],
      icon: Users,
      run: () => h.go('entities'),
    },
    {
      id: 'nav-table',
      label: 'Go to Table',
      section: 'Navigate',
      keywords: ['spreadsheet', 'grid'],
      icon: Table2,
      shortcut: '⌘⇧T',
      run: () => h.go('table'),
    },
    {
      id: 'nav-projects',
      label: 'Go to Projects',
      section: 'Navigate',
      keywords: ['portfolio', 'initiatives'],
      icon: FolderOpen,
      run: () => h.go('projects'),
    },
    {
      id: 'nav-kanban',
      label: 'Go to Kanban',
      section: 'Navigate',
      keywords: ['board', 'status'],
      icon: Columns2,
      shortcut: '⌘⇧K',
      run: () => h.go('kanban'),
    },
    {
      id: 'nav-timeline',
      label: 'Go to Timeline',
      section: 'Navigate',
      keywords: ['gantt', 'schedule'],
      icon: Clock,
      shortcut: '⌘⇧L',
      run: () => h.go('timeline'),
    },
    {
      id: 'nav-geospatial',
      label: 'Go to Geospatial',
      section: 'Navigate',
      keywords: ['map', 'location', 'geo'],
      icon: MapIcon,
      run: () => h.go('geospatial'),
    },
    {
      id: 'nav-analytics',
      label: 'Go to Analytics',
      section: 'Navigate',
      keywords: ['insights', 'reports'],
      icon: BarChart3,
      run: () => h.go('analytics'),
    },
    {
      id: 'nav-calendar',
      label: 'Go to Calendar',
      section: 'Navigate',
      keywords: ['dates', 'events', 'schedule'],
      icon: CalendarDays,
      run: () => h.go('calendar'),
    },
    {
      id: 'nav-data',
      label: 'Go to Data',
      section: 'Navigate',
      keywords: ['snapshots', 'import', 'enrich', 'backup'],
      icon: Database,
      run: () => h.go('data'),
    },

    // Actions
    {
      id: 'act-undo',
      label: 'Undo',
      hint: 'Revert last graph change',
      section: 'Actions',
      keywords: ['history', 'revert', 'back'],
      icon: Undo2,
      shortcut: '⌘Z',
      run: () => h.undo(),
    },
    {
      id: 'act-redo',
      label: 'Redo',
      hint: 'Re-apply undone change',
      section: 'Actions',
      keywords: ['history', 'forward'],
      icon: Redo2,
      shortcut: '⌘⇧Z',
      run: () => h.redo(),
    },
    {
      id: 'act-new-entity',
      label: 'New entity',
      hint: 'Person, project, location…',
      section: 'Actions',
      keywords: ['create', 'add', 'node'],
      icon: Plus,
      shortcut: '⌘N',
      run: () => h.newEntity(),
    },
    {
      id: 'act-pdf',
      label: 'Upload PDF',
      hint: 'Extract entities from a document',
      section: 'Actions',
      keywords: ['document', 'extract'],
      icon: FileText,
      run: () => h.openPDF(),
    },
    {
      id: 'act-import',
      label: 'Import JSON backup',
      section: 'Actions',
      keywords: ['restore', 'load', 'file'],
      icon: Upload,
      run: () => h.importJSON(),
    },
    {
      id: 'act-export',
      label: 'Export JSON backup',
      section: 'Actions',
      keywords: ['download', 'save', 'backup'],
      icon: Download,
      run: () => h.exportJSON(),
    },
    {
      id: 'act-shortcuts',
      label: 'Keyboard shortcuts',
      section: 'Actions',
      keywords: ['help', 'hotkeys', 'cheatsheet'],
      icon: Keyboard,
      shortcut: '?',
      run: () => h.openShortcuts(),
    },
    {
      id: 'act-settings',
      label: 'Open settings',
      hint: 'Export, reset, workspace name…',
      section: 'Actions',
      keywords: ['preferences', 'profile', 'export', 'reset', 'config'],
      icon: Settings,
      run: () => h.openSettings(),
    },

    // Intelligence
    {
      id: 'ai-analyse',
      label: 'Open AI Analyst',
      hint: 'Natural-language analysis of your graph',
      section: 'Intelligence',
      keywords: ['gpt', 'llm', 'ask', 'analyse', 'analyze'],
      icon: Sparkles,
      shortcut: '⌘⇧M',
      run: () => h.openAI(),
    },
    {
      id: 'ai-surprise',
      label: 'Surprise me',
      hint: 'Run a random smart insight',
      section: 'Intelligence',
      keywords: ['random', 'inspire'],
      icon: Shuffle,
      run: () => h.surprise(),
    },
    {
      id: 'ai-report',
      label: 'Generate PDF report',
      section: 'Intelligence',
      keywords: ['export', 'branded', 'document'],
      icon: BookOpen,
      run: () => h.openReport(),
    },
    {
      id: 'graph-path',
      label: 'Find path between entities',
      hint: 'Shortest path on the intelligence graph',
      section: 'Intelligence',
      keywords: ['route', 'connection', 'how connected', 'bridge', 'pathfinder'],
      icon: Route,
      run: () => h.openPathFinder(),
    },
    {
      id: 'graph-focus',
      label: 'Focus neighborhood of selected',
      hint: '1-hop subgraph around the open entity',
      section: 'Intelligence',
      keywords: ['subgraph', 'nearby', 'cluster', 'local'],
      icon: Focus,
      run: () => h.focusSelectedNeighborhood(),
    },

    // Templates (replace active graph — useful for empty workspaces)
    ...starterTemplates().map((t) => ({
      id: `tpl-${t.id}`,
      label: `Apply template: ${t.name}`,
      hint: t.blurb,
      section: 'Actions' as const,
      keywords: ['template', 'onboarding', 'seed', 'starter', ...t.tags],
      icon: Layers,
      run: () => h.applyTemplate(t.id),
    })),
  ];
}

export function entityCommands(
  nodes: OntologyNode[],
  selectEntity: (node: OntologyNode) => void,
  limit = 40
): PaletteCommand[] {
  return nodes.slice(0, limit).map((n) => ({
    id: `entity-${n.id}`,
    label: n.label,
    hint: n.type,
    section: 'Entities' as const,
    keywords: [
      n.type,
      ...(n.tags ?? []),
      ...Object.values(n.properties)
        .filter((v) => typeof v === 'string' || typeof v === 'number')
        .map(String),
    ],
    icon: Network,
    entityId: n.id,
    entityType: n.type,
    run: () => selectEntity(n),
  }));
}

/** Simple rank: lower is better. Returns null if no match. */
export function scoreCommand(cmd: PaletteCommand, query: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const label = cmd.label.toLowerCase();
  const hay = [
    label,
    cmd.hint?.toLowerCase() ?? '',
    cmd.section.toLowerCase(),
    ...(cmd.keywords ?? []).map((k) => k.toLowerCase()),
  ].join(' ');

  if (label === q) return 0;
  if (label.startsWith(q)) return 1;
  if (label.includes(q)) return 2;

  // all tokens must appear somewhere
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.every((t) => hay.includes(t))) {
    // prefer earlier token hits in the label
    const labelHits = tokens.filter((t) => label.includes(t)).length;
    return 3 + (tokens.length - labelHits);
  }

  // fuzzy: characters in order
  if (fuzzyMatch(label, q) || fuzzyMatch(hay, q)) return 10;

  return null;
}

function fuzzyMatch(text: string, query: string): boolean {
  let ti = 0;
  for (let qi = 0; qi < query.length; qi++) {
    const ch = query[qi];
    const found = text.indexOf(ch, ti);
    if (found === -1) return false;
    ti = found + 1;
  }
  return true;
}

export interface RankedCommand extends PaletteCommand {
  score: number;
}

const SECTION_ORDER: CommandSection[] = [
  'Navigate',
  'Actions',
  'Intelligence',
  'Entities',
];

export function filterCommands(
  commands: PaletteCommand[],
  query: string
): RankedCommand[] {
  const ranked: RankedCommand[] = [];
  for (const cmd of commands) {
    const score = scoreCommand(cmd, query);
    if (score === null) continue;
    ranked.push({ ...cmd, score });
  }

  ranked.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    const sa = SECTION_ORDER.indexOf(a.section);
    const sb = SECTION_ORDER.indexOf(b.section);
    if (sa !== sb) return sa - sb;
    return a.label.localeCompare(b.label);
  });

  // Cap entity flood when browsing empty query — show static first
  if (!query.trim()) {
    const statics = ranked.filter((c) => c.section !== 'Entities');
    const entities = ranked.filter((c) => c.section === 'Entities').slice(0, 8);
    return [...statics, ...entities];
  }

  return ranked.slice(0, 50);
}

export function groupBySection(commands: RankedCommand[]): {
  section: CommandSection;
  items: RankedCommand[];
}[] {
  const map = new Map<CommandSection, RankedCommand[]>();
  for (const cmd of commands) {
    const list = map.get(cmd.section) ?? [];
    list.push(cmd);
    map.set(cmd.section, list);
  }
  return SECTION_ORDER
    .filter((s) => map.has(s))
    .map((section) => ({ section, items: map.get(section)! }));
}
