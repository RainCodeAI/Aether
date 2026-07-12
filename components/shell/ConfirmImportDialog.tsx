// components/shell/ConfirmImportDialog.tsx
'use client';

import { useState } from 'react';
import { AlertTriangle, Layers, GitBranch } from 'lucide-react';
import type { AnyImportResult } from '@/lib/import';
import ModalShell from '@/components/ui/ModalShell';

export type PendingImport = AnyImportResult & { filename: string };

interface ConfirmDialogProps {
  pending: PendingImport;
  currentNodeCount: number;
  currentRelCount: number;
  currentWorkspaceCount: number;
  onConfirmGraph: () => void;
  onConfirmWorkspaces: (mode: 'replace' | 'merge') => void;
  onCancel: () => void;
}

export default function ConfirmImportDialog({
  pending,
  currentNodeCount,
  currentRelCount,
  currentWorkspaceCount,
  onConfirmGraph,
  onConfirmWorkspaces,
  onCancel,
}: ConfirmDialogProps) {
  const [wsMode, setWsMode] = useState<'replace' | 'merge'>('merge');
  const isWs = pending.kind === 'workspaces';

  return (
    <ModalShell
      isOpen
      onClose={onCancel}
      label={isWs ? 'Import workspaces backup' : 'Replace current graph'}
      maxWidthClass="max-w-md"
      maxHeightClass="max-h-[min(90dvh,640px)]"
      zClass="z-[90]"
    >
      <div className="flex-1 overflow-y-auto min-h-0 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            {isWs ? (
              <Layers size={20} className="text-amber-400" />
            ) : (
              <AlertTriangle size={20} className="text-amber-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {isWs ? 'Import workspaces backup?' : 'Replace current graph?'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isWs
                ? 'Choose how to load the multi-workspace file'
                : 'This replaces entities in the active workspace'}
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-400 leading-relaxed mb-5">
          Importing{' '}
          <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded text-xs">
            {pending.filename}
          </span>
          {isWs ? (
            <>
              {' '}
              ({pending.workspaceCount} workspace
              {pending.workspaceCount !== 1 ? 's' : ''}, {pending.totalNodes}{' '}
              entities).
            </>
          ) : (
            <> will replace all entities and relationships in this workspace.</>
          )}
        </p>

        {pending.kind === 'graph' && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 divide-y divide-slate-800 mb-4">
            <div className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-slate-500">Current workspace</span>
              <span className="font-mono text-slate-400">
                {currentNodeCount} entities · {currentRelCount} rels
              </span>
            </div>
            <div className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-slate-500">Importing</span>
              <span className="font-mono text-cyan-400">
                {pending.nodeCount} entities · {pending.relationshipCount} rels
              </span>
            </div>
          </div>
        )}

        {pending.kind === 'workspaces' && (
          <>
            <div className="rounded-2xl bg-slate-900 border border-slate-800 divide-y divide-slate-800 mb-4">
              <div className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-slate-500">Currently on device</span>
                <span className="font-mono text-slate-400">
                  {currentWorkspaceCount} workspace
                  {currentWorkspaceCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-slate-500">In backup file</span>
                <span className="font-mono text-cyan-400">
                  {pending.workspaceCount} ws · {pending.totalNodes} entities
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 mb-4 max-h-32 overflow-y-auto space-y-1.5">
              {pending.workspaceSummaries.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-xs px-2 py-1"
                >
                  <span className="text-slate-300 truncate flex items-center gap-1.5">
                    <GitBranch size={11} className="text-slate-600 shrink-0" />
                    {s.name}
                  </span>
                  <span className="font-mono text-slate-600 shrink-0">
                    {s.nodes}n · {s.rels}r
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                type="button"
                onClick={() => setWsMode('merge')}
                className={`px-3 py-3 rounded-2xl border text-left transition-all ${
                  wsMode === 'merge'
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <p className="text-sm font-semibold">Merge</p>
                <p className="text-[10px] opacity-70 mt-0.5 leading-snug">
                  Keep current workspaces; add imported ones (re-id if needed)
                </p>
              </button>
              <button
                type="button"
                onClick={() => setWsMode('replace')}
                className={`px-3 py-3 rounded-2xl border text-left transition-all ${
                  wsMode === 'replace'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <p className="text-sm font-semibold">Replace all</p>
                <p className="text-[10px] opacity-70 mt-0.5 leading-snug">
                  Wipe local workspaces and load the backup
                </p>
              </button>
            </div>
          </>
        )}

        {pending.warnings.length > 0 && (
          <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4 mb-5 space-y-1.5">
            <p className="text-xs font-semibold text-amber-400 mb-1">Import warnings</p>
            {pending.warnings.slice(0, 8).map((w, i) => (
              <p key={i} className="text-xs text-amber-300/80 flex items-start gap-2">
                <span className="shrink-0 mt-px">⚠</span>
                <span>{w}</span>
              </p>
            ))}
            {pending.warnings.length > 8 && (
              <p className="text-[10px] text-amber-600">
                +{pending.warnings.length - 8} more (see console)
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (pending.kind === 'graph') onConfirmGraph();
              else onConfirmWorkspaces(wsMode);
            }}
            className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-colors ${
              isWs && wsMode === 'replace'
                ? 'bg-rose-500 hover:bg-rose-400 text-white'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black'
            }`}
          >
            {pending.kind === 'graph'
              ? 'Import & Replace'
              : wsMode === 'merge'
                ? 'Merge workspaces'
                : 'Replace everything'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
