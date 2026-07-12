// Helpers for resetting the Zustand store between unit tests.
import { useAetherStore } from '@/lib/store';
import type { AetherData, Workspace } from '@/types';

const PERSONAL: Workspace = {
  id: 'ws-personal',
  name: 'Personal',
  owner: 'Avery Miller',
  members: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  sharedNodes: [],
  sharedRelationships: [],
};

export const emptyGraph = (): AetherData => ({ nodes: [], relationships: [] });

/** Wipe localStorage and put the store into a clean empty Personal workspace. */
export function resetStore(seed: AetherData = emptyGraph()) {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
  useAetherStore.setState({
    data: seed,
    workspaceData: { [PERSONAL.id]: seed },
    workspaces: [PERSONAL],
    currentWorkspaceId: PERSONAL.id,
    selectedNode: null,
    searchQuery: '',
    savedInsights: [],
    snapshots: [],
    currentView: 'dashboard',
    isNewEntityModalOpen: false,
    isPDFUploadModalOpen: false,
    pdfLinkedEntityId: undefined,
    isAIAnalystOpen: false,
    isReportGeneratorOpen: false,
    reportFocusNodeId: undefined,
    dashboardCardOrder: ['intelligence-feed', 'active-projects', 'key-metrics'],
    graphFocus: null,
    isPathFinderOpen: false,
    pathFinderFromId: undefined,
  });
}

export { PERSONAL };
