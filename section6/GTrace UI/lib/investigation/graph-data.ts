/**
 * graph-data.ts
 * Types and fetch helpers for the real pipeline output (section4/data/graph_output.json).
 * The pipeline embeds both graph topology AND centrality in a single JSON file.
 */

// ─── Node / Edge types matching graph_output.json ────────────────────────────

export interface PipelineNode {
  id: string;         // normalised name, e.g. "Arjun Malhotra"
  node_type: string;  // always "PERSON" in current pipeline
  role: string;       // "Key Person" | "Associate" | "Unrelated"
  phone?: string;
  city?: string;
  doc_count?: number; // # documents this person appears in
}

export interface PipelineEdge {
  source: string;
  target: string;
  weight: number;         // cumulative evidence score
  edge_types: string[];   // e.g. ["co_occurrence","cdr_call","shared_vehicle"]
  co_occurrence: number;
  cdr_call: number;
  shared_phone: number;
  shared_vehicle: number;
  shared_location: number;
  details?: Array<Record<string, string>>; // [{doc_id: "REP-0001"}, {phone: "900..."}, ...]
}

export interface PipelineCentralityEntry {
  name: string;
  role: string;
  degree: number;
  degree_centrality: number;
  betweenness_centrality: number;
  closeness_centrality: number;
  eigenvector_centrality: number;
}

export interface PipelineGraphMetadata {
  node_count: number;
  edge_count: number;
  source_file: string;
  edge_types: string[];
}

export interface PipelineGraph {
  metadata: PipelineGraphMetadata;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  centrality: PipelineCentralityEntry[];
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchGraphData(): Promise<PipelineGraph> {
  const res = await fetch("/data/graph_output.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load graph_output.json: ${res.status}`);
  return res.json() as Promise<PipelineGraph>;
}

// ─── Helper: get a node's neighbours from the edge list ──────────────────────

export function getNeighbours(nodeId: string, edges: PipelineEdge[]): string[] {
  const result: string[] = [];
  for (const e of edges) {
    if (e.source === nodeId) result.push(e.target);
    else if (e.target === nodeId) result.push(e.source);
  }
  return result;
}

// ─── Helper: get edge between two nodes ──────────────────────────────────────

export function getEdge(
  a: string,
  b: string,
  edges: PipelineEdge[],
): PipelineEdge | undefined {
  return edges.find(
    (e) => (e.source === a && e.target === b) || (e.source === b && e.target === a),
  );
}

// ─── Helper: classify a single edge as "strong" (CDR/vehicle) or plain ───────

export function isStrongEdge(edge: PipelineEdge): boolean {
  return edge.cdr_call > 0 || edge.shared_vehicle > 0;
}

// ─── Entity-type colour (all nodes are PERSON in current pipeline) ────────────

export const ROLE_COLOR: Record<string, string> = {
  "Key Person": "#8fb4ff",
  Associate:   "#a8d8a0",
  Unrelated:   "#888ea8",
};

export function nodeColor(role: string): string {
  return ROLE_COLOR[role] ?? "#888ea8";
}
