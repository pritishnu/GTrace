"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods, ForceGraphProps, LinkObject, NodeObject } from "react-force-graph-2d";
import { Plus, Minus, Maximize2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGraphStore } from "@/lib/investigation/data-store";
import { getTopPlayers, isFlaggedNode, type ScoredNode } from "@/lib/investigation/centrality";
import { isStrongEdge, nodeColor, type PipelineEdge } from "@/lib/investigation/graph-data";
import { useInvestigation } from "./investigation-context";
import { GraphLegend } from "./graph-legend";

// ─── Force-graph types ────────────────────────────────────────────────────────

type GraphNode = NodeObject<ScoredNode>;
type GraphLink = LinkObject<ScoredNode, PipelineEdge>;
type GraphMethods = ForceGraphMethods<GraphNode, GraphLink>;
type TypedForceGraphProps = ForceGraphProps<GraphNode, GraphLink> & {
  ref?: React.MutableRefObject<GraphMethods | undefined>;
};

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as unknown as React.ComponentType<TypedForceGraphProps>;

// ─── Colour constants ─────────────────────────────────────────────────────────

const FLAGGED_COLOR  = "#e05c5c";   // top-10% betweenness — red/flagged
const HIGHLIGHT      = "#f0b545";   // selection / top-players glow
const STRONG_EDGE    = "#f0b545";   // CDR / shared-vehicle edges — amber
const WEAK_EDGE      = "rgba(150,160,190,0.32)";
const DIM_ALPHA      = 0.1;

function hexWithAlpha(hex: string, alpha: number) {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

function endpointId(end: string | number | GraphNode | undefined): string {
  if (end == null) return "";
  return typeof end === "object" ? String(end.id) : String(end);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NetworkGraph() {
  const { graph, scoredNodes, loadState, loadError } = useGraphStore();
  const { selectedNodeId, selectNode, highlightTopPlayers, refreshKey, searchQuery } = useInvestigation();

  const fgRef = useRef<GraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  // ── Derived data ──────────────────────────────────────────────────────────

  const graphData = useMemo(() => {
    if (!graph) return { nodes: [], links: [] };
    return {
      nodes: scoredNodes.map((n) => ({ ...n })) as GraphNode[],
      links: graph.edges.map((e) => ({ ...e })) as GraphLink[],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, scoredNodes, refreshKey]);

  const flaggedSet = useMemo(
    () => new Set(scoredNodes.filter((n) => isFlaggedNode(n, scoredNodes)).map((n) => n.id)),
    [scoredNodes],
  );

  const topPlayers = useMemo(
    () => new Set(getTopPlayers(scoredNodes, 5)),
    [scoredNodes],
  );

  const scoredById = useMemo(
    () => new Map(scoredNodes.map((n) => [n.id, n])),
    [scoredNodes],
  );

  const neighbourhood = useMemo(() => {
    if (!selectedNodeId) return null;
    const set = new Set<string>([selectedNodeId]);
    scoredById.get(selectedNodeId)?.neighbours.forEach((n) => set.add(n));
    return set;
  }, [selectedNodeId, scoredById]);

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      scoredNodes.filter((n) => n.name.toLowerCase().includes(q) || n.role.toLowerCase().includes(q)).map((n) => n.id),
    );
  }, [searchQuery, scoredNodes]);

  const anyFilter = Boolean(searchMatches || neighbourhood || highlightTopPlayers);

  // ── Resize observer ───────────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setSettled(false);
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength(-170);
    fg.d3Force("link")?.distance(42);
  }, [refreshKey, size.width]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !selectedNodeId) return;
    const node = graphData.nodes.find((n) => n.id === selectedNodeId);
    if (node?.x != null && node?.y != null) {
      const k = Math.max(fg.zoom(), 2.2);
      const panelOffset = size.width >= 768 ? 170 / k : 0;
      fg.centerAt(node.x + panelOffset, node.y, 600);
      fg.zoom(k, 600);
    }
  }, [selectedNodeId, graphData, size.width]);

  // ── Focus logic ───────────────────────────────────────────────────────────

  const isFocused = useCallback(
    (id: string) => {
      if (searchMatches) return searchMatches.has(id);
      if (neighbourhood) return neighbourhood.has(id);
      if (highlightTopPlayers) return topPlayers.has(id);
      return true;
    },
    [searchMatches, neighbourhood, highlightTopPlayers, topPlayers],
  );

  // ── Node size: scale by degree (original visual) ────────────────────────────

  const radiusOf = (n: GraphNode) => 3 + n.degreeNorm * 9;

  // ── Paint node ────────────────────────────────────────────────────────────

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (node.x == null || node.y == null) return;
      const r = radiusOf(node);
      const focused = isFocused(node.id);
      const alpha = anyFilter && !focused ? DIM_ALPHA : 1;
      const isSelected = node.id === selectedNodeId;
      const isHover    = node.id === hoverId;
      const isTop      = highlightTopPlayers && topPlayers.has(node.id);
      const isFlagged  = flaggedSet.has(node.id);

      // Node fill colour: flagged (top-10% betweenness) → red; else role colour
      const base = isFlagged ? FLAGGED_COLOR : nodeColor(node.role);
      const glow = (isSelected || isTop || (searchMatches && focused)) && alpha === 1;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (glow || isFlagged) {
        ctx.shadowColor = isFlagged ? FLAGGED_COLOR : HIGHLIGHT;
        ctx.shadowBlur  = isTop ? 24 : isFlagged ? 14 : 16;
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, isTop ? r * 1.35 : r, 0, 2 * Math.PI);
      ctx.fillStyle = base;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (isSelected || isHover || isTop || isFlagged) {
        ctx.beginPath();
        ctx.arc(
          node.x,
          node.y,
          (isTop ? r * 1.35 : r) + 2.2 / globalScale,
          0,
          2 * Math.PI,
        );
        ctx.lineWidth   = 1.6 / globalScale;
        ctx.strokeStyle =
          isSelected || isTop ? HIGHLIGHT : isFlagged ? FLAGGED_COLOR : hexWithAlpha("#ffffff", 0.7);
        ctx.stroke();
      }

      const showLabel =
        alpha === 1 && (globalScale > 1.5 || node.betweennessNorm > 0.3 || isSelected || isHover || isTop || isFlagged);
      if (showLabel) {
        const fontSize = Math.max(10 / globalScale, 2.2);
        ctx.font = `${isSelected || isTop || isFlagged ? "600" : "400"} ${fontSize}px ui-monospace, monospace`;
        ctx.textAlign     = "center";
        ctx.textBaseline  = "top";
        ctx.fillStyle     = isSelected || isTop ? HIGHLIGHT : isFlagged ? FLAGGED_COLOR : "rgba(230,232,240,0.85)";
        ctx.fillText(node.name, node.x, node.y + r + 3 / globalScale);
      }

      ctx.restore();
    },
    [isFocused, anyFilter, selectedNodeId, hoverId, highlightTopPlayers, topPlayers, flaggedSet, searchMatches],
  );

  const paintPointerArea = useCallback((node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
    if (node.x == null || node.y == null) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radiusOf(node) + 3, 0, 2 * Math.PI);
    ctx.fill();
  }, []);

  // ── Edge colours: CDR/vehicle edges amber, pure co-occurrence grey ─────────

  const linkColor = useCallback(
    (link: GraphLink) => {
      const s = endpointId(link.source);
      const t = endpointId(link.target);
      if (selectedNodeId && (s === selectedNodeId || t === selectedNodeId)) {
        return hexWithAlpha(HIGHLIGHT, 0.85);
      }
      if (anyFilter && !(isFocused(s) && isFocused(t))) return "rgba(120,130,160,0.05)";
      if (isStrongEdge(link as unknown as Parameters<typeof isStrongEdge>[0])) return hexWithAlpha(STRONG_EDGE, 0.6);
      return WEAK_EDGE;
    },
    [selectedNodeId, anyFilter, isFocused],
  );

  const linkWidth = useCallback(
    (link: GraphLink) => {
      const s = endpointId(link.source);
      const t = endpointId(link.target);
      const strong = isStrongEdge(link as unknown as Parameters<typeof isStrongEdge>[0]);
      if (selectedNodeId && (s === selectedNodeId || t === selectedNodeId)) return 2.2;
      return strong ? 1.8 : 0.7;
    },
    [selectedNodeId],
  );

  const nodeLabel = useCallback((node: GraphNode) => {
    const btw = node.betweenness_centrality?.toFixed(4) ?? "—";
    return `<div class="graph-tooltip"><strong>${node.name}</strong><br/><span style="opacity:.7">${node.role} · deg ${node.degree} · btw ${btw}</span></div>`;
  }, []);

  // ── Controls ──────────────────────────────────────────────────────────────

  const zoomBy = (factor: number) => {
    const fg = fgRef.current;
    if (fg) fg.zoom(fg.zoom() * factor, 300);
  };
  const resetView = () => fgRef.current?.zoomToFit(500, 48);

  // ── Loading / error overlays ──────────────────────────────────────────────

  if (loadState === "loading" || loadState === "idle") {
    return (
      <div ref={containerRef} className="relative flex h-full w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-highlight" />
          <p className="font-mono text-xs uppercase tracking-widest">Loading pipeline data…</p>
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div ref={containerRef} className="relative flex h-full w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="size-8 text-red-400" />
          <p className="font-mono text-xs text-red-300">Failed to load pipeline data</p>
          <p className="max-w-xs font-mono text-[10px] text-muted-foreground">{loadError}</p>
          <p className="max-w-xs font-mono text-[10px] text-muted-foreground">
            Ensure <code>public/data/graph_output.json</code> and <code>public/data/audit_log.json</code> exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-background">
      {/* dot-grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, oklch(0.3 0.012 260) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />

      {size.width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={size.width}
          height={size.height}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={paintPointerArea}
          nodeLabel={nodeLabel}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkCurvature={0.12}
          d3VelocityDecay={0.32}
          cooldownTicks={140}
          warmupTicks={30}
          onEngineStop={() => {
            if (!settled) {
              setSettled(true);
              fgRef.current?.zoomToFit(600, 48);
            }
          }}
          onNodeClick={(node) => selectNode(node.id)}
          onNodeHover={(node) => setHoverId(node ? node.id : null)}
          onBackgroundClick={() => selectNode(null)}
          enableNodeDrag
        />
      )}

      <GraphLegend />

      {/* zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col border border-border bg-card/90 backdrop-blur-sm">
        <Button size="icon" variant="ghost" className="size-8 rounded-none border-b border-border" onClick={() => zoomBy(1.4)} aria-label="Zoom in">
          <Plus className="size-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="size-8 rounded-none border-b border-border" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out">
          <Minus className="size-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="size-8 rounded-none" onClick={resetView} aria-label="Reset view">
          <Maximize2 className="size-3.5" />
        </Button>
      </div>

      {/* stats overlay */}
      <div className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {graph?.metadata.node_count ?? 0} entities {"·"} {graph?.metadata.edge_count ?? 0} links
        {highlightTopPlayers && <span className="ml-2 text-highlight">Top players</span>}
        {searchMatches && (
          <span className="ml-2 text-highlight">
            {searchMatches.size} match{searchMatches.size === 1 ? "" : "es"}
          </span>
        )}
      </div>
    </div>
  );
}
