// components/views/EntitiesView.tsx
'use client';

import { Plus, Upload, Network } from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import EmptyState from '@/components/ui/EmptyState';

interface EntitiesViewProps {
  onImportClick: () => void;
}

export default function EntitiesView({ onImportClick }: EntitiesViewProps) {
  const { data, setSelectedNode, setNewEntityModalOpen } = useAetherStore();

  return (
    <div className="aether-view-enter">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-10 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tighter">All Entities</h1>
          <p className="text-slate-400 mt-1">{data.nodes.length} total entities in ontology</p>
        </div>
        <button
          onClick={() => setNewEntityModalOpen(true)}
          className="self-start sm:self-auto px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> New Entity
        </button>
      </div>

      {data.nodes.length === 0 ? (
        <div className="glass rounded-3xl">
          <EmptyState
            icon={Network}
            color="cyan"
            title="Your intelligence graph is empty"
            description="Add people, projects, locations, metrics, and more to start building your ontology."
            actions={[
              {
                label: 'New Entity',
                icon: Plus,
                onClick: () => setNewEntityModalOpen(true),
              },
              {
                label: 'Import JSON',
                icon: Upload,
                onClick: onImportClick,
                variant: 'secondary',
              },
            ]}
            hint="Tip: drag & drop a JSON backup anywhere on the page to import instantly"
            size="lg"
          />
        </div>
      ) : (
        <div className="glass rounded-3xl overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-slate-700">
              <tr>
                <th className="text-left p-6 font-medium text-slate-400">Type</th>
                <th className="text-left p-6 font-medium text-slate-400">Name</th>
                <th className="text-left p-6 font-medium text-slate-400">Key Properties</th>
                <th className="text-left p-6 font-medium text-slate-400">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 table-stagger">
              {data.nodes.map((node) => (
                <tr
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className="hover:bg-slate-900/70 cursor-pointer transition-colors group"
                >
                  <td className="p-6">
                    <span className="inline-block px-4 py-1.5 text-xs font-mono bg-slate-800 rounded-full">
                      {node.type}
                    </span>
                  </td>
                  <td className="p-6 font-medium group-hover:text-cyan-400 transition-colors">
                    {node.label}
                  </td>
                  <td className="p-6 text-sm text-slate-400">
                    {Object.entries(node.properties)
                      .slice(0, 2)
                      .map(([k, v]) => `${k}: ${typeof v === 'object' ? '...' : v}`)
                      .join(' • ')}
                  </td>
                  <td className="p-6 text-sm text-slate-400">
                    {node.createdAt ? new Date(node.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
