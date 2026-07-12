// components/ontology/PathFinderPanel.tsx
'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Route, X, Search, GitBranch, Focus, ArrowRight, AlertCircle, Check,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import {
  findShortestPath,
  findNeighborhood,
  labelPath,
  formatPathSummary,
} from '@/lib/graph-path';
import type { OntologyNode } from '@/types';

// ── Entity picker ─────────────────────────────────────────────────────────────

function EntityPicker({
  label,
  value,
  onChange,
  excludeId,
  nodes,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  excludeId?: string;
  nodes: OntologyNode[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const selected = nodes.find((n) => n.id === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return nodes
      .filter((n) => n.id !== excludeId)
      .filter((n) => {
        if (!query) return true;
        return (
          n.label.toLowerCase().includes(query) ||
          n.type.toLowerCase().includes(query)
        );
      })
      .slice(0, 12);
  }, [nodes, q, excludeId]);

  return (
    <div className="relative" ref={ref}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
        {label}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 hover:border-slate-600 text-left transition-colors"
      >
        {selected ? (
          <>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 shrink-0">
              {selected.type}
            </span>
            <span className="text-sm text-slate-200 truncate flex-1">{selected.label}</span>
          </>
        ) : (
          <span className="text-sm text-slate-600">Select entity…</span>
        )}
        <Search size={12} className="text-slate-600 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1.5 rounded-xl border border-slate-700 bg-[#0B1120] shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-slate-800">
            <input
              autoFocus
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter…"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500/50"
            />
          </div>
          <ul className="max-h-44 overflow-y-auto py-1">
            {filtered.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(n.id);
                    setOpen(false);
                    setQ('');
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-800/80 ${
                    n.id === value ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-mono text-slate-600 w-14 shrink-0">
                    {n.type}
                  </span>
                  <span className="truncate">{n.label}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-xs text-slate-600 text-center">No matches</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function PathFinderPanel() {
  const {
    data,
    isPathFinderOpen,
    setPathFinderOpen,
    pathFinderFromId,
    setPathFinderFromId,
    setGraphFocus,
    clearGraphFocus,
    graphFocus,
    selectedNode,
  } = useAetherStore();

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [depth, setDepth] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [lastPathLabel, setLastPathLabel] = useState<string | null>(null);

  // Sync pre-fill when panel opens
  const [wasOpen, setWasOpen] = useState(isPathFinderOpen);
  if (isPathFinderOpen !== wasOpen) {
    setWasOpen(isPathFinderOpen);
    if (isPathFinderOpen) {
      const seed = pathFinderFromId ?? selectedNode?.id ?? '';
      setFromId(seed);
      setToId('');
      setError(null);
      setLastPathLabel(null);
    }
  }

  if (!isPathFinderOpen) return null;

  const close = () => {
    setPathFinderOpen(false);
    setPathFinderFromId(undefined);
  };

  const handleFindPath = () => {
    setError(null);
    if (!fromId || !toId) {
      setError('Pick both a start and an end entity.');
      return;
    }
    const path = findShortestPath(data, fromId, toId);
    if (!path) {
      setError('No path connects these entities in the current graph.');
      clearGraphFocus();
      setLastPathLabel(null);
      return;
    }
    const fromLabel = data.nodes.find((n) => n.id === fromId)?.label ?? fromId;
    const toLabel = data.nodes.find((n) => n.id === toId)?.label ?? toId;
    const summary = formatPathSummary(data, path);
    const detail = labelPath(data, path);
    setLastPathLabel(detail);
    setGraphFocus({
      mode: 'path',
      nodeIds: path.nodeIds,
      edgeIds: path.edgeIds,
      title: `Path · ${fromLabel} → ${toLabel}`,
      detail: `${summary} · ${detail}`,
      sourceId: fromId,
      targetId: toId,
    });
  };

  const handleFocusNeighborhood = (centerId: string, hops: number) => {
    setError(null);
    const nb = findNeighborhood(data, centerId, hops);
    if (!nb) {
      setError('Entity not found in graph.');
      return;
    }
    const label = data.nodes.find((n) => n.id === centerId)?.label ?? centerId;
    setGraphFocus({
      mode: 'neighborhood',
      nodeIds: nb.nodeIds,
      edgeIds: nb.edgeIds,
      title: `Focus · ${label}`,
      detail: `${nb.nodeIds.length} nodes within ${hops} hop${hops === 1 ? '' : 's'}`,
      hopDepth: hops,
      sourceId: centerId,
    });
    setLastPathLabel(null);
  };

  return (
    <div className="absolute bottom-3 left-3 z-[25] w-[min(340px,calc(100%-1.5rem))]">
      <div
        className="rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden"
        style={{
          background: 'rgba(7,11,22,0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
              <Route size={13} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Path & Focus</p>
              <p className="text-[10px] text-slate-600">Shortest path · k-hop neighborhood</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Close path finder"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-3.5 space-y-3">
          {/* Path mode */}
          <div className="space-y-2.5">
            <EntityPicker
              label="From"
              value={fromId}
              onChange={setFromId}
              excludeId={toId}
              nodes={data.nodes}
            />
            <EntityPicker
              label="To"
              value={toId}
              onChange={setToId}
              excludeId={fromId}
              nodes={data.nodes}
            />
            <button
              type="button"
              onClick={handleFindPath}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold transition-colors"
            >
              <GitBranch size={13} />
              Find shortest path
            </button>
          </div>

          <div className="h-px bg-slate-800" />

          {/* Neighborhood */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Focus neighborhood
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] text-slate-500 shrink-0">Depth</span>
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDepth(d)}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                    depth === d
                      ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                      : 'border-slate-800 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const center = fromId || selectedNode?.id;
                if (!center) {
                  setError('Select a From entity (or select a node) first.');
                  return;
                }
                handleFocusNeighborhood(center, depth);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/15 text-violet-300 text-xs font-medium transition-colors"
            >
              <Focus size={13} />
              Focus {depth}-hop neighborhood
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-2.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {lastPathLabel && !error && (
            <div className="px-2.5 py-2 rounded-xl bg-cyan-500/8 border border-cyan-500/20 text-[11px] text-cyan-200/90 leading-relaxed break-words">
              <span className="inline-flex items-center gap-1 text-cyan-400 font-medium mb-0.5">
                <Check size={11} /> Path
              </span>
              <p className="text-slate-400 font-mono text-[10px] mt-1">{lastPathLabel}</p>
            </div>
          )}

          {graphFocus && (
            <button
              type="button"
              onClick={() => {
                clearGraphFocus();
                setLastPathLabel(null);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={11} /> Clear graph highlight
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Compact floating chip when focus is active but panel is closed. */
export function GraphFocusBanner() {
  const { graphFocus, clearGraphFocus, setPathFinderOpen } = useAetherStore();
  if (!graphFocus) return null;

  return (
    <div className="absolute top-3 left-3 z-[22] max-w-[min(280px,calc(100%-5rem))]">
      <div
        className="flex items-start gap-2 px-3 py-2 rounded-xl border border-cyan-500/30 shadow-lg"
        style={{
          background: 'rgba(7,11,22,0.92)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <ArrowRight size={12} className="text-cyan-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-cyan-300 truncate">{graphFocus.title}</p>
          {graphFocus.detail && (
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{graphFocus.detail}</p>
          )}
          <button
            type="button"
            onClick={() => setPathFinderOpen(true)}
            className="text-[10px] text-slate-600 hover:text-cyan-400 mt-1 transition-colors"
          >
            Edit path…
          </button>
        </div>
        <button
          type="button"
          onClick={() => clearGraphFocus()}
          className="p-1 rounded-md text-slate-600 hover:text-slate-300 shrink-0"
          aria-label="Clear focus"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
