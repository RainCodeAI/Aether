// components/data/PDFUploadModal.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import {
  X, Upload, FileText, Sparkles, Check, Plus, AlertTriangle,
  Loader2, ChevronRight, User, FolderOpen, MapPin, BarChart2,
  CalendarDays, Lightbulb,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import {
  extractTextFromPDF, extractEntitiesFromText, summarizeExtraction,
  ExtractedEntity,
} from '@/lib/pdf-extract';
import { OntologyNode, EntityType } from '@/types';

// ─── Type display metadata ────────────────────────────────────────────────────

const TYPE_META: Record<EntityType, {
  icon: React.ElementType;
  color: string;
  bg: string;
}> = {
  Person:   { icon: User,         color: 'text-cyan-400',   bg: 'bg-cyan-500/10'   },
  Project:  { icon: FolderOpen,   color: 'text-purple-400', bg: 'bg-purple-500/10' },
  Location: { icon: MapPin,       color: 'text-green-400',  bg: 'bg-green-500/10'  },
  Metric:   { icon: BarChart2,    color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
  Insight:  { icon: Lightbulb,    color: 'text-rose-400',   bg: 'bg-rose-500/10'   },
  Event:    { icon: CalendarDays, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  Document: { icon: FileText,     color: 'text-slate-400',  bg: 'bg-slate-500/10'  },
};

type Step = 'upload' | 'extracting' | 'review' | 'done';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PDFUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, created Document node is linked to this existing entity */
  linkedEntityId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PDFUploadModal({
  isOpen, onClose, linkedEntityId,
}: PDFUploadModalProps) {
  const { data, setData } = useAetherStore();

  const [step,          setStep]         = useState<Step>('upload');
  const [isDragOver,    setIsDragOver]   = useState(false);
  const [fileName,      setFileName]     = useState('');
  const [pageCount,     setPageCount]    = useState(0);
  const [wordCount,     setWordCount]    = useState(0);
  const [entities,      setEntities]     = useState<ExtractedEntity[]>([]);
  const [selected,      setSelected]     = useState<Set<string>>(new Set());
  const [error,         setError]        = useState<string | null>(null);
  const [createdCount,  setCreatedCount] = useState(0);
  const [aiSummary,     setAiSummary]    = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const reset = () => {
    setStep('upload');
    setIsDragOver(false);
    setFileName('');
    setPageCount(0);
    setWordCount(0);
    setEntities([]);
    setSelected(new Set());
    setError(null);
    setCreatedCount(0);
    setAiSummary('');
  };

  const handleClose = () => { reset(); onClose(); };

  // ── File processing ───────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file (.pdf).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('PDF must be under 20 MB.');
      return;
    }

    setError(null);
    setFileName(file.name);
    setStep('extracting');

    try {
      const { text, pageCount: pc, wordCount: wc } = await extractTextFromPDF(file);
      setPageCount(pc);
      setWordCount(wc);

      const extracted = extractEntitiesFromText(text);
      setEntities(extracted);
      // Auto-select high + medium confidence by default
      setSelected(new Set(extracted.filter((e) => e.confidence !== 'low').map((e) => e.id)));
      setAiSummary(summarizeExtraction(extracted));
      setStep('review');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to process PDF: ${msg}. The file may be encrypted, image-only, or corrupted.`);
      setStep('upload');
    }
  }, []);

  // ── Entity creation ───────────────────────────────────────────────────────

  const handleCreate = () => {
    const toCreate = entities.filter((e) => selected.has(e.id));
    const ts = Date.now();

    // Document node for the PDF itself
    const docNode: OntologyNode = {
      id: `pdf-doc-${ts}`,
      type: 'Document',
      label: fileName.replace(/\.pdf$/i, ''),
      properties: {
        format: 'PDF',
        wordCount,
        pageCount,
        extractedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString().split('T')[0],
    };

    const entityNodes: OntologyNode[] = toCreate.map((e, i) => ({
      id: `pdf-entity-${ts + i + 1}`,
      type: e.type,
      label: e.label,
      properties: e.properties,
      createdAt: new Date().toISOString().split('T')[0],
    }));

    const newRels = toCreate.map((e, i) => ({
      id: `pdf-rel-${ts + i}`,
      from: docNode.id,
      to: `pdf-entity-${ts + i + 1}`,
      type: 'mentions',
    }));

    if (linkedEntityId) {
      newRels.push({
        id: `pdf-link-${ts}`,
        from: linkedEntityId,
        to: docNode.id,
        type: 'hasDocument',
      });
    }

    setData({
      nodes:         [...data.nodes, docNode, ...entityNodes],
      relationships: [...data.relationships, ...newRels],
    });

    setCreatedCount(1 + entityNodes.length);
    setStep('done');
  };

  if (!isOpen) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[65] flex items-end sm:items-center justify-center p-0 sm:p-4 modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 'extracting') handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Upload and analyze PDF"
    >
      <div className="glass w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[92vh] sm:max-h-[85vh] shadow-2xl modal-panel overflow-hidden">

        {/* Pull handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0" aria-hidden="true">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <FileText size={16} className="text-rose-400" />
            </div>
            <div>
              <h2 className="font-semibold text-base leading-none mb-0.5">PDF Analyzer</h2>
              <p className="text-xs text-slate-500">Extract entities from documents</p>
            </div>
          </div>
          {step !== 'extracting' && (
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors touch-target"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto scroll-touch">

          {/* Upload step */}
          {step === 'upload' && (
            <div className="p-5 sm:p-6 space-y-5">
              {/* Drop zone */}
              <div
                className={`relative border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition-all duration-200 ${
                  isDragOver
                    ? 'border-cyan-500/80 bg-cyan-500/5'
                    : 'border-slate-700 hover:border-slate-600 hover:bg-slate-900/40'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) processFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processFile(f);
                    e.target.value = '';
                  }}
                />
                <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center transition-colors ${
                  isDragOver ? 'bg-cyan-500/15 border border-cyan-500/30' : 'bg-slate-800 border border-slate-700'
                }`}>
                  <Upload size={28} className={isDragOver ? 'text-cyan-400' : 'text-slate-500'} />
                </div>
                <p className="text-base font-medium mb-1.5">
                  {isDragOver ? 'Drop your PDF here' : 'Upload a PDF document'}
                </p>
                <p className="text-sm text-slate-500">
                  {isDragOver ? 'Release to analyze' : 'Drag & drop or click to browse · up to 20 MB'}
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/8 border border-rose-500/25">
                  <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-300">{error}</p>
                </div>
              )}

              {/* Feature list */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 mb-3">
                  What gets extracted
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                  {[
                    { icon: '👤', label: 'People',    desc: 'Names, emails, titles'      },
                    { icon: '📁', label: 'Projects',  desc: 'Project names & initiatives' },
                    { icon: '📍', label: 'Locations', desc: 'Cities, provinces, offices'  },
                    { icon: '💰', label: 'Metrics',   desc: 'Monetary values & amounts'   },
                    { icon: '📅', label: 'Events',    desc: 'Dated events & deadlines'    },
                  ].map(({ icon, label, desc }) => (
                    <div key={label} className="flex items-center gap-2.5 text-sm">
                      <span>{icon}</span>
                      <span className="font-medium text-slate-300 shrink-0">{label}</span>
                      <span className="text-slate-600 text-xs truncate">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Extracting step */}
          {step === 'extracting' && (
            <div className="flex flex-col items-center justify-center py-24 px-6 gap-5">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Loader2 size={28} className="text-cyan-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-medium mb-1">Analyzing document…</p>
                <p className="text-sm text-slate-500 max-w-xs">
                  Extracting text from {fileName} and detecting entities
                </p>
              </div>
            </div>
          )}

          {/* Review step */}
          {step === 'review' && (
            <div className="p-5 sm:p-6 space-y-5">
              {/* File info */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <FileText size={15} className="text-rose-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {pageCount} page{pageCount !== 1 ? 's' : ''} · {wordCount.toLocaleString()} words
                  </p>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1 shrink-0">
                  Parsed
                </span>
              </div>

              {/* AI summary */}
              {aiSummary && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/15">
                  <Sparkles size={13} className="text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300 leading-relaxed">{aiSummary}</p>
                </div>
              )}

              {/* Entity list */}
              {entities.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-400 mb-1">No entities detected</p>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto">
                    The document may be image-based, empty, or encrypted. Try a text-searchable PDF.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Detected Entities
                      <span className="ml-2 normal-case text-slate-600 font-normal">
                        ({entities.length} found · {selected.size} selected)
                      </span>
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => setSelected(new Set(entities.map((e) => e.id)))}
                        className="text-cyan-500 hover:text-cyan-300 transition-colors"
                      >
                        All
                      </button>
                      <span className="text-slate-700">·</span>
                      <button
                        onClick={() => setSelected(new Set())}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {entities.map((entity) => {
                      const meta = TYPE_META[entity.type];
                      const Icon = meta.icon;
                      const isSelected = selected.has(entity.id);
                      const alreadyExists = data.nodes.some(
                        (n) =>
                          n.type === entity.type &&
                          n.label.toLowerCase().trim() === entity.label.toLowerCase().trim()
                      );

                      return (
                        <button
                          key={entity.id}
                          onClick={() => {
                            if (alreadyExists) return;
                            setSelected((prev) => {
                              const next = new Set(prev);
                              next.has(entity.id) ? next.delete(entity.id) : next.add(entity.id);
                              return next;
                            });
                          }}
                          disabled={alreadyExists}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                            alreadyExists
                              ? 'border-slate-800/40 opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'border-slate-600 bg-slate-800/50'
                              : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            alreadyExists
                              ? 'border-slate-700 bg-slate-800'
                              : isSelected
                              ? 'bg-cyan-500 border-cyan-500'
                              : 'border-slate-600'
                          }`}>
                            {(isSelected || alreadyExists) && (
                              <Check size={10} className={alreadyExists ? 'text-slate-500' : 'text-black'} />
                            )}
                          </div>

                          {/* Icon */}
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                            <Icon size={13} className={meta.color} />
                          </div>

                          {/* Label + props */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-200 truncate">
                                {entity.label}
                              </span>
                              {alreadyExists && (
                                <span className="text-[10px] text-slate-600 shrink-0">exists</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={`text-[10px] font-mono ${meta.color}`}>{entity.type}</span>
                              {Object.entries(entity.properties)
                                .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
                                .slice(0, 2)
                                .map(([k, v]) => (
                                  <span key={k} className="text-[10px] text-slate-600">
                                    · {String(v)}
                                  </span>
                                ))}
                            </div>
                          </div>

                          {/* Confidence badge */}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${
                            entity.confidence === 'high'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : entity.confidence === 'medium'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-slate-800 text-slate-600 border-slate-700'
                          }`}>
                            {entity.confidence}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Done step */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-20 px-6 gap-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center aether-scale-in">
                <Check size={28} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-semibold mb-1">Import complete</p>
                <p className="text-sm text-slate-400">
                  {createdCount} entit{createdCount !== 1 ? 'ies' : 'y'} added to your intelligence graph
                </p>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={reset}
                  className="px-5 py-2.5 border border-slate-700 hover:border-slate-500 rounded-xl text-sm text-slate-300 hover:text-white transition-colors press-scale"
                >
                  Upload Another
                </button>
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-semibold transition-colors press-scale"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer (review step only) ── */}
        {step === 'review' && (
          <div className="px-5 sm:px-6 py-4 sm:py-5 border-t border-slate-800 shrink-0">
            <button
              onClick={handleCreate}
              disabled={selected.size === 0}
              aria-label={`Import ${selected.size} entities`}
              className={`w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                selected.size > 0
                  ? 'btn-glow bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Plus size={16} />
              Import {selected.size} Entit{selected.size !== 1 ? 'ies' : 'y'}
              {selected.size > 0 && (
                <span className="opacity-70 flex items-center gap-1">
                  <ChevronRight size={13} /> + Document node
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
