"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { verifyChain } from "@/lib/investigation/audit-log";
import { useGraphStore } from "@/lib/investigation/data-store";

export type IntegrityStatus = "idle" | "checking" | "verified" | "tampered";

interface InvestigationState {
  selectedNodeId: string | null;
  highlightTopPlayers: boolean;
  integrity: IntegrityStatus;
  brokenIndex: number | null;    // which audit entry broke the chain
  refreshKey: number;
  searchQuery: string;
  selectNode: (id: string | null) => void;
  toggleTopPlayers: () => void;
  runIntegrityCheck: () => void;
  refreshData: () => void;
  clearSelection: () => void;
  setSearchQuery: (q: string) => void;
}

const InvestigationContext = createContext<InvestigationState | null>(null);

export function InvestigationProvider({ children }: { children: ReactNode }) {
  const { reload, auditLog } = useGraphStore();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightTopPlayers, setHighlightTopPlayers] = useState(false);
  const [integrity, setIntegrity] = useState<IntegrityStatus>("idle");
  const [brokenIndex, setBrokenIndex] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const selectNode = useCallback((id: string | null) => setSelectedNodeId(id), []);
  const toggleTopPlayers = useCallback(() => setHighlightTopPlayers((v) => !v), []);
  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setHighlightTopPlayers(false);
    setSearchQuery("");
  }, []);

  const refreshData = useCallback(() => {
    reload();
    setRefreshKey((k) => k + 1);
  }, [reload]);

  const runIntegrityCheck = useCallback(() => {
    setIntegrity("checking");
    setBrokenIndex(null);
    void verifyChain(auditLog).then((result) => {
      setBrokenIndex(result.brokenIndex);
      setIntegrity(result.ok ? "verified" : "tampered");
    });
  }, [auditLog]);

  const value = useMemo<InvestigationState>(
    () => ({
      selectedNodeId,
      highlightTopPlayers,
      integrity,
      brokenIndex,
      refreshKey,
      searchQuery,
      selectNode,
      toggleTopPlayers,
      runIntegrityCheck,
      refreshData,
      clearSelection,
      setSearchQuery,
    }),
    [
      selectedNodeId,
      highlightTopPlayers,
      integrity,
      brokenIndex,
      refreshKey,
      searchQuery,
      selectNode,
      toggleTopPlayers,
      runIntegrityCheck,
      refreshData,
      clearSelection,
    ],
  );

  return <InvestigationContext.Provider value={value}>{children}</InvestigationContext.Provider>;
}

export function useInvestigation() {
  const ctx = useContext(InvestigationContext);
  if (!ctx) throw new Error("useInvestigation must be used within InvestigationProvider");
  return ctx;
}
