'use client';

import {
  DragDropContext, Droppable, Draggable,
  type DropResult, type DraggableProvidedDragHandleProps,
} from '@hello-pangea/dnd';
import {
  GripVertical, Sparkles, FolderOpen, BarChart3,
  ShieldAlert, TrendingUp, Zap, ChevronRight, Plus,
} from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { generateAutoInsights, type AutoInsight } from '@/lib/ai-search';
import EmptyState from '@/components/ui/EmptyState';
import Tooltip from '@/components/ui/Tooltip';

const DEFAULT_ORDER = ['intelligence-feed', 'active-projects', 'key-metrics'];

interface CardProps {
  dragHandleProps: DraggableProvidedDragHandleProps | null;
  isDragging: boolean;
}

const LIFT = 'border-cyan-500/25 shadow-[0_24px_64px_rgba(0,0,0,0.5),0_0_0_1px_rgba(6,182,212,0.2)] scale-[1.018] brightness-[1.04]';
const REST = 'border-slate-800/80';

// ─── Drag Handle ──────────────────────────────────────────────────────────────

function DragHandle({ props }: { props: DraggableProvidedDragHandleProps | null }) {
  return (
    <Tooltip content="Drag to reorder cards" position="top" delay={500}>
      <div
        {...(props ?? {})}
        className="cursor-grab active:cursor-grabbing ml-1 p-1.5 rounded-lg text-slate-700 hover:text-slate-400 hover:bg-slate-800/70 transition-colors opacity-0 group-hover/card:opacity-100 touch-none select-none"
        aria-label="Drag to reorder"
      >
        <GripVertical size={13} />
      </div>
    </Tooltip>
  );
}

// ─── Intelligence Feed ────────────────────────────────────────────────────────

function IntelligenceFeedCard({ dragHandleProps, isDragging }: CardProps) {
  const { data, setSearchQuery, setAIAnalystOpen } = useAetherStore();
  const insights = generateAutoInsights(data);

  const style = (severity: AutoInsight['severity']) =>
    ({
      risk:        { bg: 'bg-rose-500/6',    border: 'border-rose-500/20',    hover: 'hover:border-rose-500/40',    label: 'text-rose-300' },
      opportunity: { bg: 'bg-emerald-500/6', border: 'border-emerald-500/20', hover: 'hover:border-emerald-500/40', label: 'text-emerald-300' },
      info:        { bg: 'bg-cyan-500/6',    border: 'border-cyan-500/20',    hover: 'hover:border-cyan-500/40',    label: 'text-cyan-300' },
    })[severity];

  const icon = (severity: AutoInsight['severity']) => {
    if (severity === 'risk')        return <ShieldAlert size={13} className="text-rose-400" />;
    if (severity === 'opportunity') return <TrendingUp  size={13} className="text-emerald-400" />;
    return <Zap size={13} className="text-cyan-400" />;
  };

  return (
    <div className={`group/card glass rounded-3xl p-5 border transition-all duration-200 ${isDragging ? LIFT : REST}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles size={13} className="text-cyan-400" />
          Intelligence Feed
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-600 font-mono bg-slate-800/60 border border-slate-700/60 rounded-full px-2 py-0.5">
            {insights.length} signal{insights.length !== 1 ? 's' : ''}
          </span>
          <DragHandle props={dragHandleProps} />
        </div>
      </div>
      <div className="space-y-2 aether-stagger">
        {insights.map((insight) => {
          const s = style(insight.severity);
          return (
            <button
              key={insight.id}
              onClick={() => { setSearchQuery(insight.query); setAIAnalystOpen(true); }}
              className={`w-full text-left p-3.5 rounded-2xl border ${s.bg} ${s.border} ${s.hover} hover:brightness-110 transition-all duration-150 group press-scale`}
            >
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 mt-0.5">{icon(insight.severity)}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${s.label} mb-0.5 leading-snug`}>{insight.title}</p>
                  <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{insight.description}</p>
                </div>
                <ChevronRight size={11} className="text-slate-700 group-hover:text-slate-400 shrink-0 mt-0.5 transition-colors group-hover:translate-x-0.5 duration-150" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Active Projects ──────────────────────────────────────────────────────────

function ActiveProjectsCard({ dragHandleProps, isDragging }: CardProps) {
  const { data, setCurrentView, setSelectedNode, setNewEntityModalOpen } = useAetherStore();
  const projects = data.nodes.filter(n => n.type === 'Project');

  return (
    <div className={`group/card glass rounded-3xl p-5 border transition-all duration-200 ${isDragging ? LIFT : REST}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FolderOpen size={13} className="text-purple-400" />
          Active Projects
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentView('projects')}
            className="text-[11px] text-slate-600 hover:text-cyan-400 transition-colors flex items-center gap-1"
          >
            View all <ChevronRight size={11} />
          </button>
          <DragHandle props={dragHandleProps} />
        </div>
      </div>
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          color="purple"
          title="No projects tracked"
          description="Create a project to monitor budgets, milestones, and team connections."
          actions={[{ label: 'New Project', icon: Plus, onClick: () => setNewEntityModalOpen(true) }]}
          size="sm"
        />
      ) : (
        <div className="space-y-2 aether-stagger">
          {projects.slice(0, 4).map(project => {
            const progress = Number(project.properties.progress) || 0;
            const statusColor =
              project.properties.status === 'Active'   ? 'bg-emerald-400' :
              project.properties.status === 'At Risk'  ? 'bg-rose-400'    :
              project.properties.status === 'Complete' ? 'bg-slate-500'   : 'bg-amber-400';
            return (
              <button
                key={project.id}
                onClick={() => setSelectedNode(project)}
                className="w-full text-left px-3.5 py-3 bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-purple-500/30 hover:bg-slate-800/60 transition-all duration-150 group press-scale"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Tooltip
                    content={String(project.properties.status ?? 'Unknown')}
                    position="top"
                    delay={200}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
                  </Tooltip>
                  <span className="font-medium text-xs text-slate-200 group-hover:text-purple-300 transition-colors flex-1 truncate">{project.label}</span>
                  {project.properties.progress !== undefined && (
                    <span className="text-[10px] font-mono text-slate-500 tabular-nums">{progress}%</span>
                  )}
                </div>
                {project.properties.progress !== undefined && (
                  <Tooltip
                    content={`${progress}% complete · ${project.properties.status ?? 'In Progress'}`}
                    position="top"
                    delay={200}
                  >
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden w-full">
                      <div
                        className={`h-full rounded-full progress-fill ${
                          progress >= 70 ? 'bg-emerald-400' : progress >= 35 ? 'bg-cyan-400' : 'bg-rose-400'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </Tooltip>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Key Metrics ──────────────────────────────────────────────────────────────

function KeyMetricsCard({ dragHandleProps, isDragging }: CardProps) {
  const { data, setCurrentView, setSelectedNode, setNewEntityModalOpen } = useAetherStore();
  const metrics = data.nodes.filter(n => n.type === 'Metric');

  return (
    <div className={`group/card glass rounded-3xl p-5 border transition-all duration-200 ${isDragging ? LIFT : REST}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 size={13} className="text-amber-400" />
          Key Metrics
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentView('analytics')}
            className="text-[11px] text-slate-600 hover:text-cyan-400 transition-colors flex items-center gap-1"
          >
            Analytics <ChevronRight size={11} />
          </button>
          <DragHandle props={dragHandleProps} />
        </div>
      </div>
      {metrics.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          color="amber"
          title="No KPIs tracked"
          description="Add metrics to monitor revenue, growth, and performance over time."
          actions={[{ label: 'New Metric', icon: Plus, onClick: () => setNewEntityModalOpen(true) }]}
          size="sm"
        />
      ) : (
        <div className="divide-y divide-slate-800/60">
          {metrics.slice(0, 3).map(metric => {
            const val = metric.properties.value as number | string | undefined;
            const unit = metric.properties.unit;
            const display = typeof val === 'number'
              ? unit === 'USD' || String(metric.label).toLowerCase().match(/revenue|cost|budget/)
                ? `$${(val / 1000).toFixed(1)}k`
                : unit === '%' ? `${val}%` : val.toLocaleString()
              : val ?? '—';
            return (
              <button
                key={metric.id}
                onClick={() => setSelectedNode(metric)}
                className="w-full flex items-center justify-between py-3 group"
              >
                <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors truncate">{metric.label}</span>
                <Tooltip
                  content={
                    metric.properties.trend
                      ? `Trend: ${metric.properties.trend}${metric.properties.unit ? ` · ${metric.properties.unit}` : ''}`
                      : metric.label
                  }
                  position="left"
                  delay={200}
                >
                  <span className="text-sm font-semibold text-emerald-400 font-mono tabular-nums ml-3 shrink-0">{display}</span>
                </Tooltip>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Card registry ────────────────────────────────────────────────────────────

const CARDS: Record<string, React.ComponentType<CardProps>> = {
  'intelligence-feed': IntelligenceFeedCard,
  'active-projects':   ActiveProjectsCard,
  'key-metrics':       KeyMetricsCard,
};

// ─── Main export ──────────────────────────────────────────────────────────────

export default function DraggableRightColumn() {
  const { dashboardCardOrder, setDashboardCardOrder, data } = useAetherStore();
  const order = (dashboardCardOrder?.length ? dashboardCardOrder : DEFAULT_ORDER) as string[];

  const autoInsights = generateAutoInsights(data);
  const isVisible: Record<string, boolean> = {
    'intelligence-feed': autoInsights.length > 0,
    'active-projects':   true,
    'key-metrics':       true,
  };

  const visibleOrder = order.filter(id => isVisible[id] ?? true);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;

    const reordered = [...visibleOrder];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Merge reordered visible cards back into the full order, preserving hidden card positions
    let vi = 0;
    const newFull = order.map(id => (isVisible[id] ? reordered[vi++] : id));
    setDashboardCardOrder(newFull);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="dashboard-right-col" direction="vertical">
        {(droppable) => (
          <div
            ref={droppable.innerRef}
            {...droppable.droppableProps}
            className="col-span-1 lg:col-span-4 flex flex-col gap-4 sm:gap-5"
          >
            {visibleOrder.map((cardId, index) => {
              const Card = CARDS[cardId];
              if (!Card) return null;
              return (
                <Draggable key={cardId} draggableId={cardId} index={index}>
                  {(draggable, snapshot) => (
                    <div
                      ref={draggable.innerRef}
                      {...draggable.draggableProps}
                      style={{
                        ...draggable.draggableProps.style,
                        ...(snapshot.isDragging ? {} : { animationDelay: `${80 + index * 90}ms` }),
                      }}
                      className={snapshot.isDragging ? 'relative z-50' : 'aether-fade-up'}
                    >
                      <Card
                        dragHandleProps={draggable.dragHandleProps}
                        isDragging={snapshot.isDragging}
                      />
                    </div>
                  )}
                </Draggable>
              );
            })}
            {droppable.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
