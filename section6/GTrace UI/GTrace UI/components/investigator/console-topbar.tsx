"use client";

import { useState } from "react";
import { Search, Crosshair, RefreshCw, Download, Eraser, Bug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useInvestigation } from "./investigation-context";
import { IntegrityBadge } from "./integrity-badge";
import { exportInvestigationReport } from "@/lib/investigation/export-report";

export function ConsoleTopbar() {
  const {
    searchQuery,
    setSearchQuery,
    highlightTopPlayers,
    toggleTopPlayers,
    refreshData,
    clearSelection,
    tamperMode,
    setTamperMode,
  } = useInvestigation();
  const [spinning, setSpinning] = useState(false);

  function handleRefresh() {
    setSpinning(true);
    refreshData();
    toast("Data refreshed", { description: "Graph re-seeded from case file OP-KESTREL." });
    setTimeout(() => setSpinning(false), 900);
  }

  function handleExport() {
    exportInvestigationReport();
    toast("Report exported", { description: "OP-KESTREL_report.pdf saved to downloads." });
  }

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-sidebar px-3 py-2 md:h-14 md:flex-nowrap md:gap-3 md:py-0 lg:px-4">
      <div className="relative w-full md:w-auto md:flex-1 md:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search entities..."
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
          <TooltipContent>Spotlight highest-centrality nodes</TooltipContent>
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
              <RefreshCw className={cn("size-3.5", spinning && "animate-spin")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh data</TooltipContent>
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
          <TooltipContent>Export PDF report</TooltipContent>
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

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setTamperMode(!tamperMode)}
              aria-pressed={tamperMode}
              aria-label="Toggle tamper demo mode"
              className={cn(
                "ml-1 flex size-8 items-center justify-center border border-transparent text-muted-foreground/50 transition-colors hover:text-muted-foreground",
                tamperMode && "border-destructive/50 text-red-400",
              )}
            >
              <Bug className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Demo: {tamperMode ? "next check reports tampering" : "simulate tampered chain"}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
