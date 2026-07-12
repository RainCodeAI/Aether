// components/shell/ConfirmImportDialog.tsx
'use client';

import { AlertTriangle } from 'lucide-react';
import type { ImportResult } from '@/lib/import';

interface ConfirmDialogProps {
  pending: ImportResult & { filename: string };
  currentNodeCount: number;
  currentRelCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmImportDialog({
  pending,
  currentNodeCount,
  currentRelCount,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Replace current data?</h2>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-sm text-slate-400 leading-relaxed mb-5">
          Importing{' '}
          <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded text-xs">
            {pending.filename}
          </span>{' '}
          will permanently replace all current entities and relationships.
        </p>

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
