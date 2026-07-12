import { describe, it, expect } from 'vitest';
import {
  findShortestPath,
  findNeighborhood,
  labelPath,
  buildAdjacency,
  nodeDegrees,
} from './graph-path';
import type { AetherData } from '@/types';

const sample: AetherData = {
  nodes: [
    { id: 'a', type: 'Person', label: 'Ada', properties: {} },
    { id: 'b', type: 'Project', label: 'Launch', properties: {} },
    { id: 'c', type: 'Location', label: 'Hub', properties: {} },
    { id: 'd', type: 'Person', label: 'Bob', properties: {} },
    { id: 'e', type: 'Metric', label: 'MRR', properties: {} },
    { id: 'isolated', type: 'Document', label: 'Orphan', properties: {} },
  ],
  relationships: [
    { id: 'r1', from: 'a', to: 'b', type: 'worksOn' },
    { id: 'r2', from: 'b', to: 'c', type: 'locatedAt' },
    { id: 'r3', from: 'd', to: 'b', type: 'worksOn' },
    { id: 'r4', from: 'b', to: 'e', type: 'hasMetric' },
  ],
};

describe('buildAdjacency', () => {
  it('is undirected', () => {
    const adj = buildAdjacency(sample);
    expect(adj.get('a')?.some((e) => e.neighbor === 'b')).toBe(true);
    expect(adj.get('b')?.some((e) => e.neighbor === 'a')).toBe(true);
  });
});

describe('findShortestPath', () => {
  it('finds a multi-hop path', () => {
    const path = findShortestPath(sample, 'a', 'c');
    expect(path).not.toBeNull();
    expect(path!.nodeIds).toEqual(['a', 'b', 'c']);
    expect(path!.edgeIds).toEqual(['r1', 'r2']);
    expect(path!.hops.map((h) => h.relType)).toEqual(['worksOn', 'locatedAt']);
  });

  it('returns single-node path when from === to', () => {
    const path = findShortestPath(sample, 'a', 'a');
    expect(path!.nodeIds).toEqual(['a']);
    expect(path!.edgeIds).toEqual([]);
  });

  it('returns null when disconnected', () => {
    expect(findShortestPath(sample, 'a', 'isolated')).toBeNull();
  });

  it('returns null for missing ids', () => {
    expect(findShortestPath(sample, 'a', 'missing')).toBeNull();
    expect(findShortestPath(sample, 'nope', 'a')).toBeNull();
  });

  it('finds path via shared project (a → b → d)', () => {
    const path = findShortestPath(sample, 'a', 'd');
    expect(path!.nodeIds).toEqual(['a', 'b', 'd']);
  });

  it('labelPath produces readable chain', () => {
    const path = findShortestPath(sample, 'a', 'c')!;
    const label = labelPath(sample, path);
    expect(label).toContain('Ada');
    expect(label).toContain('worksOn');
    expect(label).toContain('Hub');
  });
});

describe('findNeighborhood', () => {
  it('depth 0 is just the center', () => {
    const n = findNeighborhood(sample, 'b', 0)!;
    expect(n.nodeIds).toEqual(['b']);
    expect(n.edgeIds).toEqual([]);
  });

  it('depth 1 includes direct neighbors', () => {
    const n = findNeighborhood(sample, 'b', 1)!;
    expect(new Set(n.nodeIds)).toEqual(new Set(['b', 'a', 'c', 'd', 'e']));
    expect(n.edgeIds.sort()).toEqual(['r1', 'r2', 'r3', 'r4'].sort());
  });

  it('depth 1 from leaf only has center + one neighbor', () => {
    const n = findNeighborhood(sample, 'a', 1)!;
    expect(new Set(n.nodeIds)).toEqual(new Set(['a', 'b']));
  });

  it('returns null for missing center', () => {
    expect(findNeighborhood(sample, 'zzz', 1)).toBeNull();
  });
});

describe('nodeDegrees', () => {
  it('counts undirected degree', () => {
    const deg = nodeDegrees(sample);
    expect(deg.b).toBe(4);
    expect(deg.a).toBe(1);
    expect(deg.isolated).toBe(0);
  });
});
