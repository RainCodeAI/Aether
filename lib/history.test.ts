import { describe, it, expect, beforeEach } from 'vitest';
import { useAetherStore } from './store';
import { emptyGraph, resetStore, PERSONAL } from './test-utils/reset-store';
import type { OntologyNode } from '@/types';

function node(
  partial: Partial<OntologyNode> & Pick<OntologyNode, 'id' | 'label'>
): OntologyNode {
  return { type: 'Person', properties: {}, ...partial };
}

describe('undo / redo', () => {
  beforeEach(() => {
    resetStore(emptyGraph());
  });

  it('starts with nothing to undo or redo', () => {
    expect(useAetherStore.getState().canUndo()).toBe(false);
    expect(useAetherStore.getState().canRedo()).toBe(false);
  });

  it('undoes addNode', () => {
    useAetherStore.getState().addNode(node({ id: 'a', label: 'Ada' }));
    expect(useAetherStore.getState().data.nodes).toHaveLength(1);
    expect(useAetherStore.getState().canUndo()).toBe(true);

    useAetherStore.getState().undo();
    expect(useAetherStore.getState().data.nodes).toHaveLength(0);
    expect(useAetherStore.getState().canRedo()).toBe(true);
  });

  it('redoes after undo', () => {
    useAetherStore.getState().addNode(node({ id: 'a', label: 'Ada' }));
    useAetherStore.getState().undo();
    useAetherStore.getState().redo();
    expect(useAetherStore.getState().data.nodes.map((n) => n.id)).toEqual(['a']);
    expect(useAetherStore.getState().canRedo()).toBe(false);
  });

  it('clears redo stack on new mutation after undo', () => {
    useAetherStore.getState().addNode(node({ id: 'a', label: 'A' }));
    useAetherStore.getState().addNode(node({ id: 'b', label: 'B' }));
    useAetherStore.getState().undo(); // back to [a]
    expect(useAetherStore.getState().canRedo()).toBe(true);

    useAetherStore.getState().addNode(node({ id: 'c', label: 'C' }));
    expect(useAetherStore.getState().canRedo()).toBe(false);
    expect(useAetherStore.getState().data.nodes.map((n) => n.id)).toEqual([
      'a',
      'c',
    ]);
  });

  it('undoes updateNode and removeNodes', () => {
    useAetherStore.getState().addNode(
      node({ id: 'a', label: 'Old', properties: { role: 'Eng' } })
    );
    useAetherStore.getState().updateNode('a', { label: 'New' });
    expect(useAetherStore.getState().data.nodes[0].label).toBe('New');

    useAetherStore.getState().undo();
    expect(useAetherStore.getState().data.nodes[0].label).toBe('Old');

    useAetherStore.getState().removeNodes(['a']);
    expect(useAetherStore.getState().data.nodes).toHaveLength(0);
    useAetherStore.getState().undo();
    expect(useAetherStore.getState().data.nodes).toHaveLength(1);
  });

  it('undoes applyTemplate', () => {
    useAetherStore.getState().applyTemplate('startup');
    const n = useAetherStore.getState().data.nodes.length;
    expect(n).toBeGreaterThan(0);
    useAetherStore.getState().undo();
    expect(useAetherStore.getState().data.nodes).toHaveLength(0);
  });

  it('keeps history isolated per workspace', () => {
    useAetherStore.getState().addNode(node({ id: 'p1', label: 'Personal' }));
    useAetherStore.getState().createWorkspace('Other');
    // Other starts empty with empty history
    expect(useAetherStore.getState().canUndo()).toBe(false);
    useAetherStore.getState().addNode(node({ id: 'o1', label: 'Other node' }));
    expect(useAetherStore.getState().canUndo()).toBe(true);

    useAetherStore.getState().switchWorkspace(PERSONAL.id);
    // Personal still has its own undo stack from p1
    expect(useAetherStore.getState().canUndo()).toBe(true);
    useAetherStore.getState().undo();
    expect(useAetherStore.getState().data.nodes).toHaveLength(0);

    useAetherStore.getState().switchWorkspace(
      useAetherStore.getState().workspaces.find((w) => w.name === 'Other')!.id
    );
    // Other still has o1 and can undo
    expect(useAetherStore.getState().data.nodes.map((n) => n.id)).toEqual(['o1']);
    useAetherStore.getState().undo();
    expect(useAetherStore.getState().data.nodes).toHaveLength(0);
  });

  it('undo is a no-op when stack is empty', () => {
    useAetherStore.getState().undo();
    expect(useAetherStore.getState().data.nodes).toHaveLength(0);
  });
});
