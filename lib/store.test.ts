import { describe, it, expect, beforeEach } from 'vitest';
import { useAetherStore } from './store';
import { emptyGraph, resetStore, PERSONAL } from './test-utils/reset-store';
import type { OntologyNode, Relationship } from '@/types';

function node(partial: Partial<OntologyNode> & Pick<OntologyNode, 'id' | 'label'>): OntologyNode {
  return {
    type: 'Person',
    properties: {},
    ...partial,
  };
}

function rel(
  partial: Partial<Relationship> & Pick<Relationship, 'id' | 'from' | 'to' | 'type'>
): Relationship {
  return partial;
}

describe('store mutations', () => {
  beforeEach(() => {
    resetStore(emptyGraph());
  });

  it('addNode appends a node to the active graph', () => {
    const n = node({ id: 'n1', label: 'Ada' });
    useAetherStore.getState().addNode(n);
    const { data, workspaceData, currentWorkspaceId } = useAetherStore.getState();
    expect(data.nodes).toHaveLength(1);
    expect(data.nodes[0]).toMatchObject({ id: 'n1', label: 'Ada' });
    expect(workspaceData[currentWorkspaceId].nodes).toHaveLength(1);
  });

  it('addNodes appends many and ignores empty arrays', () => {
    useAetherStore.getState().addNodes([]);
    expect(useAetherStore.getState().data.nodes).toHaveLength(0);

    useAetherStore.getState().addNodes([
      node({ id: 'a', label: 'A' }),
      node({ id: 'b', label: 'B' }),
    ]);
    expect(useAetherStore.getState().data.nodes.map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('updateNode patches label and merges properties', () => {
    useAetherStore.getState().addNode(
      node({ id: 'n1', label: 'Old', properties: { role: 'Eng', level: 1 } })
    );
    useAetherStore.getState().updateNode('n1', {
      label: 'New',
      properties: { role: 'Lead' },
    });
    const updated = useAetherStore.getState().data.nodes[0];
    expect(updated.label).toBe('New');
    expect(updated.properties).toEqual({ role: 'Lead', level: 1 });
  });

  it('updateNode supports functional patches and refreshes selectedNode', () => {
    const n = node({ id: 'n1', label: 'X', properties: { status: 'Planning' } });
    useAetherStore.getState().addNode(n);
    useAetherStore.getState().setSelectedNode(n);

    useAetherStore.getState().updateNode('n1', (cur) => ({
      ...cur,
      properties: { ...cur.properties, status: 'Active' },
    }));

    const state = useAetherStore.getState();
    expect(state.data.nodes[0].properties.status).toBe('Active');
    expect(state.selectedNode?.properties.status).toBe('Active');
  });

  it('updateNode is a no-op for unknown ids', () => {
    useAetherStore.getState().addNode(node({ id: 'n1', label: 'Keep' }));
    useAetherStore.getState().updateNode('missing', { label: 'Nope' });
    expect(useAetherStore.getState().data.nodes[0].label).toBe('Keep');
  });

  it('removeNodes drops nodes and dangling relationships', () => {
    useAetherStore.getState().addNodes([
      node({ id: 'a', label: 'A' }),
      node({ id: 'b', label: 'B' }),
      node({ id: 'c', label: 'C' }),
    ]);
    useAetherStore.getState().addRelationships([
      rel({ id: 'r1', from: 'a', to: 'b', type: 'worksOn' }),
      rel({ id: 'r2', from: 'b', to: 'c', type: 'dependsOn' }),
      rel({ id: 'r3', from: 'a', to: 'c', type: 'relatedTo' }),
    ]);

    useAetherStore.getState().setSelectedNode(
      useAetherStore.getState().data.nodes.find((n) => n.id === 'b')!
    );
    useAetherStore.getState().removeNodes(['b']);

    const { data, selectedNode } = useAetherStore.getState();
    expect(data.nodes.map((n) => n.id).sort()).toEqual(['a', 'c']);
    // r1 (a→b) and r2 (b→c) gone; r3 (a→c) remains
    expect(data.relationships.map((r) => r.id)).toEqual(['r3']);
    expect(selectedNode).toBeNull();
  });

  it('addRelationship / removeRelationship manage edges', () => {
    useAetherStore.getState().addNodes([
      node({ id: 'a', label: 'A' }),
      node({ id: 'b', label: 'B' }),
    ]);
    useAetherStore.getState().addRelationship(
      rel({ id: 'r1', from: 'a', to: 'b', type: 'worksOn' })
    );
    expect(useAetherStore.getState().data.relationships).toHaveLength(1);

    useAetherStore.getState().removeRelationship('r1');
    expect(useAetherStore.getState().data.relationships).toHaveLength(0);
  });

  it('setData replaces the active workspace graph', () => {
    useAetherStore.getState().setData({
      nodes: [node({ id: 'z', label: 'Z' })],
      relationships: [],
    });
    const { data, workspaceData, currentWorkspaceId } = useAetherStore.getState();
    expect(data.nodes).toHaveLength(1);
    expect(workspaceData[currentWorkspaceId].nodes[0].id).toBe('z');
  });
});

describe('workspace isolation', () => {
  beforeEach(() => {
    resetStore(emptyGraph());
  });

  it('createWorkspace starts empty and leaves the previous graph intact', () => {
    useAetherStore.getState().addNode(node({ id: 'p1', label: 'Personal Node' }));
    const personalId = useAetherStore.getState().currentWorkspaceId;

    useAetherStore.getState().createWorkspace('Client A');

    const afterCreate = useAetherStore.getState();
    expect(afterCreate.currentWorkspaceId).not.toBe(personalId);
    expect(afterCreate.data.nodes).toHaveLength(0);
    expect(afterCreate.workspaces).toHaveLength(2);
    expect(afterCreate.workspaceData[personalId].nodes).toHaveLength(1);
    expect(afterCreate.workspaceData[personalId].nodes[0].label).toBe('Personal Node');
  });

  it('switchWorkspace restores each workspace graph', () => {
    useAetherStore.getState().addNode(node({ id: 'p1', label: 'In Personal' }));
    const personalId = useAetherStore.getState().currentWorkspaceId;

    useAetherStore.getState().createWorkspace('Side');
    const sideId = useAetherStore.getState().currentWorkspaceId;
    useAetherStore.getState().addNode(node({ id: 's1', label: 'In Side' }));

    useAetherStore.getState().switchWorkspace(personalId);
    expect(useAetherStore.getState().data.nodes.map((n) => n.id)).toEqual(['p1']);

    useAetherStore.getState().switchWorkspace(sideId);
    expect(useAetherStore.getState().data.nodes.map((n) => n.id)).toEqual(['s1']);
  });

  it('mutations only touch the active workspace', () => {
    useAetherStore.getState().addNode(node({ id: 'p1', label: 'P' }));
    const personalId = useAetherStore.getState().currentWorkspaceId;

    useAetherStore.getState().createWorkspace('Other');
    useAetherStore.getState().addNode(node({ id: 'o1', label: 'O' }));
    useAetherStore.getState().addNode(node({ id: 'o2', label: 'O2' }));

    expect(useAetherStore.getState().workspaceData[personalId].nodes).toHaveLength(1);
    expect(useAetherStore.getState().data.nodes).toHaveLength(2);
  });

  it('deleteWorkspace removes its graph and cannot delete the last one', () => {
    useAetherStore.getState().createWorkspace('Doomed');
    const doomedId = useAetherStore.getState().currentWorkspaceId;
    useAetherStore.getState().addNode(node({ id: 'd1', label: 'Gone' }));

    useAetherStore.getState().switchWorkspace(PERSONAL.id);
    useAetherStore.getState().deleteWorkspace(doomedId);

    const state = useAetherStore.getState();
    expect(state.workspaces.map((w) => w.id)).toEqual([PERSONAL.id]);
    expect(state.workspaceData[doomedId]).toBeUndefined();
    expect(state.currentWorkspaceId).toBe(PERSONAL.id);

    // cannot delete last workspace
    useAetherStore.getState().deleteWorkspace(PERSONAL.id);
    expect(useAetherStore.getState().workspaces).toHaveLength(1);
  });

  it('deleteWorkspace while active switches to another workspace', () => {
    useAetherStore.getState().addNode(node({ id: 'p1', label: 'Keep' }));
    useAetherStore.getState().createWorkspace('Temp');
    const tempId = useAetherStore.getState().currentWorkspaceId;

    useAetherStore.getState().deleteWorkspace(tempId);

    const state = useAetherStore.getState();
    expect(state.currentWorkspaceId).toBe(PERSONAL.id);
    expect(state.data.nodes.map((n) => n.id)).toEqual(['p1']);
  });

  it('renameWorkspace updates the name', () => {
    useAetherStore.getState().renameWorkspace(PERSONAL.id, 'Home Base');
    expect(useAetherStore.getState().workspaces[0].name).toBe('Home Base');
  });

  it('snapshots are tagged with workspaceId and load into the active graph', () => {
    useAetherStore.getState().addNode(node({ id: 'n1', label: 'Snap Me' }));
    useAetherStore.getState().saveSnapshot('Checkpoint');

    const snap = useAetherStore.getState().snapshots[0];
    expect(snap.workspaceId).toBe(PERSONAL.id);
    expect(snap.nodeCount).toBe(1);

    useAetherStore.getState().setData(emptyGraph());
    expect(useAetherStore.getState().data.nodes).toHaveLength(0);

    useAetherStore.getState().loadSnapshot(snap.id);
    expect(useAetherStore.getState().data.nodes[0].label).toBe('Snap Me');
  });
});
