// components/ontology/NodeDetailPanel.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X, Calendar, Lightbulb, GitBranch, ArrowRight, ExternalLink,
  Tag, Plus, Hash, Share2, CheckCircle2, FileText, BookOpen,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { EntityType } from '@/types';
import ConnectEntityModal from './ConnectEntityModal';
import { copyShareUrl } from '@/lib/share';

// ─── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_META: Record<EntityType, { badge: string; bar: string; glow: string; icon: string }> = {
  Person:   { badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',      bar: 'bg-cyan-500',    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.15)]',     icon: '👤' },
  Project:  { badge: 'bg-purple-500/10 text-purple-300 border-purple-500/30', bar: 'bg-purple-500',  glow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)]',     icon: '📁' },
  Location: { badge: 'bg-green-500/10 text-green-300 border-green-500/30',    bar: 'bg-green-500',   glow: 'shadow-[0_0_20px_rgba(74,222,128,0.15)]',     icon: '📍' },
  Metric:   { badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',    bar: 'bg-amber-500',   glow: 'shadow-[0_0_20px_rgba(251,191,36,0.15)]',     icon: '📊' },
  Insight:  { badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30',       bar: 'bg-rose-500',    glow: 'shadow-[0_0_20px_rgba(251,113,133,0.15)]',    icon: '💡' },
  Event:    { badge: 'bg-orange-500/10 text-orange-300 border-orange-500/30', bar: 'bg-orange-500',  glow: 'shadow-[0_0_20px_rgba(251,146,60,0.15)]',     icon: '📅' },
  Document: { badge: 'bg-slate-500/10 text-slate-300 border-slate-500/30',    bar: 'bg-slate-500',   glow: 'shadow-[0_0_20px_rgba(148,163,184,0.1)]',     icon: '📄' },
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if ('lat' in v && 'lng' in v) return `${Number(v.lat).toFixed(4)}°, ${Number(v.lng).toFixed(4)}°`;
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-3 flex items-center gap-2">
      {children}
      {count !== undefined && (
        <span className="font-mono normal-case text-slate-700">{count}</span>
      )}
    </h3>
  );
}

// ─── Tag editor ────────────────────────────────────────────────────────────────

function TagEditor({ nodeId }: { nodeId: string }) {
  const { data, updateNode } = useAetherStore();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const tags = data.nodes.find(n => n.id === nodeId)?.tags ?? [];

  const addTag = (tag: string) => {
    const clean = tag.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!clean || tags.includes(clean)) { setInput(''); return; }
    updateNode(nodeId, { tags: [...tags, clean] });
    setInput('');
  };

  const removeTag = (tag: string) => {
    updateNode(nodeId, { tags: tags.filter(t => t !== tag) });
  };

  return (
    <div>
      <SectionLabel><Tag size={11} /> Tags</SectionLabel>
      <div className="flex flex-wrap gap-1.5 mb-2.5 min-h-[24px]">
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-xs bg-cyan-500/8 text-cyan-400 border border-cyan-500/20 rounded-full px-2.5 py-0.5 group hover:border-cyan-500/40 transition-colors"
          >
            <Hash size={9} className="opacity-60" />
            {tag}
            <button
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              className="hover:text-rose-400 transition-colors leading-none ml-0.5 opacity-50 hover:opacity-100"
            >
              ×
            </button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-xs text-slate-700 italic">No tags</span>}
      </div>
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input); }
          }}
          placeholder="Add tag…"
          aria-label="Add tag"
          className="flex-1 bg-slate-900/80 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_0_2px_rgba(34,211,238,0.08)] transition-all"
        />
        <button
          onClick={() => addTag(input)}
          aria-label="Add tag"
          className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg transition-colors text-slate-500 hover:text-cyan-300 press-scale"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NodeDetailPanel() {
  const {
    selectedNode, setSelectedNode, data, setSearchQuery, setAIAnalystOpen,
    currentWorkspaceId, addSharedNodeToCurrentWorkspace,
    setPDFUploadModalOpen, setPDFLinkedEntityId,
    setReportGeneratorOpen, setReportFocusNodeId,
  } = useAetherStore();
  const [connectOpen, setConnectOpen] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'done'>('idle');

  // Reset the "Copied!" share feedback when a different node is selected
  // (render-phase pattern, avoids a cascading setState-in-effect).
  const [prevNodeId, setPrevNodeId] = useState(selectedNode?.id);
  if (selectedNode?.id !== prevNodeId) {
    setPrevNodeId(selectedNode?.id);
    setShareState('idle');
  }

  useEffect(() => {
    if (!selectedNode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !connectOpen) setSelectedNode(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNode, connectOpen, setSelectedNode]);

  if (!selectedNode) return null;

  const { label, type, properties, createdAt } = selectedNode;
  const meta = TYPE_META[type] ?? TYPE_META.Document;

  const connections = data.relationships
    .filter((r) => r.from === selectedNode.id || r.to === selectedNode.id)
    .map((r) => {
      const isOut   = r.from === selectedNode.id;
      const otherId = isOut ? r.to : r.from;
      const other   = data.nodes.find((n) => n.id === otherId);
      return { rel: r, other, direction: isOut ? 'out' as const : 'in' as const };
    })
    .filter((c) => c.other !== undefined);

  // Filter out internal/system properties from display
  const displayProps = Object.entries(properties).filter(
    ([k]) => !['source', 'analyzedAt', 'confidenceScore'].includes(k)
  );

  const handleRunAnalysis = () => {
    setSearchQuery(selectedNode.label);
    setAIAnalystOpen(true);
  };

  const handleShare = async () => {
    addSharedNodeToCurrentWorkspace(selectedNode.id);
    await copyShareUrl({
      type: 'node',
      id: selectedNode.id,
      workspaceId: currentWorkspaceId,
      label: selectedNode.label,
    });
    setShareState('done');
    setTimeout(() => setShareState('idle'), 2500);
  };

  return (
    <>
      <div
        role="complementary"
        aria-label={`Details for ${label}`}
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-[#080E1C] border-l border-slate-800/80 shadow-2xl z-50 flex flex-col aether-slide-right ${meta.glow}`}
      >
        {/* Coloured top accent bar */}
        <div className={`h-0.5 w-full ${meta.bar} opacity-70`} />

        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold tracking-widest rounded-full border ${meta.badge}`}>
                <span>{meta.icon}</span>
                {type.toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-semibold leading-tight" title={label}>
              {label}
            </h2>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            aria-label="Close panel"
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white shrink-0 mt-0.5 press-scale"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Properties */}
          {displayProps.length > 0 && (
            <div>
              <SectionLabel count={displayProps.length}>Properties</SectionLabel>
              <div className="rounded-2xl border border-slate-800/80 overflow-hidden">
                {displayProps.map(([key, value], i) => (
                  <div
                    key={key}
                    className={`flex items-start justify-between gap-4 px-4 py-2.5 transition-colors hover:bg-slate-800/30 ${
                      i > 0 ? 'border-t border-slate-800/60' : ''
                    }`}
                  >
                    <span className="text-slate-500 text-xs capitalize shrink-0 pt-0.5">{key.replace(/_/g, ' ')}</span>
                    <span className={`font-medium text-xs text-right break-all max-w-[180px] ${
                      key === 'status'
                        ? value === 'Active'   ? 'text-emerald-400' :
                          value === 'At Risk'  ? 'text-rose-400'    :
                          value === 'Complete' ? 'text-slate-400'   :
                          'text-amber-400'
                        : 'text-slate-200'
                    }`}>
                      {formatValue(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <TagEditor nodeId={selectedNode.id} />

          {/* Connections */}
          {connections.length > 0 && (
            <div>
              <SectionLabel count={connections.length}>Connections</SectionLabel>
              <div className="space-y-1.5 aether-stagger">
                {connections.slice(0, 7).map(({ rel, other, direction }) => {
                  if (!other) return null;
                  const otherMeta = TYPE_META[other.type as EntityType] ?? TYPE_META.Document;
                  return (
                    <button
                      key={rel.id}
                      onClick={() => setSelectedNode(other)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-800/70 border border-slate-800/80 hover:border-slate-700 transition-all text-left group press-scale"
                    >
                      {direction === 'in' && (
                        <ArrowRight size={10} className="text-slate-700 shrink-0 rotate-180" />
                      )}
                      <span className="text-[10px] font-mono text-slate-600 shrink-0 max-w-[60px] truncate">{rel.type}</span>
                      {direction === 'out' && (
                        <ArrowRight size={10} className="text-slate-700 shrink-0" />
                      )}
                      <span className="text-xs text-slate-300 group-hover:text-white truncate flex-1 transition-colors">
                        {other.label}
                      </span>
                      <span className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded-full border opacity-50 group-hover:opacity-80 transition-opacity ${otherMeta.badge}`}>
                        {other.type}
                      </span>
                      <ExternalLink size={10} className="text-slate-700 group-hover:text-cyan-400 shrink-0 transition-colors" />
                    </button>
                  );
                })}
                {connections.length > 7 && (
                  <p className="text-[11px] text-slate-600 text-center pt-1">
                    +{connections.length - 7} more connections
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          {createdAt && (
            <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-1">
              <Calendar size={12} />
              <span>
                Added {new Date(createdAt).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Actions footer */}
        <div className="p-4 border-t border-slate-800/80 space-y-2 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setConnectOpen(true)}
              className="flex-1 py-2.5 rounded-2xl border border-dashed border-slate-700/80 hover:border-cyan-500/50 hover:bg-cyan-500/5 hover:text-cyan-300 text-slate-500 transition-all flex items-center justify-center gap-2 text-sm group press-scale"
              aria-label="Connect to entity"
            >
              <GitBranch size={14} className="group-hover:text-cyan-400 transition-colors" />
              Connect
            </button>

            <button
              onClick={handleShare}
              title="Copy shareable link to clipboard"
              className={`flex-1 py-2.5 rounded-2xl border transition-all flex items-center justify-center gap-2 text-sm press-scale ${
                shareState === 'done'
                  ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-400'
                  : 'border-slate-700/80 hover:border-slate-600 text-slate-500 hover:text-slate-300'
              }`}
            >
              {shareState === 'done' ? (
                <><CheckCircle2 size={14} /> Copied!</>
              ) : (
                <><Share2 size={14} /> Share</>
              )}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setPDFLinkedEntityId(selectedNode.id);
                setPDFUploadModalOpen(true);
              }}
              className="flex-1 py-2.5 rounded-2xl border border-dashed border-slate-700/80 hover:border-rose-500/40 hover:bg-rose-500/5 hover:text-rose-300 text-slate-500 transition-all flex items-center justify-center gap-2 text-sm group press-scale"
              aria-label="Attach PDF document"
            >
              <FileText size={14} className="group-hover:text-rose-400 transition-colors" />
              Attach PDF
            </button>

            <button
              onClick={handleRunAnalysis}
              className="btn-glow flex-1 py-2.5 rounded-2xl font-semibold flex items-center justify-center gap-2 text-sm bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black"
            >
              <Lightbulb size={14} />
              Analyse
            </button>
          </div>

          <button
            onClick={() => {
              setReportFocusNodeId(selectedNode.id);
              setReportGeneratorOpen(true);
            }}
            className="w-full py-2.5 rounded-2xl border border-slate-700/80 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-300 text-slate-500 transition-all flex items-center justify-center gap-2 text-sm group press-scale"
            aria-label="Export entity report as PDF"
          >
            <BookOpen size={14} className="group-hover:text-emerald-400 transition-colors" />
            Export Report
          </button>
        </div>
      </div>

      <ConnectEntityModal isOpen={connectOpen} onClose={() => setConnectOpen(false)} />
    </>
  );
}
