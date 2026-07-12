// components/views/SearchView.tsx
'use client';

import { Search, ArrowRight, SearchX, Sparkles } from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { searchOntology } from '@/lib/ai-search';
import EmptyState from '@/components/ui/EmptyState';

export default function SearchView() {
  const {
    data,
    searchQuery,
    setSearchQuery,
    setSelectedNode,
    setCurrentView,
    setAIAnalystOpen,
  } = useAetherStore();

  const results = searchQuery.trim() ? searchOntology(data, searchQuery) : [];

  return (
    <div className="aether-view-enter">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-semibold tracking-tighter">Global Search</h1>
          <p className="text-slate-400 mt-1">Ontology-wide intelligence</p>
        </div>
      </div>

      <div className="glass rounded-3xl p-8">
        <div className="relative mb-8">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={22} />
          <input
            type="text"
            placeholder="Search across all entities, properties, and relationships..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 pl-14 py-4 rounded-2xl text-lg focus:border-cyan-500 outline-none"
          />
        </div>

        {searchQuery.trim() && (
          <div className="space-y-3 aether-stagger">
            {results.map((node) => (
              <div
                key={node.id}
                onClick={() => {
                  setSelectedNode(node);
                  setCurrentView('entities');
                }}
                className="glass p-6 rounded-2xl hover:border-cyan-500 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="inline px-3 py-1 text-xs font-mono bg-slate-800 rounded-full mr-4">
                    {node.type}
                  </span>
                  <span className="text-xl font-medium group-hover:text-cyan-400">
                    {node.label}
                  </span>
                </div>
                <ArrowRight className="text-slate-500 group-hover:text-cyan-400 shrink-0" />
              </div>
            ))}

            {results.length === 0 && (
              <EmptyState
                icon={SearchX}
                color="slate"
                title="No matches found"
                description={`Nothing in your ontology matches "${searchQuery}". Try a broader term, or let the AI Analyst dig deeper.`}
                actions={[
                  {
                    label: 'Ask AI Analyst',
                    icon: Sparkles,
                    onClick: () => setAIAnalystOpen(true),
                  },
                  {
                    label: 'Clear search',
                    onClick: () => setSearchQuery(''),
                    variant: 'ghost',
                  },
                ]}
                size="md"
              />
            )}
          </div>
        )}

        {!searchQuery.trim() && (
          <div className="py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700/20 to-slate-800/10 border border-slate-600/25 flex items-center justify-center mx-auto mb-4">
              <Search size={22} className="text-slate-500" />
            </div>
            <p className="text-slate-300 font-medium mb-1">Search your intelligence graph</p>
            <p className="text-slate-600 text-sm mb-6">
              Entities, properties, relationships — all searchable
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { label: 'financial overview', icon: '💰' },
                { label: 'team status', icon: '👥' },
                { label: 'active projects', icon: '🚀' },
                { label: 'risks', icon: '⚠️' },
                { label: 'locations', icon: '📍' },
              ].map(({ label, icon }) => (
                <button
                  key={label}
                  onClick={() => setSearchQuery(label)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-500 rounded-full text-xs text-slate-400 hover:text-slate-200 transition-all"
                >
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
