// components/data/CSVImportModal.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { X, Upload, ChevronRight, ChevronLeft, Check, AlertTriangle, Table2 } from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { EntityType } from '@/types';
import {
  parseCSV, detectColumnMappings, suggestEntityType, csvRowsToNodes,
  ColumnMapping, MappedField,
} from '@/lib/csv-import';

const VALID_TYPES: EntityType[] = ['Person', 'Project', 'Location', 'Metric', 'Insight', 'Event', 'Document'];

const FIELD_OPTIONS: { value: MappedField; label: string }[] = [
  { value: 'skip',  label: '— Skip column —' },
  { value: 'id',    label: 'ID'               },
  { value: 'label', label: 'Name / Label'     },
  { value: 'type',  label: 'Entity Type'      },
  { value: 'status',       label: 'status'       },
  { value: 'description',  label: 'description'  },
  { value: 'role',         label: 'role'         },
  { value: 'email',        label: 'email'        },
  { value: 'phone',        label: 'phone'        },
  { value: 'budget',       label: 'budget'       },
  { value: 'progress',     label: 'progress'     },
  { value: 'priority',     label: 'priority'     },
  { value: 'value',        label: 'value'        },
  { value: 'unit',         label: 'unit'         },
  { value: 'country',      label: 'country'      },
  { value: 'city',         label: 'city'         },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'upload' | 'map' | 'preview';

export default function CSVImportModal({ isOpen, onClose }: Props) {
  const { data, setData, addNodes } = useAetherStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]             = useState<Step>('upload');
  const [rows, setRows]             = useState<string[][]>([]);
  const [mappings, setMappings]     = useState<ColumnMapping[]>([]);
  const [defaultType, setDefaultType] = useState<EntityType>('Document');
  const [mergeMode, setMergeMode]   = useState<'append' | 'replace'>('append');
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ nodeCount: number; warnings: string[] } | null>(null);

  const reset = () => {
    setStep('upload');
    setRows([]);
    setMappings([]);
    setParseError(null);
    setImportResult(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = useCallback((file: File) => {
    setParseError(null);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please select a .csv file.'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setParseError('File too large (max 5 MB).'); return;
    }
    file.text().then(text => {
      try {
        const { headers: h, rows: r } = parseCSV(text);
        const detected = detectColumnMappings(h, r);
        const suggested = suggestEntityType(r, detected);
        setRows(r);
        setMappings(detected);
        setDefaultType(suggested);
        setStep('map');
      } catch (e) {
        setParseError(e instanceof Error ? e.message : 'Failed to parse CSV.');
      }
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const updateMapping = (idx: number, value: MappedField) => {
    setMappings(prev => prev.map((m, i) => i === idx ? { ...m, mappedTo: value } : m));
  };

  const handleImport = () => {
    const result = csvRowsToNodes(rows, mappings, defaultType);
    if (mergeMode === 'append') {
      const existingIds = new Set(data.nodes.map(n => n.id));
      const newNodes = result.data.nodes.filter(n => !existingIds.has(n.id));
      addNodes(newNodes);
      setImportResult({ nodeCount: newNodes.length, warnings: result.warnings });
    } else {
      setData(result.data);
      setImportResult({ nodeCount: result.nodeCount, warnings: result.warnings });
    }
    setStep('preview');
  };

  if (!isOpen) return null;

  const hasLabel = mappings.some(m => m.mappedTo === 'label');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-slate-700 rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2.5">
              <Table2 size={20} className="text-cyan-400" />
              Import CSV
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {step === 'upload' ? 'Select a CSV file to import entities'
               : step === 'map'  ? `Map columns — ${rows.length} rows detected`
               : 'Import complete'}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800/60 shrink-0">
          {(['upload', 'map', 'preview'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-slate-700" />}
              <div className={`flex items-center gap-1.5 text-xs font-medium ${step === s ? 'text-cyan-400' : s === 'preview' && step === 'preview' ? 'text-emerald-400' : 'text-slate-600'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === s ? 'bg-cyan-500/20 border border-cyan-500/50' :
                  (s === 'map' && (step === 'preview')) || (s === 'upload' && step !== 'upload') ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400' :
                  'bg-slate-800 border border-slate-700 text-slate-600'
                }`}>
                  {((s === 'map' && step !== 'upload' && step !== 'map') || (s === 'upload' && step !== 'upload')) ? <Check size={10} /> : i + 1}
                </div>
                <span className="capitalize">{s}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div>
              <div
                className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-2xl p-10 text-center transition-colors cursor-pointer group"
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={32} className="mx-auto mb-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                <p className="text-sm font-medium text-slate-300">Drop a CSV file here or click to browse</p>
                <p className="text-xs text-slate-600 mt-1">Supports RFC 4180 CSV — max 5 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                />
              </div>
              {parseError && (
                <div className="mt-4 flex items-start gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  {parseError}
                </div>
              )}
              <div className="mt-4 p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-500 font-medium mb-2">Expected format example:</p>
                <pre className="text-[11px] text-slate-400 font-mono">
{`name,type,status,budget
Aether Platform,Project,Active,250000
Alice Chen,Person,,,`}
                </pre>
              </div>
            </div>
          )}

          {/* Step 2: Column mapping */}
          {step === 'map' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Default entity type</label>
                  <select
                    value={defaultType}
                    onChange={e => setDefaultType(e.target.value as EntityType)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/60"
                  >
                    {VALID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Import mode</label>
                  <select
                    value={mergeMode}
                    onChange={e => setMergeMode(e.target.value as 'append' | 'replace')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/60"
                  >
                    <option value="append">Append to existing data</option>
                    <option value="replace">Replace all data</option>
                  </select>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-2">Column mappings <span className="text-slate-700">(auto-detected)</span></p>
                <div className="space-y-2">
                  {mappings.map((m, idx) => (
                    <div key={m.csvHeader} className="flex items-center gap-3 bg-slate-900/60 rounded-xl border border-slate-800 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-slate-300 truncate">{m.csvHeader}</p>
                        <p className="text-[11px] text-slate-600 truncate">{m.sample.join(', ')}</p>
                      </div>
                      <ChevronRight size={13} className="text-slate-700 shrink-0" />
                      <select
                        value={m.mappedTo}
                        onChange={e => updateMapping(idx, e.target.value as MappedField)}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60 w-36 shrink-0"
                      >
                        {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        {!FIELD_OPTIONS.find(o => o.value === m.mappedTo) && (
                          <option value={m.mappedTo}>{m.mappedTo}</option>
                        )}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {!hasLabel && (
                <div className="flex items-start gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  Map at least one column to &ldquo;Name / Label&rdquo; — otherwise all rows will be skipped.
                </div>
              )}
            </div>
          )}

          {/* Step 3: Done */}
          {step === 'preview' && importResult && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-200 mb-1">
                {importResult.nodeCount} entit{importResult.nodeCount !== 1 ? 'ies' : 'y'} imported
              </h3>
              <p className="text-sm text-slate-500">
                {mergeMode === 'append' ? 'Appended to your existing data.' : 'Data replaced.'}
              </p>
              {importResult.warnings.length > 0 && (
                <div className="mt-4 text-left space-y-1">
                  {importResult.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      {w}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-slate-800 shrink-0">
          {step === 'map' ? (
            <>
              <button
                onClick={() => setStep('upload')}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors px-3 py-2 rounded-xl hover:bg-slate-800"
              >
                <ChevronLeft size={15} /> Back
              </button>
              <button
                onClick={handleImport}
                disabled={!hasLabel}
                className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Import {rows.length} rows <ChevronRight size={15} />
              </button>
            </>
          ) : step === 'preview' ? (
            <>
              <button
                onClick={reset}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors px-3 py-2 rounded-xl hover:bg-slate-800"
              >
                Import another file
              </button>
              <button
                onClick={handleClose}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Done
              </button>
            </>
          ) : (
            <button onClick={handleClose} className="ml-auto text-sm text-slate-400 hover:text-slate-200 transition-colors px-3 py-2 rounded-xl hover:bg-slate-800">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
