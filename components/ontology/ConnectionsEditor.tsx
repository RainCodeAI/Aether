// components/ontology/ConnectionsEditor.tsx
'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight, ArrowLeftRight, Trash2, ExternalLink, Plus, AlertTriangle,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import type { EntityType, OntologyNode, Relationship } from '@/types';
import {
  relationshipTypeOptions,
  relationshipTypeLabel,
} from '@/lib/relationship-types';

const TYPE_BADGE: Record<EntityType, string> = {
  Person:   'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  Project:  'bg-purple-500/10 text-purple-300 border-purple-500/30',
  Location: 'bg-green-500/10 text-green-300 border-green-500/30',
  Metric:   'bg-amber-500/10 text-amber-300 border-amber-500/30',
  Insight:  'bg-rose-500/10 text-rose-300 border-rose-500/30',
  Event:    'bg-orange-500/10 text-orange-300 border-orange-500/30',
  Document: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
};

interface ConnectionRow {
  rel: Relationship;
  other: OntologyNode | undefined;
  direction: 'out' | 'in';
  dangling: boolean;
}

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-0 flex items-center gap-2">
      {children}
      {count !== undefined && (
        <span className="font-mono normal-case text-slate-700">{count}</span>
      )}
    </h3>
  );
}

interface ConnectionsEditorProps {
  nodeId: string;
  onConnect: () => void;
}

export default function ConnectionsEditor({ nodeId, onConnect }: ConnectionsEditorProps) {
  const {
    data,
    setSelectedNode,
    removeRelationship,
    updateRelationship,
    reverseRelationship,
  } = useAetherStore();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [confirmClearBroken, setConfirmClearBroken] = useState(false);

  const connections: ConnectionRow[] = useMemo(() => {
    return data.relationships
      .filter((r) => r.from === nodeId || r.to === nodeId)
      .map((r) => {
        const isOut = r.from === nodeId;
        const otherId = isOut ? r.to : r.from;
        const other = data.nodes.find((n) => n.id === otherId);
        return {
          rel: r,
          other,
          direction: isOut ? ('out' as const) : ('in' as const),
          dangling: !other,
        };
      })
      .sort((a, b) => {
        if (a.dangling !== b.dangling) return a.dangling ? 1 : -1;
        const la = a.other?.label ?? a.rel.to;
        const lb = b.other?.label ?? b.rel.to;
        return la.localeCompare(lb);
      });
  }, [data.relationships, data.nodes, nodeId]);

  const typeOptions = useMemo(() => {
    const types = new Set(connections.map((c) => c.rel.type));
    return [...types].sort();
  }, [connections]);

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return connections;
    if (typeFilter === 'broken') return connections.filter((c) => c.dangling);
    return connections.filter((c) => c.rel.type === typeFilter);
  }, [connections, typeFilter]);

  const danglingCount = connections.filter((c) => c.dangling).length;
  const danglingIds = connections.filter((c) => c.dangling).map((c) => c.rel.id);

  const clearBroken = () => {
    for (const id of danglingIds) removeRelationship(id);
    setConfirmClearBroken(false);
    if (typeFilter === 'broken') setTypeFilter('all');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2">
        <SectionLabel count={connections.length}>Connections</SectionLabel>
        <button
          type="button"
          onClick={onConnect}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-cyan-300 transition-colors px-1.5 py-0.5 rounded-lg hover:bg-cyan-500/10 shrink-0"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {connections.length > 0 && (
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 min-w-[120px] bg-slate-900/80 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 outline-none focus:border-cyan-500/40"
            aria-label="Filter connections by type"
          >
            <option value="all">All types ({connections.length})</option>
            {danglingCount > 0 && (
              <option value="broken">Broken only ({danglingCount})</option>
            )}
            {typeOptions.map((t) => {
              const n = connections.filter((c) => c.rel.type === t).length;
              return (
                <option key={t} value={t}>
                  {relationshipTypeLabel(t)} ({n})
                </option>
              );
            })}
          </select>
        </div>
      )}

      {danglingCount > 0 && (
        <div className="flex items-start gap-2 mb-2.5 px-2.5 py-2 rounded-xl bg-amber-500/8 border border-amber-500/20 text-[11px] text-amber-300/90">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p>
              {danglingCount} broken link{danglingCount !== 1 ? 's' : ''} point to
              missing entities.
            </p>
            {!confirmClearBroken ? (
              <button
                type="button"
                onClick={() => setConfirmClearBroken(true)}
                className="mt-1.5 text-[11px] font-medium text-amber-200 hover:text-white underline-offset-2 hover:underline"
              >
                Delete all broken links
              </button>
            ) : (
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-amber-200/80">Remove {danglingCount}?</span>
                <button
                  type="button"
                  onClick={clearBroken}
                  className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-300 font-medium"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearBroken(false)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {connections.length === 0 ? (
        <button
          type="button"
          onClick={onConnect}
          className="w-full py-6 rounded-2xl border border-dashed border-slate-800 hover:border-cyan-500/40 text-slate-600 hover:text-cyan-400 text-xs transition-colors"
        >
          No connections yet — link this entity to another
        </button>
      ) : filtered.length === 0 ? (
        <p className="text-center text-xs text-slate-600 py-6">
          No connections match this filter
        </p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
          {filtered.map(({ rel, other, direction, dangling }) => {
            const otherMeta = other
              ? TYPE_BADGE[other.type] ?? TYPE_BADGE.Document
              : TYPE_BADGE.Document;
            const isConfirming = confirmDeleteId === rel.id;
            const isEditingType = editingTypeId === rel.id;

            return (
              <div
                key={rel.id}
                className={`rounded-xl border transition-colors ${
                  dangling
                    ? 'border-amber-500/25 bg-amber-500/5'
                    : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 px-2.5 py-2">
                  <button
                    type="button"
                    disabled={dangling || !other}
                    onClick={() => other && setSelectedNode(other)}
                    className="flex-1 flex items-center gap-2 min-w-0 text-left group disabled:cursor-default"
                  >
                    {direction === 'in' ? (
                      <ArrowRight size={10} className="text-slate-600 shrink-0 rotate-180" />
                    ) : (
                      <ArrowRight size={10} className="text-slate-600 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-medium truncate ${
                          dangling
                            ? 'text-amber-400/90'
                            : 'text-slate-300 group-hover:text-white'
                        }`}
                      >
                        {other?.label ?? `(missing: ${direction === 'out' ? rel.to : rel.from})`}
                      </p>
                      <p className="text-[10px] text-slate-600 font-mono truncate">
                        {direction === 'out' ? '→' : '←'}{' '}
                        {relationshipTypeLabel(rel.type)}
                      </p>
                    </div>
                    {!dangling && other && (
                      <span
                        className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded-full border opacity-60 ${otherMeta}`}
                      >
                        {other.type}
                      </span>
                    )}
                    {!dangling && (
                      <ExternalLink
                        size={10}
                        className="text-slate-700 group-hover:text-cyan-400 shrink-0 transition-colors"
                      />
                    )}
                  </button>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      title="Change relationship type"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTypeId(isEditingType ? null : rel.id);
                        setConfirmDeleteId(null);
                      }}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors text-[10px] font-mono"
                    >
                      type
                    </button>
                    <button
                      type="button"
                      title="Reverse direction"
                      disabled={dangling}
                      onClick={(e) => {
                        e.stopPropagation();
                        reverseRelationship(rel.id);
                        setConfirmDeleteId(null);
                        setEditingTypeId(null);
                      }}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-violet-300 hover:bg-violet-500/10 transition-colors disabled:opacity-30"
                    >
                      <ArrowLeftRight size={12} />
                    </button>
                    <button
                      type="button"
                      title="Delete relationship"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(isConfirming ? null : rel.id);
                        setEditingTypeId(null);
                      }}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {isEditingType && (
                  <div className="px-2.5 pb-2.5 flex items-center gap-2 border-t border-slate-800/60 pt-2">
                    <select
                      autoFocus
                      value={rel.type}
                      onChange={(e) => {
                        updateRelationship(rel.id, { type: e.target.value });
                        setEditingTypeId(null);
                      }}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500/50"
                    >
                      {relationshipTypeOptions(rel.type).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setEditingTypeId(null)}
                      className="text-[11px] text-slate-500 hover:text-slate-300 px-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {isConfirming && (
                  <div className="px-2.5 pb-2.5 flex items-center justify-between gap-2 border-t border-rose-500/20 pt-2">
                    <span className="text-[11px] text-rose-300/90">Remove this link?</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[11px] text-slate-500 hover:text-slate-300 px-2 py-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeRelationship(rel.id);
                          setConfirmDeleteId(null);
                        }}
                        className="text-[11px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-lg hover:bg-rose-500/30"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
