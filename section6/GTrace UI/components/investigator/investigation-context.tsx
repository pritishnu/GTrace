"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type IntegrityStatus = "idle" | "checking" | "verified" | "tampered";

interface InvestigationState {
  selectedNodeId: string | null;
  highlightTopPlayers: boolean;
  integrity: IntegrityStatus;
  tamperMode: boolean;
  refreshKey: number;
  searchQuery: string;
  selectNode: (id: string | null) => void;
  toggleTopPlayers: () => void;
  runIntegrityCheck: () => void;
  setTamperMode: (v: boolean) => void;
  refreshData: () => void;
  clearSelection: () => void;
  setSearchQuery: (q: string) => void;
}

const InvestigationContext = createContext<InvestigationState | null>(null);

export function InvestigationProvider({ children }: { children: ReactNode }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightTopPlayers, setHighlightTopPlayers] = useState(false);
  const [integrity, setIntegrity] = useState<IntegrityStatus>("idle");
  const [tamperMode, setTamperMode] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const selectNode = useCallback((id: string | null) => setSelectedNodeId(id), []);
  const toggleTopPlayers = useCallback(() => setHighlightTopPlayers((v) => !v), []);
  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setHighlightTopPlayers(false);
    setSearchQuery("");
  }, []);
  const refreshData = useCallback(() => setRefreshKey((k) => k + 1), []);

  const runIntegrityCheck = useCallback(() => {
    setIntegrity("checking");
    setTimeout(() => setIntegrity(tamperMode ? "tampered" : "verified"), 1400);
  }, [tamperMode]);

  const value = useMemo<InvestigationState>(
    () => ({
      selectedNodeId,
      highlightTopPlayers,
      integrity,
      tamperMode,
      refreshKey,
      searchQuery,
      selectNode,
      toggleTopPlayers,
      runIntegrityCheck,
      setTamperMode,
      refreshData,
      clearSelection,
      setSearchQuery,
    }),
    [
      selectedNodeId,
      highlightTopPlayers,
      integrity,
      tamperMode,
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
