// lib/workspace-templates.ts — seed packs for empty workspaces & onboarding
import type { AetherData, OntologyNode, Relationship } from '@/types';
import { initialAetherData } from './data';

export type TemplateAccent =
  | 'cyan'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'orange'
  | 'slate';

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  /** Short line for cards */
  blurb: string;
  emoji: string;
  accent: TemplateAccent;
  tags: string[];
  /** Approximate size for UI badges */
  entityCount: number;
  relationshipCount: number;
  /** Build a fresh deep-cloned graph (unique enough for a new workspace). */
  build: () => AetherData;
}

function cloneGraph(data: AetherData): AetherData {
  return {
    nodes: data.nodes.map((n) => ({
      ...n,
      properties: { ...n.properties },
      tags: n.tags ? [...n.tags] : undefined,
    })),
    relationships: data.relationships.map((r) => ({
      ...r,
      properties: r.properties ? { ...r.properties } : undefined,
    })),
  };
}

let stampSeq = 0;

function stampIds(data: AetherData, prefix: string): AetherData {
  const idMap = new Map<string, string>();
  // Date.now alone can collide when building multiple packs in the same ms
  const stamp = `${Date.now().toString(36)}-${(stampSeq++).toString(36)}`;
  for (const n of data.nodes) {
    idMap.set(n.id, `${prefix}-${n.id}-${stamp}`);
  }
  return {
    nodes: data.nodes.map((n) => ({
      ...n,
      id: idMap.get(n.id)!,
      properties: { ...n.properties },
      tags: n.tags ? [...n.tags] : undefined,
    })),
    relationships: data.relationships.map((r, i) => ({
      ...r,
      id: `${prefix}-rel-${i}-${stamp}`,
      from: idMap.get(r.from) ?? r.from,
      to: idMap.get(r.to) ?? r.to,
      properties: r.properties ? { ...r.properties } : undefined,
    })),
  };
}

function graph(
  nodes: OntologyNode[],
  relationships: Relationship[]
): AetherData {
  return { nodes, relationships };
}

// ─── Template graphs ──────────────────────────────────────────────────────────

function startupGraph(): AetherData {
  return stampIds(
    graph(
      [
        {
          id: 'founder',
          type: 'Person',
          label: 'Alex Founder',
          properties: { role: 'CEO', email: 'alex@startup.io' },
          tags: ['founder'],
          createdAt: '2026-01-15',
        },
        {
          id: 'eng',
          type: 'Person',
          label: 'Riley Eng',
          properties: { role: 'Engineer', email: 'riley@startup.io' },
          tags: ['engineering'],
          createdAt: '2026-02-01',
        },
        {
          id: 'pm',
          type: 'Person',
          label: 'Casey PM',
          properties: { role: 'Product Manager' },
          tags: ['product'],
          createdAt: '2026-02-10',
        },
        {
          id: 'mvp',
          type: 'Project',
          label: 'MVP Launch',
          properties: {
            status: 'Active',
            budget: 60000,
            priority: 'Critical',
            progress: 55,
            startDate: '2026-03-01',
            endDate: '2026-08-01',
          },
          tags: ['product', 'launch'],
          createdAt: '2026-03-01',
        },
        {
          id: 'growth',
          type: 'Project',
          label: 'Growth Experiments',
          properties: {
            status: 'Planning',
            budget: 15000,
            priority: 'Medium',
            progress: 10,
          },
          tags: ['growth'],
          createdAt: '2026-04-01',
        },
        {
          id: 'infra',
          type: 'Project',
          label: 'Platform Reliability',
          properties: {
            status: 'At Risk',
            budget: 22000,
            priority: 'High',
            progress: 30,
          },
          tags: ['infra'],
          createdAt: '2026-03-15',
        },
        {
          id: 'hq',
          type: 'Location',
          label: 'HQ · Downtown',
          properties: {
            city: 'Toronto',
            province: 'Ontario',
            type: 'HQ',
            coordinates: { lat: 43.6532, lng: -79.3832 },
          },
          tags: ['office'],
          createdAt: '2026-01-01',
        },
        {
          id: 'mrr',
          type: 'Metric',
          label: 'MRR',
          properties: { value: 8200, unit: 'CAD', trend: 'up' },
          tags: ['finance'],
          createdAt: '2026-05-01',
        },
        {
          id: 'users',
          type: 'Metric',
          label: 'Weekly Active Users',
          properties: { value: 410, unit: 'users', trend: 'up' },
          tags: ['product'],
          createdAt: '2026-05-01',
        },
        {
          id: 'board',
          type: 'Event',
          label: 'Investor Update',
          properties: { type: 'meeting', date: '2026-07-15', status: 'scheduled' },
          tags: ['fundraising'],
          createdAt: '2026-05-20',
        },
      ],
      [
        { id: 'r1', from: 'founder', to: 'mvp', type: 'worksOn', properties: { role: 'Lead' } },
        { id: 'r2', from: 'eng', to: 'mvp', type: 'worksOn', properties: { role: 'Engineer' } },
        { id: 'r3', from: 'pm', to: 'mvp', type: 'worksOn', properties: { role: 'PM' } },
        { id: 'r4', from: 'founder', to: 'growth', type: 'worksOn' },
        { id: 'r5', from: 'eng', to: 'infra', type: 'worksOn' },
        { id: 'r6', from: 'mvp', to: 'hq', type: 'locatedAt' },
        { id: 'r7', from: 'mvp', to: 'mrr', type: 'hasMetric' },
        { id: 'r8', from: 'mvp', to: 'users', type: 'hasMetric' },
        { id: 'r9', from: 'founder', to: 'board', type: 'participatedIn' },
      ]
    ),
    'tpl-startup'
  );
}

function jobHuntGraph(): AetherData {
  return stampIds(
    graph(
      [
        {
          id: 'me',
          type: 'Person',
          label: 'You',
          properties: { role: 'Candidate', location: 'Remote / Hybrid' },
          tags: ['self'],
          createdAt: '2026-04-01',
        },
        {
          id: 'ref',
          type: 'Person',
          label: 'Morgan Mentor',
          properties: { role: 'Referral', email: 'morgan@example.com' },
          tags: ['network'],
          createdAt: '2026-04-05',
        },
        {
          id: 'recruiter',
          type: 'Person',
          label: 'Jamie Recruiter',
          properties: { role: 'Recruiter', email: 'jamie@talent.co' },
          tags: ['recruiter'],
          createdAt: '2026-04-12',
        },
        {
          id: 'role1',
          type: 'Project',
          label: 'Staff Engineer @ Northwind',
          properties: {
            status: 'Active',
            priority: 'High',
            progress: 40,
            stage: 'Onsite',
          },
          tags: ['application', 'engineering'],
          createdAt: '2026-04-10',
        },
        {
          id: 'role2',
          type: 'Project',
          label: 'PM Lead @ Contoso',
          properties: {
            status: 'Planning',
            priority: 'Medium',
            progress: 15,
            stage: 'Applied',
          },
          tags: ['application', 'product'],
          createdAt: '2026-04-18',
        },
        {
          id: 'role3',
          type: 'Project',
          label: 'Platform Eng @ Fabrikam',
          properties: {
            status: 'At Risk',
            priority: 'High',
            progress: 70,
            stage: 'Offer negotiation',
          },
          tags: ['application'],
          createdAt: '2026-03-20',
        },
        {
          id: 'sf',
          type: 'Location',
          label: 'San Francisco Bay',
          properties: {
            city: 'San Francisco',
            type: 'Region',
            coordinates: { lat: 37.7749, lng: -122.4194 },
          },
          tags: ['geo'],
          createdAt: '2026-04-01',
        },
        {
          id: 'remote',
          type: 'Location',
          label: 'Remote',
          properties: { type: 'Remote', city: 'Anywhere' },
          tags: ['geo'],
          createdAt: '2026-04-01',
        },
        {
          id: 'interview',
          type: 'Event',
          label: 'Northwind System Design',
          properties: {
            type: 'interview',
            date: '2026-06-28',
            status: 'scheduled',
          },
          tags: ['interview'],
          createdAt: '2026-05-01',
        },
        {
          id: 'resume',
          type: 'Document',
          label: 'Resume v4',
          properties: { format: 'PDF', status: 'ready' },
          tags: ['materials'],
          createdAt: '2026-04-02',
        },
      ],
      [
        { id: 'r1', from: 'me', to: 'role1', type: 'worksOn' },
        { id: 'r2', from: 'me', to: 'role2', type: 'worksOn' },
        { id: 'r3', from: 'me', to: 'role3', type: 'worksOn' },
        { id: 'r4', from: 'ref', to: 'role1', type: 'relatedTo', properties: { note: 'Referral' } },
        { id: 'r5', from: 'recruiter', to: 'role2', type: 'relatedTo' },
        { id: 'r6', from: 'role1', to: 'sf', type: 'locatedAt' },
        { id: 'r7', from: 'role2', to: 'remote', type: 'locatedAt' },
        { id: 'r8', from: 'me', to: 'interview', type: 'participatedIn' },
        { id: 'r9', from: 'role1', to: 'interview', type: 'relatedTo' },
        { id: 'r10', from: 'me', to: 'resume', type: 'hasDocument' },
      ]
    ),
    'tpl-job'
  );
}

function researchGraph(): AetherData {
  return stampIds(
    graph(
      [
        {
          id: 'pi',
          type: 'Person',
          label: 'Dr. Nora Vale',
          properties: { role: 'Principal Investigator' },
          tags: ['pi', 'faculty'],
          createdAt: '2026-01-10',
        },
        {
          id: 'postdoc',
          type: 'Person',
          label: 'Dr. Kim Postdoc',
          properties: { role: 'Postdoctoral Researcher' },
          tags: ['lab'],
          createdAt: '2026-02-01',
        },
        {
          id: 'study',
          type: 'Project',
          label: 'Signal Detection Study',
          properties: {
            status: 'Active',
            priority: 'High',
            progress: 45,
            budget: 120000,
          },
          tags: ['study', 'grant'],
          createdAt: '2026-01-20',
        },
        {
          id: 'lit',
          type: 'Project',
          label: 'Literature Review',
          properties: { status: 'Complete', progress: 100, priority: 'Medium' },
          tags: ['writing'],
          createdAt: '2025-11-01',
        },
        {
          id: 'lab',
          type: 'Location',
          label: 'Cognitive Lab · Building C',
          properties: {
            city: 'Cambridge',
            type: 'Lab',
            coordinates: { lat: 42.3736, lng: -71.1097 },
          },
          tags: ['site'],
          createdAt: '2026-01-01',
        },
        {
          id: 'n',
          type: 'Metric',
          label: 'Sample size (n)',
          properties: { value: 86, unit: 'count', trend: 'up' },
          tags: ['stats'],
          createdAt: '2026-05-01',
        },
        {
          id: 'hyp',
          type: 'Insight',
          label: 'H1: latency predicts accuracy',
          properties: {
            confidence: 'medium',
            intent: 'summary',
            summary: 'Primary hypothesis for the signal detection study.',
          },
          tags: ['hypothesis'],
          createdAt: '2026-02-15',
        },
        {
          id: 'paper',
          type: 'Document',
          label: 'Draft manuscript',
          properties: { format: 'Markdown', status: 'draft' },
          tags: ['writing'],
          createdAt: '2026-04-01',
        },
        {
          id: 'conf',
          type: 'Event',
          label: 'Lab Meeting',
          properties: { type: 'meeting', date: '2026-06-12', status: 'scheduled' },
          tags: ['calendar'],
          createdAt: '2026-05-01',
        },
      ],
      [
        { id: 'r1', from: 'pi', to: 'study', type: 'worksOn', properties: { role: 'PI' } },
        { id: 'r2', from: 'postdoc', to: 'study', type: 'worksOn', properties: { role: 'Lead' } },
        { id: 'r3', from: 'postdoc', to: 'lit', type: 'worksOn' },
        { id: 'r4', from: 'study', to: 'lab', type: 'locatedAt' },
        { id: 'r5', from: 'study', to: 'n', type: 'hasMetric' },
        { id: 'r6', from: 'study', to: 'hyp', type: 'hasAnalysis' },
        { id: 'r7', from: 'study', to: 'paper', type: 'hasDocument' },
        { id: 'r8', from: 'pi', to: 'conf', type: 'participatedIn' },
        { id: 'r9', from: 'postdoc', to: 'conf', type: 'participatedIn' },
      ]
    ),
    'tpl-research'
  );
}

function personalOpsGraph(): AetherData {
  // Re-stamp the rich demo seed so each apply gets unique ids
  return stampIds(cloneGraph(initialAetherData), 'tpl-demo');
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: 'blank',
    name: 'Blank canvas',
    description: 'Start with an empty graph and build your own ontology.',
    blurb: 'No seed data — pure empty workspace.',
    emoji: '◻',
    accent: 'slate',
    tags: ['empty'],
    entityCount: 0,
    relationshipCount: 0,
    build: () => ({ nodes: [], relationships: [] }),
  },
  {
    id: 'startup',
    name: 'Startup ops',
    description:
      'Team, product launches, metrics, and HQ — a product company command center.',
    blurb: 'MVP, growth, infra, MRR, team.',
    emoji: '🚀',
    accent: 'cyan',
    tags: ['product', 'startup', 'metrics'],
    entityCount: 10,
    relationshipCount: 9,
    build: startupGraph,
  },
  {
    id: 'job-hunt',
    name: 'Job search',
    description:
      'Track applications, recruiters, interviews, and materials as a living graph.',
    blurb: 'Roles, network, interviews, resume.',
    emoji: '🎯',
    accent: 'violet',
    tags: ['career', 'applications'],
    entityCount: 10,
    relationshipCount: 10,
    build: jobHuntGraph,
  },
  {
    id: 'research',
    name: 'Research lab',
    description:
      'Studies, hypotheses, lab sites, sample metrics, and draft papers.',
    blurb: 'PI, study, lab, hypothesis, manuscript.',
    emoji: '🔬',
    accent: 'emerald',
    tags: ['academia', 'science'],
    entityCount: 9,
    relationshipCount: 9,
    build: researchGraph,
  },
  {
    id: 'personal-demo',
    name: 'Personal demo',
    description:
      'The full Aether showcase graph — projects, people, map pins, and metrics.',
    blurb: 'Richest seed for exploring every view.',
    emoji: '✦',
    accent: 'amber',
    tags: ['demo', 'tour'],
    entityCount: initialAetherData.nodes.length,
    relationshipCount: initialAetherData.relationships.length,
    build: personalOpsGraph,
  },
];

export function getTemplate(id: string): WorkspaceTemplate | undefined {
  return WORKSPACE_TEMPLATES.find((t) => t.id === id);
}

export function buildTemplateData(templateId: string): AetherData {
  const tpl = getTemplate(templateId);
  if (!tpl) return { nodes: [], relationships: [] };
  return tpl.build();
}

/** Templates shown on empty-state onboarding (exclude pure blank from “starter packs”). */
export function starterTemplates(): WorkspaceTemplate[] {
  return WORKSPACE_TEMPLATES.filter((t) => t.id !== 'blank');
}

/** True when applying a template would wipe existing graph data. */
export function needsTemplateApplyConfirm(
  nodeCount: number,
  relCount = 0
): boolean {
  return nodeCount > 0 || relCount > 0;
}

export function templateApplyConfirmMessage(opts: {
  templateId: string;
  nodeCount: number;
  relCount: number;
}): string {
  const name = getTemplate(opts.templateId)?.name ?? opts.templateId;
  const ent =
    opts.nodeCount === 1 ? '1 entity' : `${opts.nodeCount} entities`;
  const rels =
    opts.relCount === 1 ? '1 relationship' : `${opts.relCount} relationships`;
  return (
    `Replace this workspace’s graph with “${name}”?\n\n` +
    `Current data (${ent} · ${rels}) will be replaced.\n\n` +
    `You can undo with ⌘Z / Ctrl+Z after applying.`
  );
}

/**
 * @deprecated Prefer ConfirmTemplateDialog. Kept for tests / non-UI callers.
 * Confirm (if needed) via window.confirm. Returns false if cancelled.
 */
export function confirmTemplateApply(opts: {
  templateId: string;
  nodeCount: number;
  relCount: number;
}): boolean {
  if (!needsTemplateApplyConfirm(opts.nodeCount, opts.relCount)) return true;
  if (typeof window === 'undefined') return true;
  return window.confirm(templateApplyConfirmMessage(opts));
}
