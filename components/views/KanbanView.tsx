// components/views/KanbanView.tsx
'use client';

import { useState, useCallback } from 'react';
import {
  Plus, GripVertical, AlertTriangle, TrendingUp,
  DollarSign, Users, ChevronRight,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { OntologyNode } from '@/types';

// ─── Column definitions ────────────────────────────────────────────────────────

interface KanbanCol {
  id: string;
  label: string;
  statusValues: string[];
  accent: string;
  text: string;
  headerBg: string;
  countBg: string;
  dropBg: string;
  dotColor: string;
}

const COLUMNS: KanbanCol[] = [
  {
    id: 'Planning',
    label: 'Planning',
    statusValues: ['Planning'],
    accent: 'border-amber-500/25 bg-amber-500/4',
    text: 'text-amber-400',
    headerBg: 'border-amber-500/25 bg-amber-500/5',
    countBg: 'bg-amber-500/15 text-amber-300 border border-amber-500/25',
    dropBg: 'bg-amber-500/6 border-amber-500/35',
    dotColor: 'bg-amber-400',
  },
  {
    id: 'Active',
    label: 'Active',
    statusValues: ['Active'],
    accent: 'border-cyan-500/25 bg-cyan-500/4',
    text: 'text-cyan-400',
    headerBg: 'border-cyan-500/25 bg-cyan-500/5',
    countBg: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25',
    dropBg: 'bg-cyan-500/6 border-cyan-500/35',
    dotColor: 'bg-cyan-400',
  },
  {
    id: 'At Risk',
    label: 'At Risk',
    statusValues: ['At Risk'],
    accent: 'border-rose-500/25 bg-rose-500/4',
    text: 'text-rose-400',
    headerBg: 'border-rose-500/25 bg-rose-500/5',
    countBg: 'bg-rose-500/15 text-rose-300 border border-rose-500/25',
    dropBg: 'bg-rose-500/6 border-rose-500/35',
    dotColor: 'bg-rose-400',
  },
  {
    id: 'Complete',
    label: 'Completed',
    statusValues: ['Complete', 'Completed', 'Done'],
    accent: 'border-emerald-500/25 bg-emerald-500/4',
    text: 'text-emerald-400',
    headerBg: 'border-emerald-500/25 bg-emerald-500/5',
    countBg: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25',
    dropBg: 'bg-emerald-500/6 border-emerald-500/35',
    dotColor: 'bg-emerald-400',
  },
];

function getColId(status: string | undefined): string {
  if (!status) return 'Planning';
  for (const col of COLUMNS) {
    if (col.statusValues.includes(status)) return col.id;
  }
  return 'Planning';
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color =
    pct >= 70 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]' :
    pct >= 35 ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]'    :
                'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.4)]';
  return (
    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Kanban card ─────────────────────────────────────────────────────────────

interface CardProps {
  node: OntologyNode;
  lead: string | null;
  isAtRisk: boolean;
  isDragging: boolean;
  colAccent: string;
  colText: string;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

function KanbanCard({ node, lead, isAtRisk, isDragging, colAccent, colText, onDragStart, onDragEnd, onClick }: CardProps) {
  const progress  = Number(node.properties.progress) || 0;
  const budget    = Number(node.properties.budget)   || 0;
  const hasProgress = 'progress' in node.properties;
  const hasBudget   = budget > 0;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(node.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      role="button"
      aria-label={`${node.label} — drag to move`}
      className={`group relative rounded-2xl border bg-slate-900/80 p-4 cursor-grab active:cursor-grabbing transition-all duration-150 select-none ${
        isDragging
          ? 'opacity-30 scale-95 border-slate-700 shadow-none'
          : `border-slate-800 hover:${colAccent} hover:border-opacity-40 hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5`
      }`}
    >
      {/* Subtle left accent when not dragging */}
      {!isDragging && (
        <div className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-r-full opacity-0 group-hover:opacity-60 transition-opacity duration-200 ${colText.replace('text-', 'bg-')}`} />
      )}

      {/* Drag handle */}
      <div className="absolute top-3.5 right-3 opacity-0 group-hover:opacity-30 transition-opacity">
        <GripVertical size={13} className="text-slate-400" />
      </div>

      {/* Header */}
      <div className="flex items-start gap-2 mb-3 pr-5">
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold text-slate-200 leading-snug transition-colors truncate group-hover:${colText}`}>
            {node.label}
          </h4>
          {node.properties.description && (
            <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1 leading-snug">{node.properties.description}</p>
          )}
        </div>
      </div>

      {/* At-risk badge */}
      {isAtRisk && (
        <div className="flex items-center gap-1.5 mb-3 text-rose-400 text-xs bg-rose-500/8 border border-rose-500/20 rounded-xl px-2.5 py-1.5">
          <AlertTriangle size={11} />
          <span>Low progress — review needed</span>
        </div>
      )}

      {/* Progress */}
      {hasProgress && (
        <div className="mb-3">
          <div className="flex justify-between text-[11px] text-slate-600 mb-1.5">
            <span>Progress</span>
            <span className="tabular-nums font-mono">{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      )}

      {/* Metadata row */}
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {hasBudget && (
          <div className="flex items-center gap-1 text-[11px] text-slate-600">
            <DollarSign size={10} />
            <span className="tabular-nums">{(budget / 1000).toFixed(0)}k</span>
          </div>
        )}
        {lead && (
          <div className="flex items-center gap-1 text-[11px] text-slate-600">
            <Users size={10} />
            <span className="truncate max-w-[72px]">{lead}</span>
          </div>
        )}
        {node.properties.priority && (
          <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
            node.properties.priority === 'high'   || node.properties.priority === 'Critical' ? 'bg-rose-500/15 text-rose-400' :
            node.properties.priority === 'medium' || node.properties.priority === 'Medium'   ? 'bg-amber-500/15 text-amber-400' :
                                                                                               'bg-slate-500/15 text-slate-400'
          }`}>
            {node.properties.priority}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function KanbanView() {
  const { data, setData, setSelectedNode, setNewEntityModalOpen } = useAetherStore();

  const [draggingId,  setDraggingId]  = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const leadsByProjectId = new Map<string, string>();
  data.relationships
    .filter(r => r.type === 'worksOn')
    .forEach(r => {
      const person = data.nodes.find(n => n.id === r.from && n.type === 'Person');
      if (person && !leadsByProjectId.has(r.to)) leadsByProjectId.set(r.to, person.label);
    });

  const projects = data.nodes.filter(n => n.type === 'Project');

  const handleDragStart = useCallback((id: string) => setDraggingId(id), []);
  const handleDragEnd   = useCallback(() => { setDraggingId(null); setDragOverCol(null); }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (!draggingId) return;
    setData({
      nodes: data.nodes.map(n =>
        n.id === draggingId ? { ...n, properties: { ...n.properties, status: colId } } : n
      ),
      relationships: data.relationships,
    });
    setDraggingId(null);
    setDragOverCol(null);
  }, [draggingId, data, setData]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null);
  }, []);

  return (
    <div className="flex gap-3 sm:gap-4 h-full overflow-x-auto pb-2 scroll-touch">
      {COLUMNS.map((col, colIdx) => {
        const cards  = projects.filter(p => getColId(p.properties.status) === col.id);
        const isOver = dragOverCol === col.id && !!draggingId;

        return (
          <div
            key={col.id}
            className="flex flex-col min-w-64 sm:min-w-72 max-w-80 flex-1"
            style={{ animationDelay: `${colIdx * 60}ms` }}
            onDragOver={e => handleDragOver(e, col.id)}
            onDrop={e => handleDrop(e, col.id)}
            onDragLeave={handleDragLeave}
          >
            {/* Column header */}
            <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border mb-3 ${col.headerBg}`}>
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                <span className={`font-semibold text-sm ${col.text}`}>{col.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${col.countBg}`}>
                  {cards.length}
                </span>
                <button
                  onClick={() => setNewEntityModalOpen(true)}
                  aria-label={`Add project to ${col.label}`}
                  className="p-0.5 hover:bg-white/8 rounded-lg transition-colors text-slate-600 hover:text-slate-300 press-scale"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* Drop zone */}
            <div
              className={`flex-1 rounded-2xl border-2 border-dashed transition-all duration-150 p-2 space-y-2.5 overflow-y-auto min-h-40 ${
                isOver
                  ? `${col.dropBg} border-current ${col.text}`
                  : 'border-transparent'
              }`}
            >
              {cards.length === 0 && !isOver && (
                <div className="h-full flex flex-col items-center justify-center py-10 text-center">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-2.5 opacity-30 ${col.headerBg}`}>
                    <TrendingUp size={14} className={col.text} />
                  </div>
                  <p className="text-xs text-slate-700 mb-1.5">No projects</p>
                  <button
                    onClick={() => setNewEntityModalOpen(true)}
                    className={`text-xs hover:text-slate-400 transition-colors text-slate-700`}
                  >
                    + Add one
                  </button>
                </div>
              )}

              {isOver && (
                <div className={`rounded-xl border-2 border-dashed h-16 flex items-center justify-center text-xs opacity-50 ${col.text} border-current`}>
                  <ChevronRight size={14} className="mr-1" /> Drop here
                </div>
              )}

              {cards.map((card, cardIdx) => {
                const isAtRisk =
                  card.properties.status === 'Active' &&
                  Number(card.properties.progress ?? 100) < 25;

                return (
                  <div
                    key={card.id}
                    className="aether-fade-up"
                    style={{ animationDelay: `${cardIdx * 35}ms` }}
                  >
                    <KanbanCard
                      node={card}
                      lead={leadsByProjectId.get(card.id) ?? null}
                      isAtRisk={isAtRisk}
                      isDragging={draggingId === card.id}
                      colAccent={col.accent}
                      colText={col.text}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedNode(card)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
