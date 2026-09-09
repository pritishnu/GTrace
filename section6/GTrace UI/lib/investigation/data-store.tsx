/**
 * data-store.ts
 * React context that owns the loaded pipeline data.
 * Exposes `useGraphStore()` hook consumed by components.
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchGraphData, type PipelineGraph } from "./graph-data";
import { buildScoredNodes, type ScoredNode } from "./centrality";
import { fetchAuditLog, type PipelineAuditEntry } from "./audit-log";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LoadState = "idle" | "loading" | "loaded" | "error";

export interface GraphStore {
  loadState: LoadState;
  loadError: string | null;
  graph: PipelineGraph | null;
  scoredNodes: ScoredNode[];
  auditLog: PipelineAuditEntry[];
  reload: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const GraphStoreContext = createContext<GraphStore | null>(null);

export function GraphStoreProvider({ children }: { children: ReactNode }) {
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [graph, setGraph] = useState<PipelineGraph | null>(null);
  const [scoredNodes, setScoredNodes] = useState<ScoredNode[]>([]);
  const [auditLog, setAuditLog] = useState<PipelineAuditEntry[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadState("loading");
    setLoadError(null);
    try {
      const [g, log] = await Promise.all([fetchGraphData(), fetchAuditLog()]);
      setGraph(g);
      setScoredNodes(buildScoredNodes(g));
      setAuditLog(log);
      setLoadState("loaded");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
      setLoadState("error");
    } finally {
      loadingRef.current = false;
    }
  }, []);

  // Initial load + reload on demand
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const value = useMemo<GraphStore>(
    () => ({ loadState, loadError, graph, scoredNodes, auditLog, reload }),
    [loadState, loadError, graph, scoredNodes, auditLog, reload],
  );

  return (
    <GraphStoreContext.Provider value={value}>
      {children}
    </GraphStoreContext.Provider>
  );
}

export function useGraphStore(): GraphStore {
  const ctx = useContext(GraphStoreContext);
  if (!ctx) throw new Error("useGraphStore must be used inside GraphStoreProvider");
  return ctx;
}
