// components/views/TableView.tsx
'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Search, ArrowUp, ArrowDown, ArrowUpDown, Trash2, Download,
  Columns3, CheckSquare2, Square, X, ChevronLeft,
  ChevronRight as ChevronRightIcon, Filter, SearchX, Database, Plus,
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useAetherStore } from '@/lib/store';
import { OntologyNode, EntityType } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTITY_TYPES: EntityType[] = ['Person', 'Project', 'Location', 'Metric', 'Insight', 'Event', 'Document'];

const TYPE_BADGE: Record<EntityType, string> = {
  Person:   'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  Project:  'bg-violet-500/15 text-violet-300 border-violet-500/30',
  Location: 'bg-green-500/15 text-green-300 border-green-500/30',
  Metric:   'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Insight:  'bg-rose-500/15 text-rose-300 border-rose-500/30',
  Event:    'bg-orange-500/15 text-orange-300 border-orange-500/30',
  Document: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

type SortDir = 'asc' | 'desc';
type SortKey = 'label' | 'type' | 'status' | 'value' | 'role' | 'createdAt';

interface ColDef {
  key: SortKey;
  label: string;
  sortable: boolean;
  defaultVisible: boolean;
  width: string;
}

const COLUMNS: ColDef[] = [
  { key: 'type',      label: 'Type',    sortable: true,  defaultVisible: true,  width: 'w-32' },
  { key: 'label',     label: 'Name',    sortable: true,  defaultVisible: true,  width: 'flex-1' },
  { key: 'status',    label: 'Status',  sortable: true,  defaultVisible: true,  width: 'w-28' },
  { key: 'value',     label: 'Value',   sortable: true,  defaultVisible: true,  width: 'w-32' },
  { key: 'role',      label: 'Role',    sortable: false, defaultVisible: true,  width: 'w-36' },
  { key: 'createdAt', label: 'Created', sortable: true,  defaultVisible: true,  width: 'w-28' },
];

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCellValue(node: OntologyNode, key: SortKey): string {
  switch (key) {
    case 'label':     return node.label;
    case 'type':      return node.type;
    case 'status':    return String(node.properties.status ?? '');
    case 'value':     return String(node.properties.budget ?? node.properties.value ?? '');
    case 'role':      return String(node.properties.role ?? node.properties.organization ?? '');
    case 'createdAt': return node.createdAt ?? '';
    default:          return '';
  }
}

function formatValue(node: OntologyNode): string {
  const budget = node.properties.budget;
  const value  = node.properties.value;
  if (budget) return `$${Number(budget).toLocaleString()}`;
  if (value)  return Number(value).toLocaleString();
  return '—';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir | null }) {
  if (col !== sortKey) return <ArrowUpDown size={13} className="text-slate-600" />;
  return sortDir === 'asc'
    ? <ArrowUp size={13} className="text-cyan-400" />
    : <ArrowDown size={13} className="text-cyan-400" />;
}

function Checkbox({
  checked, indeterminate, onChange,
}: {
  checked: boolean; indeterminate?: boolean; onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TableViewProps {
  /** Restrict to a specific entity type (used when embedded in Projects view). */
  typeFilter?: EntityType;
  compact?: boolean;
}

export default function TableView({ typeFilter, compact = false }: TableViewProps) {
  const { data, removeNodes, setSelectedNode, setNewEntityModalOpen } = useAetherStore();

  const [search,       setSearch]       = useState('');
  const [activeType,   setActiveType]   = useState<EntityType | 'All'>(typeFilter ?? 'All');
  const [activeTag,    setActiveTag]    = useState<string | null>(null);
  const [sortKey,      setSortKey]      = useState<SortKey>('label');
  const [sortDir,      setSortDir]      = useState<SortDir>('asc');
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [visibleCols,  setVisibleCols]  = useState<Set<SortKey>>(new Set(COLUMNS.map(c => c.key)));
  const [colMenuOpen,  setColMenuOpen]  = useState(false);
  const [page,         setPage]         = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Sync activeType when the typeFilter prop changes (e.g. embedded use), via the
  // render-phase pattern to avoid a cascading setState-in-effect.
  const [prevTypeFilter, setPrevTypeFilter] = useState(typeFilter);
  if (typeFilter !== prevTypeFilter) {
    setPrevTypeFilter(typeFilter);
    if (typeFilter) setActiveType(typeFilter);
  }

  // Reset pagination whenever the active filters change (render-phase pattern).
  const filterKey = `${search} ${activeType} ${activeTag}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(0);
  }

  // Collect all tags across visible nodes
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    data.nodes.forEach(n => n.tags?.forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [data.nodes]);

  // ── Data pipeline ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let nodes = data.nodes;

    if (activeType !== 'All') {
      nodes = nodes.filter(n => n.type === activeType);
    }

    if (activeTag) {
      nodes = nodes.filter(n => n.tags?.includes(activeTag));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      nodes = nodes.filter(n => {
        const text = [
          n.label, n.type,
          ...(n.tags ?? []),
          ...Object.values(n.properties).map(v => typeof v === 'string' ? v : JSON.stringify(v)),
        ].join(' ').toLowerCase();
        return text.includes(q);
      });
    }

    return nodes;
  }, [data.nodes, activeType, activeTag, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = getCellValue(a, sortKey);
      const bv = getCellValue(b, sortKey);
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageSlice  = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const pageIds = new Set(pageSlice.map(n => n.id));
    const allSelected = pageSlice.every(n => selectedIds.has(n.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  }, [pageSlice, selectedIds]);

  const allPageSelected = pageSlice.length > 0 && pageSlice.every(n => selectedIds.has(n.id));
  const somePageSelected = pageSlice.some(n => selectedIds.has(n.id)) && !allPageSelected;

  // ── Sort click ─────────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // ── Bulk actions ───────────────────────────────────────────────────────────

  const handleBulkDelete = () => {
    removeNodes([...selectedIds]);
    setSelectedIds(new Set());
    setDeleteConfirm(false);
  };

  const handleBulkExport = () => {
    const rows = [['Type', 'Label', 'Status', 'Value', 'Role', 'Created']];
    data.nodes
      .filter(n => selectedIds.has(n.id))
      .forEach(n => {
        rows.push([
          n.type,
          n.label,
          String(n.properties.status ?? ''),
          formatValue(n),
          String(n.properties.role ?? n.properties.organization ?? ''),
          n.createdAt ?? '',
        ]);
      });
    const csv = rows.map(r => r.map(f => `"${f}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `aether-selection-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Col visibility ─────────────────────────────────────────────────────────

  const toggleCol = (key: SortKey) => {
    // Never hide 'label' (Name) or 'type'
    if (key === 'label' || key === 'type') return;
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const visibleColDefs = COLUMNS.filter(c => visibleCols.has(c.key));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col ${compact ? '' : 'h-full'}`}>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Filter entities…"
            className="w-full bg-slate-900 border border-slate-700 pl-9 pr-3 py-2 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Type filters */}
        {!typeFilter && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveType('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeType === 'All'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              All
              <span className="ml-1.5 text-slate-500 tabular-nums">{data.nodes.length}</span>
            </button>
            {ENTITY_TYPES.filter(t => data.nodes.some(n => n.type === t)).map(t => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeType === t
                    ? `${TYPE_BADGE[t]} border`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {t}
                <span className="ml-1.5 opacity-60 tabular-nums">
                  {data.nodes.filter(n => n.type === t).length}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={12} className="text-slate-600 shrink-0" />
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  activeTag === tag
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                    : 'text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Column visibility */}
        <div className="relative">
          <button
            onClick={() => setColMenuOpen(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition-all ${
              colMenuOpen
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <Columns3 size={13} />
            Columns
          </button>
          {colMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setColMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-20 w-44 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2">
                {COLUMNS.map(col => {
                  const locked  = col.key === 'label' || col.key === 'type';
                  const checked = visibleCols.has(col.key);
                  return (
                    <button
                      key={col.key}
                      onClick={() => toggleCol(col.key)}
                      disabled={locked}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {checked
                        ? <CheckSquare2 size={14} className="text-cyan-400 shrink-0" />
                        : <Square size={14} className="text-slate-600 shrink-0" />}
                      <span className="text-slate-300">{col.label}</span>
                      {locked && <span className="ml-auto text-[10px] text-slate-600">lock</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-cyan-500/8 border border-cyan-500/25 aether-fade-up">
          <span className="text-sm text-cyan-300 font-medium flex-1">
            {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleBulkExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
          >
            <Download size={12} /> Export CSV
          </button>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-all"
            >
              <Trash2 size={12} /> Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-300">Delete {selectedIds.size}?</span>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-xl text-xs bg-rose-500 hover:bg-rose-400 text-white transition-all font-medium"
              >
                Confirm
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-xl text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
            </div>
          )}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="glass rounded-3xl overflow-hidden flex-1 flex flex-col min-h-0">
        {sorted.length === 0 ? (
          <div className="flex-1 flex flex-col min-h-0">
            {data.nodes.length === 0 ? (
              <EmptyState
                icon={Database}
                color="cyan"
                title="No entities to display"
                description="Your ontology is empty. Add entities first to populate this table."
                actions={[
                  { label: 'New Entity', icon: Plus, onClick: () => setNewEntityModalOpen(true) },
                ]}
                size="md"
              />
            ) : (
              <EmptyState
                icon={SearchX}
                color="slate"
                title="No results match"
                description="Try adjusting your search term, type filter, or tag to find what you're looking for."
                actions={[
                  {
                    label: 'Clear filters',
                    onClick: () => { setSearch(''); setActiveType(typeFilter ?? 'All'); setActiveTag(null); },
                    variant: 'secondary',
                  },
                ]}
                size="md"
              />
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto flex-1 flex flex-col min-h-0 scroll-touch">
            {/* Header */}
            <div className="flex items-center gap-0 border-b border-slate-700 bg-slate-900/60 shrink-0 min-w-[660px]">
              {/* Checkbox col */}
              <div className="w-12 flex items-center justify-center py-3.5 shrink-0">
                <Checkbox
                  checked={allPageSelected}
                  indeterminate={somePageSelected}
                  onChange={toggleSelectAll}
                />
              </div>
              {visibleColDefs.map((col) => (
                <div
                  key={col.key}
                  className={`${col.key === 'label' ? 'flex-1' : col.width} py-3.5 px-3 shrink-0`}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors group"
                    >
                      {col.label}
                      <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {col.label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-800/60 overflow-y-auto flex-1 min-w-[660px]">
              {pageSlice.map((node, rowIdx) => {
                const isSelected = selectedIds.has(node.id);
                return (
                  <div
                    key={node.id}
                    className={`relative flex items-center gap-0 transition-all duration-100 cursor-pointer group ${
                      isSelected
                        ? 'bg-cyan-500/5 border-l-2 border-cyan-500/40'
                        : 'hover:bg-slate-800/40 border-l-2 border-transparent hover:border-slate-600/40'
                    }`}
                    style={{ animationDelay: `${rowIdx * 18}ms` }}
                  >
                    {/* Checkbox */}
                    <div
                      className="w-12 flex items-center justify-center py-3 shrink-0"
                      onClick={(e) => { e.stopPropagation(); toggleSelect(node.id); }}
                    >
                      <Checkbox checked={isSelected} onChange={() => toggleSelect(node.id)} />
                    </div>

                    {/* Data cells */}
                    <div
                      className="flex items-center flex-1 gap-0"
                      onClick={() => setSelectedNode(node)}
                    >
                      {visibleColDefs.map(col => (
                        <div
                          key={col.key}
                          className={`${col.key === 'label' ? 'flex-1' : col.width} py-3 px-3 shrink-0 min-w-0`}
                        >
                          {col.key === 'type' && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono border ${TYPE_BADGE[node.type as EntityType] ?? TYPE_BADGE.Document}`}>
                              {node.type}
                            </span>
                          )}
                          {col.key === 'label' && (
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-slate-200 group-hover:text-cyan-300 transition-colors truncate block">
                                {node.label}
                              </span>
                              {node.tags && node.tags.length > 0 && (
                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                  {node.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="text-[10px] bg-cyan-500/8 text-cyan-600 border border-cyan-500/15 rounded-full px-1.5 py-0.5">
                                      #{tag}
                                    </span>
                                  ))}
                                  {node.tags.length > 3 && (
                                    <span className="text-[10px] text-slate-600">+{node.tags.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          {col.key === 'status' && (
                            <span className="text-sm text-slate-400 truncate block">
                              {node.properties.status ? (
                                <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium ${
                                  node.properties.status === 'Active'   ? 'bg-emerald-500/12 text-emerald-400' :
                                  node.properties.status === 'Planning' ? 'bg-amber-500/12 text-amber-400'    :
                                  node.properties.status === 'At Risk'  ? 'bg-rose-500/12 text-rose-400'      :
                                  'bg-slate-500/12 text-slate-400'
                                }`}>
                                  {node.properties.status as string}
                                </span>
                              ) : <span className="text-slate-700">—</span>}
                            </span>
                          )}
                          {col.key === 'value' && (
                            <span className="text-xs text-slate-400 font-mono tabular-nums">
                              {formatValue(node)}
                            </span>
                          )}
                          {col.key === 'role' && (
                            <span className="text-xs text-slate-500 truncate block">
                              {String(node.properties.role ?? node.properties.organization ?? '—')}
                            </span>
                          )}
                          {col.key === 'createdAt' && (
                            <span className="text-[11px] text-slate-600 tabular-nums">
                              {node.createdAt
                                ? new Date(node.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                                : '—'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            </div>{/* end overflow-x-auto */}

            {/* Footer / pagination */}
            {sorted.length > PAGE_SIZE && (
              <div className="border-t border-slate-800 px-5 py-3 flex items-center justify-between shrink-0 bg-slate-900/40">
                <span className="text-xs text-slate-500">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 text-slate-400 hover:text-slate-200 transition-all"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-slate-500 tabular-nums px-1">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 text-slate-400 hover:text-slate-200 transition-all"
                  >
                    <ChevronRightIcon size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
