// lib/hooks/useKeyboardShortcuts.ts
'use client';

import { useEffect, useCallback } from 'react';
import { useAetherStore } from '@/lib/store';

interface Options {
  isShortcutsOpen: boolean;
  onOpenShortcuts:  () => void;
  onCloseShortcuts: () => void;
}

export function useKeyboardShortcuts({
  isShortcutsOpen,
  onOpenShortcuts,
  onCloseShortcuts,
}: Options) {
  const {
    setCurrentView,
    setNewEntityModalOpen,
    setAIAnalystOpen,
    setPDFUploadModalOpen,
    setReportGeneratorOpen,
    setSelectedNode,
    isNewEntityModalOpen,
    isPDFUploadModalOpen,
    isAIAnalystOpen,
    isReportGeneratorOpen,
  } = useAetherStore();

  const focusSearch = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>(
      'input[aria-label="Search or ask anything"]',
    );
    if (input) { input.focus(); input.select(); }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta   = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const tag    = target.tagName;
      const isTyping =
        tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;

      // ── ⌘K / Ctrl+K — focus search (always, even inside inputs) ─────────────
      if (meta && !e.shiftKey && e.key === 'k') {
        e.preventDefault();
        focusSearch();
        return;
      }

      // ── ⌘N / Ctrl+N — new entity ─────────────────────────────────────────────
      if (meta && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        setNewEntityModalOpen(true);
        return;
      }

      // ── ⌘⇧_ / Ctrl+Shift+_ — view navigation + AI ───────────────────────────
      if (meta && e.shiftKey) {
        const key = e.key.toLowerCase();
        if (['g', 't', 'k', 'l', 'm'].includes(key)) {
          e.preventDefault();
          if (key === 'g') { setCurrentView('dashboard'); return; }
          if (key === 't') { setCurrentView('table');     return; }
          if (key === 'k') { setCurrentView('kanban');    return; }
          if (key === 'l') { setCurrentView('timeline');  return; }
          if (key === 'm') { setAIAnalystOpen(true);      return; }
        }
      }

      // ── Esc — close panels in priority order (innermost first) ───────────────
      if (e.key === 'Escape') {
        if (isShortcutsOpen)      { onCloseShortcuts();           return; }
        if (isNewEntityModalOpen) { setNewEntityModalOpen(false); return; }
        if (isPDFUploadModalOpen) { setPDFUploadModalOpen(false); return; }
        if (isAIAnalystOpen)      { setAIAnalystOpen(false);      return; }
        if (isReportGeneratorOpen){ setReportGeneratorOpen(false); return; }
        setSelectedNode(null);
        return;
      }

      // ── Remaining shortcuts skip if user is typing ────────────────────────────
      if (isTyping) return;

      // ── ? — toggle shortcuts cheatsheet ──────────────────────────────────────
      if (e.key === '?') {
        e.preventDefault();
        if (isShortcutsOpen) { onCloseShortcuts(); } else { onOpenShortcuts(); }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    focusSearch,
    setCurrentView,
    setNewEntityModalOpen,
    setAIAnalystOpen,
    setPDFUploadModalOpen,
    setReportGeneratorOpen,
    setSelectedNode,
    isShortcutsOpen,
    isNewEntityModalOpen,
    isPDFUploadModalOpen,
    isAIAnalystOpen,
    isReportGeneratorOpen,
    onOpenShortcuts,
    onCloseShortcuts,
  ]);
}
