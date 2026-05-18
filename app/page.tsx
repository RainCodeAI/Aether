// app/page.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import OntologyGraph from '@/components/ontology/OntologyGraph';
import NodeDetailPanel from '@/components/ontology/NodeDetailPanel';
import AetherMap from '@/components/geospatial/AetherMap';
import SearchPanel from '@/components/search/SearchPanel';
import AIInsightsPanel from '@/components/ai/AIInsightsPanel';
import NewEntityModal from '@/components/entities/NewEntityModal';
import TimelineView from '@/components/timeline/TimelineView';
import TableView from '@/components/views/TableView';
import KanbanView from '@/components/views/KanbanView';
import DataView from '@/components/data/DataView';
import PDFUploadModal from '@/components/data/PDFUploadModal';
import CalendarView from '@/components/calendar/CalendarView';
import WorkspaceSwitcher from '@/components/collaboration/WorkspaceSwitcher';
import { useAetherStore } from '@/lib/store';
import {
  Search, Bell, Plus, Lightbulb, ArrowRight, Sparkles, ChevronRight,
  Upload, AlertTriangle, CheckCircle2, XCircle, X,
  FolderOpen, Users, BarChart3, Zap, TrendingUp, ShieldAlert,
  LayoutGrid, Table2, Columns2, Eye, Menu, FileText,
} from 'lucide-react';
import { searchOntology, generateAutoInsights, AutoInsight } from '@/lib/ai-search';
import { exportAsJSON, exportAsCSV, exportGraphAsPNG } from '@/lib/export';
import { importFromJSON, ImportResult } from '@/lib/import';
import { getShareTokenFromUrl, ShareToken } from '@/lib/share';

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState {
  type: 'success' | 'error';
  title: string;
  message: string;
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const isSuccess = toast.type === 'success';
  return (
    <div
      className={`fixed top-6 right-6 z-[100] flex items-start gap-3 rounded-2xl p-4 max-w-sm shadow-2xl border backdrop-blur-sm ${
        isSuccess
          ? 'bg-emerald-950/95 border-emerald-500/30'
          : 'bg-rose-950/95 border-rose-500/30'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          isSuccess ? 'bg-emerald-500/20' : 'bg-rose-500/20'
        }`}
      >
        {isSuccess
          ? <CheckCircle2 size={16} className="text-emerald-400" />
          : <XCircle      size={16} className="text-rose-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isSuccess ? 'text-emerald-300' : 'text-rose-300'}`}>
          {toast.title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
      <button onClick={onDismiss} className="shrink-0 p-0.5 text-slate-500 hover:text-slate-200 transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Confirm import dialog ─────────────────────────────────────────────────────

interface ConfirmDialogProps {
  pending: ImportResult & { filename: string };
  currentNodeCount: number;
  currentRelCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmImportDialog({
  pending, currentNodeCount, currentRelCount, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="glass w-full max-w-md rounded-3xl p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Replace current data?</h2>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone</p>
          </div>
        </div>

        {/* Filename */}
        <p className="text-sm text-slate-400 leading-relaxed mb-5">
          Importing{' '}
          <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded text-xs">
            {pending.filename}
          </span>{' '}
          will permanently replace all current entities and relationships.
        </p>

        {/* Data comparison */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 divide-y divide-slate-800 mb-4">
          <div className="flex items-center justify-between px-5 py-3 text-sm">
            <span className="text-slate-500">Current data</span>
            <span className="font-mono text-slate-400">
              {currentNodeCount} entities · {currentRelCount} relationships
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-3 text-sm">
            <span className="text-slate-500">Replacing with</span>
            <span className="font-mono text-cyan-400">
              {pending.nodeCount} entities · {pending.relationshipCount} relationships
            </span>
          </div>
        </div>

        {/* Warnings */}
        {pending.warnings.length > 0 && (
          <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4 mb-5 space-y-1.5">
            <p className="text-xs font-semibold text-amber-400 mb-1">Import warnings</p>
            {pending.warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-300/80 flex items-start gap-2">
                <span className="shrink-0 mt-px">⚠</span>
                <span>{w}</span>
              </p>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-semibold transition-colors"
          >
            Import & Replace
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AetherDashboard() {
  const {
    data, setData,
    searchQuery, setSearchQuery,
    currentView, setCurrentView,
    isNewEntityModalOpen, setNewEntityModalOpen,
    selectedNode, setSelectedNode,
    isAIAnalystOpen, setAIAnalystOpen,
    isPDFUploadModalOpen, setPDFUploadModalOpen,
    pdfLinkedEntityId, setPDFLinkedEntityId,
  } = useAetherStore();

  // Import state
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [importPending,    setImportPending]    = useState<(ImportResult & { filename: string }) | null>(null);
  const [isDragOver,       setIsDragOver]       = useState(false);
  const [toast,            setToast]            = useState<ToastState | null>(null);
  const [projectsSubView,  setProjectsSubView]  = useState<'grid' | 'table' | 'kanban'>('grid');
  const [shareToken,       setShareToken]       = useState<ShareToken | null>(null);
  const [sidebarOpen,      setSidebarOpen]      = useState(false);

  // Detect ?share= URL param on mount
  useEffect(() => {
    const token = getShareTokenFromUrl();
    if (token) setShareToken(token);
  }, []);

  // Close sidebar on route change (view change)
  const { currentView: _cv } = useAetherStore();
  useEffect(() => { setSidebarOpen(false); }, [_cv]);

  // Auto-dismiss toast after 5 s
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  // Global drag detection — show the drop overlay whenever any file enters the window
  useEffect(() => {
    let counter = 0;
    const onEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) { counter++; setIsDragOver(true); }
    };
    const onLeave = () => { if (--counter <= 0) { counter = 0; setIsDragOver(false); } };
    const onDrop  = () => { counter = 0; setIsDragOver(false); };
    document.addEventListener('dragenter', onEnter);
    document.addEventListener('dragleave', onLeave);
    document.addEventListener('drop',      onDrop);
    return () => {
      document.removeEventListener('dragenter', onEnter);
      document.removeEventListener('dragleave', onLeave);
      document.removeEventListener('drop',      onDrop);
    };
  }, []);

  // Cmd/Ctrl + K → focus command bar search input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    try {
      const result = await importFromJSON(file);
      setImportPending({ ...result, filename: file.name });
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Import failed',
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    }
  }, []);

  const handleConfirmImport = useCallback(() => {
    if (!importPending) return;
    setData(importPending.data);
    const { nodeCount, relationshipCount, warnings } = importPending;
    setImportPending(null);
    setToast({
      type: 'success',
      title: 'Import successful',
      message: `${nodeCount} entit${nodeCount !== 1 ? 'ies' : 'y'} and ${relationshipCount} relationship${relationshipCount !== 1 ? 's' : ''} loaded.${warnings.length > 0 ? ` (${warnings.length} warning${warnings.length !== 1 ? 's' : ''} — see console)` : ''}`,
    });
    if (warnings.length > 0) console.warn('[Aether import warnings]', warnings);
  }, [importPending, setData]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ''; // reset so same file can be re-selected
        }}
      />

      {/* Full-screen drag-and-drop overlay */}
      {isDragOver && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center pointer-events-auto"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
        >
          <div className="glass rounded-3xl px-20 py-16 text-center border-2 border-dashed border-cyan-500/60 max-w-md pointer-events-none select-none">
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-6">
              <Upload size={36} className="text-cyan-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Drop to import</h2>
            <p className="text-slate-400 text-sm">Drop your Aether JSON backup file here</p>
          </div>
        </div>
      )}

      {/* Confirm import dialog */}
      {importPending && (
        <ConfirmImportDialog
          pending={importPending}
          currentNodeCount={data.nodes.length}
          currentRelCount={data.relationships.length}
          onConfirm={handleConfirmImport}
          onCancel={() => setImportPending(null)}
        />
      )}

      {/* Toast notifications */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      {/* Sidebar — fixed overlay on mobile, flex child on desktop */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area — always full width on mobile (sidebar is fixed overlay) */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Command Bar */}
        <div className="h-14 sm:h-16 border-b border-slate-800 bg-[#0A0A0C]/80 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 lg:px-8 z-10 gap-2 sm:gap-4 shrink-0">

          {/* Left: hamburger (mobile) + greeting (desktop) */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white shrink-0 touch-target"
            >
              <Menu size={20} />
            </button>

            <div className="hidden md:block text-sm text-slate-400 shrink-0">
              {(() => {
                const h = new Date().getHours();
                const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
                return `${greeting}, Avery`;
              })()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder='Ask anything…'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      setAIAnalystOpen(true);
                    }
                    if (e.key === 'Escape') {
                      e.currentTarget.blur();
                      setSearchQuery('');
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 pl-9 sm:pl-11 pr-10 sm:pr-16 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
                {searchQuery.trim() ? (
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-500 font-mono pointer-events-none">
                    ⏎
                  </kbd>
                ) : (
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-600 font-mono pointer-events-none hidden sm:flex items-center gap-0.5">
                    ⌘K
                  </kbd>
                )}
              </div>
            </div>
          </div>

          {/* Right: workspace switcher (desktop) + bell + reset + avatar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden lg:flex">
              <WorkspaceSwitcher />
            </div>
            <button
              aria-label="Notifications"
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors touch-target"
            >
              <Bell size={18} />
            </button>
            <button
              onClick={() => {
                if (confirm('Clear all data and reset to defaults?')) {
                  localStorage.removeItem('aether-storage-v1');
                  window.location.reload();
                }
              }}
              className="hidden sm:block text-xs text-slate-500 hover:text-slate-300 px-3 py-1.5 transition-colors"
            >
              Reset
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-emerald-400 rounded-full flex items-center justify-center text-black font-semibold cursor-pointer select-none text-xs">
              AM
            </div>
          </div>
        </div>

        {/* Shared-view banner */}
        {shareToken && (
          <div className="flex items-center justify-between px-8 py-2 bg-cyan-950/60 border-b border-cyan-800/30 shrink-0">
            <div className="flex items-center gap-2 text-xs text-cyan-400">
              <Eye size={13} className="shrink-0" />
              <span>Read-only shared view</span>
              <span className="text-cyan-600">·</span>
              <span className="font-medium truncate max-w-[260px]">{shareToken.label}</span>
            </div>
            <button
              onClick={() => {
                window.history.replaceState({}, '', window.location.pathname);
                setShareToken(null);
              }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors shrink-0 ml-4"
            >
              <X size={12} /> Exit shared view
            </button>
          </div>
        )}

        {/* Dashboard Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-[#0A0A0C] pb-20 sm:pb-6 lg:pb-8 scroll-touch">
          <div className="max-w-screen-2xl mx-auto">

            {currentView === 'dashboard' && (
              <div className="aether-fade-up">
                {/* ── Dashboard header ── */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 sm:mb-8 gap-4">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tighter leading-none mb-2">
                      Command Center
                    </h1>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mt-3">
                      {[
                        { label: 'entities',      count: data.nodes.length,                                          color: 'text-cyan-400' },
                        { label: 'relationships', count: data.relationships.length,                                    color: 'text-purple-400' },
                        { label: 'projects',      count: data.nodes.filter(n => n.type === 'Project').length,         color: 'text-violet-400' },
                        { label: 'people',        count: data.nodes.filter(n => n.type === 'Person').length,          color: 'text-emerald-400' },
                      ].map(({ label, count, color }) => (
                        <span key={label} className="stat-chip">
                          <span className={`font-semibold tabular-nums ${color}`}>{count}</span>
                          <span className="text-slate-500">{label}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap sm:justify-end shrink-0">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-dashed border-slate-700 hover:border-cyan-500/60 hover:bg-cyan-500/5 hover:text-cyan-300 text-slate-500 rounded-xl text-sm transition-all group press-scale"
                      title="Import JSON — or drag & drop anywhere"
                    >
                      <Upload size={14} className="group-hover:text-cyan-400 transition-colors" />
                      Import
                    </button>
                    <button
                      onClick={() => { setPDFLinkedEntityId(undefined); setPDFUploadModalOpen(true); }}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-dashed border-slate-700 hover:border-rose-500/50 hover:bg-rose-500/5 hover:text-rose-300 text-slate-500 rounded-xl text-sm transition-all group press-scale"
                      title="Upload & analyze a PDF document"
                    >
                      <FileText size={14} className="group-hover:text-rose-400 transition-colors" />
                      PDF
                    </button>
                    <div className="hidden sm:block w-px bg-slate-800 self-stretch mx-1" />
                    <button onClick={() => exportAsJSON(data)} className="px-3 sm:px-4 py-2 border border-slate-800 hover:border-slate-600 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-all press-scale">JSON</button>
                    <button onClick={() => exportAsCSV(data)} className="hidden sm:block px-4 py-2 border border-slate-800 hover:border-slate-600 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-all press-scale">CSV</button>
                    <button onClick={exportGraphAsPNG} className="hidden sm:block px-4 py-2 border border-slate-800 hover:border-slate-600 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-all press-scale">PNG</button>
                    <button
                      onClick={() => setAIAnalystOpen(true)}
                      className="btn-glow flex items-center gap-2 px-3 sm:px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-semibold"
                    >
                      <Sparkles size={14} />
                      Analyse
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
                  {/* ── Graph card ── */}
                  <div className="col-span-1 lg:col-span-8 aether-fade-up" style={{ animationDelay: '40ms' }}>
                    <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-800/80 h-full">
                      <div className="flex items-center justify-between mb-4 sm:mb-5">
                        <h2 className="text-base font-semibold flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 aether-dot-ping inline-block" />
                          Live Intelligence Graph
                        </h2>
                        <span className="text-xs text-slate-600 font-mono tabular-nums">
                          {data.nodes.length} nodes · {data.relationships.length} edges
                        </span>
                      </div>
                      <OntologyGraph />
                    </div>
                  </div>

                  {/* ── Right column ── */}
                  <div className="col-span-1 lg:col-span-4 flex flex-col gap-4 sm:gap-5">

                    {/* Intelligence Feed */}
                    {(() => {
                      const autoInsights = generateAutoInsights(data);
                      if (autoInsights.length === 0) return null;
                      const severityStyle: Record<AutoInsight['severity'], { bg: string; border: string; hoverBorder: string; icon: React.ReactNode; label: string }> = {
                        risk:        { bg: 'bg-rose-500/6',    border: 'border-rose-500/20',    hoverBorder: 'hover:border-rose-500/40',    icon: <ShieldAlert size={13} className="text-rose-400" />,   label: 'text-rose-300' },
                        opportunity: { bg: 'bg-emerald-500/6', border: 'border-emerald-500/20', hoverBorder: 'hover:border-emerald-500/40', icon: <TrendingUp size={13} className="text-emerald-400" />, label: 'text-emerald-300' },
                        info:        { bg: 'bg-cyan-500/6',    border: 'border-cyan-500/20',    hoverBorder: 'hover:border-cyan-500/40',    icon: <Zap size={13} className="text-cyan-400" />,           label: 'text-cyan-300' },
                      };
                      return (
                        <div className="glass rounded-3xl p-5 border border-slate-800/80 aether-fade-up" style={{ animationDelay: '80ms' }}>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                              <Sparkles size={13} className="text-cyan-400" />
                              Intelligence Feed
                            </h3>
                            <span className="text-[10px] text-slate-600 font-mono bg-slate-800/60 border border-slate-700/60 rounded-full px-2 py-0.5">
                              {autoInsights.length} signal{autoInsights.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="space-y-2 aether-stagger">
                            {autoInsights.map((insight) => {
                              const style = severityStyle[insight.severity];
                              return (
                                <button
                                  key={insight.id}
                                  onClick={() => { setSearchQuery(insight.query); setAIAnalystOpen(true); }}
                                  className={`w-full text-left p-3.5 rounded-2xl border ${style.bg} ${style.border} ${style.hoverBorder} hover:brightness-110 transition-all duration-150 group press-scale`}
                                >
                                  <div className="flex items-start gap-2.5">
                                    <span className="shrink-0 mt-0.5">{style.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-semibold ${style.label} mb-0.5 leading-snug`}>{insight.title}</p>
                                      <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{insight.description}</p>
                                    </div>
                                    <ChevronRight size={11} className="text-slate-700 group-hover:text-slate-400 shrink-0 mt-0.5 transition-colors group-hover:translate-x-0.5 duration-150" />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Projects card */}
                    <div className="glass rounded-3xl p-5 border border-slate-800/80 aether-fade-up" style={{ animationDelay: '120ms' }}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <FolderOpen size={13} className="text-purple-400" />
                          Active Projects
                        </h3>
                        <button
                          onClick={() => setCurrentView('projects')}
                          className="text-[11px] text-slate-600 hover:text-cyan-400 transition-colors flex items-center gap-1"
                        >
                          View all <ChevronRight size={11} />
                        </button>
                      </div>
                      {data.nodes.filter(n => n.type === 'Project').length === 0 ? (
                        <div className="py-7 flex flex-col items-center gap-3 text-center">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/15 flex items-center justify-center">
                            <FolderOpen size={20} className="text-purple-500/50" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-400">No projects yet</p>
                            <p className="text-xs text-slate-600 mt-0.5">Track budgets, progress & team</p>
                          </div>
                          <button
                            onClick={() => setNewEntityModalOpen(true)}
                            className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
                          >
                            <Plus size={11} /> Add a project
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 aether-stagger">
                          {data.nodes.filter(n => n.type === 'Project').slice(0, 4).map(project => {
                            const progress = Number(project.properties.progress) || 0;
                            const statusColor =
                              project.properties.status === 'Active'   ? 'bg-emerald-400' :
                              project.properties.status === 'At Risk'  ? 'bg-rose-400'    :
                              project.properties.status === 'Complete' ? 'bg-slate-500'   :
                              'bg-amber-400';
                            return (
                              <button
                                key={project.id}
                                onClick={() => setSelectedNode(project)}
                                className="w-full text-left px-3.5 py-3 bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-purple-500/30 hover:bg-slate-800/60 transition-all duration-150 group press-scale"
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor}`} />
                                  <span className="font-medium text-xs text-slate-200 group-hover:text-purple-300 transition-colors flex-1 truncate">{project.label}</span>
                                  {project.properties.progress !== undefined && (
                                    <span className="text-[10px] font-mono text-slate-500 tabular-nums">{progress}%</span>
                                  )}
                                </div>
                                {project.properties.progress !== undefined && (
                                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        progress >= 70 ? 'bg-emerald-400' : progress >= 35 ? 'bg-cyan-400' : 'bg-rose-400'
                                      }`}
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Metrics card */}
                    <div className="glass rounded-3xl p-5 border border-slate-800/80 aether-fade-up" style={{ animationDelay: '160ms' }}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <BarChart3 size={13} className="text-amber-400" />
                          Key Metrics
                        </h3>
                        <button
                          onClick={() => setCurrentView('analytics')}
                          className="text-[11px] text-slate-600 hover:text-cyan-400 transition-colors flex items-center gap-1"
                        >
                          Analytics <ChevronRight size={11} />
                        </button>
                      </div>
                      {data.nodes.filter(n => n.type === 'Metric').length === 0 ? (
                        <div className="py-7 flex flex-col items-center gap-3 text-center">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/15 flex items-center justify-center">
                            <BarChart3 size={20} className="text-amber-500/50" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-400">No metrics yet</p>
                            <p className="text-xs text-slate-600 mt-0.5">Add KPIs to track over time</p>
                          </div>
                          <button
                            onClick={() => setNewEntityModalOpen(true)}
                            className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
                          >
                            <Plus size={11} /> Add a metric
                          </button>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-800/60">
                          {data.nodes.filter(n => n.type === 'Metric').slice(0, 3).map(metric => {
                            const val = metric.properties.value;
                            const unit = metric.properties.unit;
                            const display = typeof val === 'number'
                              ? unit === 'USD' || String(metric.label).toLowerCase().match(/revenue|cost|budget/)
                                ? `$${(val / 1000).toFixed(1)}k`
                                : unit === '%' ? `${val}%` : val.toLocaleString()
                              : val ?? '—';
                            return (
                              <button
                                key={metric.id}
                                onClick={() => setSelectedNode(metric)}
                                className="w-full flex items-center justify-between py-3 group"
                              >
                                <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors truncate">{metric.label}</span>
                                <span className="text-sm font-semibold text-emerald-400 font-mono tabular-nums ml-3 shrink-0">{display}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'projects' && (
              <div className={`flex flex-col ${projectsSubView === 'kanban' ? 'h-[calc(100vh-8rem)]' : ''}`}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 gap-4 shrink-0">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tighter">Projects</h1>
                    <p className="text-slate-400 mt-1">
                      {data.nodes.filter(n => n.type === 'Project').length} total projects
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* View toggle */}
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
                      {([
                        { id: 'grid',   icon: LayoutGrid, label: 'Grid'   },
                        { id: 'table',  icon: Table2,     label: 'Table'  },
                        { id: 'kanban', icon: Columns2,   label: 'Kanban' },
                      ] as const).map(({ id, icon: Icon, label }) => (
                        <button
                          key={id}
                          onClick={() => setProjectsSubView(id)}
                          title={label}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            projectsSubView === id
                              ? 'bg-slate-700 text-white'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <Icon size={13} />
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setNewEntityModalOpen(true)}
                      className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Plus size={18} /> New Project
                    </button>
                  </div>
                </div>

                {/* Empty state */}
                {data.nodes.filter(n => n.type === 'Project').length === 0 && (
                  <div className="glass rounded-3xl p-20 text-center aether-fade-up">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-6">
                      <FolderOpen size={28} className="text-purple-500/60" />
                    </div>
                    <h3 className="text-2xl font-medium mb-3">No projects yet</h3>
                    <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed mb-8">
                      Create your first project entity to start tracking budgets, progress, and team connections.
                    </p>
                    <button
                      onClick={() => setNewEntityModalOpen(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black rounded-2xl font-medium text-sm transition-colors"
                    >
                      <Plus size={16} />
                      New Project
                    </button>
                  </div>
                )}

                {/* Grid view */}
                {projectsSubView === 'grid' && data.nodes.filter(n => n.type === 'Project').length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {data.nodes.filter(n => n.type === 'Project').map((project) => (
                      <div
                        key={project.id}
                        onClick={() => setSelectedNode(project)}
                        className="glass-card rounded-3xl p-8 cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <h3 className="text-2xl font-semibold group-hover:text-cyan-400 transition-colors">
                            {project.label}
                          </h3>
                          <div className={`px-3 py-1 text-xs font-medium rounded-full ${
                            project.properties.status === 'Active'   ? 'bg-emerald-500/20 text-emerald-400' :
                            project.properties.status === 'Planning' ? 'bg-amber-500/20 text-amber-400'    :
                            project.properties.status === 'At Risk'  ? 'bg-rose-500/20 text-rose-400'      :
                                                                        'bg-slate-500/20 text-slate-400'
                          }`}>
                            {project.properties.status ?? 'Planning'}
                          </div>
                        </div>
                        <div className="space-y-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Budget</span>
                            <span className="font-medium">${project.properties.budget?.toLocaleString() || '—'}</span>
                          </div>
                          {project.properties.progress !== undefined && (
                            <div>
                              <div className="flex justify-between mb-1.5">
                                <span className="text-slate-400">Progress</span>
                                <span>{project.properties.progress}%</span>
                              </div>
                              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${project.properties.progress}%` }} />
                              </div>
                            </div>
                          )}
                          {project.properties.priority && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Priority</span>
                              <span className="font-medium capitalize">{project.properties.priority}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Table sub-view (projects only) */}
                {projectsSubView === 'table' && data.nodes.filter(n => n.type === 'Project').length > 0 && (
                  <TableView typeFilter="Project" compact />
                )}

                {/* Kanban sub-view */}
                {projectsSubView === 'kanban' && data.nodes.filter(n => n.type === 'Project').length > 0 && (
                  <div className="flex-1 min-h-0">
                    <KanbanView />
                  </div>
                )}
              </div>
            )}

            {currentView === 'geospatial' && (
              <div>
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h1 className="text-4xl font-semibold tracking-tighter">Geospatial Intelligence</h1>
                    <p className="text-slate-400 mt-1">
                      Location ontology • {data.nodes.filter(n => n.type === 'Location').length} sites • Connected insights
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button className="px-5 py-2.5 border border-slate-700 hover:border-slate-500 rounded-xl text-sm transition-colors">
                      Add Location
                    </button>
                    <button className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-medium transition-colors">
                      Filter Timeline
                    </button>
                  </div>
                </div>

                <AetherMap />
              </div>
            )}

            {currentView === 'entities' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-10 gap-4">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tighter">All Entities</h1>
                    <p className="text-slate-400 mt-1">{data.nodes.length} total entities in ontology</p>
                  </div>
                  <button
                    onClick={() => setNewEntityModalOpen(true)}
                    className="self-start sm:self-auto px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus size={18} /> New Entity
                  </button>
                </div>

                {data.nodes.length === 0 ? (
                  <div className="glass rounded-3xl p-20 text-center aether-fade-up">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-6">
                      <Users size={28} className="text-cyan-500/60" />
                    </div>
                    <h3 className="text-2xl font-medium mb-3">No entities yet</h3>
                    <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed mb-8">
                      Your ontology is empty. Add people, projects, locations, metrics, and more to start building your intelligence graph.
                    </p>
                    <button
                      onClick={() => setNewEntityModalOpen(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black rounded-2xl font-medium text-sm transition-colors"
                    >
                      <Plus size={16} />
                      New Entity
                    </button>
                  </div>
                ) : (
                  <div className="glass rounded-3xl overflow-hidden">
                    <table className="w-full">
                      <thead className="border-b border-slate-700">
                        <tr>
                          <th className="text-left p-6 font-medium text-slate-400">Type</th>
                          <th className="text-left p-6 font-medium text-slate-400">Name</th>
                          <th className="text-left p-6 font-medium text-slate-400">Key Properties</th>
                          <th className="text-left p-6 font-medium text-slate-400">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {data.nodes.map((node) => (
                          <tr
                            key={node.id}
                            onClick={() => setSelectedNode(node)}
                            className="hover:bg-slate-900/70 cursor-pointer transition-colors group"
                          >
                            <td className="p-6">
                              <span className="inline-block px-4 py-1.5 text-xs font-mono bg-slate-800 rounded-full">
                                {node.type}
                              </span>
                            </td>
                            <td className="p-6 font-medium group-hover:text-cyan-400 transition-colors">
                              {node.label}
                            </td>
                            <td className="p-6 text-sm text-slate-400">
                              {Object.entries(node.properties).slice(0, 2).map(([k, v]) => (
                                `${k}: ${typeof v === 'object' ? '...' : v}`
                              )).join(' • ')}
                            </td>
                            <td className="p-6 text-sm text-slate-400">
                              {node.createdAt ? new Date(node.createdAt).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {currentView === 'search' && (
              <div>
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
                    <div className="space-y-3">
                      {searchOntology(data, searchQuery).map((node) => (
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
                            <span className="text-xl font-medium group-hover:text-cyan-400">{node.label}</span>
                          </div>
                          <ArrowRight className="text-slate-500 group-hover:text-cyan-400 shrink-0" />
                        </div>
                      ))}

                      {searchOntology(data, searchQuery).length === 0 && (
                        <div className="text-center py-14">
                          <p className="text-slate-500 text-sm mb-1">No entities match</p>
                          <p className="text-slate-300 font-medium">&ldquo;{searchQuery}&rdquo;</p>
                          <p className="text-xs text-slate-600 mt-3">Try a broader term or check the AI Analyst for insights</p>
                        </div>
                      )}
                    </div>
                  )}

                  {!searchQuery.trim() && (
                    <div className="py-16 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-5">
                        <Search size={22} className="text-slate-500" />
                      </div>
                      <p className="text-slate-400 mb-6">Search across all entities, properties, and relationships</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {['financial overview', 'team status', 'active projects', 'risks', 'locations'].map((hint) => (
                          <button
                            key={hint}
                            onClick={() => setSearchQuery(hint)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-full text-xs text-slate-400 hover:text-slate-200 transition-all"
                          >
                            {hint}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentView === 'timeline' && (
              <TimelineView />
            )}

            {/* ── Table View ── */}
            {currentView === 'table' && (
              <div className="flex flex-col h-[calc(100dvh-7rem)] sm:h-[calc(100vh-8rem)]">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-5 sm:mb-8 gap-3 shrink-0">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tighter">Table View</h1>
                    <p className="text-slate-400 mt-1">{data.nodes.length} entities · sortable, filterable</p>
                  </div>
                  <button
                    onClick={() => setNewEntityModalOpen(true)}
                    className="self-start sm:self-auto px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus size={18} /> New Entity
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  <TableView />
                </div>
              </div>
            )}

            {/* ── Kanban View ── */}
            {currentView === 'kanban' && (
              <div className="flex flex-col h-[calc(100dvh-7rem)] sm:h-[calc(100vh-8rem)]">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-5 sm:mb-8 gap-3 shrink-0">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tighter">Kanban Board</h1>
                    <p className="text-slate-400 mt-1">
                      {data.nodes.filter(n => n.type === 'Project').length} projects · drag to change status
                    </p>
                  </div>
                  <button
                    onClick={() => setNewEntityModalOpen(true)}
                    className="self-start sm:self-auto px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus size={18} /> New Project
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  <KanbanView />
                </div>
              </div>
            )}

            {/* ── Data Management View ── */}
            {currentView === 'data' && (
              <div className="max-w-2xl">
                <DataView />
              </div>
            )}

            {/* ── Calendar View ── */}
            {currentView === 'calendar' && <CalendarView />}

            {currentView === 'analytics' && (() => {
              const insightNodes = data.nodes.filter(
                n => n.type === 'Insight' || n.label.startsWith('Analysis:')
              );
              const INTENT_COLORS: Record<string, string> = {
                financial:   'bg-amber-500/10 text-amber-300 border-amber-500/30',
                risk:        'bg-rose-500/10 text-rose-300 border-rose-500/30',
                team:        'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
                projects:    'bg-purple-500/10 text-purple-300 border-purple-500/30',
                location:    'bg-green-500/10 text-green-300 border-green-500/30',
                opportunity: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                summary:     'bg-blue-500/10 text-blue-300 border-blue-500/30',
                search:      'bg-slate-500/10 text-slate-300 border-slate-500/30',
              };
              return (
                <div>
                  <div className="flex justify-between items-end mb-10">
                    <div>
                      <h1 className="text-4xl font-semibold tracking-tighter">Analytics & Insights</h1>
                      <p className="text-slate-400 mt-1">
                        {insightNodes.length} saved analysis{insightNodes.length !== 1 ? 'es' : ''} · AI-generated intelligence
                      </p>
                    </div>
                    <button
                      onClick={() => setAIAnalystOpen(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-medium transition-colors"
                    >
                      <Sparkles size={16} />
                      New Analysis
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {insightNodes.map((insight) => {
                      const intent = insight.properties.intent as string | undefined;
                      const confidence = insight.properties.confidence as string | undefined;
                      const keyFindings = insight.properties.keyFindings as string[] | undefined;
                      const recommendations = insight.properties.recommendations as string[] | undefined;
                      const analyzedAt = insight.properties.analyzedAt || insight.createdAt;
                      const intentColor = intent ? INTENT_COLORS[intent] : INTENT_COLORS.search;

                      return (
                        <div
                          key={insight.id}
                          onClick={() => setSelectedNode(insight)}
                          className="glass rounded-3xl p-7 hover:border-cyan-500/30 transition-all cursor-pointer group flex flex-col gap-5"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {intent && (
                                <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${intentColor}`}>
                                  {intent}
                                </span>
                              )}
                              {confidence && (
                                <span className="text-xs text-slate-500 capitalize">{confidence} confidence</span>
                              )}
                            </div>
                            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ChevronRight size={14} className="text-cyan-400" />
                            </div>
                          </div>

                          <h3 className="text-lg font-semibold leading-snug group-hover:text-cyan-300 transition-colors">
                            {insight.label}
                          </h3>

                          <p className="text-slate-400 text-sm leading-relaxed">
                            {insight.properties.summary}
                          </p>

                          {/* Key findings */}
                          {keyFindings && keyFindings.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs uppercase tracking-widest text-slate-600">Key Findings</p>
                              {keyFindings.slice(0, 3).map((f, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                                  <span className="text-cyan-600 mt-0.5 shrink-0">◆</span>
                                  {f}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Recommendations */}
                          {recommendations && recommendations.length > 0 && (
                            <div className="space-y-1.5 pt-1 border-t border-slate-800">
                              <p className="text-xs uppercase tracking-widest text-slate-600">Recommendations</p>
                              {recommendations.slice(0, 2).map((rec, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                                  <ArrowRight size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                                  {rec}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="text-xs text-slate-600 mt-auto">
                            {analyzedAt ? new Date(analyzedAt).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                              hour: 'numeric', minute: '2-digit', hour12: true,
                            }) : '—'}
                          </div>
                        </div>
                      );
                    })}

                    {insightNodes.length === 0 && (
                      <div className="col-span-full glass rounded-3xl p-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-6">
                          <Sparkles className="text-cyan-600" size={28} />
                        </div>
                        <h3 className="text-2xl font-medium mb-3">No analyses yet</h3>
                        <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed mb-8">
                          Use the command bar or the button above to run AI analyses. They'll appear here as rich insight cards.
                        </p>
                        <button
                          onClick={() => setAIAnalystOpen(true)}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black rounded-2xl font-medium text-sm transition-colors"
                        >
                          <Sparkles size={16} />
                          Run First Analysis
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>

        <NodeDetailPanel />
        <SearchPanel />
        <AIInsightsPanel />
        <NewEntityModal
          isOpen={isNewEntityModalOpen}
          onClose={() => setNewEntityModalOpen(false)}
        />
        <PDFUploadModal
          isOpen={isPDFUploadModalOpen}
          onClose={() => { setPDFUploadModalOpen(false); setPDFLinkedEntityId(undefined); }}
          linkedEntityId={pdfLinkedEntityId}
        />
      </div>
    </div>
  );
}
