// components/data/EnrichModal.tsx
'use client';

import { useState, useMemo } from 'react';
import { X, Sparkles, Check, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { analyzeEnrichment, applyEnrichment } from '@/lib/enrich';

const CONFIDENCE_STYLE = {
  high:   { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'High'   },
  medium: { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',       label: 'Medium' },
  low:    { badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30',        label: 'Low'    },
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('lat' in o && 'lng' in o) return `${Number(o.lat).toFixed(4)}, ${Number(o.lng).toFixed(4)}`;
    return JSON.stringify(v);
  }
  return String(v);
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function EnrichModal({ isOpen, onClose }: Props) {
  const { data, setData } = useAetherStore();

  const suggestions = useMemo(() => analyzeEnrichment(data), [data]);
  const [accepted, setAccepted] = useState<Set<string>>(() => {
    // Auto-select high-confidence suggestions
    const set = new Set<string>();
    suggestions.forEach((s, i) => { if (s.confidence === 'high') set.add(String(i)); });
    return set;
  });
  const [applied, setApplied] = useState(false);

  const toggleAll = () => {
    if (accepted.size === suggestions.length) {
      setAccepted(new Set());
    } else {
      setAccepted(new Set(suggestions.map((_, i) => String(i))));
    }
  };

  const toggle = (idx: number) => {
    setAccepted(prev => {
      const next = new Set(prev);
      if (next.has(String(idx))) next.delete(String(idx));
      else next.add(String(idx));
      return next;
    });
  };

  const handleApply = () => {
    const toApply = suggestions.filter((_, i) => accepted.has(String(i)));
    const enriched = applyEnrichment(data, toApply);
    setData(enriched);
    setApplied(true);
  };

  const handleClose = () => { setApplied(false); onClose(); };

  if (!isOpen) return null;

  const acceptedCount = accepted.size;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-slate-700 rounded-3xl shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2.5">
              <Sparkles size={20} className="text-amber-400" />
              Enrich Data
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rule-based suggestions to fill missing fields
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {applied ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-200 mb-1">
                {acceptedCount} suggestion{acceptedCount !== 1 ? 's' : ''} applied
              </h3>
              <p className="text-sm text-slate-500">Your entities have been enriched.</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500/60" />
              <p className="text-sm text-slate-400 font-medium">Nothing to enrich</p>
              <p className="text-xs text-slate-600 mt-1">All detectable fields are already populated.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} found</p>
                <button onClick={toggleAll} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                  {accepted.size === suggestions.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              {suggestions.map((s, idx) => {
                const isSelected = accepted.has(String(idx));
                const conf = CONFIDENCE_STYLE[s.confidence];
                return (
                  <button
                    key={`${s.nodeId}-${s.field}`}
                    onClick={() => toggle(idx)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? 'bg-cyan-500/5 border-cyan-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-700 bg-slate-800'
                      }`}>
                        {isSelected && <Check size={11} className="text-black" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium text-slate-200 truncate">{s.nodeLabel}</span>
                          <span className="text-[10px] font-mono text-slate-600">→ {s.field}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${conf.badge}`}>
                            {conf.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {s.currentValue !== null && (
                            <>
                              <span className="text-slate-600 line-through">{formatValue(s.currentValue)}</span>
                              <ChevronRight size={11} className="text-slate-700" />
                            </>
                          )}
                          <span className="text-emerald-400 font-mono">{formatValue(s.suggestedValue)}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">{s.reason}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!applied && suggestions.length > 0 && (
          <div className="flex items-center justify-between gap-3 p-5 border-t border-slate-800 shrink-0">
            <button onClick={handleClose} className="text-sm text-slate-400 hover:text-slate-200 px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={acceptedCount === 0}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <Sparkles size={14} />
              Apply {acceptedCount > 0 ? acceptedCount : ''} suggestion{acceptedCount !== 1 ? 's' : ''}
            </button>
          </div>
        )}
        {applied && (
          <div className="p-5 border-t border-slate-800 shrink-0">
            <button onClick={handleClose} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-2.5 rounded-xl text-sm transition-colors">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
