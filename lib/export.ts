// lib/export.ts
import { AetherData } from '@/types';

export function exportAsJSON(data: AetherData) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `aether-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
