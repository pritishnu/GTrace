"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods, ForceGraphProps, LinkObject, NodeObject } from "react-force-graph-2d";
import { Plus, Minus, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ENTITY_TYPE_META, links, type EntityType } from "@/lib/investigation/graph-data";
import { getScoredNodes, getTopPlayers, type ScoredNode } from "@/lib/investigation/centrality";
import { useInvestigation } from "./investigation-context";
import { GraphLegend } from "./graph-legend";

type LinkExtra = { relation: string };
type GraphNode = NodeObject<ScoredNode>;
type GraphLink = LinkObject<ScoredNode, LinkExtra>;
type GraphMethods = ForceGraphMethods<GraphNode, GraphLink>;
type TypedForceGraphProps = ForceGraphProps<GraphNode, GraphLink> & {
  ref?: React.MutableRefObject<GraphMethods | undefined>;
};

// next/dynamic erases the library's generic signature, so re-assert it with our node/link types
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as unknown as React.ComponentType<TypedForceGraphProps>;

const HIGHLIGHT = "#f0b545";
const DIM_ALPHA = 0.1;

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

export function NetworkGraph() {
  const { selectedNodeId, selectNode, highlightTopPlayers, refreshKey, searchQuery } = useInvestigation();
  const fgRef = useRef<GraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  // Fresh copies per refresh so the simulation re-seeds (the library mutates link endpoints)
  const graphData = useMemo(
    () => ({
      nodes: getScoredNodes().map((n) => ({ ...n })) as GraphNode[],
      links: links.map((l) => ({ ...l })) as GraphLink[],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey],
  );

  const topPlayers = useMemo(() => new Set(getTopPlayers(5)), []);
  const scoredById = useMemo(() => new Map(getScoredNodes().map((n) => [n.id, n])), []);

  const neighborhood = useMemo(() => {
    if (!selectedNodeId) return null;
    const set = new Set<string>([selectedNodeId]);
    scoredById.get(selectedNodeId)?.neighbors.forEach((n) => set.add(n));
    return set;
  }, [selectedNodeId, scoredById]);

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      getScoredNodes()
        .filter((n) => n.name.toLowerCase().includes(q) || n.type.includes(q))
        .map((n) => n.id),
    );
  }, [searchQuery]);

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

  // Recenter whenever selection changes (from click or from the detail panel's connection list)
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !selectedNodeId) return;
    const node = graphData.nodes.find((n) => n.id === selectedNodeId);
    if (node?.x != null && node?.y != null) {
      const k = Math.max(fg.zoom(), 2.2);
      // On desktop the detail panel covers the right 340px, so center within the visible area
      const panelOffset = size.width >= 768 ? 170 / k : 0;
      fg.centerAt(node.x + panelOffset, node.y, 600);
      fg.zoom(k, 600);
    }
  }, [selectedNodeId, graphData, size.width]);

  const isFocused = useCallback(
    (id: string) => {
      if (searchMatches) return searchMatches.has(id);
      if (neighborhood) return neighborhood.has(id);
      if (highlightTopPlayers) return topPlayers.has(id);
      return true;
    },
    [searchMatches, neighborhood, highlightTopPlayers, topPlayers],
  );

  const anyFilter = Boolean(searchMatches || neighborhood || highlightTopPlayers);

  const radiusOf = (n: GraphNode) => 3 + n.degreeNorm * 9;

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (node.x == null || node.y == null) return;
      const r = radiusOf(node);
      const focused = isFocused(node.id);
      const alpha = anyFilter && !focused ? DIM_ALPHA : 1;
      const base = ENTITY_TYPE_META[node.type as EntityType].color;
      const isSelected = node.id === selectedNodeId;
      const isHover = node.id === hoverId;
      const isTop = highlightTopPlayers && topPlayers.has(node.id);
      const glow = (isSelected || isTop || (searchMatches && focused)) && alpha === 1;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (glow) {
        ctx.shadowColor = HIGHLIGHT;
        ctx.shadowBlur = isTop ? 22 : 16;
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, isTop ? r * 1.35 : r, 0, 2 * Math.PI);
      ctx.fillStyle = base;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (isSelected || isHover || isTop) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, (isTop ? r * 1.35 : r) + 2.2 / globalScale, 0, 2 * Math.PI);
        ctx.lineWidth = 1.4 / globalScale;
        ctx.strokeStyle = isSelected || isTop ? HIGHLIGHT : hexWithAlpha("#ffffff", 0.7);
        ctx.stroke();
      }

      const showLabel =
        alpha === 1 && (globalScale > 1.7 || node.degree >= 6 || isSelected || isHover || isTop);
      if (showLabel) {
        const fontSize = Math.max(10 / globalScale, 2.2);
        ctx.font = `${isSelected || isTop ? "600" : "400"} ${fontSize}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = isSelected || isTop ? HIGHLIGHT : "rgba(230,232,240,0.85)";
        ctx.fillText(node.name, node.x, node.y + r + 3 / globalScale);
      }
      ctx.restore();
    },
    [isFocused, anyFilter, selectedNodeId, hoverId, highlightTopPlayers, topPlayers, searchMatches],
  );

  const paintPointerArea = useCallback((node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
    if (node.x == null || node.y == null) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radiusOf(node) + 3, 0, 2 * Math.PI);
    ctx.fill();
  }, []);

  const linkColor = useCallback(
    (link: GraphLink) => {
      const s = endpointId(link.source);
      const t = endpointId(link.target);
      if (selectedNodeId && (s === selectedNodeId || t === selectedNodeId)) {
        return hexWithAlpha(HIGHLIGHT, 0.75);
      }
      if (anyFilter && !(isFocused(s) && isFocused(t))) return "rgba(120,130,160,0.06)";
      return "rgba(150,160,190,0.32)";
    },
    [selectedNodeId, anyFilter, isFocused],
  );

  const linkWidth = useCallback(
    (link: GraphLink) => {
      const s = endpointId(link.source);
      const t = endpointId(link.target);
      return selectedNodeId && (s === selectedNodeId || t === selectedNodeId) ? 1.6 : 0.8;
    },
    [selectedNodeId],
  );

  const nodeLabel = useCallback((node: GraphNode) => {
    const meta = ENTITY_TYPE_META[node.type as EntityType];
    return `<div class="graph-tooltip"><strong style="color:${meta.color}">${node.name}</strong><br/><span style="opacity:.7">${meta.label} · ${node.degree} links</span></div>`;
  }, []);

  const zoomBy = (factor: number) => {
    const fg = fgRef.current;
    if (fg) fg.zoom(fg.zoom() * factor, 300);
  };

  const resetView = () => fgRef.current?.zoomToFit(500, 48);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, oklch(0.3 0.012 260) 1px, transparent 0)",
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

      <div className="absolute bottom-4 right-4 flex flex-col border border-border bg-card/90 backdrop-blur-sm">
        <Button
          size="icon"
          variant="ghost"
          className="size-8 rounded-none border-b border-border"
          onClick={() => zoomBy(1.4)}
          aria-label="Zoom in"
        >
          <Plus className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 rounded-none border-b border-border"
          onClick={() => zoomBy(1 / 1.4)}
          aria-label="Zoom out"
        >
          <Minus className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 rounded-none"
          onClick={resetView}
          aria-label="Reset view"
        >
          <Maximize2 className="size-3.5" />
        </Button>
      </div>

      <div className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {getScoredNodes().length} entities {"·"} {links.length} links
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
