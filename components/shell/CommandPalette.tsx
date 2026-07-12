// components/shell/CommandPalette.tsx
'use client';

import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { exportAsJSON } from '@/lib/export';
import { getRandomInsight } from '@/lib/ai-search';
import { findNeighborhood } from '@/lib/graph-path';
import {
  buildStaticCommands,
  entityCommands,
  filterCommands,
  groupBySection,
  type PaletteCommand,
  type PaletteHandlers,
  type RankedCommand,
} from '@/lib/command-palette';
import type { EntityType, OntologyNode } from '@/types';

// ── Type badge colors ─────────────────────────────────────────────────────────

const TYPE_BADGE: Record<EntityType, string> = {
  Person:   'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
  Project:  'bg-purple-500/10 text-purple-300 border-purple-500/25',
  Location: 'bg-green-500/10 text-green-300 border-green-500/25',
  Metric:   'bg-amber-500/10 text-amber-300 border-amber-500/25',
  Insight:  'bg-rose-500/10 text-rose-300 border-rose-500/25',
  Event:    'bg-orange-500/10 text-orange-300 border-orange-500/25',
  Document: 'bg-slate-500/10 text-slate-300 border-slate-500/25',
};

function getMod() {
  if (typeof navigator === 'undefined') return '⌘';
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? '⌘' : 'Ctrl';
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onImportClick: () => void;
  onOpenShortcuts: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CommandPalette({
  isOpen,
  onClose,
  onImportClick,
  onOpenShortcuts,
}: CommandPaletteProps) {
  const {
    data,
    selectedNode,
    setCurrentView,
    setNewEntityModalOpen,
    setAIAnalystOpen,
    setSearchQuery,
    setPDFUploadModalOpen,
    setPDFLinkedEntityId,
    setReportGeneratorOpen,
    setReportFocusNodeId,
    setSelectedNode,
    setPathFinderOpen,
    setPathFinderFromId,
    setGraphFocus,
    applyTemplate,
    undo,
    redo,
  } = useAetherStore();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset when opened
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    // Defer focus so the dialog is mounted
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  const handlers: PaletteHandlers = useMemo(
    () => ({
      go: (view) => {
        setCurrentView(view as Parameters<typeof setCurrentView>[0]);
      },
      newEntity: () => setNewEntityModalOpen(true),
      openAI: (q) => {
        if (q) setSearchQuery(q);
        setAIAnalystOpen(true);
      },
      openPDF: () => {
        setPDFLinkedEntityId(undefined);
        setPDFUploadModalOpen(true);
      },
      openReport: () => {
        setReportFocusNodeId(undefined);
        setReportGeneratorOpen(true);
      },
      openShortcuts: () => onOpenShortcuts(),
      importJSON: () => onImportClick(),
      exportJSON: () => exportAsJSON(data),
      surprise: () => {
        const q = getRandomInsight(data);
        setSearchQuery(q);
        setAIAnalystOpen(true);
      },
      selectEntity: (node: OntologyNode) => setSelectedNode(node),
      openPathFinder: () => {
        setCurrentView('dashboard');
        setPathFinderFromId(selectedNode?.id);
        setPathFinderOpen(true);
      },
      focusSelectedNeighborhood: () => {
        if (!selectedNode) {
          setCurrentView('dashboard');
          setPathFinderOpen(true);
          return;
        }
        const nb = findNeighborhood(data, selectedNode.id, 1);
        if (!nb) return;
        setGraphFocus({
          mode: 'neighborhood',
          nodeIds: nb.nodeIds,
          edgeIds: nb.edgeIds,
          title: `Focus · ${selectedNode.label}`,
          detail: `${nb.nodeIds.length} nodes within 1 hop`,
          hopDepth: 1,
          sourceId: selectedNode.id,
        });
        setCurrentView('dashboard');
      },
      applyTemplate: (templateId) => {
        applyTemplate(templateId);
        setCurrentView('dashboard');
      },
      undo: () => undo(),
      redo: () => redo(),
    }),
    [
      applyTemplate,
      undo,
      redo,
      data,
      onImportClick,
      onOpenShortcuts,
      selectedNode,
      setAIAnalystOpen,
      setCurrentView,
      setGraphFocus,
      setNewEntityModalOpen,
      setPDFLinkedEntityId,
      setPDFUploadModalOpen,
      setPathFinderFromId,
      setPathFinderOpen,
      setReportFocusNodeId,
      setReportGeneratorOpen,
      setSearchQuery,
      setSelectedNode,
    ]
  );

  const allCommands: PaletteCommand[] = useMemo(() => {
    const statics = buildStaticCommands(handlers);
    // When user is typing, surface more of the graph; otherwise a short preview
    const entities = entityCommands(
      data.nodes,
      handlers.selectEntity,
      query.trim() ? 80 : 12
    );
    return [...statics, ...entities];
  }, [handlers, data.nodes, query]);

  const ranked = useMemo(
    () => filterCommands(allCommands, query),
    [allCommands, query]
  );

  const groups = useMemo(() => groupBySection(ranked), [ranked]);

  // Flat list for keyboard index mapping
  const flat: RankedCommand[] = ranked;

  // Keep active index in range when results change
  if (activeIndex >= flat.length && flat.length > 0) {
    setActiveIndex(0);
  }

  const runCommand = useCallback(
    (cmd: PaletteCommand) => {
      onClose();
      // Let the close paint before side effects (modals, view switches)
      requestAnimationFrame(() => cmd.run());
    },
    [onClose]
  );

  // Keyboard navigation inside the palette
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (flat.length === 0 ? 0 : (i + 1) % flat.length));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) =>
          flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length
        );
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = flat[activeIndex];
        if (cmd) runCommand(cmd);
        else if (query.trim()) {
          // Fall through: treat free text as AI Analyst query
          onClose();
          requestAnimationFrame(() => {
            setSearchQuery(query.trim());
            setAIAnalystOpen(true);
          });
        }
      }
    };

    // Capture phase so we win over global Esc handlers
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [
    isOpen,
    flat,
    activeIndex,
    onClose,
    runCommand,
    query,
    setSearchQuery,
    setAIAnalystOpen,
  ]);

  // Scroll active item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-palette-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen, flat.length]);

  if (!isOpen) return null;

  const mod = getMod();
  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] sm:pt-[15vh] px-3 sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl glass rounded-2xl shadow-2xl border border-slate-700/60 overflow-hidden flex flex-col max-h-[min(70vh,560px)] aether-fade-up">
        {/* Search field */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-800/80 shrink-0">
          <Search size={18} className="text-cyan-400/80 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Jump to a view, run an action, or find an entity…"
            className="flex-1 bg-transparent text-sm sm:text-[15px] text-slate-100 placeholder:text-slate-600 outline-none min-w-0"
            aria-label="Command palette search"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center h-6 px-1.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-500 shrink-0">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-2 scroll-touch">
          {flat.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-400 mb-1">No matches</p>
              <p className="text-xs text-slate-600">
                Press{' '}
                <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">
                  ⏎
                </kbd>{' '}
                to ask the AI Analyst about “{query.trim()}”
              </p>
            </div>
          ) : (
            groups.map(({ section, items }) => (
              <div key={section} className="mb-1">
                <p className="px-4 sm:px-5 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  {section}
                </p>
                <ul role="listbox" aria-label={section}>
                  {items.map((cmd) => {
                    runningIndex += 1;
                    const index = runningIndex;
                    const active = index === activeIndex;
                    const Icon = cmd.icon;
                    return (
                      <li key={cmd.id} role="option" aria-selected={active}>
                        <button
                          type="button"
                          data-palette-index={index}
                          onClick={() => runCommand(cmd)}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={`w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 text-left transition-colors ${
                            active
                              ? 'bg-cyan-500/12 text-slate-100'
                              : 'text-slate-300 hover:bg-slate-800/50'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                              active
                                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                                : 'bg-slate-900/80 border-slate-800 text-slate-500'
                            }`}
                          >
                            <Icon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{cmd.label}</p>
                            {cmd.hint && (
                              <p className="text-[11px] text-slate-600 truncate mt-0.5">
                                {cmd.hint}
                              </p>
                            )}
                          </div>
                          {cmd.entityType && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                                TYPE_BADGE[cmd.entityType] ?? TYPE_BADGE.Document
                              }`}
                            >
                              {cmd.entityType}
                            </span>
                          )}
                          {cmd.shortcut && !cmd.entityType && (
                            <kbd className="hidden sm:inline text-[10px] font-mono text-slate-600 shrink-0">
                              {cmd.shortcut.replace(/⌘/g, mod)}
                            </kbd>
                          )}
                          {active && (
                            <CornerDownLeft
                              size={13}
                              className="text-cyan-500/70 shrink-0 hidden sm:block"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 border-t border-slate-800/80 bg-slate-950/40 text-[10px] text-slate-600">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <ArrowUp size={10} />
              <ArrowDown size={10} />
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft size={10} />
              select
            </span>
            <span className="hidden sm:inline">esc close</span>
          </div>
          <span className="tabular-nums">
            {flat.length} result{flat.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
