// components/entities/NewEntityModal.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  X, Plus, Minus, Check, Search, ChevronDown,
  User, FolderOpen, MapPin, BarChart2, Lightbulb,
  CalendarDays, FileText, ArrowRight, ArrowLeft,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { OntologyNode, EntityType, Relationship } from '@/types';

// ─── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_META: Record<EntityType, {
  icon: React.ElementType;
  color:  string; // text-*
  bg:     string; // bg-*/10
  border: string; // border-*
  dot:    string; // bg-* for dots
  placeholder: string;
}> = {
  Person:   { icon: User,         color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500',    dot: 'bg-cyan-400',    placeholder: 'Sarah Chen' },
  Project:  { icon: FolderOpen,   color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500',  dot: 'bg-purple-400',  placeholder: 'Q4 Product Launch' },
  Location: { icon: MapPin,       color: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500',   dot: 'bg-green-400',   placeholder: 'Toronto Office' },
  Metric:   { icon: BarChart2,    color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500',   dot: 'bg-amber-400',   placeholder: 'Monthly Revenue' },
  Insight:  { icon: Lightbulb,    color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500',    dot: 'bg-rose-400',    placeholder: 'Market Opportunity' },
  Event:    { icon: CalendarDays, color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500',  dot: 'bg-orange-400',  placeholder: 'Q3 Planning Summit' },
  Document: { icon: FileText,     color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500',   dot: 'bg-slate-400',   placeholder: 'Technical Spec v2' },
};

// ─── Field schema ──────────────────────────────────────────────────────────────

type FieldKind = 'text' | 'number' | 'select' | 'textarea';

interface FieldDef {
  key:         string;
  label:       string;
  kind:        FieldKind;
  placeholder?: string;
  options?:    string[];
  min?:        number;
  max?:        number;
  step?:       number;
  span?:       'half' | 'full';
}

const SCHEMA: Record<EntityType, FieldDef[]> = {
  Person: [
    { key: 'role',     label: 'Role',     kind: 'text',   placeholder: 'Founder',           span: 'half' },
    { key: 'email',    label: 'Email',    kind: 'text',   placeholder: 'sarah@example.com', span: 'half' },
    { key: 'location', label: 'Location', kind: 'text',   placeholder: 'Toronto, ON',       span: 'half' },
    { key: 'joined',   label: 'Joined',   kind: 'text',   placeholder: '2024',              span: 'half' },
  ],
  Project: [
    { key: 'status',   label: 'Status',      kind: 'select', options: ['Active', 'Planning', 'On Hold', 'Complete'],    span: 'half' },
    { key: 'priority', label: 'Priority',    kind: 'select', options: ['Critical', 'High', 'Medium', 'Low'],            span: 'half' },
    { key: 'budget',   label: 'Budget ($)',  kind: 'number', min: 0, step: 1000,                                        span: 'half' },
    { key: 'progress', label: 'Progress (%)', kind: 'number', min: 0, max: 100, step: 5,                               span: 'half' },
  ],
  Location: [
    { key: 'city',     label: 'City',      kind: 'text',   placeholder: 'Stratford',         span: 'half' },
    { key: 'province', label: 'Province',  kind: 'text',   placeholder: 'Ontario',           span: 'half' },
    { key: 'locType',  label: 'Site Type', kind: 'select', options: ['Office', 'HQ', 'Remote', 'Partner', 'Field', 'Data Centre'], span: 'half' },
    { key: 'lat',      label: 'Latitude',  kind: 'number', min: -90,  max: 90,  step: 0.001, span: 'half' },
    { key: 'lng',      label: 'Longitude', kind: 'number', min: -180, max: 180, step: 0.001, span: 'half' },
  ],
  Metric: [
    { key: 'value',    label: 'Value',  kind: 'number', min: 0,                                                                    span: 'half' },
    { key: 'unit',     label: 'Unit',   kind: 'select', options: ['CAD', 'USD', 'EUR', 'GBP', '%', 'count', 'kg', 'km', 'hrs'],   span: 'half' },
    { key: 'trend',    label: 'Trend',  kind: 'select', options: ['up', 'down', 'neutral'],                                        span: 'half' },
  ],
  Insight: [
    { key: 'confidence', label: 'Confidence', kind: 'select', options: ['high', 'medium', 'low'],                                                          span: 'half' },
    { key: 'intent',     label: 'Intent',     kind: 'select', options: ['financial', 'risk', 'team', 'projects', 'location', 'opportunity', 'summary'],    span: 'half' },
    { key: 'summary',    label: 'Summary',    kind: 'textarea', placeholder: 'Key findings and observations…', span: 'full' },
  ],
  Event: [
    { key: 'date',        label: 'Date',        kind: 'text',     placeholder: '2026-06-15',  span: 'half' },
    { key: 'status',      label: 'Status',      kind: 'select',   options: ['Upcoming', 'In Progress', 'Complete', 'Cancelled'], span: 'half' },
    { key: 'description', label: 'Description', kind: 'textarea', placeholder: 'Event details…', span: 'full' },
  ],
  Document: [
    { key: 'format', label: 'Format', kind: 'select', options: ['PDF', 'Markdown', 'Spreadsheet', 'Slides', 'Word', 'Other'], span: 'half' },
    { key: 'author', label: 'Author', kind: 'text',   placeholder: 'Name or team',                                           span: 'half' },
    { key: 'url',    label: 'URL',    kind: 'text',   placeholder: 'https://…',                                              span: 'full' },
  ],
};

function getDefaultValues(type: EntityType): Record<string, any> {
  const out: Record<string, any> = {};
  SCHEMA[type].forEach((f) => {
    if (f.kind === 'select')   out[f.key] = f.options![0];
    else if (f.kind === 'number') out[f.key] = 0;
    else                       out[f.key] = '';
  });
  // Override with sensible starting values
  if (type === 'Location') { out.lat = 43.37; out.lng = -80.98; }
  return out;
}

// ─── Relationship types ────────────────────────────────────────────────────────

const REL_TYPES = [
  'worksOn', 'locatedAt', 'hasMetric', 'owns', 'impacts',
  'participatedIn', 'reportsTo', 'dependsOn', 'relatedTo', 'hasAnalysis',
];

interface PendingConn {
  targetId:  string;
  relType:   string;
  direction: 'from' | 'to'; // 'from' = new→target, 'to' = target→new
}

// ─── FieldInput ────────────────────────────────────────────────────────────────

function FieldInput({
  field, value, onChange, hasError,
}: {
  field: FieldDef; value: any; onChange: (v: any) => void; hasError?: boolean;
}) {
  const base = `w-full bg-slate-900/80 border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
    hasError
      ? 'border-rose-500/70 focus:border-rose-400'
      : 'border-slate-700 focus:border-cyan-500'
  }`;

  if (field.kind === 'select') {
    return (
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${base} appearance-none cursor-pointer pr-8`}
        >
          {field.options!.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>
    );
  }

  if (field.kind === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={3}
        className={`${base} resize-none`}
      />
    );
  }

  return (
    <input
      type={field.kind === 'number' ? 'number' : 'text'}
      value={value}
      onChange={(e) =>
        onChange(field.kind === 'number' ? Number(e.target.value) : e.target.value)
      }
      placeholder={field.placeholder}
      min={field.min}
      max={field.max}
      step={field.step}
      className={base}
    />
  );
}

// ─── ConnectionRow ─────────────────────────────────────────────────────────────

function ConnectionRow({
  node, conn, onRelTypeChange, onDirectionToggle, onRemove,
}: {
  node:               OntologyNode;
  conn:               PendingConn;
  onRelTypeChange:    (t: string) => void;
  onDirectionToggle:  () => void;
  onRemove:           () => void;
}) {
  const meta = TYPE_META[node.type];
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
      <span className="text-xs text-slate-300 truncate flex-1 min-w-0">{node.label}</span>

      {/* Direction toggle */}
      <button
        onClick={onDirectionToggle}
        title={conn.direction === 'from' ? 'New → Target (click to reverse)' : 'Target → New (click to reverse)'}
        className="shrink-0 p-1 rounded-lg hover:bg-slate-700 transition-colors text-slate-500 hover:text-cyan-400"
      >
        {conn.direction === 'from'
          ? <ArrowRight size={11} />
          : <ArrowLeft  size={11} />}
      </button>

      {/* Rel type */}
      <div className="relative shrink-0">
        <select
          value={conn.relType}
          onChange={(e) => onRelTypeChange(e.target.value)}
          className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 pr-5 outline-none appearance-none focus:border-cyan-500 cursor-pointer"
        >
          {REL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>

      <button
        onClick={onRemove}
        className="p-1 text-slate-600 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-400/10 shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ─── PreviewCard ───────────────────────────────────────────────────────────────

function PreviewCard({
  type, label, schemaProps, customProps, connections, allNodes,
}: {
  type:        EntityType;
  label:       string;
  schemaProps: Record<string, any>;
  customProps: Array<{ key: string; value: string }>;
  connections: PendingConn[];
  allNodes:    OntologyNode[];
}) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;

  // Merge all properties for display (skip lat/lng — show as coordinates)
  const displayProps: Array<[string, string]> = [];
  const schema = SCHEMA[type];

  schema.forEach((f) => {
    if (f.key === 'lat' || f.key === 'lng') return; // handled below
    const v = schemaProps[f.key];
    if (v !== '' && v !== 0 && v != null) displayProps.push([f.label, String(v)]);
  });

  if (type === 'Location' && (schemaProps.lat || schemaProps.lng)) {
    displayProps.push(['Coords', `${Number(schemaProps.lat).toFixed(3)}, ${Number(schemaProps.lng).toFixed(3)}`]);
  }

  customProps.forEach(({ key, value }) => {
    if (key.trim() && value.trim()) displayProps.push([key, value]);
  });

  const shownProps = displayProps.slice(0, 5);

  return (
    <div className={`rounded-2xl border p-4 ${meta.border}/30 ${meta.bg}`}>
      {/* Type row */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.bg} border ${meta.border}/40`}>
          <Icon size={14} className={meta.color} />
        </div>
        <span className={`text-xs font-mono uppercase tracking-widest ${meta.color}`}>{type}</span>
      </div>

      {/* Label */}
      <p className={`font-semibold text-base mb-3 leading-snug ${label ? 'text-white' : 'text-slate-600 italic'}`}>
        {label || 'Entity name…'}
      </p>

      {/* Properties */}
      {shownProps.length > 0 && (
        <div className="space-y-1 mb-3">
          {shownProps.map(([k, v]) => (
            <div key={k} className="flex gap-2 text-xs">
              <span className="text-slate-500 shrink-0 w-16 truncate capitalize">{k}</span>
              <span className="text-slate-300 truncate">{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Connections */}
      {connections.length > 0 && (
        <div className="pt-3 border-t border-white/10 space-y-1.5">
          {connections.map((c, i) => {
            const target = allNodes.find((n) => n.id === c.targetId);
            if (!target) return null;
            const tMeta = TYPE_META[target.type];
            return (
              <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                {c.direction === 'from' ? (
                  <>
                    <span className="text-slate-500 shrink-0">this</span>
                    <ArrowRight size={10} className="text-cyan-600 shrink-0" />
                    <span className="font-mono text-cyan-600/80 shrink-0">{c.relType}</span>
                    <ArrowRight size={10} className="text-cyan-600 shrink-0" />
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tMeta.dot}`} />
                    <span className="truncate">{target.label}</span>
                  </>
                ) : (
                  <>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tMeta.dot}`} />
                    <span className="truncate">{target.label}</span>
                    <ArrowRight size={10} className="text-cyan-600 shrink-0" />
                    <span className="font-mono text-cyan-600/80 shrink-0">{c.relType}</span>
                    <ArrowRight size={10} className="text-cyan-600 shrink-0" />
                    <span className="text-slate-500 shrink-0">this</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────────

export default function NewEntityModal({
  isOpen, onClose,
}: {
  isOpen: boolean; onClose: () => void;
}) {
  const { data, setData } = useAetherStore();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [type,        setType]       = useState<EntityType>('Project');
  const [label,       setLabel]      = useState('');
  const [schemaProps, setSchemaProps] = useState<Record<string, any>>(getDefaultValues('Project'));
  const [customProps, setCustomProps] = useState<Array<{ key: string; value: string }>>([]);
  const [connections, setConnections] = useState<PendingConn[]>([]);

  // ── Connection picker ────────────────────────────────────────────────────────
  const [connSearch, setConnSearch] = useState('');

  // ── Validation / status ──────────────────────────────────────────────────────
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [status,  setStatus]  = useState<'idle' | 'success'>('idle');

  // Reset when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setType('Project');
    setLabel('');
    setSchemaProps(getDefaultValues('Project'));
    setCustomProps([]);
    setConnections([]);
    setConnSearch('');
    setErrors({});
    setStatus('idle');
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleTypeChange = (t: EntityType) => {
    setType(t);
    setLabel('');
    setSchemaProps(getDefaultValues(t));
    setCustomProps([]);
    setErrors({});
  };

  const updateSchemaProp = (key: string, value: any) => {
    setSchemaProps((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  };

  // Custom props
  const addCustomProp    = () => setCustomProps((p) => [...p, { key: '', value: '' }]);
  const removeCustomProp = (i: number) => setCustomProps((p) => p.filter((_, idx) => idx !== i));
  const setCustomKey     = (i: number, k: string) => setCustomProps((p) => p.map((r, idx) => idx === i ? { ...r, key: k }   : r));
  const setCustomValue   = (i: number, v: string) => setCustomProps((p) => p.map((r, idx) => idx === i ? { ...r, value: v } : r));

  // Connections
  const addConnection    = (nodeId: string) => { setConnections((p) => [...p, { targetId: nodeId, relType: REL_TYPES[0], direction: 'from' }]); setConnSearch(''); };
  const removeConnection = (i: number) => setConnections((p) => p.filter((_, idx) => idx !== i));
  const updateRelType    = (i: number, relType: string) => setConnections((p) => p.map((c, idx) => idx === i ? { ...c, relType } : c));
  const toggleDirection  = (i: number) => setConnections((p) => p.map((c, idx) => idx === i ? { ...c, direction: c.direction === 'from' ? 'to' : 'from' } : c));

  // Candidate nodes for connection picker
  const candidates = useMemo(() => {
    const q = connSearch.toLowerCase();
    return data.nodes.filter(
      (n) =>
        !connections.some((c) => c.targetId === n.id) &&
        (n.label.toLowerCase().includes(q) || n.type.toLowerCase().includes(q)),
    );
  }, [data.nodes, connections, connSearch]);

  // ── Validation ───────────────────────────────────────────────────────────────

  const labelDuplicate = Boolean(
    label.trim() &&
    data.nodes.some((n) => n.label.toLowerCase() === label.trim().toLowerCase())
  );

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!label.trim()) errs.label = 'Name is required';

    if (type === 'Location') {
      const lat = Number(schemaProps.lat);
      const lng = Number(schemaProps.lng);
      if (isNaN(lat) || lat < -90  || lat > 90)  errs.lat = 'Must be −90 to 90';
      if (isNaN(lng) || lng < -180 || lng > 180) errs.lng = 'Must be −180 to 180';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Build final properties ────────────────────────────────────────────────────

  const buildProperties = (): Record<string, any> => {
    const props: Record<string, any> = { ...schemaProps };

    // Location: flatten lat/lng into a coordinates object (matching existing data shape)
    if (type === 'Location') {
      props.coordinates = { lat: Number(props.lat), lng: Number(props.lng) };
      props.type = props.locType;
      delete props.lat;
      delete props.lng;
      delete props.locType;
    }

    // Merge valid custom props
    customProps.forEach(({ key, value }) => {
      if (key.trim()) props[key.trim()] = value;
    });

    return props;
  };

  // ── Create ───────────────────────────────────────────────────────────────────

  const handleCreate = () => {
    if (!validate()) return;

    const ts  = Date.now();
    const newNode: OntologyNode = {
      id:         `node-${ts}`,
      type,
      label:      label.trim(),
      properties: buildProperties(),
      createdAt:  new Date().toISOString().split('T')[0],
    };

    const newRels: Relationship[] = connections.map((c, i) => ({
      id:   `rel-${ts + i}`,
      from: c.direction === 'from' ? newNode.id : c.targetId,
      to:   c.direction === 'from' ? c.targetId : newNode.id,
      type: c.relType,
    }));

    setData({
      nodes:         [...data.nodes, newNode],
      relationships: [...data.relationships, ...newRels],
    });

    setStatus('success');
    setTimeout(() => { setStatus('idle'); onClose(); }, 1300);
  };

  if (!isOpen) return null;

  const meta     = TYPE_META[type];
  const canCreate = label.trim().length > 0 && status === 'idle';

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget && status === 'idle') onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Create new entity"
    >
      {/* Panel: full-width bottom-sheet on mobile, centered on sm+ */}
      <div className="glass w-full sm:max-w-4xl rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] shadow-2xl modal-panel">

        {/* ═══ LEFT COLUMN: FORM ═══ */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">

          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5 border-b border-slate-800 shrink-0">
            {/* Pull handle — mobile only */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-700 rounded-full sm:hidden" aria-hidden="true" />
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold">New Entity</h2>
              <p className="text-xs text-slate-500 mt-0.5">Add to the intelligence graph</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white touch-target"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable form body */}
          <div className="flex-1 overflow-y-auto scroll-touch px-5 sm:px-8 py-5 sm:py-6 space-y-6 sm:space-y-7">

            {/* ── Type selector ── */}
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">Entity Type</p>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {(Object.keys(TYPE_META) as EntityType[]).map((t) => {
                  const m   = TYPE_META[t];
                  const Ico = m.icon;
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      onClick={() => handleTypeChange(t)}
                      className={`flex flex-col items-center gap-1 sm:gap-1.5 py-2 sm:py-3 px-1 sm:px-2 rounded-xl sm:rounded-2xl border transition-all press-scale touch-target ${
                        active
                          ? `${m.border} ${m.bg}`
                          : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/40'
                      }`}
                    >
                      <Ico size={15} className={active ? m.color : 'text-slate-500'} />
                      <span className={`text-[10px] sm:text-xs font-medium ${active ? m.color : 'text-slate-500'}`}>{t}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Label ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-widest text-slate-500">Name / Label</p>
                {labelDuplicate && !errors.label && (
                  <span className="text-xs text-amber-400 flex items-center gap-1">
                    ⚠ Name already exists
                  </span>
                )}
              </div>
              <input
                type="text"
                value={label}
                autoFocus
                onChange={(e) => {
                  setLabel(e.target.value);
                  setErrors((p) => { const n = { ...p }; delete n.label; return n; });
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && canCreate) handleCreate(); }}
                placeholder={meta.placeholder}
                className={`w-full bg-slate-900/80 border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${
                  errors.label
                    ? 'border-rose-500/70 focus:border-rose-400'
                    : 'border-slate-700 focus:border-cyan-500'
                }`}
              />
              {errors.label && <p className="text-xs text-rose-400 mt-1.5">{errors.label}</p>}
            </div>

            {/* ── Schema properties ── */}
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">Properties</p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {SCHEMA[type].map((field) => (
                  <div key={field.key} className={field.span === 'full' ? 'col-span-2' : ''}>
                    <label className="text-xs text-slate-500 block mb-1.5">{field.label}</label>
                    <FieldInput
                      field={field}
                      value={schemaProps[field.key] ?? ''}
                      onChange={(v) => updateSchemaProp(field.key, v)}
                      hasError={Boolean(errors[field.key])}
                    />
                    {errors[field.key] && (
                      <p className="text-xs text-rose-400 mt-1">{errors[field.key]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Custom properties ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-widest text-slate-500">Custom Properties</p>
                <button
                  onClick={addCustomProp}
                  className="flex items-center gap-1.5 text-xs text-cyan-500 hover:text-cyan-300 transition-colors px-2 py-1 rounded-lg hover:bg-cyan-500/10"
                >
                  <Plus size={12} /> Add field
                </button>
              </div>

              {customProps.length === 0 ? (
                <p className="text-xs text-slate-600 italic py-1">
                  No custom fields. Click &ldquo;Add field&rdquo; to extend this entity with any key/value pair.
                </p>
              ) : (
                <div className="space-y-2">
                  {customProps.map((prop, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={prop.key}
                        onChange={(e) => setCustomKey(i, e.target.value)}
                        placeholder="key"
                        className="w-28 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 font-mono placeholder:text-slate-600"
                      />
                      <input
                        type="text"
                        value={prop.value}
                        onChange={(e) => setCustomValue(i, e.target.value)}
                        placeholder="value"
                        className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 placeholder:text-slate-600"
                      />
                      <button
                        onClick={() => removeCustomProp(i)}
                        className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-400/10 shrink-0"
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer / Create button */}
          <div className="px-5 sm:px-8 py-4 sm:py-5 border-t border-slate-800 shrink-0">
            {status === 'success' ? (
              <div className="flex items-center justify-center gap-2.5 py-3.5 text-emerald-400 animate-pulse">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check size={14} className="text-emerald-400" />
                </div>
                <span className="font-semibold">
                  {type} created{connections.length > 0 ? ` with ${connections.length} connection${connections.length !== 1 ? 's' : ''}` : ''}!
                </span>
              </div>
            ) : (
              <button
                onClick={handleCreate}
                disabled={!canCreate}
                aria-label={`Create ${type} entity`}
                className={`w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 ${
                  canCreate
                    ? 'btn-glow bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Plus size={16} />
                Create {type}
                {connections.length > 0 && (
                  <span className="ml-1 opacity-80">
                    + {connections.length} connection{connections.length !== 1 ? 's' : ''}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: PREVIEW + CONNECTIONS ═══ */}
        <div className="hidden md:flex w-72 border-l border-slate-800 flex-col bg-slate-900/20 shrink-0">

          {/* Preview header */}
          <div className="px-5 pt-6 pb-4 border-b border-slate-800 shrink-0">
            <p className="text-xs uppercase tracking-widest text-slate-500">Live Preview</p>
          </div>

          {/* Scrollable right body */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

            {/* Preview card */}
            <PreviewCard
              type={type}
              label={label}
              schemaProps={schemaProps}
              customProps={customProps}
              connections={connections}
              allNodes={data.nodes}
            />

            {/* Connection picker */}
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                Connect to
                {connections.length > 0 && (
                  <span className="ml-2 text-cyan-500 normal-case font-normal not-italic">
                    {connections.length} selected
                  </span>
                )}
              </p>

              {/* Selected connections */}
              {connections.length > 0 && (
                <div className="space-y-2 mb-3">
                  {connections.map((c, i) => {
                    const node = data.nodes.find((n) => n.id === c.targetId);
                    if (!node) return null;
                    return (
                      <ConnectionRow
                        key={i}
                        node={node}
                        conn={c}
                        onRelTypeChange={(t) => updateRelType(i, t)}
                        onDirectionToggle={() => toggleDirection(i)}
                        onRemove={() => removeConnection(i)}
                      />
                    );
                  })}
                  <div className="border-t border-slate-800 pt-1" />
                </div>
              )}

              {/* Direction legend */}
              {connections.length > 0 && (
                <p className="text-xs text-slate-600 mb-3 flex items-center gap-1.5">
                  <ArrowRight size={10} /> = new → target &nbsp;·&nbsp;
                  <ArrowLeft  size={10} /> = target → new
                </p>
              )}

              {/* Entity search */}
              {data.nodes.length > 0 ? (
                <>
                  <div className="relative mb-2">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={connSearch}
                      onChange={(e) => setConnSearch(e.target.value)}
                      placeholder="Search entities…"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs outline-none focus:border-cyan-500 placeholder:text-slate-600"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800/60 max-h-48 overflow-y-auto">
                    {candidates.length === 0 ? (
                      <p className="text-xs text-slate-600 text-center py-5 italic">
                        {connSearch ? 'No entities match your search' : 'All entities already connected'}
                      </p>
                    ) : (
                      candidates.slice(0, 10).map((node) => {
                        const m = TYPE_META[node.type];
                        return (
                          <button
                            key={node.id}
                            onClick={() => addConnection(node.id)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-800/70 transition-colors group"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.dot}`} />
                            <span className="text-xs text-slate-300 group-hover:text-white truncate flex-1 min-w-0">
                              {node.label}
                            </span>
                            <span className={`text-xs font-mono shrink-0 ${m.color} opacity-60`}>
                              {node.type}
                            </span>
                            <Plus size={10} className="text-slate-600 group-hover:text-cyan-400 shrink-0 transition-colors" />
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-600 italic">
                  No existing entities to connect to. They will appear here as you add them.
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
