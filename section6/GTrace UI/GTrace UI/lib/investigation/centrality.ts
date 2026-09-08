import { links, nodes, type EntityLink, type EntityNode } from "./graph-data";

export interface CentralityScores {
  degree: number;
  degreeNorm: number;
  betweenness: number;
  betweennessNorm: number;
}

export interface ScoredNode extends EntityNode, CentralityScores {
  neighbors: string[];
}

function buildAdjacency(nodeList: EntityNode[], linkList: EntityLink[]) {
  const adj = new Map<string, Set<string>>();
  nodeList.forEach((n) => adj.set(n.id, new Set()));
  linkList.forEach((l) => {
    adj.get(l.source)?.add(l.target);
    adj.get(l.target)?.add(l.source);
  });
  return adj;
}

/** Brandes' algorithm for betweenness centrality on an unweighted, undirected graph. */
function betweenness(adj: Map<string, Set<string>>): Map<string, number> {
  const ids = [...adj.keys()];
  const cb = new Map<string, number>(ids.map((id) => [id, 0]));

  for (const s of ids) {
    const stack: string[] = [];
    const pred = new Map<string, string[]>(ids.map((id) => [id, []]));
    const sigma = new Map<string, number>(ids.map((id) => [id, 0]));
    const dist = new Map<string, number>(ids.map((id) => [id, -1]));
    sigma.set(s, 1);
    dist.set(s, 0);
    const queue: string[] = [s];

    while (queue.length) {
      const v = queue.shift()!;
      stack.push(v);
      for (const w of adj.get(v) ?? []) {
        if (dist.get(w)! < 0) {
          queue.push(w);
          dist.set(w, dist.get(v)! + 1);
        }
        if (dist.get(w) === dist.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          pred.get(w)!.push(v);
        }
      }
    }

    const delta = new Map<string, number>(ids.map((id) => [id, 0]));
    while (stack.length) {
      const w = stack.pop()!;
      for (const v of pred.get(w)!) {
        delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
      }
      if (w !== s) cb.set(w, cb.get(w)! + delta.get(w)!);
    }
  }

  // Undirected: each pair counted twice
  cb.forEach((v, k) => cb.set(k, v / 2));
  return cb;
}

let cache: ScoredNode[] | null = null;

export function getScoredNodes(): ScoredNode[] {
  if (cache) return cache;
  const adj = buildAdjacency(nodes, links);
  const bc = betweenness(adj);
  const maxDeg = Math.max(...[...adj.values()].map((s) => s.size));
  const maxBc = Math.max(...bc.values()) || 1;

  cache = nodes.map((n) => {
    const neighbors = [...(adj.get(n.id) ?? [])];
    const degree = neighbors.length;
    const b = bc.get(n.id) ?? 0;
    return {
      ...n,
      neighbors,
      degree,
      degreeNorm: degree / maxDeg,
      betweenness: Math.round(b * 10) / 10,
      betweennessNorm: b / maxBc,
    };
  });
  return cache;
}

export function getScoredNode(id: string): ScoredNode | undefined {
  return getScoredNodes().find((n) => n.id === id);
}

export function getTopPlayers(count = 5): string[] {
  return [...getScoredNodes()]
    .sort((a, b) => b.degreeNorm + b.betweennessNorm - (a.degreeNorm + a.betweennessNorm))
    .slice(0, count)
    .map((n) => n.id);
}

export type RiskLevel = "Key Player" | "Mid-Tier" | "Associate" | "Peripheral";

export function riskLevel(n: ScoredNode): RiskLevel {
  const score = n.degreeNorm * 0.5 + n.betweennessNorm * 0.5;
  if (score >= 0.6) return "Key Player";
  if (score >= 0.25) return "Mid-Tier";
  if (n.degree >= 2) return "Associate";
  return "Peripheral";
}

export function getLinkRelation(a: string, b: string): string | undefined {
  return links.find(
    (l) => (l.source === a && l.target === b) || (l.source === b && l.target === a),
  )?.relation;
}
