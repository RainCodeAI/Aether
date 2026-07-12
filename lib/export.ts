// lib/export.ts
import { AetherData, Workspace } from '@/types';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const dateStamp = () => new Date().toISOString().split('T')[0];

export function exportAsJSON(data: AetherData) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadBlob(blob, `aether-backup-${dateStamp()}.json`);
}

/** Full multi-workspace backup (workspace metadata + per-ws graphs). */
export interface WorkspacesBundle {
  format: 'aether-workspaces-v1';
  exportedAt: string;
  currentWorkspaceId: string;
  workspaces: Workspace[];
  workspaceData: Record<string, AetherData>;
}

export function exportAllWorkspaces(bundle: {
  workspaces: Workspace[];
  workspaceData: Record<string, AetherData>;
  currentWorkspaceId: string;
  data: AetherData;
}) {
  // Ensure active graph is included (in case workspaceData is slightly stale)
  const workspaceData = {
    ...bundle.workspaceData,
    [bundle.currentWorkspaceId]: bundle.data,
  };
  const payload: WorkspacesBundle = {
    format: 'aether-workspaces-v1',
    exportedAt: new Date().toISOString(),
    currentWorkspaceId: bundle.currentWorkspaceId,
    workspaces: bundle.workspaces,
    workspaceData,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(blob, `aether-workspaces-${dateStamp()}.json`);
}

export function exportAsCSV(data: AetherData) {
  const rows: string[][] = [
    ['Type', 'Label', 'Properties', 'Created']
  ];

  data.nodes.forEach(node => {
    const props = Object.entries(node.properties)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' | ');

    rows.push([
      node.type,
      node.label,
      props,
      node.createdAt || ''
    ]);
  });

  const csvContent = rows.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `aether-entities-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportGraphAsPNG() {
  const graphElement = document.querySelector('.react-flow') as HTMLElement;

  if (!graphElement) {
    alert("Graph not found. Make sure you're on the Dashboard.");
    return;
  }

  import('html2canvas').then(({ default: html2canvas }) => {
    html2canvas(graphElement, { scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.download = `aether-graph-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  });
}
