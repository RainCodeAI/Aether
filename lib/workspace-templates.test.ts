import { describe, it, expect, beforeEach } from 'vitest';
import {
  WORKSPACE_TEMPLATES,
  buildTemplateData,
  getTemplate,
  starterTemplates,
} from './workspace-templates';
import { useAetherStore } from './store';
import { emptyGraph, resetStore } from './test-utils/reset-store';

describe('workspace templates', () => {
  it('registers blank + starter packs', () => {
    expect(WORKSPACE_TEMPLATES.some((t) => t.id === 'blank')).toBe(true);
    expect(starterTemplates().every((t) => t.id !== 'blank')).toBe(true);
    expect(starterTemplates().length).toBeGreaterThanOrEqual(3);
  });

  it('builds non-empty graphs for starter templates', () => {
    for (const t of starterTemplates()) {
      const g = t.build();
      expect(g.nodes.length).toBe(t.entityCount);
      expect(g.relationships.length).toBe(t.relationshipCount);
      // all relationship endpoints resolve
      const ids = new Set(g.nodes.map((n) => n.id));
      for (const r of g.relationships) {
        expect(ids.has(r.from)).toBe(true);
        expect(ids.has(r.to)).toBe(true);
      }
    }
  });

  it('stamps unique ids on each build', () => {
    const a = buildTemplateData('startup');
    const b = buildTemplateData('startup');
    expect(a.nodes[0].id).not.toBe(b.nodes[0].id);
  });

  it('getTemplate returns undefined for unknown ids', () => {
    expect(getTemplate('nope')).toBeUndefined();
    expect(buildTemplateData('nope')).toEqual({ nodes: [], relationships: [] });
  });
});

describe('store template APIs', () => {
  beforeEach(() => {
    resetStore(emptyGraph());
  });

  it('createWorkspace with template seeds the new graph', () => {
    useAetherStore.getState().createWorkspace('Ops', { templateId: 'startup' });
    const state = useAetherStore.getState();
    expect(state.workspaces.some((w) => w.name === 'Ops')).toBe(true);
    expect(state.data.nodes.length).toBeGreaterThan(0);
    expect(
      state.workspaceData[state.currentWorkspaceId].nodes.length
    ).toBe(state.data.nodes.length);
  });

  it('createWorkspace without template stays empty', () => {
    useAetherStore.getState().createWorkspace('Empty');
    expect(useAetherStore.getState().data.nodes).toHaveLength(0);
  });

  it('applyTemplate replaces the active graph', () => {
    useAetherStore.getState().applyTemplate('job-hunt');
    const n = useAetherStore.getState().data.nodes.length;
    expect(n).toBeGreaterThan(0);
    useAetherStore.getState().applyTemplate('blank');
    expect(useAetherStore.getState().data.nodes).toHaveLength(0);
  });

  it('applyTemplate clears selection and graph focus', () => {
    useAetherStore.getState().applyTemplate('research');
    const node = useAetherStore.getState().data.nodes[0];
    useAetherStore.getState().setSelectedNode(node);
    useAetherStore.getState().setGraphFocus({
      mode: 'neighborhood',
      nodeIds: [node.id],
      edgeIds: [],
      title: 'test',
    });
    useAetherStore.getState().applyTemplate('startup');
    expect(useAetherStore.getState().selectedNode).toBeNull();
    expect(useAetherStore.getState().graphFocus).toBeNull();
  });
});
