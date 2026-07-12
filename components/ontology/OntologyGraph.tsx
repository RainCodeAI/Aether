// components/ontology/OntologyGraph.tsx
'use client';

import React, { useCallback, useMemo, useState, useEffect, useRef, memo } from 'react';
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  BackgroundVariant, MarkerType, ReactFlowInstance,
  Handle, Position, NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Search, X } from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { OntologyNode } from '@/types';
import dagre from 'dagre';

// ─── Viewport cache ────────────────────────────────────────────────────────────
let viewportCache: { x: number; y: number; zoom: number } | null = null;

// ─── Type colours ─────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  Person:   '#22D3EE',
  Project:  '#A78BFA',
  Location: '#4ADE80',
  Metric:   '#FBBF24',
  Insight:  '#FB7185',
  Event:    '#FB923C',
  Document: '#94A3B8',
};

const TYPE_GLOW: Record<string, string> = {
  Person:   'rgba(34, 211, 238, 0.5)',
  Project:  'rgba(167, 139, 250, 0.5)',
  Location: 'rgba(74, 222, 128, 0.5)',
  Metric:   'rgba(251, 191, 36, 0.5)',
  Insight:  'rgba(251, 113, 133, 0.5)',
  Event:    'rgba(251, 146, 60, 0.5)',
  Document: 'rgba(148, 163, 184, 0.5)',
};

// First-letter abbreviation shown inside the type badge on each node
const TYPE_ABBR: Record<string, string> = {
  Person: 'P', Project: 'J', Location: 'L',
  Metric: 'M', Insight: 'I', Event: 'E', Document: 'D',
};

function nodeColor(type: string) { return TYPE_COLOR[type] ?? '#64748B'; }
function nodeGlow(type: string)  { return TYPE_GLOW[type]  ?? 'rgba(100, 116, 139, 0.5)'; }

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_W = 200;
const NODE_H = 72;

// ─── Custom node ──────────────────────────────────────────────────────────────
// Defined outside the component so React Flow never recreates nodeTypes.
// IMPORTANT: Do NOT set `transform` in node.style — React Flow uses it for
// positioning (translate). Scale/animation must go on a child element.

interface AetherNodeData { label: string; nodeType: string; color: string; isPulsed: boolean }

const AetherNode = memo(function AetherNode({ data }: NodeProps<AetherNodeData>) {
  const abbr  = TYPE_ABBR[data.nodeType] ?? data.nodeType[0] ?? '?';
  const label = data.label.length > 22 ? data.label.slice(0, 20) + '…' : data.label;

  return (
    <>
      {/* Invisible handles so React Flow draws edges correctly for LR layout */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0, pointerEvents: 'none', width: 1, height: 1, minWidth: 1, minHeight: 1 }}
      />
      {/* Pulse scale applied here, NOT on the outer ReactFlow wrapper */}
      <div
        className="flex items-center gap-2.5 w-full min-w-0"
        style={{
          transform: data.isPulsed ? 'scale(1.04)' : 'scale(1)',
          transformOrigin: 'center',
          transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Type badge */}
        <div
          className="w-[22px] h-[22px] rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold select-none"
          style={{
            background: `${data.color}22`,
            color: data.color,
            border: `1px solid ${data.color}45`,
          }}
        >
          {abbr}
        </div>
        {/* Label + type */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="text-[12.5px] font-medium leading-tight text-slate-100 truncate">
            {label}
          </div>
          <div
            className="text-[9px] uppercase tracking-widest font-semibold mt-[3px] truncate"
            style={{ color: `${data.color}90` }}
          >
            {data.nodeType}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0, pointerEvents: 'none', width: 1, height: 1, minWidth: 1, minHeight: 1 }}
      />
    </>
  );
});

// Must be a stable reference outside the component
const NODE_TYPES = { aether: AetherNode };

// ─── Smart key-property extractor ─────────────────────────────────────────────

function getSmartProps(node: OntologyNode): Array<{ key: string; val: string }> {
  const p = node.properties;

  const fmt = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return '';
    const s = typeof v === 'number' ? v.toLocaleString() : String(v);
    return s.length > 26 ? s.slice(0, 24) + '…' : s;
  };

  const pick = (...keys: string[]): Array<{ key: string; val: string }> =>
    keys.map(k => ({ key: k, val: fmt(p[k]) })).filter(x => x.val).slice(0, 3);

  switch (node.type) {
    case 'Person':
      return pick('role', 'email', 'location');
    case 'Project':
      return [
        p.status   !== undefined ? { key: 'Status',   val: String(p.status) }                              : null,
        p.budget   !== undefined ? { key: 'Budget',   val: `$${Number(p.budget).toLocaleString()}` }       : null,
        p.progress !== undefined ? { key: 'Progress', val: `${p.progress}%` }                              : null,
      ].filter(Boolean) as Array<{ key: string; val: string }>;
    case 'Location':
      return pick('city', 'province', 'type');
    case 'Metric':
      return [
        p.value !== undefined
          ? { key: 'Value', val: `${fmt(p.value)}${p.unit ? ` ${p.unit}` : ''}` }
          : null,
        p.trend !== undefined ? { key: 'Trend', val: String(p.trend) } : null,
      ].filter(Boolean) as Array<{ key: string; val: string }>;
    case 'Event':
      return pick('date', 'location', 'status');
    case 'Insight':
      return pick('intent', 'confidence');
    case 'Document':
      return pick('fileType', 'pages', 'source');
    default:
      return Object.entries(p)
        .filter(([, v]) => typeof v !== 'object' && v !== undefined && v !== null)
        .slice(0, 3)
        .map(([k, v]) => ({ key: k, val: fmt(v) }));
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OntologyGraph() {
  const { data, selectedNode, setSelectedNode } = useAetherStore();

  const [hoveredId,     setHoveredId]     = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [pulsedId,      setPulsedId]      = useState<string | null>(null);
  const [graphSearch,   setGraphSearch]   = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [rfInstance,    setRfInstance]    = useState<ReactFlowInstance | null>(null);

  // Hover tooltip anchor: screen coords captured once on node-enter
  const [tooltipAnchor, setTooltipAnchor] = useState<{ x: number; y: number } | null>(null);

  const prevNodeCount    = useRef(0);
  const pulsedTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef     = useRef<HTMLDivElement>(null);
  const searchInputRef   = useRef<HTMLInputElement>(null);
  const graphMouseActive = useRef(false);

  // ── Stage 1: Dagre layout ─────────────────────────────────────────────────

  const layout = useMemo(() => {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 50 });

    data.nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
    data.relationships.forEach(r => g.setEdge(r.from, r.to));
    dagre.layout(g);

    const positions = new Map<string, { x: number; y: number }>();
    data.nodes.forEach(n => {
      const p = g.node(n.id);
      if (p) positions.set(n.id, { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 });
    });

    return positions;
  }, [data]);

  // ── Stage 2: Connected-node sets ──────────────────────────────────────────

  const connectedToHovered = useMemo(() => {
    if (!hoveredId) return null;
    const ids = new Set<string>();
    data.relationships.forEach(r => {
      if (r.from === hoveredId) ids.add(r.to);
      if (r.to   === hoveredId) ids.add(r.from);
    });
    return ids;
  }, [hoveredId, data.relationships]);

  const connectedEdgeIds = useMemo(() => {
    if (!hoveredId) return null;
    return new Set(
      data.relationships
        .filter(r => r.from === hoveredId || r.to === hoveredId)
        .map(r => r.id)
    );
  }, [hoveredId, data.relationships]);

  const edgeEndpointNodes = useMemo(() => {
    if (!hoveredEdgeId) return null;
    const rel = data.relationships.find(r => r.id === hoveredEdgeId);
    if (!rel) return null;
    return new Set([rel.from, rel.to]);
  }, [hoveredEdgeId, data.relationships]);

  // ── Stage 3: Search matches ───────────────────────────────────────────────

  const searchMatches = useMemo(() => {
    const q = graphSearch.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      data.nodes
        .filter(n => {
          if (n.label.toLowerCase().includes(q)) return true;
          if (n.type.toLowerCase().includes(q))  return true;
          // Search all scalar property values (role, status, city, email, …)
          return Object.values(n.properties).some(v => {
            if (v === null || v === undefined || typeof v === 'object') return false;
            return String(v).toLowerCase().includes(q);
          });
        })
        .map(n => n.id)
    );
  }, [graphSearch, data.nodes]);

  // ── Stage 4: Build styled ReactFlow nodes + edges ─────────────────────────

  const { nodes, edges } = useMemo(() => {
    const rfNodes: Node[] = data.nodes.map(n => {
      const color          = nodeColor(n.type);
      const glow           = nodeGlow(n.type);
      const isSelected     = selectedNode?.id === n.id;
      const isHovered      = hoveredId === n.id;
      const isLinked       = connectedToHovered?.has(n.id) ?? false;
      const inSearch       = searchMatches?.has(n.id) ?? false;
      const isEdgeEndpoint = edgeEndpointNodes?.has(n.id) ?? false;
      const isPulsed       = pulsedId === n.id;

      let opacity = 1;
      if (searchMatches !== null) {
        opacity = inSearch ? 1 : 0.12;
      } else if (edgeEndpointNodes !== null) {
        opacity = isEdgeEndpoint ? 1 : 0.15;
      } else if (hoveredId !== null) {
        opacity = isHovered || isLinked ? 1 : 0.2;
      }

      const boxShadow =
        isPulsed
          ? `0 0 0 4px ${color}90, 0 0 44px ${glow}, 0 8px 24px rgba(0,0,0,0.4)`
          : isSelected
            ? `0 0 0 3px ${color}40, 0 0 28px ${glow}, 0 8px 24px rgba(0,0,0,0.4)`
            : isHovered
              ? `0 0 0 2px ${color}70, 0 0 28px ${glow}, 0 0 50px ${glow}40`
              : isLinked || isEdgeEndpoint
                ? `0 0 0 1px ${color}35, 0 0 14px ${glow}70`
                : (searchMatches !== null && inSearch)
                  ? `0 0 0 1px ${color}55, 0 0 22px ${glow}50, 0 4px 14px rgba(0,0,0,0.35)`
                  : '0 4px 12px rgba(0,0,0,0.3)';

      const pos = layout.get(n.id) ?? { x: 0, y: 0 };

      return {
        id:       n.id,
        type:     'aether',
        data:     { label: n.label, nodeType: n.type, color, isPulsed },
        position: pos,
        style: {
          background:   isSelected || isPulsed ? 'rgba(15, 23, 42, 1)' : '#1E2937',
          border:       `2px solid ${color}`,
          borderRadius: '14px',
          padding:      '10px 14px',
          width:        NODE_W,
          fontWeight:   isSelected || isPulsed ? 600 : 400,
          boxShadow,
          opacity,
          // NOTE: No transform/transformOrigin here — React Flow uses `transform`
          // on this element for translate positioning; overriding breaks layout.
          transition:   'opacity 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
          cursor:       'pointer',
        },
      };
    });

    const rfEdges: Edge[] = data.relationships.map(rel => {
      const isLinkedEdge  = connectedEdgeIds?.has(rel.id) ?? false;
      const isEdgeHovered = hoveredEdgeId === rel.id;
      // Edge stays visible if EITHER endpoint matches — shows connections radiating
      // outward from matched nodes even when the far endpoint is faded.
      const inSearch      = searchMatches !== null
        ? (searchMatches.has(rel.from) || searchMatches.has(rel.to))
        : true;

      let opacity = 1;
      if (searchMatches !== null) {
        opacity = inSearch ? 1 : 0.08;
      } else if (hoveredEdgeId !== null) {
        opacity = isEdgeHovered ? 1 : 0.06;
      } else if (hoveredId !== null) {
        opacity = isLinkedEdge ? 1 : 0.08;
      }

      const stroke =
        isEdgeHovered              ? '#67E8F9' :
        isLinkedEdge && hoveredId  ? '#22D3EE' :
        '#475569';

      const strokeWidth =
        isEdgeHovered              ? 3   :
        isLinkedEdge && hoveredId  ? 2.5 :
        1.5;

      return {
        id:     rel.id,
        source: rel.from,
        target: rel.to,
        label:  rel.type,
        type:   'smoothstep',
        style:  { stroke, strokeWidth, opacity },
        labelStyle: {
          fill:       isEdgeHovered ? '#A5F3FC' : isLinkedEdge && hoveredId ? '#67E8F9' : '#64748B',
          fontSize:   '10px',
          fontFamily: 'monospace',
          fontWeight: 500,
          opacity,
        },
        labelBgStyle: { fill: 'rgba(15, 23, 42, 0.9)', rx: 4, ry: 4 },
        markerEnd: {
          type:   MarkerType.ArrowClosed,
          color:  stroke,
          width:  16,
          height: 16,
        },
      };
    });

    return { nodes: rfNodes, edges: rfEdges };
  }, [data, layout, selectedNode, hoveredId, hoveredEdgeId, pulsedId, connectedToHovered, connectedEdgeIds, edgeEndpointNodes, searchMatches]);

  // ── Zoom persistence ──────────────────────────────────────────────────────

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setRfInstance(instance);
    if (!viewportCache) {
      instance.fitView({ padding: 0.2 });
    }
  }, []);

  const onMoveEnd = useCallback((_: unknown, viewport: { x: number; y: number; zoom: number }) => {
    viewportCache = viewport;
  }, []);

  useEffect(() => {
    if (!rfInstance) return;
    if (data.nodes.length !== prevNodeCount.current) {
      prevNodeCount.current = data.nodes.length;
      rfInstance.fitView({ padding: 0.2, duration: 400 });
    }
  }, [data.nodes.length, rfInstance]);

  // Ctrl / Cmd + F while hovering the graph → focus the search input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && graphMouseActive.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Interaction handlers ──────────────────────────────────────────────────

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const found = data.nodes.find(n => n.id === node.id);
    if (!found) return;
    setSelectedNode(found);
    if (pulsedTimer.current) clearTimeout(pulsedTimer.current);
    setPulsedId(node.id);
    pulsedTimer.current = setTimeout(() => setPulsedId(null), 620);
  }, [data.nodes, setSelectedNode]);

  const onPaneClick = useCallback(() => setSelectedNode(null), [setSelectedNode]);

  const onNodeMouseEnter = useCallback((e: React.MouseEvent, node: Node) => {
    setHoveredId(node.id);
    // Capture cursor position once for tooltip — no per-mousemove updates
    const x = e.clientX;
    const y = e.clientY;
    // Right-clamp so tooltip (max 240px wide) stays in viewport
    setTooltipAnchor({ x: Math.min(x + 14, window.innerWidth - 256), y });
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredId(null);
    setTooltipAnchor(null);
  }, []);

  const onEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: Edge) => {
    setHoveredEdgeId(edge.id);
  }, []);

  const onEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(null);
  }, []);

  // ── Hover tooltip content ─────────────────────────────────────────────────

  const tooltipNode: OntologyNode | null = useMemo(
    () => (hoveredId ? (data.nodes.find(n => n.id === hoveredId) ?? null) : null),
    [hoveredId, data.nodes]
  );

  const tooltipConnCount = useMemo(
    () => (hoveredId
      ? data.relationships.filter(r => r.from === hoveredId || r.to === hoveredId).length
      : 0),
    [hoveredId, data.relationships]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="relative h-[520px] w-full rounded-2xl overflow-hidden border border-slate-800"
      onMouseEnter={() => { graphMouseActive.current = true;  }}
      onMouseLeave={() => { graphMouseActive.current = false; }}
    >

      {/* ── In-graph search overlay ──────────────────────────────────────────── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[20] w-[280px] max-w-[calc(100%-2.5rem)]">

        {/* Input pill */}
        <div
          className={`flex items-center rounded-xl overflow-hidden transition-all duration-200 ${
            searchFocused || graphSearch
              ? 'border border-cyan-500/50 shadow-[0_0_0_1px_rgba(34,211,238,0.10),_0_8px_32px_rgba(0,0,0,0.65)]'
              : 'border border-slate-700/80 shadow-[0_6px_24px_rgba(0,0,0,0.5)] hover:border-slate-600/70'
          }`}
          style={{ background: 'rgba(7,11,22,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        >
          {/* Icon */}
          <div className="pl-3 shrink-0">
            <Search
              size={13}
              className={`transition-colors duration-200 ${(searchFocused || graphSearch) ? 'text-cyan-400' : 'text-slate-500'}`}
            />
          </div>

          {/* Text field */}
          <input
            ref={searchInputRef}
            type="text"
            value={graphSearch}
            onChange={e => setGraphSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setGraphSearch('');
                e.currentTarget.blur();
              }
            }}
            placeholder="Search graph…"
            className="flex-1 min-w-0 bg-transparent pl-2 pr-1 py-[7px] text-xs text-slate-200 placeholder-slate-600 focus:outline-none caret-cyan-400"
          />

          {/* Match count badge — shown while search is active */}
          {searchMatches !== null && (
            <div className="shrink-0 px-1.5">
              <span
                className={`inline-flex items-center px-[7px] py-[2px] rounded-md text-[10px] font-mono tabular-nums leading-none border ${
                  searchMatches.size === 0
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-cyan-500/12 text-cyan-300 border-cyan-500/20'
                }`}
              >
                {searchMatches.size}
              </span>
            </div>
          )}

          {/* Clear button OR keyboard hint */}
          {graphSearch ? (
            <button
              onClick={() => { setGraphSearch(''); searchInputRef.current?.focus(); }}
              className="shrink-0 pl-1 pr-2.5 py-2 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Clear search"
            >
              <X size={11} />
            </button>
          ) : (
            <div className="shrink-0 pr-2.5 select-none pointer-events-none">
              <kbd className="text-[9px] font-mono text-slate-700 bg-slate-800/50 border border-slate-700/60 px-[5px] py-px rounded">
                ⌘F
              </kbd>
            </div>
          )}
        </div>

        {/* Match summary — shown when query is non-empty */}
        {searchMatches !== null && (
          <div className="flex items-center justify-center gap-1.5 mt-[7px]">
            <span className={`text-[10px] tabular-nums ${searchMatches.size === 0 ? 'text-rose-500/70' : 'text-slate-500'}`}>
              {searchMatches.size === 0
                ? 'No matches'
                : `${searchMatches.size} node${searchMatches.size !== 1 ? 's' : ''} matched`}
            </span>
            <span className="text-slate-700 text-[10px]">·</span>
            <span className="text-[10px] text-slate-700">ESC to clear</span>
          </div>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        onInit={onInit}
        onMoveEnd={onMoveEnd}
        defaultViewport={viewportCache ?? { x: 0, y: 0, zoom: 0.85 }}
        fitView={false}
        minZoom={0.2}
        maxZoom={2.5}
        defaultEdgeOptions={{ animated: false }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="#1E293B" gap={24} size={1} variant={BackgroundVariant.Dots} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={n => nodeColor((n.data as { nodeType?: string }).nodeType ?? '')}
          maskColor="rgba(10, 10, 12, 0.7)"
          nodeStrokeWidth={0}
        />
      </ReactFlow>

      {/* ── Rich hover tooltip (fixed, outside overflow-hidden) ──────────────── */}
      {tooltipNode && tooltipAnchor && (
        <GraphNodeTooltip
          node={tooltipNode}
          connCount={tooltipConnCount}
          x={tooltipAnchor.x}
          y={tooltipAnchor.y}
        />
      )}
    </div>
  );
}

// ─── Graph node tooltip ───────────────────────────────────────────────────────
// Rendered as position:fixed so it escapes the overflow:hidden container.

interface GraphTooltipProps {
  node: OntologyNode;
  connCount: number;
  x: number;
  y: number;
}

function GraphNodeTooltip({ node, connCount, x, y }: GraphTooltipProps) {
  const color     = TYPE_COLOR[node.type] ?? '#64748B';
  const keyProps  = getSmartProps(node);
  // Show above cursor unless too close to top of viewport
  const showBelow = y < 260;

  return (
    <div
      className="fixed z-[140] pointer-events-none"
      style={{
        left: x,
        top:  y,
        transform: showBelow ? 'translate(0, 10px)' : 'translate(0, calc(-100% - 10px))',
      }}
    >
      <div
        className="aether-tooltip rounded-2xl p-3.5 shadow-2xl"
        style={{
          width: '230px',
          background: 'rgba(7, 11, 26, 0.97)',
          border:     `1px solid ${color}38`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: `0 0 0 1px ${color}12, 0 16px 48px rgba(0,0,0,0.75), 0 0 32px ${color}0A`,
        }}
      >
        {/* Type badge */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
            style={{ background: `${color}22`, color, border: `1px solid ${color}40` }}
          >
            {node.type}
          </span>
        </div>

        {/* Label */}
        <p className="text-[13px] font-semibold text-slate-100 leading-snug mb-2.5 break-words">
          {node.label}
        </p>

        {/* Key properties */}
        {keyProps.length > 0 && (
          <div
            className="space-y-1 mb-2.5 pb-2.5 border-b"
            style={{ borderColor: `${color}18` }}
          >
            {keyProps.map(({ key, val }) => (
              <div key={key} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 capitalize shrink-0">{key}</span>
                <span className="text-slate-300 text-right truncate">{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Connection count */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
          {connCount} connection{connCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
