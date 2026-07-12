// components/onboarding/WorkspaceOnboarding.tsx
'use client';

import {
  Plus, Upload, Sparkles, Layers, ArrowRight,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import {
  WORKSPACE_TEMPLATES,
  starterTemplates,
  confirmTemplateApply,
  type TemplateAccent,
  type WorkspaceTemplate,
} from '@/lib/workspace-templates';

const ACCENT: Record<
  TemplateAccent,
  { ring: string; bg: string; text: string; border: string; badge: string }
> = {
  cyan: {
    ring: 'hover:border-cyan-500/50',
    bg: 'from-cyan-500/15 to-cyan-500/5',
    text: 'text-cyan-300',
    border: 'border-cyan-500/25',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  violet: {
    ring: 'hover:border-violet-500/50',
    bg: 'from-violet-500/15 to-violet-500/5',
    text: 'text-violet-300',
    border: 'border-violet-500/25',
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  },
  emerald: {
    ring: 'hover:border-emerald-500/50',
    bg: 'from-emerald-500/15 to-emerald-500/5',
    text: 'text-emerald-300',
    border: 'border-emerald-500/25',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  amber: {
    ring: 'hover:border-amber-500/50',
    bg: 'from-amber-500/15 to-amber-500/5',
    text: 'text-amber-300',
    border: 'border-amber-500/25',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  rose: {
    ring: 'hover:border-rose-500/50',
    bg: 'from-rose-500/15 to-rose-500/5',
    text: 'text-rose-300',
    border: 'border-rose-500/25',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
  orange: {
    ring: 'hover:border-orange-500/50',
    bg: 'from-orange-500/15 to-orange-500/5',
    text: 'text-orange-300',
    border: 'border-orange-500/25',
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  slate: {
    ring: 'hover:border-slate-500/50',
    bg: 'from-slate-700/25 to-slate-800/10',
    text: 'text-slate-300',
    border: 'border-slate-600/40',
    badge: 'bg-slate-800 text-slate-400 border-slate-700',
  },
};

function TemplateCard({
  template,
  onSelect,
}: {
  template: WorkspaceTemplate;
  onSelect: () => void;
}) {
  const a = ACCENT[template.accent];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group text-left rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5 transition-all ${a.ring} hover:bg-slate-900/70 press-scale`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${a.bg} border ${a.border} flex items-center justify-center text-lg shrink-0`}
        >
          {template.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${a.text} group-hover:brightness-110`}>
            {template.name}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{template.blurb}</p>
        </div>
        <ArrowRight
          size={14}
          className="text-slate-700 group-hover:text-slate-400 shrink-0 mt-1 transition-colors"
        />
      </div>
      <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">
        {template.description}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {template.entityCount > 0 ? (
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${a.badge}`}>
            {template.entityCount} entities · {template.relationshipCount} rels
          </span>
        ) : (
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${a.badge}`}>
            empty
          </span>
        )}
        {template.tags.slice(0, 2).map((t) => (
          <span key={t} className="text-[10px] text-slate-600">
            #{t}
          </span>
        ))}
      </div>
    </button>
  );
}

interface WorkspaceOnboardingProps {
  onImportClick?: () => void;
  /** Compact layout for embedding inside smaller views */
  compact?: boolean;
}

export default function WorkspaceOnboarding({
  onImportClick,
  compact = false,
}: WorkspaceOnboardingProps) {
  const {
    applyTemplate,
    setNewEntityModalOpen,
    workspaces,
    currentWorkspaceId,
    data,
  } = useAetherStore();

  const wsName =
    workspaces.find((w) => w.id === currentWorkspaceId)?.name ?? 'this workspace';

  const starters = starterTemplates();
  const blank = WORKSPACE_TEMPLATES.find((t) => t.id === 'blank')!;

  const handleTemplate = (id: string) => {
    // Onboarding usually only renders when empty; still guard if data exists.
    const ok = confirmTemplateApply({
      templateId: id,
      nodeCount: data.nodes.length,
      relCount: data.relationships.length,
    });
    if (!ok) return;
    applyTemplate(id);
  };

  return (
    <div
      className={`aether-view-enter ${
        compact ? '' : 'max-w-4xl mx-auto'
      }`}
    >
      <div className={`text-center ${compact ? 'mb-6' : 'mb-8 sm:mb-10'}`}>
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/25 mb-4">
          <Layers size={26} className="text-cyan-400" />
        </div>
        <h1
          className={`font-semibold tracking-tight text-slate-100 mb-2 ${
            compact ? 'text-xl' : 'text-2xl sm:text-3xl'
          }`}
        >
          Start building in {wsName}
        </h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          This workspace is empty. Pick a starter template, create your first entity,
          or import a JSON backup.
        </p>
      </div>

      {/* Starter packs */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-0.5">
          <Sparkles size={13} className="text-cyan-500" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            Starter templates
          </p>
        </div>
        <div
          className={`grid gap-3 ${
            compact
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
          }`}
        >
          {starters.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onSelect={() => handleTemplate(t.id)}
            />
          ))}
        </div>
      </div>

      {/* Secondary actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => handleTemplate(blank.id)}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-slate-700 hover:border-slate-500 text-left transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-slate-200 shrink-0">
            {blank.emoji}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-300">Stay blank</p>
            <p className="text-[11px] text-slate-600">Add entities one by one</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setNewEntityModalOpen(true)}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-cyan-500/25 bg-cyan-500/8 hover:bg-cyan-500/12 text-left transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Plus size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-cyan-300">New entity</p>
            <p className="text-[11px] text-cyan-600/80">Person, project, place…</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onImportClick?.()}
          disabled={!onImportClick}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-700 hover:border-slate-500 text-left transition-colors group disabled:opacity-40"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-slate-200 shrink-0">
            <Upload size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-300">Import JSON</p>
            <p className="text-[11px] text-slate-600">Restore a backup file</p>
          </div>
        </button>
      </div>
    </div>
  );
}
