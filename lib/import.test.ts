import { describe, it, expect, beforeEach } from 'vitest';
import {
  importFromJSON,
  parseWorkspacesBundle,
  WORKSPACES_FORMAT,
} from './import';
import { useAetherStore } from './store';
import { emptyGraph, resetStore, PERSONAL } from './test-utils/reset-store';
import type { WorkspacesBundle } from './export';

function jsonFile(name: string, content: unknown, sizePad = 0): File {
  const body = typeof content === 'string' ? content : JSON.stringify(content);
  const padded = body + ' '.repeat(sizePad);
  return new File([padded], name, { type: 'application/json' });
}

const validGraph = {
  nodes: [
    {
      id: 'p1',
      type: 'Person',
      label: 'Ada',
      properties: { role: 'Engineer' },
    },
  ],
  relationships: [
    { id: 'r1', from: 'p1', to: 'missing', type: 'worksOn' },
  ],
};

const validBundle: WorkspacesBundle = {
  format: WORKSPACES_FORMAT,
  exportedAt: '2026-07-12T00:00:00.000Z',
  currentWorkspaceId: 'ws-a',
  workspaces: [
    {
      id: 'ws-a',
      name: 'Alpha',
      owner: 'Test',
      members: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      sharedNodes: [],
      sharedRelationships: [],
    },
    {
      id: 'ws-b',
      name: 'Beta',
      owner: 'Test',
      members: ['x@y.com'],
      createdAt: '2026-01-02T00:00:00.000Z',
      sharedNodes: [],
      sharedRelationships: [],
    },
  ],
  workspaceData: {
    'ws-a': {
      nodes: [
        {
          id: 'n1',
          type: 'Project',
          label: 'Launch',
          properties: { status: 'Active' },
        },
      ],
      relationships: [],
    },
    'ws-b': {
      nodes: [
        {
          id: 'n2',
          type: 'Person',
          label: 'Bob',
          properties: {},
        },
        {
          id: 'n3',
          type: 'Location',
          label: 'HQ',
          properties: { city: 'Toronto' },
        },
      ],
      relationships: [
        { id: 'r1', from: 'n2', to: 'n3', type: 'locatedAt' },
      ],
    },
  },
};

describe('importFromJSON — single graph', () => {
  it('imports a valid graph and warns on dangling relationships', async () => {
    const result = await importFromJSON(jsonFile('backup.json', validGraph));
    expect(result.kind).toBe('graph');
    if (result.kind !== 'graph') return;
    expect(result.nodeCount).toBe(1);
    expect(result.relationshipCount).toBe(1);
    expect(result.warnings.some((w) => w.includes('missing node IDs'))).toBe(true);
  });

  it('rejects non-json extensions', async () => {
    await expect(importFromJSON(jsonFile('notes.txt', validGraph))).rejects.toThrow(/\.json/i);
  });

  it('rejects empty files', async () => {
    await expect(importFromJSON(new File([], 'empty.json'))).rejects.toThrow(/empty/i);
  });

  it('rejects invalid JSON', async () => {
    await expect(importFromJSON(jsonFile('bad.json', '{nope'))).rejects.toThrow(/Invalid JSON/i);
  });

  it('rejects missing nodes array', async () => {
    await expect(
      importFromJSON(jsonFile('x.json', { relationships: [] }))
    ).rejects.toThrow(/nodes/i);
  });

  it('skips invalid nodes with a warning when some remain valid', async () => {
    const mixed = {
      nodes: [
        validGraph.nodes[0],
        { id: 'bad', type: 'NotAType', label: 'x', properties: {} },
        { foo: 1 },
      ],
      relationships: [],
    };
    const result = await importFromJSON(jsonFile('mixed.json', mixed));
    expect(result.kind).toBe('graph');
    if (result.kind !== 'graph') return;
    expect(result.nodeCount).toBe(1);
    expect(result.warnings.some((w) => w.includes('skipped'))).toBe(true);
  });

  it('throws when every node is invalid', async () => {
    await expect(
      importFromJSON(
        jsonFile('all-bad.json', {
          nodes: [{ id: 1, type: 'Person', label: 'x', properties: {} }],
          relationships: [],
        })
      )
    ).rejects.toThrow(/invalid/i);
  });
});

describe('importFromJSON — workspaces bundle', () => {
  it('parses a full workspaces backup', async () => {
    const result = await importFromJSON(jsonFile('all.json', validBundle));
    expect(result.kind).toBe('workspaces');
    if (result.kind !== 'workspaces') return;
    expect(result.workspaceCount).toBe(2);
    expect(result.totalNodes).toBe(3);
    expect(result.totalRels).toBe(1);
    expect(result.currentWorkspaceId).toBe('ws-a');
    expect(result.workspaceSummaries).toHaveLength(2);
  });

  it('accepts workspaces+workspaceData without format field', async () => {
    const { format: _f, ...rest } = validBundle;
    void _f;
    const result = await importFromJSON(jsonFile('legacy.json', rest));
    expect(result.kind).toBe('workspaces');
  });

  it('parseWorkspacesBundle fills empty graph when data missing', () => {
    const broken = {
      format: WORKSPACES_FORMAT,
      workspaces: validBundle.workspaces,
      workspaceData: { 'ws-a': validBundle.workspaceData['ws-a'] },
      // ws-b missing
    };
    const result = parseWorkspacesBundle(broken);
    expect(result.workspaceData['ws-b'].nodes).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('Beta'))).toBe(true);
  });

  it('rejects empty workspaces array', () => {
    expect(() =>
      parseWorkspacesBundle({
        format: WORKSPACES_FORMAT,
        workspaces: [],
        workspaceData: {},
      })
    ).toThrow(/no workspaces/i);
  });
});

describe('store importWorkspaces', () => {
  beforeEach(() => {
    resetStore(emptyGraph());
  });

  it('replace wipes existing and loads bundle', () => {
    useAetherStore.getState().addNode({
      id: 'local',
      type: 'Person',
      label: 'Local',
      properties: {},
    });
    const parsed = parseWorkspacesBundle(validBundle as unknown as Record<string, unknown>);
    useAetherStore.getState().importWorkspaces(
      {
        workspaces: parsed.workspaces,
        workspaceData: parsed.workspaceData,
        currentWorkspaceId: parsed.currentWorkspaceId,
      },
      'replace'
    );
    const state = useAetherStore.getState();
    expect(state.workspaces.map((w) => w.id).sort()).toEqual(['ws-a', 'ws-b']);
    expect(state.currentWorkspaceId).toBe('ws-a');
    expect(state.data.nodes.map((n) => n.id)).toEqual(['n1']);
    expect(state.history).toEqual({});
  });

  it('merge keeps personal and appends imported (re-ids on collision)', () => {
    // PERSONAL id is ws-personal; import uses ws-a / ws-b — no collision
    useAetherStore.getState().addNode({
      id: 'keep',
      type: 'Person',
      label: 'Keep me',
      properties: {},
    });
    const parsed = parseWorkspacesBundle(validBundle as unknown as Record<string, unknown>);
    useAetherStore.getState().importWorkspaces(
      {
        workspaces: parsed.workspaces,
        workspaceData: parsed.workspaceData,
        currentWorkspaceId: parsed.currentWorkspaceId,
      },
      'merge'
    );
    const state = useAetherStore.getState();
    expect(state.workspaces).toHaveLength(3);
    expect(state.currentWorkspaceId).toBe(PERSONAL.id);
    expect(state.data.nodes.map((n) => n.id)).toEqual(['keep']);
    expect(state.workspaceData['ws-b'].nodes).toHaveLength(2);
  });

  it('merge re-ids when workspace id collides', () => {
    // Create a workspace with same id as import's ws-a by replacing first
    useAetherStore.setState({
      workspaces: [
        PERSONAL,
        {
          id: 'ws-a',
          name: 'Existing Alpha',
          owner: 'Me',
          members: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          sharedNodes: [],
          sharedRelationships: [],
        },
      ],
      workspaceData: {
        [PERSONAL.id]: emptyGraph(),
        'ws-a': {
          nodes: [{ id: 'old', type: 'Person', label: 'Old', properties: {} }],
          relationships: [],
        },
      },
      currentWorkspaceId: PERSONAL.id,
      data: emptyGraph(),
    });

    const parsed = parseWorkspacesBundle(validBundle as unknown as Record<string, unknown>);
    useAetherStore.getState().importWorkspaces(
      {
        workspaces: parsed.workspaces,
        workspaceData: parsed.workspaceData,
        currentWorkspaceId: parsed.currentWorkspaceId,
      },
      'merge'
    );

    const state = useAetherStore.getState();
    // personal + existing ws-a + 2 imported (one re-id'd)
    expect(state.workspaces.length).toBe(4);
    const alphaExisting = state.workspaces.find((w) => w.id === 'ws-a');
    expect(alphaExisting?.name).toBe('Existing Alpha');
    expect(state.workspaceData['ws-a'].nodes[0].id).toBe('old');
    // imported Alpha got a new id
    const importedAlpha = state.workspaces.find(
      (w) => w.name === 'Alpha' || w.name === 'Alpha (imported)'
    );
    expect(importedAlpha).toBeDefined();
    expect(importedAlpha!.id).not.toBe('ws-a');
    expect(state.workspaceData[importedAlpha!.id].nodes[0].label).toBe('Launch');
  });
});
