// components/calendar/CalendarView.tsx
'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, CalendarDays, Plus, X,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { OntologyNode, EntityType } from '@/types';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function normalizeDate(raw: unknown): string | null {
  if (!raw) return null;
  const s = String(raw);

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // Try native Date parse (handles ISO strings, named months, etc.)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  // MM/DD/YYYY or DD/MM/YYYY (treat as MM/DD/YYYY)
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    return `${year}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`;
  }

  return null;
}

// ─── Display metadata ─────────────────────────────────────────────────────────

const TYPE_DOT: Record<EntityType, string> = {
  Event:    'bg-orange-400',
  Project:  'bg-purple-400',
  Insight:  'bg-rose-400',
  Person:   'bg-cyan-400',
  Location: 'bg-green-400',
  Metric:   'bg-amber-400',
  Document: 'bg-slate-400',
};

const TYPE_LABEL: Record<EntityType, string> = {
  Event:    'text-orange-300',
  Project:  'text-purple-300',
  Insight:  'text-rose-300',
  Person:   'text-cyan-300',
  Location: 'text-green-300',
  Metric:   'text-amber-300',
  Document: 'text-slate-300',
};

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

// ─── Build date → nodes map ───────────────────────────────────────────────────

function buildDateMap(nodes: OntologyNode[]): Map<string, OntologyNode[]> {
  const map = new Map<string, OntologyNode[]>();

  const add = (date: string | null, node: OntologyNode) => {
    if (!date) return;
    map.set(date, [...(map.get(date) ?? []), node]);
  };

  nodes.forEach((node) => {
    if (node.type === 'Event') {
      add(normalizeDate(node.properties.date), node);
    } else if (node.type === 'Insight') {
      add(normalizeDate(node.properties.analyzedAt ?? node.createdAt), node);
    } else {
      // Projects and everything else: show on their createdAt date
      add(normalizeDate(node.createdAt), node);
    }
  });

  return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarView() {
  const { data, setSelectedNode, setNewEntityModalOpen } = useAetherStore();

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().slice(0, 10), [today]);

  const [year,         setYear]         = useState(today.getFullYear());
  const [month,        setMonth]        = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dateMap = useMemo(() => buildDateMap(data.nodes), [data.nodes]);

  // ── Calendar grid ─────────────────────────────────────────────────────────

  const cells = useMemo(() => {
    const firstDow   = new Date(year, month, 1).getDay();
    const daysInMon  = new Date(year, month + 1, 0).getDate();
    const result: Array<{ day: number | null; dateStr: string | null }> = [];

    for (let i = 0; i < firstDow; i++) result.push({ day: null, dateStr: null });

    for (let d = 1; d <= daysInMon; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      result.push({ day: d, dateStr });
    }

    const rem = result.length % 7;
    if (rem > 0) for (let i = 0; i < 7 - rem; i++) result.push({ day: null, dateStr: null });

    return result;
  }, [year, month]);

  // ── Navigation ────────────────────────────────────────────────────────────

  const navigate = (dir: -1 | 1) => {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedDate(null);
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  // ── Month stats ───────────────────────────────────────────────────────────

  const monthPrefix  = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEntries = [...dateMap.entries()].filter(([d]) => d.startsWith(monthPrefix));
  const monthNodes   = monthEntries.flatMap(([, ns]) => ns);
  const eventCount   = monthNodes.filter((n) => n.type === 'Event').length;
  const projectCount = monthNodes.filter((n) => n.type === 'Project').length;

  const selectedEntities = selectedDate ? (dateMap.get(selectedDate) ?? []) : [];

  // Upcoming events from today forward
  const upcoming = useMemo(() =>
    [...dateMap.entries()]
      .filter(([d]) => d >= todayStr)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 7),
    [dateMap, todayStr]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="aether-fade-up">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tighter">Calendar</h1>
          <p className="text-slate-400 mt-1">
            {eventCount} event{eventCount !== 1 ? 's' : ''} · {projectCount} project{projectCount !== 1 ? 's' : ''} this month
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={goToToday}
            className="px-4 py-2 border border-slate-700 hover:border-slate-500 rounded-xl text-sm text-slate-400 hover:text-white transition-all press-scale"
          >
            Today
          </button>
          <button
            onClick={() => setNewEntityModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-medium transition-colors press-scale"
          >
            <Plus size={15} /> New Event
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-5">

        {/* ── Calendar grid ── */}
        <div className="glass rounded-3xl p-5 sm:p-7 flex-1 min-w-0">

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors press-scale"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
            <button
              onClick={() => navigate(1)}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors press-scale"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-widest text-slate-600 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, i) => {
              if (!cell.day || !cell.dateStr) {
                return <div key={i} className="aspect-square" />;
              }

              const isToday    = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDate;
              const nodes      = dateMap.get(cell.dateStr) ?? [];
              const dotTypes   = [...new Set(nodes.map((n) => n.type as EntityType))].slice(0, 3);

              return (
                <button
                  key={cell.dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : cell.dateStr!)}
                  className={`aspect-square flex flex-col items-center justify-start pt-1.5 rounded-xl transition-all duration-150 press-scale ${
                    isSelected
                      ? 'bg-cyan-500/15 ring-1 ring-cyan-500/40'
                      : isToday
                      ? 'ring-1 ring-cyan-500/30 hover:bg-slate-800/60'
                      : 'hover:bg-slate-800/50'
                  }`}
                  aria-label={`${cell.day} ${MONTHS[month]} ${year}${nodes.length > 0 ? ` — ${nodes.length} item${nodes.length !== 1 ? 's' : ''}` : ''}`}
                >
                  <span className={`text-sm font-medium leading-none mb-1 ${
                    isToday    ? 'text-cyan-400'  :
                    isSelected ? 'text-cyan-300'  :
                    nodes.length > 0 ? 'text-slate-200' :
                    'text-slate-500'
                  }`}>
                    {cell.day}
                  </span>
                  {dotTypes.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      {dotTypes.map((type) => (
                        <span
                          key={type}
                          className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT[type] ?? 'bg-slate-500'}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-4 flex-wrap">
            {(['Event', 'Project', 'Insight', 'Document'] as EntityType[]).map((type) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`w-2 h-2 rounded-full ${TYPE_DOT[type]}`} />
                {type}s
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-auto">
              <span className="w-4 h-4 rounded-md ring-1 ring-cyan-500/40 inline-block" />
              Today
            </div>
          </div>
        </div>

        {/* ── Side panel: selected day or upcoming ── */}
        <div className="xl:w-80 shrink-0">
          {selectedDate ? (
            /* Day detail */
            <div className="glass rounded-3xl p-5 aether-scale-in">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Selected</p>
                  <h3 className="font-semibold leading-snug">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric',
                    })}
                  </h3>
                  {selectedEntities.length > 0 && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedEntities.length} item{selectedEntities.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                  aria-label="Clear selection"
                >
                  <X size={14} />
                </button>
              </div>

              {selectedEntities.length === 0 ? (
                <div className="py-10 text-center">
                  <CalendarDays size={28} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Nothing on this day</p>
                  <button
                    onClick={() => setNewEntityModalOpen(true)}
                    className="mt-3 text-xs text-cyan-500 hover:text-cyan-400 transition-colors flex items-center gap-1 mx-auto"
                  >
                    <Plus size={11} /> Add event
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEntities.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className="w-full flex items-start gap-3 p-3 rounded-2xl border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 text-left transition-all group"
                    >
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${TYPE_DOT[node.type as EntityType] ?? 'bg-slate-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 group-hover:text-white truncate">
                          {node.label}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${TYPE_LABEL[node.type as EntityType] ?? 'text-slate-500'}`}>
                          {node.type}
                        </p>
                        {node.type === 'Event' && node.properties.status && (
                          <p className="text-[10px] text-slate-600 mt-0.5">{String(node.properties.status)}</p>
                        )}
                        {node.type === 'Project' && node.properties.progress !== undefined && (
                          <div className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                Number(node.properties.progress) >= 70 ? 'bg-emerald-400' :
                                Number(node.properties.progress) >= 35 ? 'bg-cyan-400'    : 'bg-rose-400'
                              }`}
                              style={{ width: `${node.properties.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <ChevronRight size={12} className="text-slate-700 group-hover:text-slate-400 shrink-0 mt-1 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Upcoming panel */
            <div className="glass rounded-3xl p-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-4">Upcoming</p>

              {upcoming.length === 0 ? (
                <div className="py-10 text-center">
                  <CalendarDays size={28} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 mb-1">No upcoming items</p>
                  <p className="text-xs text-slate-600">
                    Add Event entities with a <span className="font-mono">date</span> property
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcoming.map(([date, nodes]) => {
                    const d = new Date(date + 'T12:00:00');
                    return (
                      <button
                        key={date}
                        onClick={() => {
                          setYear(d.getFullYear());
                          setMonth(d.getMonth());
                          setSelectedDate(date);
                        }}
                        className="w-full flex items-start gap-3 p-3 rounded-2xl border border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/40 text-left transition-all group"
                      >
                        {/* Date block */}
                        <div className="text-center w-9 shrink-0">
                          <div className={`text-xl font-bold leading-none tabular-nums ${
                            date === todayStr ? 'text-cyan-400' : 'text-slate-200'
                          }`}>
                            {d.getDate()}
                          </div>
                          <div className="text-[10px] text-slate-600 uppercase mt-0.5">
                            {d.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                        </div>

                        {/* Items */}
                        <div className="flex-1 min-w-0">
                          {nodes.slice(0, 2).map((node) => (
                            <div key={node.id} className="flex items-center gap-1.5 mb-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT[node.type as EntityType] ?? 'bg-slate-500'}`} />
                              <span className="text-xs text-slate-300 group-hover:text-slate-200 truncate transition-colors">
                                {node.label}
                              </span>
                            </div>
                          ))}
                          {nodes.length > 2 && (
                            <p className="text-[10px] text-slate-600">+{nodes.length - 2} more</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
