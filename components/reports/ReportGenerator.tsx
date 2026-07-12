// components/reports/ReportGenerator.tsx
'use client';

import { useState, useCallback } from 'react';
import {
  X, FileText, Download, Eye, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { ReportTemplate, ReportOptions, generatePDF, downloadPDF } from '@/lib/pdf-report';

// ─── Template config ───────────────────────────────────────────────────────────

const TEMPLATES: {
  id: ReportTemplate;
  title: string;
  desc: string;
  icon: string;
  active: string;
}[] = [
  {
    id: 'executive-summary',
    title: 'Executive Summary',
    desc: 'High-level overview with KPIs, risks, and AI recommendations',
    icon: '📊',
    active: 'border-blue-500/60 bg-blue-500/8 text-blue-300',
  },
  {
    id: 'full-ontology',
    title: 'Full Ontology',
    desc: 'Complete entity and relationship export across all types',
    icon: '🔗',
    active: 'border-cyan-500/60 bg-cyan-500/8 text-cyan-300',
  },
  {
    id: 'project-deep-dive',
    title: 'Project Deep Dive',
    desc: 'Detailed per-project analysis with team, metrics, and connections',
    icon: '📁',
    active: 'border-purple-500/60 bg-purple-500/8 text-purple-300',
  },
  {
    id: 'risk-assessment',
    title: 'Risk Assessment',
    desc: 'Risk landscape, flagged entities, exposure map, and mitigations',
    icon: '⚠️',
    active: 'border-rose-500/60 bg-rose-500/8 text-rose-300',
  },
  {
    id: 'geospatial-overview',
    title: 'Geospatial Overview',
    desc: 'Location-centric view with connected projects, people, and events',
    icon: '📍',
    active: 'border-green-500/60 bg-green-500/8 text-green-300',
  },
];

const DEFAULT_TITLES: Record<ReportTemplate, string> = {
  'executive-summary':   'Aether Executive Summary',
  'full-ontology':       'Aether Intelligence Report',
  'project-deep-dive':   'Aether Project Deep Dive',
  'risk-assessment':     'Aether Risk Assessment',
  'geospatial-overview': 'Aether Geospatial Overview',
};

// ─── HTML Preview ──────────────────────────────────────────────────────────────

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[8px] font-bold uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200 pb-1 mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function EntityRow({ label, type, status }: { label: string; type: string; status?: string }) {
  const colors: Record<string, string> = {
    Person:   'bg-cyan-100 text-cyan-700',
    Project:  'bg-purple-100 text-purple-700',
    Location: 'bg-green-100 text-green-700',
    Metric:   'bg-amber-100 text-amber-700',
    Insight:  'bg-rose-100 text-rose-700',
    Event:    'bg-orange-100 text-orange-700',
    Document: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="flex items-center gap-2 py-1 border-b border-slate-100">
      <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded ${colors[type] ?? colors.Document}`}>
        {type.toUpperCase()}
      </span>
      <span className="text-[10px] font-semibold text-slate-800 flex-1 truncate">{label}</span>
      {status && <span className="text-[9px] text-slate-400 shrink-0">{status}</span>}
    </div>
  );
}

function ReportPreview({
  template,
  title,
}: {
  template: ReportTemplate;
  title: string;
}) {
  const { data, savedInsights } = useAetherStore();
  const date      = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const projects  = data.nodes.filter(n => n.type === 'Project');
  const locations = data.nodes.filter(n => n.type === 'Location');
  const riskNodes = data.nodes.filter(n => n.properties.status === 'At Risk');
  const latest    = savedInsights[0];

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-xl border border-slate-200 text-slate-900">
      {/* PDF Header */}
      <div className="bg-[#0A0A0C] px-5 py-4">
        <div className="w-8 h-0.5 bg-cyan-400 mb-3 rounded" />
        <p className="text-white font-bold text-[13px] mb-1 leading-tight">{title}</p>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[9px]">Generated {date} · Aether Intelligence OS</span>
          <span className="text-cyan-400 font-mono text-[7px] bg-slate-800 px-2 py-0.5 rounded-full">
            {template.replace(/-/g, ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-5 divide-x divide-slate-100 border-b border-slate-100">
        {[
          { n: data.nodes.length,         l: 'Entities'      },
          { n: data.relationships.length, l: 'Rels'          },
          { n: projects.length,           l: 'Projects'      },
          { n: data.nodes.filter(n => n.type === 'Person').length,  l: 'People' },
          { n: data.nodes.filter(n => n.type === 'Metric').length,  l: 'Metrics'},
        ].map(({ n, l }) => (
          <div key={l} className="py-2.5 text-center">
            <div className="text-cyan-600 font-bold text-[13px] font-mono leading-none">{n}</div>
            <div className="text-slate-400 text-[7.5px] uppercase tracking-wide mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {/* Body preview */}
      <div className="px-5 py-4 space-y-3.5">
        {template === 'executive-summary' && (
          <>
            <PreviewSection title="Executive Summary">
              <div className="bg-cyan-50 border-l-2 border-cyan-400 rounded px-2.5 py-2 text-[9px] text-slate-700 leading-relaxed">
                {latest?.result.summary?.slice(0, 180) ??
                  `Overview of ${data.nodes.length} entities and ${data.relationships.length} relationships.${riskNodes.length > 0 ? ` ${riskNodes.length} item${riskNodes.length !== 1 ? 's' : ''} flagged as at-risk.` : ' No critical risks identified.'}`}
                {(latest?.result.summary?.length ?? 0) > 180 && '…'}
              </div>
            </PreviewSection>
            {projects.length > 0 && (
              <PreviewSection title={`Active Projects (${projects.length})`}>
                {projects.slice(0, 3).map(p => (
                  <EntityRow key={p.id} label={p.label} type="Project" status={String(p.properties.status ?? '')} />
                ))}
              </PreviewSection>
            )}
            {riskNodes.length > 0 && (
              <PreviewSection title="Risk Indicators">
                {riskNodes.slice(0, 2).map(n => (
                  <EntityRow key={n.id} label={n.label} type={n.type} status="At Risk" />
                ))}
              </PreviewSection>
            )}
          </>
        )}

        {template === 'full-ontology' && (
          <>
            <PreviewSection title={`All Entities (${data.nodes.length})`}>
              {data.nodes.slice(0, 5).map(n => (
                <EntityRow key={n.id} label={n.label} type={n.type} />
              ))}
              {data.nodes.length > 5 && (
                <p className="text-[9px] text-slate-400 mt-1">+ {data.nodes.length - 5} more…</p>
              )}
            </PreviewSection>
            <PreviewSection title={`Relationships (${data.relationships.length})`}>
              {data.relationships.slice(0, 3).map(r => {
                const from = data.nodes.find(n => n.id === r.from);
                const to   = data.nodes.find(n => n.id === r.to);
                return from && to ? (
                  <div key={r.id} className="flex items-center gap-1.5 py-0.5 text-[9px]">
                    <span className="font-semibold truncate max-w-[70px]">{from.label}</span>
                    <span className="text-cyan-600 font-mono bg-cyan-50 px-1 rounded text-[7.5px] shrink-0">{r.type}</span>
                    <span className="font-semibold truncate max-w-[70px]">{to.label}</span>
                  </div>
                ) : null;
              })}
            </PreviewSection>
          </>
        )}

        {template === 'project-deep-dive' && (
          <>
            {projects.length === 0 ? (
              <p className="text-[9px] text-slate-400 italic">No project entities in ontology.</p>
            ) : (
              projects.slice(0, 2).map(p => (
                <PreviewSection key={p.id} title={p.label}>
                  <div className="bg-purple-50 rounded px-2.5 py-2 text-[9px] space-y-1">
                    {Object.entries(p.properties).slice(0, 3).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-purple-500 capitalize">{k.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-purple-900">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </PreviewSection>
              ))
            )}
          </>
        )}

        {template === 'risk-assessment' && (
          <>
            <PreviewSection title="Risk Overview">
              <div className="bg-rose-50 border-l-2 border-rose-400 rounded px-2.5 py-2 text-[9px] text-slate-700">
                {riskNodes.length > 0
                  ? `${riskNodes.length} at-risk ${riskNodes.length === 1 ? 'entity' : 'entities'} identified. Immediate review recommended.`
                  : 'No entities currently flagged as at-risk.'}
              </div>
            </PreviewSection>
            {riskNodes.length > 0 && (
              <PreviewSection title="At-Risk Entities">
                {riskNodes.slice(0, 3).map(n => (
                  <EntityRow key={n.id} label={n.label} type={n.type} status="At Risk" />
                ))}
              </PreviewSection>
            )}
          </>
        )}

        {template === 'geospatial-overview' && (
          <>
            <PreviewSection title={`Locations (${locations.length})`}>
              {locations.length === 0 ? (
                <p className="text-[9px] text-slate-400 italic">No location entities found.</p>
              ) : (
                locations.slice(0, 4).map(n => (
                  <EntityRow key={n.id} label={n.label} type="Location" status={String(n.properties.country ?? n.properties.region ?? '')} />
                ))
              )}
            </PreviewSection>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-50 border-t border-slate-100 px-5 py-2 flex justify-between items-center">
        <span className="text-[8px] font-mono text-slate-400 truncate max-w-[160px]">
          AETHER · {title.toUpperCase()}
        </span>
        <span className="text-[8px] text-slate-400">1 / 1</span>
        <span className="text-[8px] text-slate-300">CONFIDENTIAL</span>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ReportGenerator() {
  const {
    isReportGeneratorOpen, setReportGeneratorOpen,
    reportFocusNodeId,
    data, savedInsights,
  } = useAetherStore();

  const [template,      setTemplate]      = useState<ReportTemplate>('executive-summary');
  const [customTitle,   setCustomTitle]   = useState('');
  const [includeGraph,  setIncludeGraph]  = useState(false);
  const [status,        setStatus]        = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [errorMsg,      setErrorMsg]      = useState('');

  const resolvedTitle = customTitle.trim() || DEFAULT_TITLES[template];

  const handleClose = useCallback(() => {
    setReportGeneratorOpen(false);
    // Reset status after close animation
    setTimeout(() => { setStatus('idle'); setErrorMsg(''); }, 300);
  }, [setReportGeneratorOpen]);

  const handleGenerate = useCallback(async () => {
    if (status !== 'idle') return;
    setStatus('generating');
    setErrorMsg('');

    try {
      let graphScreenshot: string | undefined;

      if (includeGraph) {
        const h2c = (await import('html2canvas')).default;
        const el  = document.querySelector('.react-flow') as HTMLElement | null;
        if (el) {
          const canvas = await h2c(el, { backgroundColor: '#0A0A0C', scale: 1.5, useCORS: true });
          graphScreenshot = canvas.toDataURL('image/png');
        }
      }

      const opts: ReportOptions = {
        template,
        title: resolvedTitle,
        includeGraph,
        includeTimeline: false,
        selectedEntityIds: [],
        data,
        savedInsights,
        graphScreenshot,
        focusNodeId: reportFocusNodeId,
      };

      const blob     = await generatePDF(opts);
      const dateStr  = new Date().toISOString().split('T')[0];
      downloadPDF(blob, `aether-${template}-${dateStr}.pdf`);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3500);
    } catch (err) {
      console.error('[Aether PDF]', err);
      setErrorMsg(err instanceof Error ? err.message : 'PDF generation failed');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  }, [status, template, resolvedTitle, includeGraph, data, savedInsights, reportFocusNodeId]);

  if (!isReportGeneratorOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Report Generator"
    >
      <div className="glass w-full max-w-4xl rounded-3xl flex flex-col shadow-2xl border border-slate-700/50 overflow-hidden max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <FileText size={17} className="text-black" />
            </div>
            <div>
              <h2 className="font-semibold text-base leading-none mb-0.5">Export Report</h2>
              <p className="text-xs text-slate-500">Professional branded PDF · stays on your device</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Left: Config */}
          <div className="w-[52%] border-r border-slate-800 overflow-y-auto p-6 space-y-6 shrink-0">

            {/* Template selection */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-3">
                Template
              </p>
              <div className="space-y-1.5">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-2xl border transition-all text-left group ${
                      template === t.id
                        ? t.active
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 text-slate-400'
                    }`}
                  >
                    <span className="text-base shrink-0 mt-0.5">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none mb-1">{t.title}</p>
                      <p className="text-[10px] text-slate-500 leading-snug">{t.desc}</p>
                    </div>
                    {template === t.id && (
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5 opacity-80" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Report title */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
                Report Title
              </p>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={DEFAULT_TITLES[template]}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>

            {/* Options */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
                Options
              </p>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/40 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={includeGraph}
                  onChange={(e) => setIncludeGraph(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 accent-cyan-500"
                />
                <div>
                  <p className="text-sm text-slate-300">Include graph screenshot</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Captures the current ontology graph as an image</p>
                </div>
              </label>
            </div>

            {/* Data summary */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 px-4 py-3">
              <p className="text-[9px] uppercase tracking-[0.12em] text-slate-600 mb-2">Data included</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {[
                  { label: `${data.nodes.length} entities`,         color: 'text-cyan-400'    },
                  { label: `${data.relationships.length} relationships`, color: 'text-purple-400' },
                  { label: `${savedInsights.length} saved insights`, color: 'text-emerald-400' },
                ].map(({ label, color }) => (
                  <span key={label} className={`text-xs font-mono ${color}`}>{label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40">
            <div className="flex items-center gap-2 mb-4">
              <Eye size={12} className="text-slate-500" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Preview</p>
            </div>
            <ReportPreview template={template} title={resolvedTitle} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          {status === 'error' ? (
            <div className="flex items-center gap-2 text-rose-400 text-xs">
              <AlertCircle size={13} />
              <span>{errorMsg || 'Generation failed — check console'}</span>
            </div>
          ) : (
            <p className="text-xs text-slate-600">
              PDF generated client-side · never uploaded
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-slate-700 hover:border-slate-500 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={status !== 'idle'}
              className="btn-glow flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black rounded-xl text-sm font-semibold disabled:opacity-60 transition-all press-scale"
            >
              {status === 'generating' && <Loader2 size={14} className="animate-spin" />}
              {status === 'done'       && <CheckCircle2 size={14} />}
              {status === 'error'      && <AlertCircle size={14} />}
              {status === 'idle'       && <Download size={14} />}
              {status === 'generating' ? 'Generating…'
                : status === 'done'   ? 'Downloaded!'
                : status === 'error'  ? 'Try Again'
                : 'Generate PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
