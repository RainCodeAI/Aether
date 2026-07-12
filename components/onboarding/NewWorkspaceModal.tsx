// components/onboarding/NewWorkspaceModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Check, Layers } from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import {
  WORKSPACE_TEMPLATES,
  type TemplateAccent,
  type WorkspaceTemplate,
} from '@/lib/workspace-templates';
import ModalShell from '@/components/ui/ModalShell';

const ACCENT_DOT: Record<TemplateAccent, string> = {
  cyan: 'bg-cyan-400',
  violet: 'bg-violet-400',
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
  orange: 'bg-orange-400',
  slate: 'bg-slate-500',
};

interface NewWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewWorkspaceModal({ isOpen, onClose }: NewWorkspaceModalProps) {
  const createWorkspace = useAetherStore((s) => s.createWorkspace);
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('blank');

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setTemplateId('blank');
  }, [isOpen]);

  const selected = WORKSPACE_TEMPLATES.find((t) => t.id === templateId);

  const handleCreate = () => {
    const n = name.trim() || selected?.name || 'New Workspace';
    createWorkspace(n, {
      templateId: templateId === 'blank' ? undefined : templateId,
    });
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      label="Create workspace"
      maxWidthClass="max-w-lg"
      maxHeightClass="max-h-[min(90dvh,720px)]"
      zClass="z-[80]"
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
            <Layers size={15} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">New workspace</h2>
            <p className="text-[11px] text-slate-600">Name it and choose a starting pack</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-h-0">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1.5 block">
            Name
          </label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
            placeholder={selected?.name ?? 'Workspace name…'}
            className="w-full bg-slate-900/80 border border-slate-700 focus:border-cyan-500/50 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-2">
            Template
          </p>
          <div className="space-y-1.5">
            {WORKSPACE_TEMPLATES.map((t: WorkspaceTemplate) => {
              const active = t.id === templateId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${
                    active
                      ? 'bg-cyan-500/10 border-cyan-500/35 text-slate-100'
                      : 'border-transparent hover:bg-slate-800/60 text-slate-400'
                  }`}
                >
                  <span className="text-base w-7 text-center shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-[11px] text-slate-600 truncate">{t.blurb}</p>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${ACCENT_DOT[t.accent]} ${
                      active ? 'opacity-100' : 'opacity-40'
                    }`}
                  />
                  {active && <Check size={14} className="text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-6 py-4 flex gap-2 border-t border-slate-800 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-semibold transition-colors"
        >
          Create workspace
        </button>
      </div>
    </ModalShell>
  );
}
