// components/ontology/ConnectEntityModal.tsx
'use client';

import { useState, useMemo } from 'react';
import { X, Link2, ArrowRight, ChevronDown } from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { EntityType } from '@/types';
import { RELATIONSHIP_TYPES } from '@/lib/relationship-types';

const TYPE_COLORS: Record<EntityType, string> = {
  Person:   'text-cyan-400',
  Project:  'text-purple-400',
  Location: 'text-green-400',
  Metric:   'text-amber-400',
  Insight:  'text-rose-400',
  Event:    'text-orange-400',
  Document: 'text-slate-400',
};

const TYPE_BG: Record<EntityType, string> = {
  Person:   'bg-cyan-500/10 border-cyan-500/30',
  Project:  'bg-purple-500/10 border-purple-500/30',
  Location: 'bg-green-500/10 border-green-500/30',
  Metric:   'bg-amber-500/10 border-amber-500/30',
  Insight:  'bg-rose-500/10 border-rose-500/30',
  Event:    'bg-orange-500/10 border-orange-500/30',
  Document: 'bg-slate-500/10 border-slate-500/30',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectEntityModal({ isOpen, onClose }: Props) {
  const { selectedNode, data, addRelationship } = useAetherStore();

  const [relType, setRelType]         = useState(RELATIONSHIP_TYPES[0].value);
  const [targetId, setTargetId]       = useState('');
  const [filterText, setFilterText]   = useState('');
  const [filterType, setFilterType]   = useState<EntityType | 'All'>('All');

  const candidates = useMemo(() => {
    if (!selectedNode) return [];
    return data.nodes.filter((n) => {
      if (n.id === selectedNode.id) return false;
      if (filterType !== 'All' && n.type !== filterType) return false;
      if (filterText && !n.label.toLowerCase().includes(filterText.toLowerCase())) return false;
      return true;
    });
  }, [data.nodes, selectedNode, filterText, filterType]);

  const entityTypes: Array<EntityType | 'All'> = [
    'All', 'Person', 'Project', 'Location', 'Metric', 'Event', 'Document', 'Insight',
  ];

  const handleCreate = () => {
    if (!selectedNode || !targetId) return;

    addRelationship({
      id: `rel-${Date.now()}`,
      from: selectedNode.id,
      to: targetId,
      type: relType,
    });

    setTargetId('');
    setFilterText('');
    setRelType(RELATIONSHIP_TYPES[0].value);
    onClose();
  };

  const targetNode = data.nodes.find((n) => n.id === targetId);

  if (!isOpen || !selectedNode) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass w-full max-w-lg rounded-3xl p-8 flex flex-col gap-7">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <Link2 size={18} className="text-cyan-400" />
            </div>
            <h2 className="text-2xl font-semibold">Connect Entity</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* ── Source node ── */}
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">From</p>
          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${TYPE_BG[selectedNode.type]}`}>
            <span className={`text-xs font-mono tracking-widest px-2 py-0.5 rounded-full bg-slate-800 ${TYPE_COLORS[selectedNode.type]}`}>
              {selectedNode.type.toUpperCase()}
            </span>
            <span className="font-semibold">{selectedNode.label}</span>
          </div>
        </div>

        {/* ── Relationship type ── */}
        <div>
          <label className="text-xs uppercase tracking-widest text-slate-500 block mb-2">
            Relationship
          </label>
          <div className="relative">
            <select
              value={relType}
              onChange={(e) => setRelType(e.target.value)}
              className="w-full appearance-none bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-cyan-500 rounded-2xl px-4 py-3 outline-none transition-colors cursor-pointer"
            >
              {RELATIONSHIP_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        {/* ── Target node picker ── */}
        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-widest text-slate-500">To</label>

          {/* Type filter pills */}
          <div className="flex gap-2 flex-wrap">
            {entityTypes.map((et) => (
              <button
                key={et}
                onClick={() => { setFilterType(et); setTargetId(''); }}
                className={`px-3 py-1 rounded-full text-xs font-mono tracking-wide border transition-all ${
                  filterType === et
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {et}
              </button>
            ))}
          </div>

          {/* Search input */}
          <input
            type="text"
            value={filterText}
            onChange={(e) => { setFilterText(e.target.value); setTargetId(''); }}
            placeholder="Search entities…"
            className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-2xl px-4 py-3 outline-none transition-colors text-sm"
          />

          {/* Entity list */}
          <div className="max-h-44 overflow-y-auto rounded-2xl border border-slate-800 divide-y divide-slate-800">
            {candidates.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">No entities found</p>
            ) : (
              candidates.map((node) => (
                <button
                  key={node.id}
                  onClick={() => setTargetId(node.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    targetId === node.id
                      ? 'bg-cyan-500/10'
                      : 'hover:bg-slate-800/60'
                  }`}
                >
                  <span className={`text-xs font-mono shrink-0 ${TYPE_COLORS[node.type]}`}>
                    {node.type}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">{node.label}</span>
                  {targetId === node.id && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Preview ── */}
        {targetNode && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-sm">
            <span className="font-medium truncate max-w-[120px]">{selectedNode.label}</span>
            <div className="flex items-center gap-1.5 text-cyan-400 shrink-0">
              <ArrowRight size={14} />
              <span className="text-xs font-mono">{relType}</span>
              <ArrowRight size={14} />
            </div>
            <span className="font-medium truncate max-w-[120px]">{targetNode.label}</span>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!targetId}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold transition-all text-sm flex items-center justify-center gap-2"
          >
            <Link2 size={16} />
            Create Relationship
          </button>
        </div>

      </div>
    </div>
  );
}
