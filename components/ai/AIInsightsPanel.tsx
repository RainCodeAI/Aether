// components/ai/AIInsightsPanel.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Sparkles, BookmarkPlus, BarChart3, Network,
  Trash2, ChevronRight, TrendingUp, TrendingDown, Minus,
  CheckCircle2, AlertCircle, Info, Brain, GitBranch,
  Download, MessageSquarePlus, Plus, Zap, Target, ArrowLeft,
  Eye, FileText, Share2,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { copyShareUrl } from '@/lib/share';
import {
  generateInsight, createInsightNode,
  AnalysisResult, AnalysisIntent, SavedInsight, AutoInsight,
} from '@/lib/ai-search';

// ─── Intent metadata ──────────────────────────────────────────────────────────

const INTENT_META: Record<AnalysisIntent, { label: string; color: string; bg: string; icon: string }> = {
  financial:            { label: 'Financial',            color: 'text-amber-300',   bg: 'bg-amber-500/15 border-amber-500/30',   icon: '💰' },
  risk:                 { label: 'Risk',                 color: 'text-rose-300',    bg: 'bg-rose-500/15 border-rose-500/30',     icon: '⚠' },
  team:                 { label: 'Team',                 color: 'text-cyan-300',    bg: 'bg-cyan-500/15 border-cyan-500/30',     icon: '👥' },
  projects:             { label: 'Projects',             color: 'text-purple-300',  bg: 'bg-purple-500/15 border-purple-500/30', icon: '📁' },
  location:             { label: 'Location',             color: 'text-green-300',   bg: 'bg-green-500/15 border-green-500/30',   icon: '📍' },
  opportunity:          { label: 'Opportunity',          color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/30', icon: '🚀' },
  summary:              { label: 'Summary',              color: 'text-blue-300',    bg: 'bg-blue-500/15 border-blue-500/30',     icon: '📊' },
  connection_discovery: { label: 'Connections',          color: 'text-violet-300',  bg: 'bg-violet-500/15 border-violet-500/30', icon: '🔗' },
  scenario_projection:  { label: 'Scenario',             color: 'text-orange-300',  bg: 'bg-orange-500/15 border-orange-500/30', icon: '🔮' },
  search:               { label: 'Search',               color: 'text-slate-300',   bg: 'bg-slate-500/15 border-slate-500/30',   icon: '🔍' },
};

const CONFIDENCE_META = {
  high:   { icon: CheckCircle2, color: 'text-emerald-400', bar: 'bg-emerald-400', label: 'High confidence' },
  medium: { icon: Info,          color: 'text-amber-400',   bar: 'bg-amber-400',   label: 'Medium confidence' },
  low:    { icon: AlertCircle,   color: 'text-rose-400',    bar: 'bg-rose-400',    label: 'Low confidence' },
};

// Suggested queries shown in the Suggestions tab
const SUGGESTION_QUERIES: { label: string; query: string; intent: AnalysisIntent; description: string }[] = [
  { label: 'Financial Overview',     query: 'financial overview',          intent: 'financial',            description: 'Budget allocation, revenue metrics, capital efficiency' },
  { label: 'Risk Assessment',        query: 'risk assessment',             intent: 'risk',                 description: 'Delivery risks, blockers, key-person dependencies' },
  { label: 'Team Status',            query: 'team overview',               intent: 'team',                 description: 'Who is working on what, role coverage, org gaps' },
  { label: 'Project Portfolio',      query: 'project portfolio status',    intent: 'projects',             description: 'Progress, budgets, leads, and delivery health' },
  { label: 'Connection Discovery',   query: 'connection discovery',        intent: 'connection_discovery', description: 'Isolated entities, hub nodes, relationship gaps' },
  { label: 'Scenario Projection',    query: 'scenario projection forecast', intent: 'scenario_projection', description: 'What-if analysis based on current trends' },
  { label: 'Opportunity Finder',     query: 'opportunity analysis',        intent: 'opportunity',          description: 'Growth signals, strategic bets, untapped potential' },
  { label: 'Full Snapshot',          query: 'full summary overview',       intent: 'summary',              description: 'Complete intelligence snapshot across all entities' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend?: 'up' | 'down' | 'neutral' }) {
  if (trend === 'up')   return <TrendingUp  size={13} className="text-emerald-400" />;
  if (trend === 'down') return <TrendingDown size={13} className="text-rose-400" />;
  return <Minus size={13} className="text-slate-500" />;
}

function ConfidenceBar({ score, label }: { score: number; label: AnalysisResult['confidence'] }) {
  const meta = CONFIDENCE_META[label];
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${meta.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-mono tabular-nums ${meta.color}`}>{score}%</span>
    </div>
  );
}

function SavedInsightCard({
  saved, onDelete, onOpen,
}: {
  saved: SavedInsight;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const meta = INTENT_META[saved.result.intent];
  const ts   = new Date(saved.timestamp);
  const dateLabel = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 group hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
            {meta.icon} {meta.label}
          </span>
          <span className="text-xs text-slate-500">{dateLabel}</span>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-rose-400 text-slate-500 shrink-0"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <p className="text-xs text-slate-400 font-mono mb-2 truncate">&ldquo;{saved.query}&rdquo;</p>
      <p className="text-sm text-slate-300 leading-relaxed line-clamp-2 mb-3">{saved.result.summary}</p>
      <div className="mb-3">
        <ConfidenceBar score={saved.result.confidenceScore ?? 60} label={saved.result.confidence} />
      </div>
      <button
        onClick={onOpen}
        className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-300 transition-colors"
      >
        View full analysis <ChevronRight size={12} />
      </button>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function AIInsightsPanel() {
  const {
    isAIAnalystOpen, setAIAnalystOpen,
    searchQuery, setSearchQuery,
    data, setData,
    setCurrentView,
    savedInsights, addSavedInsight, removeSavedInsight,
    currentWorkspaceId,
  } = useAetherStore();

  const [activeTab,    setActiveTab]    = useState<'analysis' | 'saved' | 'suggestions'>('analysis');
  const [result,       setResult]       = useState<AnalysisResult | null>(null);
  const [savedState,   setSavedState]   = useState<'idle' | 'done'>('idle');
  const [graphState,   setGraphState]   = useState<'idle' | 'done'>('idle');
  const [taskState,    setTaskState]    = useState<'idle' | 'done'>('idle');
  const [shareState,   setShareState]   = useState<'idle' | 'done'>('idle');
  const [viewingSaved, setViewingSaved] = useState<SavedInsight | null>(null);
  const [followUpText, setFollowUpText] = useState('');
  const [showTrace,    setShowTrace]    = useState(false);
  const followUpRef = useRef<HTMLInputElement>(null);

  // Recompute analysis whenever the panel opens or query changes
  useEffect(() => {
    if (isAIAnalystOpen && searchQuery.trim()) {
      setResult(generateInsight(data, searchQuery));
      setSavedState('idle');
      setGraphState('idle');
      setTaskState('idle');
      setViewingSaved(null);
      setShowTrace(false);
    }
  }, [isAIAnalystOpen, searchQuery, data]);

  const close = useCallback(() => {
    setAIAnalystOpen(false);
    setActiveTab('analysis');
    setViewingSaved(null);
    setFollowUpText('');
    setShowTrace(false);
  }, [setAIAnalystOpen]);

  useEffect(() => {
    if (!isAIAnalystOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAIAnalystOpen, close]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSaveToLibrary = () => {
    if (!result || !searchQuery.trim() || savedState !== 'idle') return;
    const saved: SavedInsight = {
      id: `si-${Date.now()}`,
      timestamp: new Date().toISOString(),
      query: searchQuery,
      result,
    };
    addSavedInsight(saved);
    setSavedState('done');
  };

  const handleAddToGraph = () => {
    if (!result || !searchQuery.trim() || graphState !== 'idle') return;
    const insightNode = createInsightNode(searchQuery, result);
    setData({
      nodes: [...data.nodes, insightNode],
      relationships: data.relationships,
    });
    setGraphState('done');
  };

  const handleCreateTask = () => {
    if (!result || taskState !== 'idle') return;
    const rec = result.recommendations[0];
    if (!rec) return;
    const taskNode = {
      id: `task-${Date.now()}`,
      type: 'Event' as const,
      label: `Task: ${rec.replace(/^[⚠◆→\s]+/, '').slice(0, 60)}`,
      properties: {
        type:        'task',
        status:      'pending',
        description: rec,
        source:      'AI Analyst',
        createdFrom: searchQuery,
      },
      createdAt: new Date().toISOString().split('T')[0],
    };
    setData({
      nodes: [...data.nodes, taskNode],
      relationships: data.relationships,
    });
    setTaskState('done');
  };

  const handleShare = async () => {
    if (shareState !== 'idle') return;
    const r = viewingSaved ? viewingSaved.result : result;
    const q = viewingSaved ? viewingSaved.query  : searchQuery;
    if (!r || !q.trim()) return;
    await copyShareUrl({
      type: 'insight',
      id: `insight-${Date.now()}`,
      workspaceId: currentWorkspaceId,
      label: q,
    });
    setShareState('done');
    setTimeout(() => setShareState('idle'), 2500);
  };

  const handleExport = () => {
    if (!result) return;
    const displayQ = viewingSaved ? viewingSaved.query : searchQuery;
    const r        = viewingSaved ? viewingSaved.result : result;
    const lines = [
      `AETHER INTELLIGENCE REPORT`,
      `Generated: ${new Date().toLocaleString()}`,
      `Query: "${displayQ}"`,
      `Intent: ${r.intent} | Confidence: ${r.confidence} (${r.confidenceScore}%)`,
      '',
      'SUMMARY',
      r.summary,
      '',
      'KEY FINDINGS',
      ...r.keyFindings.map((f, i) => `${i + 1}. ${f}`),
      '',
      'RECOMMENDATIONS',
      ...r.recommendations.map((rec, i) => `${i + 1}. ${rec}`),
      '',
      r.metrics && r.metrics.length > 0 ? 'METRICS' : '',
      ...(r.metrics?.map(m => `• ${m.label}: ${m.value} (${m.trend ?? 'stable'})`) ?? []),
      '',
      'REASONING TRACE',
      `Nodes analyzed: ${r.reasoningTrace.nodesAnalyzed.length}`,
      `Relationships analyzed: ${r.reasoningTrace.relsAnalyzed.length}`,
      ...r.reasoningTrace.dataPoints.map(p => `• ${p}`),
    ].filter(l => l !== null) as string[];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `aether-insight-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFollowUp = () => {
    if (!followUpText.trim()) return;
    setSearchQuery(followUpText.trim());
    setFollowUpText('');
    setActiveTab('analysis');
  };

  const handleOpenSaved = (saved: SavedInsight) => {
    setViewingSaved(saved);
    setActiveTab('analysis');
  };

  const handleSuggestionClick = (query: string) => {
    setSearchQuery(query);
    setActiveTab('analysis');
  };

  if (!isAIAnalystOpen) return null;

  const displayResult  = viewingSaved ? viewingSaved.result : result;
  const displayQuery   = viewingSaved ? viewingSaved.query  : searchQuery;
  const intentMeta     = displayResult ? INTENT_META[displayResult.intent] : null;
  const confidenceMeta = displayResult ? CONFIDENCE_META[displayResult.confidence] : null;
  const ConfIcon       = confidenceMeta?.icon;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[70] flex items-end sm:items-start justify-center pt-0 sm:pt-16 px-0 sm:px-4 pb-0 sm:pb-6 modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-label="AI Analyst"
    >
      <div className="glass w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl flex flex-col h-[92vh] sm:h-auto sm:max-h-[88vh] shadow-2xl border border-slate-700/50 modal-panel">

        {/* Pull handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0" aria-hidden="true">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
              <Brain size={17} className="text-black" />
            </div>
            <div>
              <h2 className="font-semibold text-base leading-none mb-0.5">AI Analyst</h2>
              <p className="text-xs text-slate-500">Intelligence OS · Aether</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/80 rounded-xl p-1 border border-slate-800">
            {(['analysis', 'saved', 'suggestions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); if (tab === 'analysis') setViewingSaved(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize flex items-center gap-1.5 ${
                  activeTab === tab ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'analysis'    && <Sparkles size={11} />}
                {tab === 'saved'       && <BookmarkPlus size={11} />}
                {tab === 'suggestions' && <Zap size={11} />}
                {tab}
                {tab === 'saved' && savedInsights.length > 0 && (
                  <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full tabular-nums">
                    {savedInsights.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={close}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ═══ ANALYSIS TAB ═══ */}
          {activeTab === 'analysis' && (
            <div className="px-6 py-5 space-y-5">

              {/* Back to current / query + meta */}
              {displayQuery && (
                <div className="flex items-center gap-2 flex-wrap">
                  {viewingSaved && (
                    <button
                      onClick={() => setViewingSaved(null)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <ArrowLeft size={11} /> Current
                    </button>
                  )}
                  <p className="text-xs text-slate-500 font-mono flex-1 truncate">
                    &ldquo;{displayQuery}&rdquo;
                  </p>
                  {intentMeta && (
                    <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full border shrink-0 ${intentMeta.bg} ${intentMeta.color}`}>
                      {intentMeta.icon} {intentMeta.label}
                    </span>
                  )}
                </div>
              )}

              {/* Empty state */}
              {!displayQuery && !displayResult && (
                <div className="text-center py-14">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-5">
                    <Brain size={28} className="text-cyan-600" />
                  </div>
                  <p className="text-slate-400 text-sm mb-1">
                    Type a query in the command bar and press{' '}
                    <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs font-mono">Enter</kbd>
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    Or pick a query in the{' '}
                    <button onClick={() => setActiveTab('suggestions')} className="text-cyan-600 hover:text-cyan-400 underline transition-colors">
                      Suggestions
                    </button>
                    {' '}tab
                  </p>
                </div>
              )}

              {displayResult && (
                <>
                  {/* Confidence bar */}
                  <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {confidenceMeta && ConfIcon && (
                          <ConfIcon size={14} className={confidenceMeta.color} />
                        )}
                        <span className="text-xs text-slate-400">{confidenceMeta?.label}</span>
                      </div>
                      <button
                        onClick={() => setShowTrace(v => !v)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                      >
                        <Eye size={11} />
                        {showTrace ? 'Hide' : 'Show'} reasoning
                      </button>
                    </div>
                    <ConfidenceBar
                      score={displayResult.confidenceScore}
                      label={displayResult.confidence}
                    />

                    {/* Reasoning trace */}
                    {showTrace && displayResult.reasoningTrace && (
                      <div className="border-t border-slate-800 pt-3 space-y-2">
                        <p className="text-xs uppercase tracking-widest text-slate-600">Reasoning trace</p>
                        <div className="space-y-1">
                          {displayResult.reasoningTrace.dataPoints.map((point, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-500">
                              <GitBranch size={10} className="text-cyan-700 mt-0.5 shrink-0" />
                              <span>{point}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
                          <span className="flex items-center gap-1">
                            <Network size={10} />
                            {displayResult.reasoningTrace.nodesAnalyzed.length} entities
                          </span>
                          <span className="flex items-center gap-1">
                            <GitBranch size={10} />
                            {displayResult.reasoningTrace.relsAnalyzed.length} relationships
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
                    <p className="text-slate-200 leading-relaxed text-sm">{displayResult.summary}</p>
                  </div>

                  {/* Metrics grid */}
                  {displayResult.metrics && displayResult.metrics.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-600 mb-3">Metrics</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {displayResult.metrics.map((m, i) => (
                          <div key={i} className="flex items-center justify-between bg-slate-900 rounded-xl px-4 py-3 border border-slate-800">
                            <span className="text-xs text-slate-400 truncate mr-2">{m.label}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <TrendIcon trend={m.trend} />
                              <span className="text-sm font-semibold tabular-nums">{m.value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key findings */}
                  {displayResult.keyFindings.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-600 mb-3">Key Findings</p>
                      <div className="space-y-2">
                        {displayResult.keyFindings.map((f, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm">
                            <span className="text-cyan-500 mt-0.5 shrink-0 text-xs">◆</span>
                            <span className="text-slate-300 leading-relaxed">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {displayResult.recommendations.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-600 mb-3">Recommendations</p>
                      <div className="space-y-2">
                        {displayResult.recommendations.map((r, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm group">
                            <ChevronRight size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span className="text-slate-300 leading-relaxed">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up input */}
                  {!viewingSaved && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                      <p className="text-xs uppercase tracking-widest text-slate-600 mb-3 flex items-center gap-1.5">
                        <MessageSquarePlus size={11} />
                        Ask a follow-up
                      </p>
                      <div className="flex gap-2">
                        <input
                          ref={followUpRef}
                          type="text"
                          value={followUpText}
                          onChange={(e) => setFollowUpText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleFollowUp(); }}
                          placeholder='e.g. "drill into the risk findings"'
                          className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-600 outline-none transition-colors"
                        />
                        <button
                          onClick={handleFollowUp}
                          disabled={!followUpText.trim()}
                          className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-300 text-sm transition-all disabled:opacity-40"
                        >
                          Ask
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══ SAVED TAB ═══ */}
          {activeTab === 'saved' && (
            <div className="px-6 py-5">
              {savedInsights.length === 0 ? (
                <div className="text-center py-16">
                  <BookmarkPlus className="mx-auto mb-4 text-slate-700" size={40} />
                  <p className="text-slate-400 text-sm">No saved insights yet.</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Run an analysis and click &ldquo;Save to Library&rdquo;.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedInsights.map((s) => (
                    <SavedInsightCard
                      key={s.id}
                      saved={s}
                      onDelete={() => removeSavedInsight(s.id)}
                      onOpen={() => handleOpenSaved(s)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ SUGGESTIONS TAB ═══ */}
          {activeTab === 'suggestions' && (
            <div className="px-6 py-5">
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Pre-built intelligence queries tuned to your ontology. Click any to run an instant analysis.
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {SUGGESTION_QUERIES.map((s) => {
                  const meta = INTENT_META[s.intent];
                  return (
                    <button
                      key={s.query}
                      onClick={() => handleSuggestionClick(s.query)}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/60 transition-all group text-left"
                    >
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 text-sm ${meta.bg}`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium group-hover:${meta.color} transition-colors`}>
                          {s.label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{s.description}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Action footer ── */}
        {activeTab === 'analysis' && displayResult && (
          <div className="px-6 py-4 border-t border-slate-800 shrink-0 space-y-3">

            {/* Primary action row */}
            <div className="flex gap-2 flex-wrap">
              {/* Save to Library */}
              <button
                onClick={handleSaveToLibrary}
                disabled={savedState !== 'idle' || !!viewingSaved}
                title="Save this analysis to your insight library"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  savedState === 'done'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 disabled:opacity-40'
                }`}
              >
                {savedState === 'done' ? <><CheckCircle2 size={13} /> Saved!</> : <><BookmarkPlus size={13} /> Save</>}
              </button>

              {/* Add to Graph */}
              <button
                onClick={handleAddToGraph}
                disabled={graphState !== 'idle' || !!viewingSaved}
                title="Add this insight as a node in the ontology graph"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  graphState === 'done'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40'
                }`}
              >
                {graphState === 'done' ? <><CheckCircle2 size={13} /> Added!</> : <><Plus size={13} /> Add to Graph</>}
              </button>

              {/* Create Task */}
              <button
                onClick={handleCreateTask}
                disabled={taskState !== 'idle' || !!viewingSaved}
                title="Create a task entity from the top recommendation"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  taskState === 'done'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40'
                }`}
              >
                {taskState === 'done' ? <><CheckCircle2 size={13} /> Created!</> : <><Target size={13} /> Create Task</>}
              </button>

              {/* Export */}
              <button
                onClick={handleExport}
                title="Download analysis as a text report"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              >
                <Download size={13} /> Export
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                title="Copy shareable link to this analysis"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  shareState === 'done'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {shareState === 'done'
                  ? <><CheckCircle2 size={13} /> Copied!</>
                  : <><Share2 size={13} /> Share</>
                }
              </button>
            </div>

            {/* Secondary navigation row */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setCurrentView('analytics'); close(); }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <BarChart3 size={12} /> Analytics
              </button>
              <span className="text-slate-700">·</span>
              <button
                onClick={() => { setCurrentView('dashboard'); close(); }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <Network size={12} /> Graph
              </button>
              {!viewingSaved && searchQuery && (
                <>
                  <span className="text-slate-700">·</span>
                  <button
                    onClick={() => { setSearchQuery(''); }}
                    className="text-xs text-slate-500 hover:text-rose-400 transition-colors ml-auto"
                  >
                    Clear query
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
