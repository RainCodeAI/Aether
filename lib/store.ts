// lib/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { initialAetherData } from './data';
import { AetherData, OntologyNode, Workspace } from '@/types';
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
}

type AppView = 'dashboard' | 'search' | 'entities' | 'projects' | 'geospatial' | 'analytics' | 'timeline' | 'table' | 'kanban' | 'data' | 'calendar';

interface AetherStore {
  data: AetherData;
  setData: (data: AetherData) => void;
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
  // AI Analyst
  isAIAnalystOpen: boolean;
  setAIAnalystOpen: (open: boolean) => void;
  savedInsights: SavedInsight[];
  addSavedInsight: (insight: SavedInsight) => void;
  removeSavedInsight: (id: string) => void;
  // Snapshots
  snapshots: Snapshot[];
  saveSnapshot: (name: string) => void;
  loadSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  // Workspaces
  workspaces: Workspace[];
  currentWorkspaceId: string;
  createWorkspace: (name: string) => void;
  switchWorkspace: (id: string) => void;
  addMemberToCurrentWorkspace: (email: string) => void;
  addSharedNodeToCurrentWorkspace: (nodeId: string) => void;
}

export const useAetherStore = create<AetherStore>()(
  persist(
    (set, get) => ({
      data: initialAetherData,
      setData: (data) => set({ data }),
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
      // AI Analyst
      isAIAnalystOpen: false,
      setAIAnalystOpen: (open) => set({ isAIAnalystOpen: open }),
      savedInsights: [],
      addSavedInsight: (insight) =>
        set((state) => ({
          savedInsights: [insight, ...state.savedInsights].slice(0, 20),
        })),
      removeSavedInsight: (id) =>
        set((state) => ({
          savedInsights: state.savedInsights.filter((i) => i.id !== id),
        })),
      // Snapshots
      snapshots: [],
      saveSnapshot: (name) =>
        set((state) => {
          const snap: Snapshot = {
            id: `snap-${Date.now()}`,
            name: name.trim() || `Snapshot ${new Date().toLocaleString()}`,
            createdAt: new Date().toISOString(),
            data: state.data,
            nodeCount: state.data.nodes.length,
            relCount: state.data.relationships.length,
          };
          return { snapshots: [snap, ...state.snapshots].slice(0, 10) };
        }),
      loadSnapshot: (id) =>
        set((state) => {
          const snap = state.snapshots.find((s) => s.id === id);
          if (!snap) return {};
          return { data: snap.data, selectedNode: null };
        }),
      deleteSnapshot: (id) =>
        set((state) => ({
          snapshots: state.snapshots.filter((s) => s.id !== id),
        })),
      // Workspaces
      workspaces: [DEFAULT_WORKSPACE],
      currentWorkspaceId: DEFAULT_WORKSPACE.id,
      createWorkspace: (name) =>
        set((state) => {
          const ws: Workspace = {
            id: `ws-${Date.now()}`,
            name: name.trim() || 'New Workspace',
            owner: DEFAULT_WORKSPACE.owner,
            members: [],
            createdAt: new Date().toISOString(),
            sharedNodes: [],
            sharedRelationships: [],
          };
          return { workspaces: [...state.workspaces, ws], currentWorkspaceId: ws.id };
        }),
      switchWorkspace: (id) => set({ currentWorkspaceId: id }),
      addMemberToCurrentWorkspace: (email) =>
        set((state) => ({
          workspaces: state.workspaces.map((ws) =>
            ws.id === state.currentWorkspaceId
              ? { ...ws, members: ws.members.includes(email) ? ws.members : [...ws.members, email] }
              : ws
          ),
        })),
      addSharedNodeToCurrentWorkspace: (nodeId) =>
        set((state) => ({
          workspaces: state.workspaces.map((ws) =>
            ws.id === state.currentWorkspaceId
              ? { ...ws, sharedNodes: ws.sharedNodes.includes(nodeId) ? ws.sharedNodes : [...ws.sharedNodes, nodeId] }
              : ws
          ),
        })),
    }),
    {
      name: 'aether-storage-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        data: state.data,
        currentView: state.currentView,
        savedInsights: state.savedInsights,
        snapshots: state.snapshots,
        workspaces: state.workspaces,
        currentWorkspaceId: state.currentWorkspaceId,
      }),
    }
  )
);
