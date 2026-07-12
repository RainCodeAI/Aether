// components/search/SearchPanel.tsx
'use client';

import { useAetherStore } from '@/lib/store';
import { X, ExternalLink } from 'lucide-react';
import { searchOntology } from '@/lib/ai-search';

export default function SearchPanel() {
  const { searchQuery, setSearchQuery, data, setSelectedNode, setCurrentView } = useAetherStore();

  const results = searchOntology(data, searchQuery);

  if (!searchQuery.trim() || results.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-24">
      <div className="glass w-full max-w-2xl rounded-3xl border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Search Results</h2>
            <p className="text-sm text-slate-400">{results.length} matches for &ldquo;{searchQuery}&rdquo;</p>
          </div>
          <button onClick={() => setSearchQuery('')} className="p-2 hover:bg-slate-800 rounded-xl">
            <X size={24} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-auto p-4">
          {results.map((node) => (
            <div
              key={node.id}
              onClick={() => {
                setSelectedNode(node);
                setSearchQuery('');
                if (node.type === 'Location') setCurrentView('geospatial');
              }}
              className="glass p-5 rounded-2xl mb-3 hover:border-cyan-500 cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-block px-3 py-1 text-xs font-mono bg-slate-800 rounded-full mb-2">
                    {node.type}
                  </div>
                  <h3 className="text-xl font-medium group-hover:text-cyan-400 transition-colors">
                    {node.label}
                  </h3>
                </div>
                <ExternalLink size={18} className="text-slate-500 group-hover:text-cyan-400" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                {Object.entries(node.properties).slice(0, 4).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-slate-500 capitalize">{key}:</span>{' '}
                    <span className="text-slate-300">
                      {typeof value === 'object'
                        ? JSON.stringify(value).slice(0, 40) + '...'
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
