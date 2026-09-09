/**
 * centrality.ts
 * Derives ScoredNode objects from the pre-computed centrality list embedded
 * in graph_output.json (data.centrality[]).  No client-side algorithm needed.
 */

import type { PipelineGraph, PipelineEdge } from "./graph-data";
import { getNeighbours } from "./graph-data";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ScoredNode {
  id: string;
  name: string;
  role: string;
  // Raw node attributes
  phone?: string;
  city?: string;
  doc_count?: number;
  // Centrality
  degree: number;
  degree_centrality: number;
  betweenness_centrality: number;
  closeness_centrality: number;
  eigenvector_centrality: number;
  // Derived normalised [0-1] for sizing/colouring
  degreeNorm: number;
  betweennessNorm: number;
  // Neighbours (node IDs)
  neighbours: string[];
}

export type RiskLevel = "Key Player" | "Mid-Tier" | "Associate" | "Peripheral";

// ─── Build ScoredNode list from a loaded PipelineGraph ───────────────────────

export function buildScoredNodes(graph: PipelineGraph): ScoredNode[] {
  const { nodes, edges, centrality } = graph;

  // Build a lookup: name → centrality entry
  const centralityMap = new Map(centrality.map((c) => [c.name, c]));

  // Build a lookup: name → node attributes
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const maxBtw = Math.max(...centrality.map((c) => c.betweenness_centrality), 0.001);
  const maxDeg = Math.max(...centrality.map((c) => c.degree_centrality), 0.001);

  return nodes.map((n) => {
    const c = centralityMap.get(n.id);
    const attrs = nodeMap.get(n.id);
    const btw = c?.betweenness_centrality ?? 0;
    const deg = c?.degree_centrality ?? 0;
    return {
      id: n.id,
      name: n.id,
      role: n.role,
      phone: attrs?.phone,
      city: attrs?.city,
      doc_count: attrs?.doc_count,
      degree: c?.degree ?? 0,
      degree_centrality: deg,
      betweenness_centrality: btw,
      closeness_centrality: c?.closeness_centrality ?? 0,
      eigenvector_centrality: c?.eigenvector_centrality ?? 0,
      degreeNorm: deg / maxDeg,
      betweennessNorm: btw / maxBtw,
      neighbours: getNeighbours(n.id, edges),
    };
  });
}

// ─── Derived helpers ──────────────────────────────────────────────────────────

export function getTopPlayers(scored: ScoredNode[], count = 5): string[] {
  return [...scored]
    .sort(
      (a, b) =>
        b.betweenness_centrality + b.degree_centrality -
        (a.betweenness_centrality + a.degree_centrality),
    )
    .slice(0, count)
    .map((n) => n.id);
}

/** Top 10% by betweenness = "flagged" tier (rendered red). */
export function isFlaggedNode(node: ScoredNode, allNodes: ScoredNode[]): boolean {
  const sorted = [...allNodes].sort(
    (a, b) => b.betweenness_centrality - a.betweenness_centrality,
  );
  const cutoff = Math.max(1, Math.ceil(sorted.length * 0.1));
  return sorted.slice(0, cutoff).some((n) => n.id === node.id);
}

export function riskLevel(n: ScoredNode): RiskLevel {
  const score = n.degreeNorm * 0.4 + n.betweennessNorm * 0.6;
  if (score >= 0.5) return "Key Player";
  if (score >= 0.2) return "Mid-Tier";
  if (n.degree >= 2) return "Associate";
  return "Peripheral";
}
