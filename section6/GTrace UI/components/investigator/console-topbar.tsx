"use client";

import { useState } from "react";
import { Search, Crosshair, RefreshCw, Download, Eraser } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useInvestigation } from "./investigation-context";
import { IntegrityBadge } from "./integrity-badge";
import { exportInvestigationReport } from "@/lib/investigation/export-report";
import { useGraphStore } from "@/lib/investigation/data-store";

export function ConsoleTopbar() {
  const {
    searchQuery,
    setSearchQuery,
    highlightTopPlayers,
    toggleTopPlayers,
    refreshData,
    clearSelection,
    integrity,
  } = useInvestigation();
  const { scoredNodes, auditLog, loadState } = useGraphStore();
  const [spinning, setSpinning] = useState(false);

  function handleRefresh() {
    setSpinning(true);
    refreshData();
    toast("Data refreshed", { description: "Re-reading graph_output.json and audit_log.json." });
    setTimeout(() => setSpinning(false), 1200);
  }

  function handleExport() {
    if (scoredNodes.length === 0) {
      toast.error("No data", { description: "Pipeline data not yet loaded." });
      return;
    }
    exportInvestigationReport(scoredNodes, auditLog, integrity);
    toast("Report exported", { description: "GTrace_report.pdf saved to downloads." });
  }

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-sidebar px-3 py-2 md:h-14 md:flex-nowrap md:gap-3 md:py-0 lg:px-4">
      <div className="relative w-full md:w-auto md:flex-1 md:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search entities…"
          aria-label="Search entities"
          className="h-8 rounded-none border-border bg-background/60 pl-8 font-mono text-xs focus-visible:border-highlight focus-visible:ring-highlight/50"
        />
      </div>

      <div className="flex w-full items-center gap-1.5 md:ml-auto md:w-auto">
        <IntegrityBadge />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              aria-pressed={highlightTopPlayers}
              onClick={toggleTopPlayers}
              className={cn(
                "rounded-none border-border bg-transparent hover:bg-accent",
                highlightTopPlayers && "border-highlight/70 text-highlight glow-highlight hover:text-highlight",
              )}
            >
              <Crosshair className="size-3.5" />
              <span className="hidden lg:inline">Highlight Top Players</span>
              <span className="lg:hidden">Top</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Spotlight highest-betweenness nodes</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={handleRefresh}
              aria-label="Refresh data"
              className="size-8 rounded-none border-border bg-transparent hover:bg-accent"
            >
              <RefreshCw className={cn("size-3.5", (spinning || loadState === "loading") && "animate-spin")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Re-read JSON files (no page reload)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              className="rounded-none border-border bg-transparent hover:bg-accent"
            >
              <Download className="size-3.5" />
              <span className="hidden lg:inline">Export Report</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export PDF report from live data</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearSelection}
              className="rounded-none text-muted-foreground hover:text-foreground"
            >
              <Eraser className="size-3.5" />
              <span className="hidden lg:inline">Clear Selection</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset selection and highlights</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
