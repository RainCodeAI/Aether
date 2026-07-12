// components/views/AnalyticsView.tsx
'use client';

import { Sparkles, BookOpen, ChevronRight, ArrowRight } from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import EmptyState from '@/components/ui/EmptyState';

const INTENT_COLORS: Record<string, string> = {
  financial: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  risk: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  team: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  projects: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  location: 'bg-green-500/10 text-green-300 border-green-500/30',
  opportunity: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  summary: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  search: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
};

export default function AnalyticsView() {
  const {
    data,
    setSelectedNode,
    setAIAnalystOpen,
    setReportGeneratorOpen,
    setReportFocusNodeId,
  } = useAetherStore();

  const insightNodes = data.nodes.filter(
    (n) => n.type === 'Insight' || n.label.startsWith('Analysis:')
  );

  return (
    <div className="aether-view-enter">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-semibold tracking-tighter">Analytics & Insights</h1>
          <p className="text-slate-400 mt-1">
            {insightNodes.length} saved analysis{insightNodes.length !== 1 ? 'es' : ''} ·
            AI-generated intelligence
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setReportFocusNodeId(undefined);
              setReportGeneratorOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-300 text-slate-400 rounded-xl text-sm transition-all"
            title="Export analytics as PDF"
          >
            <BookOpen size={14} />
            Export Report
          </button>
          <button
            onClick={() => setAIAnalystOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-medium transition-colors"
          >
            <Sparkles size={16} />
            New Analysis
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 aether-grid-stagger">
        {insightNodes.map((insight) => {
          const intent = insight.properties.intent as string | undefined;
          const confidence = insight.properties.confidence as string | undefined;
          const keyFindings = insight.properties.keyFindings as string[] | undefined;
          const recommendations = insight.properties.recommendations as string[] | undefined;
          const analyzedAt =
            (insight.properties.analyzedAt as string | undefined) || insight.createdAt;
          const intentColor = intent ? INTENT_COLORS[intent] : INTENT_COLORS.search;

          return (
            <div
              key={insight.id}
              onClick={() => setSelectedNode(insight)}
              className="glass rounded-3xl p-7 hover:border-cyan-500/30 transition-all cursor-pointer group flex flex-col gap-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {intent && (
                    <span
                      className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${intentColor}`}
                    >
                      {intent}
                    </span>
                  )}
                  {confidence && (
                    <span className="text-xs text-slate-500 capitalize">
                      {confidence} confidence
                    </span>
                  )}
                </div>
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={14} className="text-cyan-400" />
                </div>
              </div>

              <h3 className="text-lg font-semibold leading-snug group-hover:text-cyan-300 transition-colors">
                {insight.label}
              </h3>

              <p className="text-slate-400 text-sm leading-relaxed">
                {insight.properties.summary as string}
              </p>

              {keyFindings && keyFindings.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs uppercase tracking-widest text-slate-600">Key Findings</p>
                  {keyFindings.slice(0, 3).map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <span className="text-cyan-600 mt-0.5 shrink-0">◆</span>
                      {f}
                    </div>
                  ))}
                </div>
              )}

              {recommendations && recommendations.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <p className="text-xs uppercase tracking-widest text-slate-600">
                    Recommendations
                  </p>
                  {recommendations.slice(0, 2).map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <ArrowRight size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                      {rec}
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs text-slate-600 mt-auto">
                {analyzedAt
                  ? new Date(analyzedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : '—'}
              </div>
            </div>
          );
        })}

        {insightNodes.length === 0 && (
          <div className="col-span-full glass rounded-3xl">
            <EmptyState
              icon={Sparkles}
              color="cyan"
              title="No signals detected yet"
              description="Run an AI analysis from the command bar or the button above. Results appear here as structured insight cards with key findings and recommendations."
              actions={[
                {
                  label: 'Run Analysis',
                  icon: Sparkles,
                  onClick: () => setAIAnalystOpen(true),
                },
              ]}
              hint='Try asking "What are the top risks?" or "Summarise financial health"'
              size="lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}
