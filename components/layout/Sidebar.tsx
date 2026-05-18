// components/layout/Sidebar.tsx
'use client';

import React from 'react';
import {
  Home, Search, Users, FolderOpen, Map, BarChart3, Clock, Plus,
  Command, Table2, Columns2, Database, X, CalendarDays,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';

type View = 'dashboard' | 'search' | 'entities' | 'projects' | 'geospatial' | 'analytics' | 'timeline' | 'table' | 'kanban' | 'data' | 'calendar';

interface MenuItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  view: View;
  section?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: Home,       label: 'Dashboard',  view: 'dashboard' },
  { icon: Search,     label: 'Search',     view: 'search' },
  { icon: Users,      label: 'Entities',   view: 'entities',   section: 'Data Views' },
  { icon: Table2,     label: 'Table',      view: 'table' },
  { icon: FolderOpen, label: 'Projects',   view: 'projects',   section: 'Workspace' },
  { icon: Columns2,   label: 'Kanban',     view: 'kanban' },
  { icon: Clock,      label: 'Timeline',   view: 'timeline' },
  { icon: Map,        label: 'Geospatial', view: 'geospatial', section: 'Intelligence' },
  { icon: BarChart3,  label: 'Analytics',  view: 'analytics' },
  { icon: Database,     label: 'Data',     view: 'data',     section: 'Data' },
  { icon: CalendarDays, label: 'Calendar', view: 'calendar' },
];

// Subset shown in the mobile bottom nav
const BOTTOM_NAV: View[] = ['dashboard', 'entities', 'projects', 'analytics', 'data'];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const {
    currentView, setCurrentView,
    searchQuery, setSearchQuery,
    setNewEntityModalOpen,
    data,
    workspaces, currentWorkspaceId,
  } = useAetherStore();

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];

  const counts: Partial<Record<View, number>> = {
    entities:  data.nodes.length,
    projects:  data.nodes.filter(n => n.type === 'Project').length,
    table:     data.nodes.length,
    kanban:    data.nodes.filter(n => n.type === 'Project').length,
    analytics: data.nodes.filter(n => n.type === 'Insight' || n.label.startsWith('Analysis:')).length || undefined,
  };

  const navigate = (view: View) => {
    setCurrentView(view);
    onClose();
  };

  return (
    <>
      {/* ── Mobile backdrop ─────────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Sidebar panel ───────────────────────────────────────────────────── */}
      {/*
        Mobile  (< lg): fixed overlay; slides in/out via transform.
        Desktop (≥ lg): relative flex child; always visible.
      */}
      <div
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          w-72 lg:w-64 shrink-0
          bg-[#0B1120] border-r border-slate-800/80
          flex flex-col h-full
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)] aether-glow-pulse shrink-0">
              <span className="text-black font-bold text-xl leading-none select-none">Æ</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">AETHER</h1>
              <p className="text-[11px] text-slate-500 tracking-widest uppercase">Intelligence OS</p>
              {currentWorkspace && (
                <p className="text-[10px] text-slate-700 mt-0.5 truncate max-w-[120px]" title={currentWorkspace.name}>
                  {currentWorkspace.name}
                  {currentWorkspace.members.length > 0 && (
                    <span className="ml-1 opacity-60">· {currentWorkspace.members.length}</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="lg:hidden p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Search */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={14} />
            <input
              type="text"
              placeholder="Quick search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Quick search"
              className="w-full bg-slate-900/60 border border-slate-700/60 pl-8 pr-10 py-2 rounded-xl text-sm focus:outline-none focus:border-cyan-500/60 focus:bg-slate-900 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.08)] transition-all placeholder:text-slate-600"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none opacity-50">
              <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-slate-500 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 font-mono leading-none">
                <Command size={8} />K
              </kbd>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-1 overflow-y-auto scroll-touch" aria-label="Main navigation">
          {MENU_ITEMS.map((item) => {
            const isActive = currentView === item.view;
            const count    = counts[item.view];

            return (
              <React.Fragment key={item.view}>
                {item.section && (
                  <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold tracking-[0.12em] text-slate-600 uppercase select-none">
                    {item.section}
                  </p>
                )}

                <button
                  onClick={() => navigate(item.view)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 text-left group touch-target ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-300 shadow-[inset_0_1px_0_rgba(34,211,238,0.1)]'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyan-400 rounded-r-full shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                  )}
                  {!isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 group-hover:h-4 bg-slate-600 rounded-r-full transition-all duration-200" />
                  )}

                  <item.icon
                    size={16}
                    className={`shrink-0 transition-all duration-150 ${
                      isActive
                        ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]'
                        : 'group-hover:text-slate-300'
                    }`}
                  />
                  <span className={`font-medium text-sm flex-1 ${isActive ? 'text-cyan-200' : ''}`}>
                    {item.label}
                  </span>

                  {count !== undefined && count > 0 && (
                    <span className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-md transition-colors ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-slate-800 text-slate-600 group-hover:bg-slate-700 group-hover:text-slate-400'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800/80 space-y-2">
          <button
            onClick={() => { setNewEntityModalOpen(true); onClose(); }}
            aria-label="Create new entity"
            className="btn-glow w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black font-semibold py-3 rounded-xl text-sm shadow-[0_0_20px_rgba(34,211,238,0.18)] active:scale-95"
          >
            <Plus size={16} />
            New Entity
          </button>

          <div className="flex items-center justify-center gap-3 pt-1">
            <span className="text-[11px] text-slate-700 tabular-nums">
              {data.nodes.length} entities
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span className="text-[11px] text-slate-700 tabular-nums">
              {data.relationships.length} links
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom nav — phones only (< sm = 640px) ─────────────────────────── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0B1120]/95 backdrop-blur-md border-t border-slate-800/80 flex items-center justify-around pb-safe"
        aria-label="Mobile navigation"
      >
        {BOTTOM_NAV.map((view) => {
          const item    = MENU_ITEMS.find(m => m.view === view)!;
          const isActive = currentView === view;
          const Icon     = item.icon;
          return (
            <button
              key={view}
              onClick={() => navigate(view)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={`flex flex-col items-center gap-1 px-4 py-2.5 transition-colors touch-target ${
                isActive ? 'text-cyan-400' : 'text-slate-600 active:text-slate-300'
              }`}
            >
              <Icon size={20} className={isActive ? 'drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]' : ''} />
              <span className={`text-[9px] font-medium tracking-wide ${isActive ? 'text-cyan-400' : 'text-slate-600'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
