// components/timeline/TimelineView.tsx
'use client';

import { useMemo, useState } from 'react';
import { Clock, GitBranch, ArrowRight, Layers } from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { OntologyNode, EntityType, Relationship } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterOption = 'All' | EntityType | 'Relationship';

const FILTER_OPTIONS: FilterOption[] = [
  'All', 'Person', 'Project', 'Location', 'Metric', 'Insight', 'Document', 'Event', 'Relationship',
];

interface NodeRelCtx {
  rel: Relationship;
  other: OntologyNode | undefined;
  direction: 'out' | 'in';
}

interface TimelineEntry {
  id: string;
  date: Date;
  kind: 'node' | 'relationship';
  node?: OntologyNode;
  relationship?: Relationship;
  fromNode?: OntologyNode;
  toNode?: OntologyNode;
  isDynamic?: boolean;
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const DOT_COLOR: Record<EntityType, string> = {
  Person:   'bg-cyan-400',
  Project:  'bg-purple-400',
  Location: 'bg-green-400',
  Metric:   'bg-amber-400',
  Insight:  'bg-rose-400',
  Event:    'bg-orange-400',
  Document: 'bg-slate-400',
};

const BADGE_STYLE: Record<EntityType, string> = {
  Person:   'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  Project:  'bg-purple-500/10 text-purple-300 border-purple-500/30',
  Location: 'bg-green-500/10 text-green-300 border-green-500/30',
  Metric:   'bg-amber-500/10 text-amber-300 border-amber-500/30',
  Insight:  'bg-rose-500/10 text-rose-300 border-rose-500/30',
  Event:    'bg-orange-500/10 text-orange-300 border-orange-500/30',
  Document: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

// Parse "YYYY-MM-DD" strings as local noon to avoid UTC offset flipping the day
function parseNodeDate(createdAt: string | undefined): Date {
  if (!createdAt) return new Date(0);
  if (/^\d{4}-\d{2}-\d{2}$/.test(createdAt)) return new Date(`${createdAt}T12:00:00`);
  return new Date(createdAt);
}

// Dynamic relationships have IDs like "rel-1747123456789"
function parseRelDate(rel: Relationship): Date | null {
  const m = rel.id.match(/^rel-(\d{13,})$/);
  return m ? new Date(parseInt(m[1], 10)) : null;
}

// Local YYYY-MM-DD string used as the group key
function localDayKey(date: Date): string {
  return date.toLocaleDateString('en-CA'); // gives "YYYY-MM-DD"
}

function getDayLabel(dateKey: string): string {
  const now = new Date();
  const todayKey    = now.toLocaleDateString('en-CA');
  const yesterday   = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toLocaleDateString('en-CA');

  if (dateKey === todayKey)    return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';

  const date = new Date(`${dateKey}T12:00:00`);
  const diffDays = Math.round((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  if (now.getFullYear() === date.getFullYear())
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(date: Date): string | null {
  const todayKey = new Date().toLocaleDateString('en-CA');
  if (date.toLocaleDateString('en-CA') !== todayKey) return null;
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ─── Property highlight helpers ───────────────────────────────────────────────

function getHighlights(node: OntologyNode): Array<{ key: string; value: string }> {
  const p = node.properties;
  switch (node.type) {
    case 'Person':
      return [
        p.role     && { key: 'Role',     value: p.role },
        p.location && { key: 'Location', value: p.location },
      ].filter(Boolean) as { key: string; value: string }[];
    case 'Project':
      return [
        p.status   && { key: 'Status',   value: p.status },
        p.progress != null && { key: 'Progress', value: `${p.progress}%` },
        p.budget   && { key: 'Budget',   value: `$${Number(p.budget).toLocaleString()}` },
      ].filter(Boolean) as { key: string; value: string }[];
    case 'Location':
      return [
        p.city     && { key: 'City',     value: p.city },
        p.province && { key: 'Province', value: p.province },
      ].filter(Boolean) as { key: string; value: string }[];
    case 'Metric':
      return [
        p.value != null && { key: 'Value', value: `${Number(p.value).toLocaleString()} ${p.unit ?? ''}`.trim() },
        p.trend && { key: 'Trend', value: p.trend === 'up' ? '↑ Up' : p.trend === 'down' ? '↓ Down' : p.trend },
      ].filter(Boolean) as { key: string; value: string }[];
    case 'Insight':
      return p.summary
        ? [{ key: 'Summary', value: `${String(p.summary).slice(0, 100)}${String(p.summary).length > 100 ? '…' : ''}` }]
        : [];
    default:
      return Object.entries(p)
        .filter(([, v]) => typeof v !== 'object')
        .slice(0, 2)
        .map(([k, v]) => ({ key: k, value: String(v) }));
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NodeCard({
  node,
  date,
  relCtx,
  onClick,
}: {
  node: OntologyNode;
  date: Date;
  relCtx: NodeRelCtx[];
  onClick: () => void;
}) {
  const time = formatTime(date);
  const highlights = getHighlights(node);

  return (
    <div
      onClick={onClick}
      role="button"
      aria-label={`View ${node.label}`}
      className="glass-card rounded-2xl p-4 cursor-pointer group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${BADGE_STYLE[node.type]}`}>
            {node.type}
          </span>
          <h3 className="font-semibold text-sm text-slate-200 group-hover:text-cyan-300 transition-colors truncate">
            {node.label}
          </h3>
        </div>
        <div className="text-[11px] text-slate-600 shrink-0 tabular-nums mt-0.5">
          {time ?? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Property highlights */}
      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-2.5">
          {highlights.map(({ key, value }) => (
            <span key={key} className="text-xs text-slate-500">
              <span className="text-slate-700">{key}: </span>{value}
            </span>
          ))}
        </div>
      )}

      {/* Relationship context */}
      {relCtx.length > 0 && (
        <div className="flex flex-col gap-1 pt-2.5 border-t border-slate-800/60">
          {relCtx.map(({ rel, other, direction }) => (
            <div key={rel.id} className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <GitBranch size={10} className="text-slate-700 shrink-0" />
              {direction === 'out' ? (
                <>
                  <span className="text-slate-500">{node.label}</span>
                  <ArrowRight size={9} className="text-slate-700" />
                  <span className="font-mono text-cyan-700/80">{rel.type}</span>
                  <ArrowRight size={9} className="text-slate-700" />
                  <span className="text-slate-500">{other?.label ?? rel.to}</span>
                </>
              ) : (
                <>
                  <span className="text-slate-500">{other?.label ?? rel.from}</span>
                  <ArrowRight size={9} className="text-slate-700" />
                  <span className="font-mono text-cyan-700/80">{rel.type}</span>
                  <ArrowRight size={9} className="text-slate-700" />
                  <span className="text-slate-500">{node.label}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RelationshipCard({
  relationship,
  fromNode,
  toNode,
  date,
  onClickFrom,
  onClickTo,
}: {
  relationship: Relationship;
  fromNode: OntologyNode | undefined;
  toNode: OntologyNode | undefined;
  date: Date;
  onClickFrom: () => void;
  onClickTo: () => void;
}) {
  const time = formatTime(date);

  return (
    <div className="glass rounded-2xl p-5 border border-slate-800 border-dashed hover:border-cyan-500/30 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <GitBranch size={13} className="text-cyan-600" />
          <span className="font-mono text-cyan-600">{relationship.type}</span>
          <span className="text-slate-700">relationship created</span>
        </div>
        <div className="text-xs text-slate-500">
          {time ?? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Connection display */}
      <div className="flex items-center gap-3">
        {fromNode ? (
          <button
            onClick={onClickFrom}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-medium hover:text-cyan-300"
          >
            <span className={`w-2 h-2 rounded-full ${fromNode ? DOT_COLOR[fromNode.type] : 'bg-slate-500'}`} />
            {fromNode.label}
          </button>
        ) : (
          <span className="text-xs text-slate-500 px-3 py-1.5 bg-slate-900 rounded-xl">{relationship.from}</span>
        )}

        <div className="flex items-center gap-1.5 text-cyan-600 shrink-0">
          <ArrowRight size={14} />
          <span className="text-xs font-mono text-cyan-500">{relationship.type}</span>
          <ArrowRight size={14} />
        </div>

        {toNode ? (
          <button
            onClick={onClickTo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-medium hover:text-cyan-300"
          >
            <span className={`w-2 h-2 rounded-full ${toNode ? DOT_COLOR[toNode.type] : 'bg-slate-500'}`} />
            {toNode.label}
          </button>
        ) : (
          <span className="text-xs text-slate-500 px-3 py-1.5 bg-slate-900 rounded-xl">{relationship.to}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TimelineView() {
  const { data, setSelectedNode } = useAetherStore();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');

  // Build flat list of timeline entries
  const allEntries = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];

    // Entity nodes
    for (const node of data.nodes) {
      entries.push({
        id: `node-${node.id}`,
        date: parseNodeDate(node.createdAt),
        kind: 'node',
        node,
      });
    }

    // Relationships — dynamic ones get their own timestamp; static ones get the from-node date
    for (const rel of data.relationships) {
      const dynamicDate = parseRelDate(rel);
      const fromNode = data.nodes.find(n => n.id === rel.from);
      const toNode   = data.nodes.find(n => n.id === rel.to);
      const date = dynamicDate ?? (fromNode ? parseNodeDate(fromNode.createdAt) : new Date(0));

      entries.push({
        id: `rel-${rel.id}`,
        date,
        kind: 'relationship',
        relationship: rel,
        fromNode,
        toNode,
        isDynamic: !!dynamicDate,
      });
    }

    // Newest first
    return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [data]);

  // Per-filter counts for pill badges
  const counts = useMemo(() => {
    const c: Record<FilterOption, number> = { All: allEntries.length, Relationship: 0 } as Record<FilterOption, number>;
    for (const e of allEntries) {
      if (e.kind === 'relationship') c.Relationship = (c.Relationship ?? 0) + 1;
      if (e.kind === 'node' && e.node) c[e.node.type] = (c[e.node.type] ?? 0) + 1;
    }
    return c;
  }, [allEntries]);

  // Apply active filter
  const filtered = useMemo(() => {
    if (activeFilter === 'All') return allEntries;
    if (activeFilter === 'Relationship') return allEntries.filter(e => e.kind === 'relationship');
    return allEntries.filter(e => e.kind === 'node' && e.node?.type === activeFilter);
  }, [allEntries, activeFilter]);

  // Group into day buckets, ordered newest-first
  const groups = useMemo(() => {
    const map = new Map<string, TimelineEntry[]>();
    for (const entry of filtered) {
      const key = localDayKey(entry.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return Array.from(map.entries()).map(([key, entries]) => ({
      key,
      label: getDayLabel(key),
      entries,
    }));
  }, [filtered]);

  // Relationship context for a given node (max 2)
  function getRelCtx(nodeId: string): NodeRelCtx[] {
    return data.relationships
      .filter(r => r.from === nodeId || r.to === nodeId)
      .slice(0, 2)
      .map(r => ({
        rel: r,
        other: data.nodes.find(n => n.id === (r.from === nodeId ? r.to : r.from)),
        direction: r.from === nodeId ? ('out' as const) : ('in' as const),
      }));
  }

  const todayKey = new Date().toLocaleDateString('en-CA');

  return (
    <div className="max-w-3xl mx-auto aether-fade-up">

      {/* ── Header ── */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tighter">Timeline</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {allEntries.length} event{allEntries.length !== 1 ? 's' : ''} · chronological intelligence
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2">
          <Clock size={12} />
          Newest first
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div className="flex gap-1.5 flex-wrap mb-8">
        {FILTER_OPTIONS.map((f) => {
          const count = counts[f] ?? 0;
          if (count === 0 && f !== 'All') return null;
          const isActive = activeFilter === f;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all press-scale ${
                isActive
                  ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                  : 'border-slate-700/80 text-slate-500 hover:border-slate-600 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {f}
              <span className={`tabular-nums rounded-full px-1.5 py-0.5 text-[10px] ${
                isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Empty state ── */}
      {groups.length === 0 && (
        <div className="glass rounded-3xl p-20 text-center border border-slate-800/80 aether-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-5">
            <Layers size={24} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-slate-300">Nothing here yet</h3>
          <p className="text-slate-600 max-w-sm mx-auto text-sm leading-relaxed">
            Add entities or create relationships to see them appear on your timeline.
          </p>
        </div>
      )}

      {/* ── Timeline groups ── */}
      <div className="space-y-10">
        {groups.map((group, groupIdx) => {
          const isToday = group.key === todayKey;
          return (
            <section key={group.key} className="aether-fade-up" style={{ animationDelay: `${groupIdx * 60}ms` }}>

              {/* Day header */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`flex items-center gap-2 shrink-0 ${isToday ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {isToday && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 aether-dot-ping" />}
                  <span className={`text-xs font-semibold tracking-widest uppercase ${isToday ? 'text-cyan-300' : ''}`}>
                    {group.label}
                  </span>
                </div>
                <div className={`flex-1 h-px ${isToday ? 'bg-gradient-to-r from-cyan-500/30 to-transparent' : 'bg-slate-800/80'}`} />
                <span className="text-[10px] text-slate-700 tabular-nums font-mono bg-slate-900/60 px-2 py-0.5 rounded-full border border-slate-800 shrink-0">
                  {group.entries.length}
                </span>
              </div>

              {/* Entries */}
              <div className="relative pl-9">
                {/* Vertical guide line */}
                <div
                  aria-hidden
                  className={`absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b ${
                    isToday
                      ? 'from-cyan-500/60 via-cyan-500/20 to-transparent'
                      : 'from-slate-700/60 via-slate-800/40 to-transparent'
                  }`}
                />

                <div className="space-y-3 aether-stagger">
                  {group.entries.map((entry) => {
                    const isRecent = entry.isDynamic || (isToday && entry.kind === 'node');
                    return (
                      <div key={entry.id} className="relative">
                        {/* Timeline dot */}
                        <div aria-hidden className="absolute -left-9 top-[17px] z-10">
                          <div className={`w-3 h-3 rounded-full ring-2 ring-[#0A0A0C] ${
                            entry.kind === 'node'
                              ? DOT_COLOR[entry.node!.type]
                              : 'bg-cyan-500/70'
                          }`} />
                          {isRecent && (
                            <div className={`absolute inset-0 rounded-full opacity-50 aether-dot-ping ${
                              entry.kind === 'node' ? DOT_COLOR[entry.node!.type] : 'bg-cyan-400'
                            }`} />
                          )}
                        </div>

                        {entry.kind === 'node' ? (
                          <NodeCard
                            node={entry.node!}
                            date={entry.date}
                            relCtx={getRelCtx(entry.node!.id)}
                            onClick={() => setSelectedNode(entry.node!)}
                          />
                        ) : (
                          <RelationshipCard
                            relationship={entry.relationship!}
                            fromNode={entry.fromNode}
                            toNode={entry.toNode}
                            date={entry.date}
                            onClickFrom={() => entry.fromNode && setSelectedNode(entry.fromNode)}
                            onClickTo={() => entry.toNode && setSelectedNode(entry.toNode)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
