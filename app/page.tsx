// app/page.tsx — app shell: layout, import/export chrome, global modals
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import CommandBar from '@/components/layout/CommandBar';
import NodeDetailPanel from '@/components/ontology/NodeDetailPanel';
import SearchPanel from '@/components/search/SearchPanel';
import AIInsightsPanel from '@/components/ai/AIInsightsPanel';
import NewEntityModal from '@/components/entities/NewEntityModal';
import PDFUploadModal from '@/components/data/PDFUploadModal';
import ReportGenerator from '@/components/reports/ReportGenerator';
import ViewRouter from '@/components/views/ViewRouter';
import Toast, { type ToastState } from '@/components/shell/Toast';
import ConfirmImportDialog, {
  type PendingImport,
} from '@/components/shell/ConfirmImportDialog';
import CommandPalette from '@/components/shell/CommandPalette';
import SettingsPanel from '@/components/shell/SettingsPanel';
import ShortcutsModal from '@/components/ui/ShortcutsModal';
import { useAetherStore } from '@/lib/store';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { importFromJSON } from '@/lib/import';
import { getShareTokenFromUrl, type ShareToken } from '@/lib/share';
import { Upload, Eye, X } from 'lucide-react';

export default function AetherDashboard() {
  const {
    data,
    setData,
    importWorkspaces,
    workspaces,
    currentView,
    isNewEntityModalOpen,
    setNewEntityModalOpen,
    isPDFUploadModalOpen,
    setPDFUploadModalOpen,
    pdfLinkedEntityId,
    setPDFLinkedEntityId,
  } = useAetherStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPending, setImportPending] = useState<PendingImport | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [shareToken, setShareToken] = useState<ShareToken | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useKeyboardShortcuts({
    isShortcutsOpen: shortcutsOpen,
    onOpenShortcuts: () => setShortcutsOpen(true),
    onCloseShortcuts: () => setShortcutsOpen(false),
    isPaletteOpen: paletteOpen,
    onOpenPalette: () => setPaletteOpen(true),
    onClosePalette: () => setPaletteOpen(false),
  });

  // Detect ?share= URL param on mount (external browser state — avoid hydration mismatch)
  useEffect(() => {
    const token = getShareTokenFromUrl();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only external read
    if (token) setShareToken(token);
  }, []);

  // Close sidebar when the view changes (render-phase pattern)
  const [prevView, setPrevView] = useState(currentView);
  if (currentView !== prevView) {
    setPrevView(currentView);
    setSidebarOpen(false);
  }

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  // Global drag detection for JSON import overlay
  useEffect(() => {
    let counter = 0;
    const onEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        counter++;
        setIsDragOver(true);
      }
    };
    const onLeave = () => {
      if (--counter <= 0) {
        counter = 0;
        setIsDragOver(false);
      }
    };
    const onDrop = () => {
      counter = 0;
      setIsDragOver(false);
    };
    document.addEventListener('dragenter', onEnter);
    document.addEventListener('dragleave', onLeave);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onEnter);
      document.removeEventListener('dragleave', onLeave);
      document.removeEventListener('drop', onDrop);
    };
  }, []);

  const handleFile = useCallback(async (file: File) => {
    try {
      const result = await importFromJSON(file);
      setImportPending({ ...result, filename: file.name });
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Import failed',
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    }
  }, []);

  const warnIfNeeded = (warnings: string[]) => {
    if (warnings.length > 0) console.warn('[Aether import warnings]', warnings);
  };

  const handleConfirmGraphImport = useCallback(() => {
    if (!importPending || importPending.kind !== 'graph') return;
    setData(importPending.data);
    const { nodeCount, relationshipCount, warnings } = importPending;
    setImportPending(null);
    setToast({
      type: 'success',
      title: 'Graph imported',
      message: `${nodeCount} entit${nodeCount !== 1 ? 'ies' : 'y'} and ${relationshipCount} relationship${relationshipCount !== 1 ? 's' : ''} loaded into this workspace.${warnings.length > 0 ? ` (${warnings.length} warning${warnings.length !== 1 ? 's' : ''})` : ''}`,
    });
    warnIfNeeded(warnings);
  }, [importPending, setData]);

  const handleConfirmWorkspacesImport = useCallback(
    (mode: 'replace' | 'merge') => {
      if (!importPending || importPending.kind !== 'workspaces') return;
      importWorkspaces(
        {
          workspaces: importPending.workspaces,
          workspaceData: importPending.workspaceData,
          currentWorkspaceId: importPending.currentWorkspaceId,
        },
        mode
      );
      const { workspaceCount, totalNodes, warnings } = importPending;
      setImportPending(null);
      setToast({
        type: 'success',
        title: mode === 'merge' ? 'Workspaces merged' : 'Workspaces restored',
        message: `${workspaceCount} workspace${workspaceCount !== 1 ? 's' : ''} · ${totalNodes} entities (${mode}).${warnings.length > 0 ? ` ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}` : ''}`,
      });
      warnIfNeeded(warnings);
    },
    [importPending, importWorkspaces]
  );

  const triggerImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleReset = useCallback(() => {
    if (confirm('Clear all data and reset to defaults?')) {
      localStorage.removeItem('aether-storage-v1');
      window.location.reload();
    }
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {isDragOver && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center pointer-events-auto"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
        >
          <div className="glass rounded-3xl px-20 py-16 text-center border-2 border-dashed border-cyan-500/60 max-w-md pointer-events-none select-none">
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-6">
              <Upload size={36} className="text-cyan-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Drop to import</h2>
            <p className="text-slate-400 text-sm">
              Single graph or multi-workspace JSON backup
            </p>
          </div>
        </div>
      )}

      {importPending && (
        <ConfirmImportDialog
          pending={importPending}
          currentNodeCount={data.nodes.length}
          currentRelCount={data.relationships.length}
          currentWorkspaceCount={workspaces.length}
          onConfirmGraph={handleConfirmGraphImport}
          onConfirmWorkspaces={handleConfirmWorkspacesImport}
          onCancel={() => setImportPending(null)}
        />
      )}

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onImportClick={triggerImport}
        onOpenShortcuts={() => {
          setPaletteOpen(false);
          setShortcutsOpen(true);
        }}
        onOpenSettings={() => {
          setPaletteOpen(false);
          setSettingsOpen(true);
        }}
      />

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenShortcuts={() => {
          setSettingsOpen(false);
          setShortcutsOpen(true);
        }}
        onOpenPalette={() => {
          setSettingsOpen(false);
          setPaletteOpen(true);
        }}
        onReset={handleReset}
        onImportClick={triggerImport}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <CommandBar
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onReset={handleReset}
        />

        {shareToken && (
          <div className="flex items-center justify-between px-8 py-2 bg-cyan-950/60 border-b border-cyan-800/30 shrink-0">
            <div className="flex items-center gap-2 text-xs text-cyan-400">
              <Eye size={13} className="shrink-0" />
              <span>Read-only shared view</span>
              <span className="text-cyan-600">·</span>
              <span className="font-medium truncate max-w-[260px]">{shareToken.label}</span>
            </div>
            <button
              onClick={() => {
                window.history.replaceState({}, '', window.location.pathname);
                setShareToken(null);
              }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors shrink-0 ml-4"
            >
              <X size={12} /> Exit shared view
            </button>
          </div>
        )}

        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-[#0A0A0C] pb-20 sm:pb-6 lg:pb-8 scroll-touch">
          <div className="max-w-screen-2xl mx-auto">
            <ViewRouter onImportClick={triggerImport} />
          </div>
        </div>

        <NodeDetailPanel />
        <SearchPanel />
        <AIInsightsPanel />
        <ReportGenerator />
        <NewEntityModal
          isOpen={isNewEntityModalOpen}
          onClose={() => setNewEntityModalOpen(false)}
        />
        <PDFUploadModal
          isOpen={isPDFUploadModalOpen}
          onClose={() => {
            setPDFUploadModalOpen(false);
            setPDFLinkedEntityId(undefined);
          }}
          linkedEntityId={pdfLinkedEntityId}
        />
      </div>
    </div>
  );
}
