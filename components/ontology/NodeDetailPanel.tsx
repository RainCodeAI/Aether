// components/ontology/NodeDetailPanel.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Calendar, Lightbulb, GitBranch,
  Tag, Plus, Hash, Share2, CheckCircle2, FileText, BookOpen,
  Pencil, Trash2, Check, Route, Focus,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { EntityType, OntologyNode } from '@/types';
import ConnectEntityModal from './ConnectEntityModal';
import ConnectionsEditor from './ConnectionsEditor';
import { copyShareUrl } from '@/lib/share';
import { findNeighborhood } from '@/lib/graph-path';

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

/** System keys shown read-only (or hidden from the add-property picker). */
const SYSTEM_KEYS = new Set(['source', 'analyzedAt', 'confidenceScore']);

/** Known select options for common property keys. */
const SELECT_OPTIONS: Record<string, string[]> = {
  status: [
    'Planning', 'Active', 'At Risk', 'On Hold', 'Complete',
    'Upcoming', 'In Progress', 'Cancelled', 'scheduled', 'pending', 'draft',
  ],
  priority: ['Critical', 'High', 'Medium', 'Low'],
  trend: ['up', 'down', 'neutral'],
  confidence: ['high', 'medium', 'low'],
  format: ['PDF', 'Markdown', 'Spreadsheet', 'Slides', 'Word', 'Other'],
  type: ['Office', 'HQ', 'Remote', 'Partner', 'Field', 'Data Centre', 'meeting', 'task'],
  unit: ['CAD', 'USD', 'EUR', 'GBP', '%', 'count', 'users', 'kg', 'km', 'hrs'],
  intent: [
    'financial', 'risk', 'team', 'projects', 'location',
    'opportunity', 'summary', 'connection_discovery', 'scenario_projection', 'search',
  ],
};

type EditorKind = 'text' | 'number' | 'select' | 'boolean' | 'coords' | 'textarea' | 'json';

function isCoords(value: unknown): value is { lat: number; lng: number } {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return 'lat' in v && 'lng' in v;
}

function inferEditorKind(key: string, value: unknown): EditorKind {
  if (isCoords(value) || key === 'coordinates') return 'coords';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (SELECT_OPTIONS[key]) return 'select';
  if (typeof value === 'object' && value !== null) return 'json';
  if (
    key === 'summary' ||
    key === 'description' ||
    (typeof value === 'string' && value.length > 80)
  ) {
    return 'textarea';
  }
  return 'text';
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (isCoords(value)) {
    return `${Number(value.lat).toFixed(4)}°, ${Number(value.lng).toFixed(4)}°`;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

function coerceScalar(raw: string, previous: unknown): unknown {
  if (typeof previous === 'number') {
    if (raw.trim() === '') return previous;
    const n = Number(raw);
    return Number.isFinite(n) ? n : previous;
  }
  if (typeof previous === 'boolean') {
    const lower = raw.trim().toLowerCase();
    if (lower === 'true' || lower === 'yes' || lower === '1') return true;
    if (lower === 'false' || lower === 'no' || lower === '0') return false;
    return previous;
  }
  return raw;
}

function statusColor(value: unknown): string {
  if (value === 'Active' || value === 'Complete' || value === 'up') return 'text-emerald-400';
  if (value === 'At Risk' || value === 'Cancelled' || value === 'down') return 'text-rose-400';
  if (value === 'Planning' || value === 'Upcoming' || value === 'pending') return 'text-amber-400';
  return 'text-slate-200';
}

const INPUT_CLS =
  'w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:shadow-[0_0_0_2px_rgba(34,211,238,0.08)] transition-all';

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

// ─── Label editor ──────────────────────────────────────────────────────────────

function LabelEditor({
  nodeId,
  label,
}: {
  nodeId: string;
  label: string;
}) {
  const updateNode = useAetherStore((s) => s.updateNode);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync when selection / external rename changes (and not mid-edit)
  const [prevLabel, setPrevLabel] = useState(label);
  if (label !== prevLabel) {
    setPrevLabel(label);
    if (!editing) setDraft(label);
  }

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    const next = draft.trim();
    if (!next) {
      setDraft(label);
      setEditing(false);
      return;
    }
    if (next !== label) updateNode(nodeId, { label: next });
    setEditing(false);
  }, [draft, label, nodeId, updateNode]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setDraft(label); setEditing(true); }}
        className="group w-full text-left flex items-start gap-2 rounded-xl -mx-1 px-1 py-0.5 hover:bg-slate-800/40 transition-colors"
        title="Click to rename"
      >
        <h2 className="text-xl font-semibold leading-tight flex-1 min-w-0 break-words" title={label}>
          {label}
        </h2>
        <Pencil
          size={13}
          className="text-slate-700 group-hover:text-cyan-400 shrink-0 mt-1.5 transition-colors"
        />
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
        if (e.key === 'Escape') {
          setDraft(label);
          setEditing(false);
        }
      }}
      aria-label="Entity name"
      className="w-full bg-slate-900/90 border border-cyan-500/40 rounded-xl px-3 py-2 text-xl font-semibold text-slate-100 outline-none focus:shadow-[0_0_0_3px_rgba(34,211,238,0.12)]"
    />
  );
}

// ─── Single property row ───────────────────────────────────────────────────────

function PropertyRow({
  nodeId,
  propKey,
  value,
  readOnly,
  onRemove,
}: {
  nodeId: string;
  propKey: string;
  value: unknown;
  readOnly?: boolean;
  onRemove?: () => void;
}) {
  const updateNode = useAetherStore((s) => s.updateNode);
  const kind = inferEditorKind(propKey, value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() =>
    kind === 'json' ? JSON.stringify(value, null, 2) : String(value ?? '')
  );
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Reset local draft when external value changes and we're not editing
  const valueKey = JSON.stringify(value);
  const [prevValueKey, setPrevValueKey] = useState(valueKey);
  if (valueKey !== prevValueKey) {
    setPrevValueKey(valueKey);
    if (!editing) {
      setDraft(kind === 'json' ? JSON.stringify(value, null, 2) : String(value ?? ''));
    }
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const patchProperty = useCallback(
    (next: unknown) => {
      updateNode(nodeId, (n) => ({
        ...n,
        properties: { ...n.properties, [propKey]: next },
      }));
    },
    [nodeId, propKey, updateNode]
  );

  const commitScalar = useCallback(() => {
    if (kind === 'json') {
      try {
        const parsed = JSON.parse(draft) as unknown;
        patchProperty(parsed);
        setEditing(false);
      } catch {
        // keep editing with invalid JSON
      }
      return;
    }
    const next = coerceScalar(draft, value);
    if (next !== value) patchProperty(next);
    setEditing(false);
  }, [draft, kind, patchProperty, value]);

  const label = propKey.replace(/_/g, ' ');

  // ── Read-only system props ──────────────────────────────────────────────────
  if (readOnly) {
    return (
      <div className="flex items-start justify-between gap-4 px-4 py-2.5">
        <span className="text-slate-500 text-xs capitalize shrink-0 pt-0.5">{label}</span>
        <span className="font-medium text-xs text-right break-all max-w-[180px] text-slate-500">
          {formatValue(value)}
        </span>
      </div>
    );
  }

  // ── Coordinates ─────────────────────────────────────────────────────────────
  if (kind === 'coords') {
    const coords = isCoords(value) ? value : { lat: 0, lng: 0 };
    return (
      <div className="px-4 py-2.5 space-y-2 group/row">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500 text-xs capitalize">{label}</span>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${propKey}`}
              className="p-1 rounded-md text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover/row:opacity-100 transition-all"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Lat</span>
            <input
              type="number"
              step="0.0001"
              min={-90}
              max={90}
              defaultValue={coords.lat}
              key={`lat-${coords.lat}`}
              onBlur={(e) => {
                const lat = Number(e.target.value);
                if (!Number.isFinite(lat)) return;
                patchProperty({
                  lat: Math.min(90, Math.max(-90, lat)),
                  lng: Number(coords.lng) || 0,
                });
              }}
              className={INPUT_CLS}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Lng</span>
            <input
              type="number"
              step="0.0001"
              min={-180}
              max={180}
              defaultValue={coords.lng}
              key={`lng-${coords.lng}`}
              onBlur={(e) => {
                const lng = Number(e.target.value);
                if (!Number.isFinite(lng)) return;
                patchProperty({
                  lat: Number(coords.lat) || 0,
                  lng: Math.min(180, Math.max(-180, lng)),
                });
              }}
              className={INPUT_CLS}
            />
          </label>
        </div>
      </div>
    );
  }

  // ── Boolean toggle ──────────────────────────────────────────────────────────
  if (kind === 'boolean') {
    const on = Boolean(value);
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 group/row">
        <span className="text-slate-500 text-xs capitalize shrink-0">{label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => patchProperty(!on)}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              on ? 'bg-cyan-500/80' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                on ? 'translate-x-4' : ''
              }`}
            />
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${propKey}`}
              className="p-1 rounded-md text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover/row:opacity-100 transition-all"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Select (immediate save) ─────────────────────────────────────────────────
  if (kind === 'select') {
    const options = SELECT_OPTIONS[propKey] ?? [];
    const strVal = String(value ?? '');
    const opts = options.includes(strVal) ? options : [strVal, ...options].filter(Boolean);
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 group/row">
        <span className="text-slate-500 text-xs capitalize shrink-0">{label}</span>
        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
          <select
            value={strVal}
            onChange={(e) => patchProperty(e.target.value)}
            className={`${INPUT_CLS} max-w-[160px] appearance-none cursor-pointer ${statusColor(value)}`}
          >
            {opts.map((o) => (
              <option key={o} value={o} className="bg-slate-900 text-slate-200">
                {o}
              </option>
            ))}
          </select>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${propKey}`}
              className="p-1 rounded-md text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover/row:opacity-100 transition-all shrink-0"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Text / number / textarea / json — click to edit ──────────────────────────
  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3 px-4 py-2.5 group/row hover:bg-slate-800/30 transition-colors">
        <span className="text-slate-500 text-xs capitalize shrink-0 pt-0.5">{label}</span>
        <div className="flex items-start gap-1.5 min-w-0 flex-1 justify-end">
          <button
            type="button"
            onClick={() => {
              setDraft(
                kind === 'json'
                  ? JSON.stringify(value, null, 2)
                  : value === null || value === undefined
                    ? ''
                    : String(value)
              );
              setEditing(true);
            }}
            className={`font-medium text-xs text-right break-all max-w-[160px] rounded-md px-1.5 py-0.5 -mr-1 hover:bg-slate-800/80 transition-colors ${
              propKey === 'status' || propKey === 'trend' ? statusColor(value) : 'text-slate-200'
            }`}
            title="Click to edit"
          >
            {formatValue(value)}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(
                kind === 'json'
                  ? JSON.stringify(value, null, 2)
                  : value === null || value === undefined
                    ? ''
                    : String(value)
              );
              setEditing(true);
            }}
            aria-label={`Edit ${propKey}`}
            className="p-1 rounded-md text-slate-700 hover:text-cyan-400 opacity-0 group-hover/row:opacity-100 transition-all shrink-0 mt-0.5"
          >
            <Pencil size={11} />
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${propKey}`}
              className="p-1 rounded-md text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover/row:opacity-100 transition-all shrink-0 mt-0.5"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Editing mode
  if (kind === 'textarea' || kind === 'json') {
    return (
      <div className="px-4 py-2.5 space-y-2">
        <span className="text-slate-500 text-xs capitalize block">{label}</span>
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitScalar}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setDraft(kind === 'json' ? JSON.stringify(value, null, 2) : String(value ?? ''));
              setEditing(false);
            }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              commitScalar();
            }
          }}
          rows={kind === 'json' ? 4 : 3}
          className={`${INPUT_CLS} resize-y font-mono`}
          aria-label={label}
        />
        <p className="text-[10px] text-slate-600">
          {kind === 'json' ? 'Valid JSON required · ' : ''}⌘/Ctrl+Enter to save · Esc cancel
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-slate-500 text-xs capitalize shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={kind === 'number' ? 'number' : 'text'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitScalar}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitScalar();
            }
            if (e.key === 'Escape') {
              setDraft(String(value ?? ''));
              setEditing(false);
            }
          }}
          className={`${INPUT_CLS} max-w-[160px] text-right`}
          aria-label={label}
        />
        <button
          type="button"
          onClick={commitScalar}
          aria-label="Save"
          className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/10 shrink-0"
        >
          <Check size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Properties section ────────────────────────────────────────────────────────

function PropertiesEditor({ node }: { node: OntologyNode }) {
  const updateNode = useAetherStore((s) => s.updateNode);
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const keyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) keyRef.current?.focus();
  }, [adding]);

  const entries = Object.entries(node.properties);
  const editable = entries.filter(([k]) => !SYSTEM_KEYS.has(k));
  const system = entries.filter(([k]) => SYSTEM_KEYS.has(k));

  const removeProperty = (key: string) => {
    updateNode(node.id, (n) => {
      const { [key]: _removed, ...rest } = n.properties;
      void _removed;
      return { ...n, properties: rest };
    });
  };

  const handleAdd = () => {
    const key = newKey
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .replace(/^(\d)/, '_$1');
    if (!key) {
      setAddError('Key is required');
      return;
    }
    if (SYSTEM_KEYS.has(key) || key in node.properties) {
      setAddError('Property already exists');
      return;
    }
    // Coerce numbers when the whole string is numeric
    let value: unknown = newValue;
    if (newValue.trim() !== '' && !Number.isNaN(Number(newValue)) && /^-?\d+(\.\d+)?$/.test(newValue.trim())) {
      value = Number(newValue.trim());
    } else if (newValue.trim().toLowerCase() === 'true') {
      value = true;
    } else if (newValue.trim().toLowerCase() === 'false') {
      value = false;
    }
    updateNode(node.id, (n) => ({
      ...n,
      properties: { ...n.properties, [key]: value },
    }));
    setNewKey('');
    setNewValue('');
    setAddError(null);
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel count={editable.length + system.length}>Properties</SectionLabel>
        <button
          type="button"
          onClick={() => {
            setAdding((v) => !v);
            setAddError(null);
          }}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-cyan-300 transition-colors px-1.5 py-0.5 rounded-lg hover:bg-cyan-500/10"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800/80 overflow-hidden divide-y divide-slate-800/60">
        {editable.length === 0 && system.length === 0 && !adding && (
          <p className="px-4 py-6 text-center text-xs text-slate-600 italic">
            No properties yet — click Add to create one
          </p>
        )}

        {editable.map(([key, value]) => (
          <PropertyRow
            key={key}
            nodeId={node.id}
            propKey={key}
            value={value}
            onRemove={() => removeProperty(key)}
          />
        ))}

        {system.map(([key, value]) => (
          <PropertyRow
            key={key}
            nodeId={node.id}
            propKey={key}
            value={value}
            readOnly
          />
        ))}

        {adding && (
          <div className="px-4 py-3 space-y-2 bg-slate-900/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              New property
            </p>
            <div className="flex gap-2">
              <input
                ref={keyRef}
                type="text"
                value={newKey}
                onChange={(e) => { setNewKey(e.target.value); setAddError(null); }}
                placeholder="key"
                className={`${INPUT_CLS} flex-1 font-mono`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') { setAdding(false); setAddError(null); }
                }}
              />
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="value"
                className={`${INPUT_CLS} flex-1`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') { setAdding(false); setAddError(null); }
                }}
              />
            </div>
            {addError && (
              <p className="text-[11px] text-rose-400">{addError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                className="flex-1 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-colors"
              >
                Save property
              </button>
              <button
                type="button"
                onClick={() => { setAdding(false); setAddError(null); }}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
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
    setPathFinderOpen, setPathFinderFromId, setGraphFocus, setCurrentView,
  } = useAetherStore();
  const [connectOpen, setConnectOpen] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'done'>('idle');

  // Prefer live graph node so edits stay in sync with the store
  const liveNode = selectedNode
    ? (data.nodes.find((n) => n.id === selectedNode.id) ?? selectedNode)
    : null;

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
      if (e.key === 'Escape' && !connectOpen) {
        // Don't close the panel while a nested input is focused — let the
        // field-level Escape handlers cancel the edit first.
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNode, connectOpen, setSelectedNode]);

  // If the node was deleted elsewhere, close the panel
  useEffect(() => {
    if (selectedNode && !data.nodes.some((n) => n.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [data.nodes, selectedNode, setSelectedNode]);

  if (!liveNode) return null;

  const { label, type, createdAt } = liveNode;
  const meta = TYPE_META[type] ?? TYPE_META.Document;

  const handleRunAnalysis = () => {
    setSearchQuery(liveNode.label);
    setAIAnalystOpen(true);
  };

  const handleShare = async () => {
    addSharedNodeToCurrentWorkspace(liveNode.id);
    await copyShareUrl({
      type: 'node',
      id: liveNode.id,
      workspaceId: currentWorkspaceId,
      label: liveNode.label,
    });
    setShareState('done');
    setTimeout(() => setShareState('idle'), 2500);
  };

  const handleFindPathFrom = () => {
    setPathFinderFromId(liveNode.id);
    setPathFinderOpen(true);
    setCurrentView('dashboard');
  };

  const handleFocusNeighborhood = () => {
    const nb = findNeighborhood(data, liveNode.id, 1);
    if (!nb) return;
    setGraphFocus({
      mode: 'neighborhood',
      nodeIds: nb.nodeIds,
      edgeIds: nb.edgeIds,
      title: `Focus · ${liveNode.label}`,
      detail: `${nb.nodeIds.length} nodes within 1 hop`,
      hopDepth: 1,
      sourceId: liveNode.id,
    });
    setCurrentView('dashboard');
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
            <LabelEditor nodeId={liveNode.id} label={label} />
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

          {/* Editable properties */}
          <PropertiesEditor node={liveNode} />

          {/* Tags */}
          <TagEditor nodeId={liveNode.id} />

          {/* Connections — edit type, reverse, delete */}
          <ConnectionsEditor
            nodeId={liveNode.id}
            onConnect={() => setConnectOpen(true)}
          />

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
              onClick={handleFindPathFrom}
              className="flex-1 py-2 rounded-2xl border border-slate-700/80 hover:border-cyan-500/40 hover:bg-cyan-500/5 hover:text-cyan-300 text-slate-500 transition-all flex items-center justify-center gap-2 text-xs group press-scale"
              title="Open path finder starting from this entity"
            >
              <Route size={13} className="group-hover:text-cyan-400 transition-colors" />
              Find path
            </button>
            <button
              onClick={handleFocusNeighborhood}
              className="flex-1 py-2 rounded-2xl border border-slate-700/80 hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-violet-300 text-slate-500 transition-all flex items-center justify-center gap-2 text-xs group press-scale"
              title="Highlight 1-hop neighborhood on the graph"
            >
              <Focus size={13} className="group-hover:text-violet-400 transition-colors" />
              Focus nearby
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setPDFLinkedEntityId(liveNode.id);
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
              setReportFocusNodeId(liveNode.id);
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
