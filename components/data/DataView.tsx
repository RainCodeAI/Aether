// components/data/DataView.tsx
'use client';

import { useState } from 'react';
import {
  Database, Save, RotateCcw, Trash2, Clock, AlertTriangle,
  ChevronRight, Check, Layers,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import CSVImportModal from './CSVImportModal';
import EnrichModal from './EnrichModal';

export default function DataView() {
  const {
    data, snapshots, saveSnapshot, loadSnapshot, deleteSnapshot,
    currentWorkspaceId, workspaces,
  } = useAetherStore();

  const [snapName, setSnapName]         = useState('');
  const [confirmLoad, setConfirmLoad]   = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [justSaved, setJustSaved]       = useState(false);
  const [csvOpen, setCsvOpen]           = useState(false);
  const [enrichOpen, setEnrichOpen]     = useState(false);

  const workspaceName =
    workspaces.find((w) => w.id === currentWorkspaceId)?.name ?? 'Workspace';
  const workspaceSnapshots = snapshots.filter(
    (s) => !s.workspaceId || s.workspaceId === currentWorkspaceId
  );

  const handleSave = () => {
    saveSnapshot(snapName || `Snapshot — ${new Date().toLocaleString()}`);
    setSnapName('');
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleLoad = (id: string) => {
    loadSnapshot(id);
    setConfirmLoad(null);
  };

  const handleDelete = (id: string) => {
    deleteSnapshot(id);
    setConfirmDelete(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2.5">
            <Database size={20} className="text-cyan-400" />
            Data Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Import data, enrich entities, and manage ontology snapshots.
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setCsvOpen(true)}
          className="flex items-center gap-3 p-4 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 group-hover:bg-cyan-500/20 transition-colors">
            <Layers size={17} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">Import CSV</p>
            <p className="text-xs text-slate-500">Add entities from spreadsheet</p>
          </div>
          <ChevronRight size={14} className="ml-auto text-slate-700 group-hover:text-cyan-400 transition-colors" />
        </button>

        <button
          onClick={() => setEnrichOpen(true)}
          className="flex items-center gap-3 p-4 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
            <span className="text-amber-400 text-base">✦</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">Enrich Data</p>
            <p className="text-xs text-slate-500">Fill missing fields automatically</p>
          </div>
          <ChevronRight size={14} className="ml-auto text-slate-700 group-hover:text-amber-400 transition-colors" />
        </button>

        <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-800 bg-slate-900/50">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <Database size={17} className="text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">Current state · {workspaceName}</p>
            <p className="text-xs text-slate-500 font-mono">{data.nodes.length} nodes · {data.relationships.length} rels</p>
          </div>
        </div>
      </div>

      {/* Save snapshot */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Save size={15} className="text-cyan-400" />
          Save Snapshot
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={snapName}
            onChange={e => setSnapName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            placeholder="Snapshot name (optional)"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
          />
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 ${
              justSaved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black'
            }`}
          >
            {justSaved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save</>}
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2">
          Snapshots are scoped to this workspace and stored locally. Maximum 20 overall — oldest are removed automatically.
        </p>
      </div>

      {/* Snapshot history */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Clock size={13} />
          Snapshot History
          <span className="font-mono normal-case text-slate-700 ml-1">{workspaceSnapshots.length}</span>
        </h3>

        {workspaceSnapshots.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed border-slate-800">
            <Clock size={28} className="mx-auto mb-2 text-slate-700" />
            <p className="text-sm text-slate-600">No snapshots yet for {workspaceName}</p>
            <p className="text-xs text-slate-700 mt-1">Save a snapshot to create a restore point</p>
          </div>
        ) : (
          <div className="space-y-2">
            {workspaceSnapshots.map(snap => (
              <div
                key={snap.id}
                className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{snap.name}</p>
                  <p className="text-xs text-slate-600 mt-0.5 font-mono">
                    {formatDate(snap.createdAt)} · {snap.nodeCount} nodes · {snap.relCount} rels
                  </p>
                </div>

                {/* Load */}
                {confirmLoad === snap.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={11} /> Replace current data?
                    </span>
                    <button
                      onClick={() => handleLoad(snap.id)}
                      className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-medium px-2 py-1 rounded-lg transition-colors"
                    >
                      Yes, load
                    </button>
                    <button
                      onClick={() => setConfirmLoad(null)}
                      className="text-xs text-slate-500 hover:text-slate-300 px-1 py-1 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : confirmDelete === snap.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-rose-400 flex items-center gap-1">
                      <AlertTriangle size={11} /> Delete?
                    </span>
                    <button
                      onClick={() => handleDelete(snap.id)}
                      className="text-xs bg-rose-500 hover:bg-rose-400 text-white font-medium px-2 py-1 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs text-slate-500 hover:text-slate-300 px-1 py-1 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setConfirmLoad(snap.id)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <RotateCcw size={12} /> Restore
                    </button>
                    <button
                      onClick={() => setConfirmDelete(snap.id)}
                      className="p-1.5 text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <CSVImportModal isOpen={csvOpen} onClose={() => setCsvOpen(false)} />
      <EnrichModal isOpen={enrichOpen} onClose={() => setEnrichOpen(false)} />
    </div>
  );
}
