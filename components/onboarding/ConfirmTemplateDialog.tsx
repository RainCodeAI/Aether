// components/onboarding/ConfirmTemplateDialog.tsx
'use client';

import { AlertTriangle, Layers } from 'lucide-react';
import { getTemplate } from '@/lib/workspace-templates';
import ModalShell from '@/components/ui/ModalShell';

export interface PendingTemplateApply {
  templateId: string;
  nodeCount: number;
  relCount: number;
}

interface Props {
  pending: PendingTemplateApply | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmTemplateDialog({
  pending,
  onConfirm,
  onCancel,
}: Props) {
  const tpl = pending ? getTemplate(pending.templateId) : undefined;
  const name = tpl?.name ?? pending?.templateId ?? '';
  const emoji = tpl?.emoji ?? '◇';
  const ent =
    pending && pending.nodeCount === 1
      ? '1 entity'
      : `${pending?.nodeCount ?? 0} entities`;
  const rels =
    pending && pending.relCount === 1
      ? '1 relationship'
      : `${pending?.relCount ?? 0} relationships`;

  return (
    <ModalShell
      isOpen={pending !== null}
      onClose={onCancel}
      label="Confirm template apply"
      maxWidthClass="max-w-md"
      maxHeightClass="max-h-[min(90dvh,560px)]"
      zClass="z-[95]"
    >
      <div className="flex-1 overflow-y-auto min-h-0 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">
              Replace workspace graph?
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Applying a template overwrites current data
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0">
            {emoji}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
              <Layers size={12} className="text-slate-500" />
              {name}
            </p>
            {tpl?.blurb && (
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">{tpl.blurb}</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 divide-y divide-slate-800 mb-5">
          <div className="flex items-center justify-between px-5 py-3 text-sm">
            <span className="text-slate-500">Current workspace</span>
            <span className="font-mono text-slate-400">
              {ent} · {rels}
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-3 text-sm">
            <span className="text-slate-500">Will become</span>
            <span className="font-mono text-cyan-400">
              {tpl
                ? `${tpl.entityCount} entities · ${tpl.relationshipCount} rels`
                : 'template graph'}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          You can undo with{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-400">
            ⌘Z
          </kbd>{' '}
          after applying.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-semibold transition-colors"
          >
            Apply template
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
