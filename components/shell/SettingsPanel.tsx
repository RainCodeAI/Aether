// components/shell/SettingsPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  X, Settings, Download, Trash2, Focus, Keyboard, Command,
  Database, Layers, Info, User, Check, Upload,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { exportAsJSON, exportAllWorkspaces } from '@/lib/export';
import { useSafeUser } from '@/lib/hooks/useSafeUser';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcuts: () => void;
  onOpenPalette: () => void;
  onReset: () => void;
  /** Opens the shared file picker (graph or workspaces JSON). */
  onImportClick?: () => void;
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-slate-500" />
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          {title}
        </h3>
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 divide-y divide-slate-800/80 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200">{label}</p>
        {description && (
          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPanel({
  isOpen,
  onClose,
  onOpenShortcuts,
  onOpenPalette,
  onReset,
  onImportClick,
}: SettingsPanelProps) {
  const {
    data,
    workspaces,
    workspaceData,
    currentWorkspaceId,
    renameWorkspace,
    clearGraphFocus,
    graphFocus,
    history,
  } = useAetherStore();
  const { user } = useSafeUser();

  const current = workspaces.find((w) => w.id === currentWorkspaceId);
  const [wsName, setWsName] = useState(current?.name ?? '');
  const [savedName, setSavedName] = useState(false);
  const [exported, setExported] = useState<'ws' | 'all' | null>(null);

  // Sync name field when opening / switching workspace
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setWsName(current?.name ?? '');
      setSavedName(false);
      setExported(null);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const pastLen = history[currentWorkspaceId]?.past.length ?? 0;
  const futureLen = history[currentWorkspaceId]?.future.length ?? 0;
  const totalEntities = Object.values(workspaceData).reduce(
    (s, g) => s + (g?.nodes.length ?? 0),
    0
  );
  // Prefer live counts for active ws
  const activeCount = data.nodes.length;

  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.emailAddresses?.[0]?.emailAddress ??
    current?.owner ??
    'Local user';

  const handleRename = () => {
    if (!current || !wsName.trim()) return;
    renameWorkspace(current.id, wsName.trim());
    setSavedName(true);
    setTimeout(() => setSavedName(false), 1500);
  };

  const handleExportCurrent = () => {
    exportAsJSON(data);
    setExported('ws');
    setTimeout(() => setExported(null), 2000);
  };

  const handleExportAll = () => {
    exportAllWorkspaces({
      workspaces,
      workspaceData,
      currentWorkspaceId,
      data,
    });
    setExported('all');
    setTimeout(() => setExported(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="glass w-full max-w-md rounded-3xl shadow-2xl border border-slate-700/60 overflow-hidden flex flex-col max-h-[min(88vh,640px)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Settings size={15} className="text-slate-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Settings</h2>
              <p className="text-[11px] text-slate-600">Workspace, data & preferences</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800"
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scroll-touch">
          {/* Profile */}
          <Section title="Profile" icon={User}>
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-black font-bold text-sm shrink-0">
                {(displayName[0] ?? '?').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-600">
                  {user ? 'Signed in with Clerk' : 'Local session · no account required'}
                </p>
              </div>
            </div>
          </Section>

          {/* Workspace */}
          <Section title="Workspace" icon={Layers}>
            <div className="px-4 py-3 space-y-2">
              <p className="text-[11px] text-slate-600">Rename current workspace</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                  }}
                  className="flex-1 bg-slate-950/80 border border-slate-700 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
                />
                <button
                  type="button"
                  onClick={handleRename}
                  className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-medium hover:bg-cyan-500/25 transition-colors"
                >
                  {savedName ? (
                    <span className="flex items-center gap-1">
                      <Check size={12} /> Saved
                    </span>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-600 font-mono">
                {activeCount} entities · {data.relationships.length} relationships
              </p>
            </div>
          </Section>

          {/* Data */}
          <Section title="Data" icon={Database}>
            <Row
              label="Export current workspace"
              description="JSON graph for this workspace only"
            >
              <button
                type="button"
                onClick={handleExportCurrent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
              >
                <Download size={12} />
                {exported === 'ws' ? 'Done' : 'Export'}
              </button>
            </Row>
            <Row
              label="Export all workspaces"
              description={`${workspaces.length} workspace${workspaces.length !== 1 ? 's' : ''} · ~${totalEntities || activeCount} entities total`}
            >
              <button
                type="button"
                onClick={handleExportAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
              >
                <Download size={12} />
                {exported === 'all' ? 'Done' : 'Export'}
              </button>
            </Row>
            <Row
              label="Import backup"
              description="Single graph or multi-workspace JSON (merge or replace)"
            >
              <button
                type="button"
                disabled={!onImportClick}
                onClick={() => {
                  onClose();
                  onImportClick?.();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:border-slate-500 hover:text-white transition-colors disabled:opacity-40"
              >
                <Upload size={12} />
                Import
              </button>
            </Row>
            <Row
              label="Reset everything"
              description="Wipe localStorage and reload demo seed"
            >
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReset();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 size={12} />
                Reset
              </button>
            </Row>
          </Section>

          {/* Graph */}
          <Section title="Graph" icon={Focus}>
            <Row
              label="Clear path / focus highlight"
              description={
                graphFocus
                  ? graphFocus.title
                  : 'No highlight active'
              }
            >
              <button
                type="button"
                disabled={!graphFocus}
                onClick={() => clearGraphFocus()}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-30 disabled:hover:border-slate-700 transition-colors"
              >
                Clear
              </button>
            </Row>
            <Row
              label="Undo history"
              description={`${pastLen} step${pastLen !== 1 ? 's' : ''} back · ${futureLen} forward (session only)`}
            >
              <span className="text-[11px] font-mono text-slate-600">⌘Z / ⌘⇧Z</span>
            </Row>
          </Section>

          {/* Help */}
          <Section title="Help" icon={Keyboard}>
            <Row label="Keyboard shortcuts" description="Full cheatsheet">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenShortcuts();
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:border-slate-500 transition-colors"
              >
                Open
              </button>
            </Row>
            <Row label="Command palette" description="Jump, actions, templates">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPalette();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:border-slate-500 transition-colors"
              >
                <Command size={12} />
                ⌘K
              </button>
            </Row>
          </Section>

          {/* About */}
          <Section title="About" icon={Info}>
            <div className="px-4 py-3 space-y-1">
              <p className="text-sm text-slate-200">Aether · Intelligence OS</p>
              <p className="text-[11px] text-slate-600">
                Version 0.1.0 · Local-first · Optional Clerk / OpenAI
              </p>
              <p className="text-[11px] text-slate-700">
                Data stays in this browser unless you export it.
              </p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
