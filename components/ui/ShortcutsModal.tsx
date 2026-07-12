// components/ui/ShortcutsModal.tsx
'use client';

import { X, Keyboard } from 'lucide-react';
import ModalShell from '@/components/ui/ModalShell';

function getMod() {
  if (typeof navigator === 'undefined') return '⌘';
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? '⌘' : 'Ctrl';
}

function Row({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        {keys.map((k, i) => (
          <kbd
            key={i}
            className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-slate-800 border border-slate-600/80 rounded-md text-[11px] font-mono text-slate-300 shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)] leading-none"
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 mb-2 pb-1 border-b border-slate-800">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const mod = getMod();

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      label="Keyboard shortcuts"
      maxWidthClass="max-w-sm"
      maxHeightClass="max-h-[min(90dvh,640px)]"
      zClass="z-[80]"
      panelClassName="rounded-2xl"
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            <Keyboard size={13} className="text-slate-400" />
          </div>
          <h2 className="text-sm font-semibold text-slate-200">Keyboard Shortcuts</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-h-0 scroll-touch">
        <Section title="General">
          <Row keys={[mod, 'K']} label="Open command palette" />
          <Row keys={[mod, 'N']} label="New entity" />
          <Row keys={[mod, 'Z']} label="Undo graph edit" />
          <Row keys={[mod, '⇧', 'Z']} label="Redo graph edit" />
          <Row keys={['?']} label="Show this panel" />
          <Row keys={['Esc']} label="Close panel or dismiss" />
        </Section>

        <Section title="Command palette">
          <Row keys={['↑', '↓']} label="Move selection" />
          <Row keys={['⏎']} label="Run selected / ask AI" />
          <Row keys={['Esc']} label="Close palette" />
        </Section>

        <Section title="Navigate">
          <Row keys={[mod, '⇧', 'G']} label="Graph · Dashboard" />
          <Row keys={[mod, '⇧', 'T']} label="Table view" />
          <Row keys={[mod, '⇧', 'K']} label="Kanban board" />
          <Row keys={[mod, '⇧', 'L']} label="Timeline" />
        </Section>

        <Section title="Intelligence">
          <Row keys={[mod, '⇧', 'M']} label="Open AI Analyst" />
        </Section>
      </div>

      <div className="px-6 py-4 border-t border-slate-800 shrink-0">
        <p className="text-[11px] text-slate-700 text-center">
          {mod === '⌘' ? 'Mac shortcuts shown' : 'Windows / Linux shortcuts shown'}
          {' · '}
          <span className="text-slate-600">shortcuts work globally</span>
        </p>
      </div>
    </ModalShell>
  );
}
