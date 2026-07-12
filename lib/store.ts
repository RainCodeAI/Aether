// lib/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { EMPTY_AETHER_DATA, initialAetherData } from './data';
import { AetherData, OntologyNode, Relationship, Workspace } from '@/types';
import { SavedInsight } from './ai-search';

const DEFAULT_WORKSPACE: Workspace = {
  id: 'ws-personal',
  name: 'Personal',
  owner: 'Avery Miller',
  members: [],
  createdAt: new Date().toISOString(),
  sharedNodes: [],
  sharedRelationships: [],
};

export interface Snapshot {
  id: string;
  name: string;
  createdAt: string;
  data: AetherData;
  nodeCount: number;
  relCount: number;
  workspaceId: string;
}

type AppView =
  | 'dashboard'
  | 'search'
  | 'entities'
  | 'projects'
  | 'geospatial'
  | 'analytics'
  | 'timeline'
  | 'table'
  | 'kanban'
  | 'data'
  | 'calendar';

type NodePatch =
  | Partial<Omit<OntologyNode, 'id'>>
  | ((node: OntologyNode) => OntologyNode);

/** Highlight mode for the live intelligence graph (not persisted). */
export interface GraphFocusState {
  mode: 'path' | 'neighborhood';
  nodeIds: string[];
  edgeIds: string[];
  title: string;
  detail?: string;
  hopDepth?: number;
  sourceId?: string;
  targetId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyGraph(): AetherData {
  return { nodes: [], relationships: [] };
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

function withWorkspaceData(
  state: { workspaceData: Record<string, AetherData>; currentWorkspaceId: string; data: AetherData },
  data: AetherData
) {
  return {
    data,
    workspaceData: {
      ...state.workspaceData,
      [state.currentWorkspaceId]: data,
    },
  };
}

function dropDanglingRels(data: AetherData, removedIds: Set<string>): Relationship[] {
  return data.relationships.filter(
    (r) => !removedIds.has(r.from) && !removedIds.has(r.to)
  );
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface AetherStore {
  /** Active workspace graph (mirrors workspaceData[currentWorkspaceId]). */
  data: AetherData;
  /** Per-workspace graphs. Switching workspaces loads the matching entry. */
  workspaceData: Record<string, AetherData>;
  setData: (data: AetherData) => void;

  addNode: (node: OntologyNode) => void;
  addNodes: (nodes: OntologyNode[]) => void;
  updateNode: (id: string, patch: NodePatch) => void;
  removeNodes: (ids: string[]) => void;
  addRelationship: (rel: Relationship) => void;
  addRelationships: (rels: Relationship[]) => void;
  removeRelationship: (id: string) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedNode: OntologyNode | null;
  setSelectedNode: (node: OntologyNode | null) => void;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  isNewEntityModalOpen: boolean;
  setNewEntityModalOpen: (open: boolean) => void;
  isPDFUploadModalOpen: boolean;
  setPDFUploadModalOpen: (open: boolean) => void;
  pdfLinkedEntityId: string | undefined;
  setPDFLinkedEntityId: (id: string | undefined) => void;
  isAIAnalystOpen: boolean;
  setAIAnalystOpen: (open: boolean) => void;
  savedInsights: SavedInsight[];
  isReportGeneratorOpen: boolean;
  setReportGeneratorOpen: (open: boolean) => void;
  reportFocusNodeId: string | undefined;
  setReportFocusNodeId: (id: string | undefined) => void;
  addSavedInsight: (insight: SavedInsight) => void;
  removeSavedInsight: (id: string) => void;

  snapshots: Snapshot[];
  saveSnapshot: (name: string) => void;
  loadSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;

  workspaces: Workspace[];
  currentWorkspaceId: string;
  createWorkspace: (name: string) => void;
  switchWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  deleteWorkspace: (id: string) => void;
  addMemberToCurrentWorkspace: (email: string) => void;
  addSharedNodeToCurrentWorkspace: (nodeId: string) => void;

  dashboardCardOrder: string[];
  setDashboardCardOrder: (order: string[]) => void;

  /** Graph path / neighborhood highlight (ephemeral). */
  graphFocus: GraphFocusState | null;
  setGraphFocus: (focus: GraphFocusState | null) => void;
  clearGraphFocus: () => void;
  isPathFinderOpen: boolean;
  setPathFinderOpen: (open: boolean) => void;
  /** Pre-fill path finder "from" when opening from a node. */
  pathFinderFromId: string | undefined;
  setPathFinderFromId: (id: string | undefined) => void;
}

// ─── Persist migration (v0 → v1: workspace-scoped graphs) ─────────────────────

type LegacyPersisted = {
  data?: AetherData;
  workspaceData?: Record<string, AetherData>;
  currentWorkspaceId?: string;
  workspaces?: Workspace[];
  currentView?: AppView;
  savedInsights?: SavedInsight[];
  snapshots?: Snapshot[];
  dashboardCardOrder?: string[];
};

function migrateToV1(persisted: LegacyPersisted): LegacyPersisted {
  const wsId = persisted.currentWorkspaceId ?? DEFAULT_WORKSPACE.id;
  const data = persisted.data ?? cloneGraph(initialAetherData);
  const workspaceData: Record<string, AetherData> = {
    ...(persisted.workspaceData ?? {}),
  };
  if (!workspaceData[wsId]) {
    workspaceData[wsId] = data;
  }
  // Ensure every known workspace has a graph entry
  for (const ws of persisted.workspaces ?? [DEFAULT_WORKSPACE]) {
    if (!workspaceData[ws.id]) {
      workspaceData[ws.id] = emptyGraph();
    }
  }
  const snapshots = (persisted.snapshots ?? []).map((s) => ({
    ...s,
    workspaceId: s.workspaceId ?? wsId,
  }));
  return {
    ...persisted,
    data: workspaceData[wsId] ?? data,
    workspaceData,
    currentWorkspaceId: wsId,
    snapshots,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAetherStore = create<AetherStore>()(
  persist(
    (set, get) => ({
      data: cloneGraph(initialAetherData),
      workspaceData: { [DEFAULT_WORKSPACE.id]: cloneGraph(initialAetherData) },

      setData: (data) =>
        set((state) => withWorkspaceData(state, data)),

      addNode: (node) =>
        set((state) =>
          withWorkspaceData(state, {
            nodes: [...state.data.nodes, node],
            relationships: state.data.relationships,
          })
        ),

      addNodes: (nodes) =>
        set((state) => {
          if (nodes.length === 0) return {};
          return withWorkspaceData(state, {
            nodes: [...state.data.nodes, ...nodes],
            relationships: state.data.relationships,
          });
        }),

      updateNode: (id, patch) =>
        set((state) => {
          let changed = false;
          const nodes = state.data.nodes.map((n) => {
            if (n.id !== id) return n;
            changed = true;
            if (typeof patch === 'function') return patch(n);
            return {
              ...n,
              ...patch,
              properties: patch.properties
                ? { ...n.properties, ...patch.properties }
                : n.properties,
              tags: patch.tags !== undefined ? patch.tags : n.tags,
            };
          });
          if (!changed) return {};
          const next = { nodes, relationships: state.data.relationships };
          const selected =
            state.selectedNode?.id === id
              ? (nodes.find((n) => n.id === id) ?? null)
              : state.selectedNode;
          return { ...withWorkspaceData(state, next), selectedNode: selected };
        }),

      removeNodes: (ids) =>
        set((state) => {
          if (ids.length === 0) return {};
          const removed = new Set(ids);
          const next: AetherData = {
            nodes: state.data.nodes.filter((n) => !removed.has(n.id)),
            relationships: dropDanglingRels(state.data, removed),
          };
          const selected =
            state.selectedNode && removed.has(state.selectedNode.id)
              ? null
              : state.selectedNode;
          return { ...withWorkspaceData(state, next), selectedNode: selected };
        }),

      addRelationship: (rel) =>
        set((state) =>
          withWorkspaceData(state, {
            nodes: state.data.nodes,
            relationships: [...state.data.relationships, rel],
          })
        ),

      addRelationships: (rels) =>
        set((state) => {
          if (rels.length === 0) return {};
          return withWorkspaceData(state, {
            nodes: state.data.nodes,
            relationships: [...state.data.relationships, ...rels],
          });
        }),

      removeRelationship: (id) =>
        set((state) =>
          withWorkspaceData(state, {
            nodes: state.data.nodes,
            relationships: state.data.relationships.filter((r) => r.id !== id),
          })
        ),

      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      selectedNode: null,
      setSelectedNode: (node) => set({ selectedNode: node }),
      currentView: 'dashboard',
      setCurrentView: (view) => set({ currentView: view }),
      isNewEntityModalOpen: false,
      setNewEntityModalOpen: (open) => set({ isNewEntityModalOpen: open }),
      isPDFUploadModalOpen: false,
      setPDFUploadModalOpen: (open) => set({ isPDFUploadModalOpen: open }),
      pdfLinkedEntityId: undefined,
      setPDFLinkedEntityId: (id) => set({ pdfLinkedEntityId: id }),
      isAIAnalystOpen: false,
      setAIAnalystOpen: (open) => set({ isAIAnalystOpen: open }),
      savedInsights: [],
      isReportGeneratorOpen: false,
      setReportGeneratorOpen: (open) => set({ isReportGeneratorOpen: open }),
      reportFocusNodeId: undefined,
      setReportFocusNodeId: (id) => set({ reportFocusNodeId: id }),
      addSavedInsight: (insight) =>
        set((state) => ({
          savedInsights: [insight, ...state.savedInsights].slice(0, 20),
        })),
      removeSavedInsight: (id) =>
        set((state) => ({
          savedInsights: state.savedInsights.filter((i) => i.id !== id),
        })),

      snapshots: [],
      saveSnapshot: (name) =>
        set((state) => {
          const snap: Snapshot = {
            id: `snap-${Date.now()}`,
            name: name.trim() || `Snapshot ${new Date().toLocaleString()}`,
            createdAt: new Date().toISOString(),
            data: cloneGraph(state.data),
            nodeCount: state.data.nodes.length,
            relCount: state.data.relationships.length,
            workspaceId: state.currentWorkspaceId,
          };
          return { snapshots: [snap, ...state.snapshots].slice(0, 20) };
        }),
      loadSnapshot: (id) =>
        set((state) => {
          const snap = state.snapshots.find((s) => s.id === id);
          if (!snap) return {};
          return {
            ...withWorkspaceData(state, cloneGraph(snap.data)),
            selectedNode: null,
          };
        }),
      deleteSnapshot: (id) =>
        set((state) => ({
          snapshots: state.snapshots.filter((s) => s.id !== id),
        })),

      workspaces: [DEFAULT_WORKSPACE],
      currentWorkspaceId: DEFAULT_WORKSPACE.id,

      createWorkspace: (name) =>
        set((state) => {
          const id = `ws-${Date.now()}`;
          const ws: Workspace = {
            id,
            name: name.trim() || 'New Workspace',
            owner: DEFAULT_WORKSPACE.owner,
            members: [],
            createdAt: new Date().toISOString(),
            sharedNodes: [],
            sharedRelationships: [],
          };
          // Persist active graph before switching
          const workspaceData = {
            ...state.workspaceData,
            [state.currentWorkspaceId]: state.data,
            [id]: emptyGraph(),
          };
          return {
            workspaces: [...state.workspaces, ws],
            currentWorkspaceId: id,
            workspaceData,
            data: emptyGraph(),
            selectedNode: null,
          };
        }),

      switchWorkspace: (id) =>
        set((state) => {
          if (id === state.currentWorkspaceId) return {};
          if (!state.workspaces.some((w) => w.id === id)) return {};
          const workspaceData = {
            ...state.workspaceData,
            [state.currentWorkspaceId]: state.data,
          };
          const nextData = workspaceData[id] ?? emptyGraph();
          if (!workspaceData[id]) workspaceData[id] = nextData;
          return {
            currentWorkspaceId: id,
            workspaceData,
            data: nextData,
            selectedNode: null,
            graphFocus: null,
            isPathFinderOpen: false,
            pathFinderFromId: undefined,
          };
        }),

      renameWorkspace: (id, name) =>
        set((state) => ({
          workspaces: state.workspaces.map((ws) =>
            ws.id === id ? { ...ws, name: name.trim() || ws.name } : ws
          ),
        })),

      deleteWorkspace: (id) =>
        set((state) => {
          if (state.workspaces.length <= 1) return {};
          if (!state.workspaces.some((w) => w.id === id)) return {};
          const workspaces = state.workspaces.filter((w) => w.id !== id);
          const { [id]: _removed, ...rest } = state.workspaceData;
          void _removed;
          const switching = state.currentWorkspaceId === id;
          const nextId = switching ? workspaces[0].id : state.currentWorkspaceId;
          const workspaceData = {
            ...rest,
            ...(switching
              ? {}
              : { [state.currentWorkspaceId]: state.data }),
          };
          // Keep current workspace graph saved when deleting another
          if (!switching) {
            workspaceData[state.currentWorkspaceId] = state.data;
          }
          return {
            workspaces,
            workspaceData,
            currentWorkspaceId: nextId,
            data: workspaceData[nextId] ?? emptyGraph(),
            selectedNode: switching ? null : state.selectedNode,
            snapshots: state.snapshots.filter((s) => s.workspaceId !== id),
          };
        }),

      addMemberToCurrentWorkspace: (email) =>
        set((state) => ({
          workspaces: state.workspaces.map((ws) =>
            ws.id === state.currentWorkspaceId
              ? {
                  ...ws,
                  members: ws.members.includes(email)
                    ? ws.members
                    : [...ws.members, email],
                }
              : ws
          ),
        })),

      addSharedNodeToCurrentWorkspace: (nodeId) =>
        set((state) => ({
          workspaces: state.workspaces.map((ws) =>
            ws.id === state.currentWorkspaceId
              ? {
                  ...ws,
                  sharedNodes: ws.sharedNodes.includes(nodeId)
                    ? ws.sharedNodes
                    : [...ws.sharedNodes, nodeId],
                }
              : ws
          ),
        })),

      dashboardCardOrder: ['intelligence-feed', 'active-projects', 'key-metrics'],
      setDashboardCardOrder: (order) => set({ dashboardCardOrder: order }),

      graphFocus: null,
      setGraphFocus: (focus) => set({ graphFocus: focus }),
      clearGraphFocus: () => set({ graphFocus: null }),
      isPathFinderOpen: false,
      setPathFinderOpen: (open) => set({ isPathFinderOpen: open }),
      pathFinderFromId: undefined,
      setPathFinderFromId: (id) => set({ pathFinderFromId: id }),
    }),
    {
      name: 'aether-storage-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as LegacyPersisted;
        if (version < 1) return migrateToV1(state);
        // Keep data aligned with current workspace after any future migrations
        const wsId = state.currentWorkspaceId ?? DEFAULT_WORKSPACE.id;
        if (state.workspaceData?.[wsId]) {
          return { ...state, data: state.workspaceData[wsId] };
        }
        return migrateToV1(state);
      },
      partialize: (state) => ({
        data: state.data,
        workspaceData: state.workspaceData,
        currentView: state.currentView,
        savedInsights: state.savedInsights,
        snapshots: state.snapshots,
        workspaces: state.workspaces,
        currentWorkspaceId: state.currentWorkspaceId,
        dashboardCardOrder: state.dashboardCardOrder,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const id = state.currentWorkspaceId;
        const graph = state.workspaceData?.[id];
        if (graph) {
          state.data = graph;
        } else if (state.data) {
          state.workspaceData = {
            ...(state.workspaceData ?? {}),
            [id]: state.data,
          };
        }
      },
    }
  )
);

// Convenience re-export for empty-graph consumers
export { EMPTY_AETHER_DATA };
