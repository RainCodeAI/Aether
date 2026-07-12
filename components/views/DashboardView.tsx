// components/views/DashboardView.tsx
'use client';

import {
  Upload, FileText, BookOpen, Shuffle, Sparkles,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { getRandomInsight } from '@/lib/ai-search';
import { exportAsJSON, exportAsCSV, exportGraphAsPNG } from '@/lib/export';
import OntologyGraph from '@/components/ontology/OntologyGraph';
import DraggableRightColumn from '@/components/dashboard/DraggableRightColumn';
import WorkspaceOnboarding from '@/components/onboarding/WorkspaceOnboarding';
import Tooltip, { TipKbd } from '@/components/ui/Tooltip';

interface DashboardViewProps {
  onImportClick: () => void;
}

export default function DashboardView({ onImportClick }: DashboardViewProps) {
  const {
    data,
    setSearchQuery,
    setAIAnalystOpen,
    setPDFUploadModalOpen,
    setPDFLinkedEntityId,
    setReportGeneratorOpen,
    setReportFocusNodeId,
  } = useAetherStore();

  if (data.nodes.length === 0) {
    return (
      <div className="aether-view-enter py-4 sm:py-8">
        <WorkspaceOnboarding onImportClick={onImportClick} />
      </div>
    );
  }

  return (
    <div className="aether-view-enter">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tighter leading-none mb-2">
            Command Center
          </h1>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mt-3">
            {[
              { label: 'entities', count: data.nodes.length, color: 'text-cyan-400' },
              { label: 'relationships', count: data.relationships.length, color: 'text-purple-400' },
              {
                label: 'projects',
                count: data.nodes.filter((n) => n.type === 'Project').length,
                color: 'text-violet-400',
              },
              {
                label: 'people',
                count: data.nodes.filter((n) => n.type === 'Person').length,
                color: 'text-emerald-400',
              },
            ].map(({ label, count, color }) => (
              <span key={label} className="stat-chip">
                <span className={`font-semibold tabular-nums ${color}`}>{count}</span>
                <span className="text-slate-500">{label}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap sm:justify-end shrink-0">
          <Tooltip content="Import JSON backup — or drag & drop anywhere" position="bottom">
            <button
              onClick={onImportClick}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-dashed border-slate-700 hover:border-cyan-500/60 hover:bg-cyan-500/5 hover:text-cyan-300 text-slate-500 rounded-xl text-sm transition-all group press-scale"
            >
              <Upload size={14} className="group-hover:text-cyan-400 transition-colors" />
              Import
            </button>
          </Tooltip>
          <Tooltip content="Upload & extract entities from a PDF" position="bottom">
            <button
              onClick={() => {
                setPDFLinkedEntityId(undefined);
                setPDFUploadModalOpen(true);
              }}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-dashed border-slate-700 hover:border-rose-500/50 hover:bg-rose-500/5 hover:text-rose-300 text-slate-500 rounded-xl text-sm transition-all group press-scale"
            >
              <FileText size={14} className="group-hover:text-rose-400 transition-colors" />
              PDF
            </button>
          </Tooltip>
          <div className="hidden sm:block w-px bg-slate-800 self-stretch mx-1" />
          <Tooltip content="Export graph as JSON" position="bottom">
            <button
              onClick={() => exportAsJSON(data)}
              className="px-3 sm:px-4 py-2 border border-slate-800 hover:border-slate-600 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-all press-scale"
            >
              JSON
            </button>
          </Tooltip>
          <Tooltip
            content="Export entities as CSV spreadsheet"
            position="bottom"
            className="hidden sm:inline-flex"
          >
            <button
              onClick={() => exportAsCSV(data)}
              className="px-4 py-2 border border-slate-800 hover:border-slate-600 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-all press-scale"
            >
              CSV
            </button>
          </Tooltip>
          <Tooltip content="Export graph as PNG image" position="bottom" className="hidden sm:inline-flex">
            <button
              onClick={exportGraphAsPNG}
              className="px-4 py-2 border border-slate-800 hover:border-slate-600 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-all press-scale"
            >
              PNG
            </button>
          </Tooltip>
          <Tooltip
            content="Generate branded PDF report"
            position="bottom"
            className="hidden sm:inline-flex"
          >
            <button
              onClick={() => {
                setReportFocusNodeId(undefined);
                setReportGeneratorOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-300 text-slate-400 rounded-xl text-sm transition-all press-scale"
            >
              <BookOpen size={14} />
              Report
            </button>
          </Tooltip>
          <Tooltip content="Surprise me — generate a random smart insight" position="bottom">
            <button
              onClick={() => {
                const q = getRandomInsight(data);
                setSearchQuery(q);
                setAIAnalystOpen(true);
              }}
              className="surprise-btn flex items-center gap-2 px-3 sm:px-4 py-2 border border-emerald-500/30 hover:border-emerald-400/60 bg-emerald-500/8 hover:bg-emerald-500/15 text-emerald-400 hover:text-emerald-300 rounded-xl text-sm font-medium transition-all"
            >
              <Shuffle size={14} />
              <span className="hidden sm:inline">Surprise Me</span>
            </button>
          </Tooltip>
          <Tooltip
            content={
              <>
                Run AI analysis on your graph <TipKbd>⏎</TipKbd>
              </>
            }
            position="bottom"
          >
            <button
              onClick={() => setAIAnalystOpen(true)}
              className="btn-glow flex items-center gap-2 px-3 sm:px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-semibold"
            >
              <Sparkles size={14} />
              Analyse
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <div className="col-span-1 lg:col-span-8 aether-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-800/80 h-full">
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <h2 className="text-base font-semibold flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 aether-dot-ping inline-block" />
                Live Intelligence Graph
              </h2>
              <span className="text-xs text-slate-600 font-mono tabular-nums">
                {data.nodes.length} nodes · {data.relationships.length} edges
              </span>
            </div>
            <OntologyGraph />
          </div>
        </div>

        <DraggableRightColumn />
      </div>
    </div>
  );
}
