import { describe, it, expect } from 'vitest';
import {
  scoreNodeForContext,
  selectAnalysisContext,
  serializeContextForPrompt,
} from './ai-context';
import type { AetherData, OntologyNode } from '@/types';

function n(
  id: string,
  type: OntologyNode['type'],
  label: string,
  properties: Record<string, unknown> = {},
  tags: string[] = []
): OntologyNode {
  return { id, type, label, properties, tags };
}

const sample: AetherData = {
  nodes: [
    n('p1', 'Person', 'Avery Miller', { role: 'Founder' }, ['leadership']),
    n('p2', 'Person', 'Jordan Chen', { role: 'Engineer' }),
    n('proj1', 'Project', 'Q3 Product Launch', {
      status: 'Active',
      budget: 45000,
      progress: 65,
    }),
    n('proj2', 'Project', 'Ontario Expansion', {
      status: 'Planning',
      budget: 28000,
    }),
    n('loc1', 'Location', 'Stratford Tech Hub', {
      city: 'Stratford',
      coordinates: { lat: 43, lng: -81 },
    }),
    n('m1', 'Metric', 'Monthly Revenue', { value: 12400, unit: 'CAD', trend: 'up' }),
    n('doc1', 'Document', 'Random Notes', { format: 'PDF' }),
  ],
  relationships: [
    { id: 'r1', from: 'p1', to: 'proj1', type: 'worksOn' },
    { id: 'r2', from: 'p2', to: 'proj1', type: 'worksOn' },
    { id: 'r3', from: 'proj1', to: 'loc1', type: 'locatedAt' },
    { id: 'r4', from: 'proj1', to: 'm1', type: 'hasMetric' },
    { id: 'r5', from: 'p1', to: 'proj2', type: 'worksOn' },
  ],
};

describe('scoreNodeForContext', () => {
  it('boosts label matches over unrelated nodes', () => {
    const avery = scoreNodeForContext(
      sample.nodes[0],
      ['avery'],
      'team',
      2
    );
    const doc = scoreNodeForContext(sample.nodes[6], ['avery'], 'team', 0);
    expect(avery).toBeGreaterThan(doc);
  });

  it('boosts intent-matching types for financial queries', () => {
    const metric = scoreNodeForContext(
      sample.nodes[5],
      ['revenue'],
      'financial',
      1
    );
    const person = scoreNodeForContext(
      sample.nodes[1],
      ['revenue'],
      'financial',
      1
    );
    expect(metric).toBeGreaterThan(person);
  });
});

describe('selectAnalysisContext', () => {
  it('returns full graph when under maxNodes', () => {
    const sel = selectAnalysisContext(sample, 'overview', 'summary', {
      maxNodes: 50,
    });
    expect(sel.truncated).toBe(false);
    expect(sel.data.nodes).toHaveLength(sample.nodes.length);
    expect(sel.data.relationships).toHaveLength(sample.relationships.length);
  });

  it('truncates to maxNodes and only keeps internal edges', () => {
    const sel = selectAnalysisContext(
      sample,
      'Q3 Product Launch budget revenue',
      'financial',
      { maxNodes: 3, expandNeighbors: false }
    );
    expect(sel.data.nodes.length).toBeLessThanOrEqual(3);
    expect(sel.truncated).toBe(true);
    const ids = new Set(sel.selectedNodeIds);
    for (const r of sel.data.relationships) {
      expect(ids.has(r.from)).toBe(true);
      expect(ids.has(r.to)).toBe(true);
    }
  });

  it('prefers project/metric nodes for financial intent', () => {
    const sel = selectAnalysisContext(sample, 'budget ROI', 'financial', {
      maxNodes: 4,
      expandNeighbors: false,
    });
    const types = sel.data.nodes.map((x) => x.type);
    expect(types.some((t) => t === 'Project' || t === 'Metric')).toBe(true);
    // Document should be low priority
    expect(sel.selectedNodeIds.includes('doc1')).toBe(false);
  });

  it('expands neighbors of top hits', () => {
    const sel = selectAnalysisContext(
      sample,
      'Monthly Revenue',
      'financial',
      { maxNodes: 5, expandNeighbors: true }
    );
    // m1 is top hit; proj1 is neighbor via hasMetric
    expect(sel.selectedNodeIds).toContain('m1');
    expect(sel.selectedNodeIds).toContain('proj1');
  });

  it('handles empty graph', () => {
    const sel = selectAnalysisContext(
      { nodes: [], relationships: [] },
      'anything',
      'search'
    );
    expect(sel.data.nodes).toHaveLength(0);
    expect(sel.truncated).toBe(false);
  });

  it('serializeContextForPrompt includes selectionNote', () => {
    const sel = selectAnalysisContext(sample, 'launch', 'projects', {
      maxNodes: 2,
      expandNeighbors: false,
    });
    const json = serializeContextForPrompt(sel);
    const parsed = JSON.parse(json) as { selectionNote: string; nodes: unknown[] };
    expect(parsed.selectionNote).toMatch(/entities/i);
    expect(parsed.nodes.length).toBeLessThanOrEqual(2);
  });
});
