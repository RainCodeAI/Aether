// components/ontology/OntologyGraph.tsx
'use client';

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  BackgroundVariant, MarkerType, ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Search, X } from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import dagre from 'dagre';

// ─── Viewport cache ────────────────────────────────────────────────────────────
// Module-level: survives component remount (view switches), reset on page reload.
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

function nodeColor(type: string)  { return TYPE_COLOR[type] ?? '#64748B'; }
function nodeGlow(type: string)   { return TYPE_GLOW[type]  ?? 'rgba(100, 116, 139, 0.5)'; }

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_W = 200;
const NODE_H = 72;

// ─── Component ────────────────────────────────────────────────────────────────

export default function OntologyGraph() {
  const { data, selectedNode, setSelectedNode } = useAetherStore();

  const [hoveredId,   setHoveredId]   = useState<string | null>(null);
  const [graphSearch, setGraphSearch] = useState('');
  const [rfInstance,  setRfInstance]  = useState<ReactFlowInstance | null>(null);

  const prevNodeCount = useRef(0);

  // ── Stage 1: Dagre layout ─────────────────────────────────────────────────
  // Only re-runs when data changes (not on hover/selection/search).

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

  // ── Stage 2: Connected-node sets (fast, updates on hover) ─────────────────

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

  // ── Stage 3: Search matches ───────────────────────────────────────────────

  const searchMatches = useMemo(() => {
    const q = graphSearch.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      data.nodes
        .filter(n => n.label.toLowerCase().includes(q) || n.type.toLowerCase().includes(q))
        .map(n => n.id)
    );
  }, [graphSearch, data.nodes]);

  // ── Stage 4: Build styled ReactFlow nodes + edges ─────────────────────────

  const { nodes, edges } = useMemo(() => {
    const rfNodes: Node[] = data.nodes.map(n => {
      const color      = nodeColor(n.type);
      const glow       = nodeGlow(n.type);
      const isSelected = selectedNode?.id === n.id;
      const isHovered  = hoveredId === n.id;
      const isLinked   = connectedToHovered?.has(n.id) ?? false;
      const inSearch   = searchMatches?.has(n.id) ?? false;

      // Opacity: search mode takes priority, then hover mode
      let opacity = 1;
      if (searchMatches !== null) {
        opacity = inSearch ? 1 : 0.12;
      } else if (hoveredId !== null) {
        opacity = isHovered || isLinked ? 1 : 0.2;
      }

      // Border glow
      const ringColor =
        isSelected ? `${color}60` :
        isHovered  ? `${color}80` :
        isLinked   ? `${color}40` :
        undefined;

      const boxShadow =
        isSelected
          ? `0 0 0 3px ${color}40, 0 0 28px ${glow}, 0 8px 24px rgba(0,0,0,0.4)`
          : isHovered
            ? `0 0 0 2px ${color}60, 0 0 20px ${glow}`
            : isLinked
              ? `0 0 0 1px ${color}30, 0 0 10px ${glow}60`
              : '0 4px 12px rgba(0,0,0,0.3)';

      const pos = layout.get(n.id) ?? { x: 0, y: 0 };

      return {
        id:       n.id,
        type:     'default',
        data:     { label: n.label, nodeType: n.type, color },
        position: pos,
        style: {
          background:   isSelected ? 'rgba(15, 23, 42, 1)' : '#1E2937',
          border:       `${isHovered || isLinked ? 2 : 2}px solid ${color}`,
          borderRadius: '14px',
          color:        '#E2E8F0',
          padding:      '10px 16px',
          width:        NODE_W,
          fontSize:     '13px',
          fontWeight:   isSelected ? 600 : 400,
          boxShadow,
          opacity,
          transition:   'opacity 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
          cursor:       'pointer',
        },
      };
    });

    const rfEdges: Edge[] = data.relationships.map(rel => {
      const isLinkedEdge = connectedEdgeIds?.has(rel.id) ?? false;
      const inSearch     = searchMatches !== null
        ? (searchMatches.has(rel.from) && searchMatches.has(rel.to))
        : true;

      let opacity = 1;
      if (searchMatches !== null) {
        opacity = inSearch ? 1 : 0.08;
      } else if (hoveredId !== null) {
        opacity = isLinkedEdge ? 1 : 0.08;
      }

      const stroke = isLinkedEdge && hoveredId ? '#22D3EE' : '#475569';

      return {
        id:     rel.id,
        source: rel.from,
        target: rel.to,
        label:  rel.type,
        type:   'smoothstep',
        style:  { stroke, strokeWidth: isLinkedEdge && hoveredId ? 2 : 1.5, opacity },
        labelStyle: {
          fill:       isLinkedEdge && hoveredId ? '#67E8F9' : '#64748B',
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
  }, [data, layout, selectedNode, hoveredId, connectedToHovered, connectedEdgeIds, searchMatches]);

  // ── Zoom persistence ──────────────────────────────────────────────────────

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setRfInstance(instance);
    if (!viewportCache) {
      instance.fitView({ padding: 0.2 });
    }
  }, []);

  // Save viewport whenever the user pans or zooms
  const onMoveEnd = useCallback((_: unknown, viewport: { x: number; y: number; zoom: number }) => {
    viewportCache = viewport;
  }, []);

  // Re-fit when nodes are added/removed (but not on style-only re-renders)
  useEffect(() => {
    if (!rfInstance) return;
    if (data.nodes.length !== prevNodeCount.current) {
      prevNodeCount.current = data.nodes.length;
      rfInstance.fitView({ padding: 0.2, duration: 400 });
    }
  }, [data.nodes.length, rfInstance]);

  // ── Interaction handlers ──────────────────────────────────────────────────

  const onNodeClick    = useCallback((_: React.MouseEvent, node: Node) => {
    const found = data.nodes.find(n => n.id === node.id);
    if (found) setSelectedNode(found);
  }, [data.nodes, setSelectedNode]);

  const onPaneClick    = useCallback(() => setSelectedNode(null), [setSelectedNode]);

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredId(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative h-[520px] w-full rounded-2xl overflow-hidden border border-slate-800">

      {/* In-graph search overlay */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-64">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={graphSearch}
            onChange={e => setGraphSearch(e.target.value)}
            placeholder="Filter graph…"
            className="w-full bg-slate-950/90 backdrop-blur-sm border border-slate-700 pl-8 pr-7 py-1.5 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500/70 transition-colors shadow-lg"
          />
          {graphSearch && (
            <button
              onClick={() => setGraphSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={11} />
            </button>
          )}
        </div>
        {searchMatches !== null && (
          <p className="text-center text-[10px] text-slate-600 mt-1.5">
            {searchMatches.size} node{searchMatches.size !== 1 ? 's' : ''} matched
          </p>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
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
    </div>
  );
}
