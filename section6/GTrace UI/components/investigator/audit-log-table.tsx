"use client";

import { Link2, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { truncateHash, formatTimestamp } from "@/lib/investigation/audit-log";
import { IntegrityBadge } from "./integrity-badge";
import { useInvestigation } from "./investigation-context";
import { useGraphStore } from "@/lib/investigation/data-store";
import { cn } from "@/lib/utils";

export function AuditLogTable() {
  const { integrity, brokenIndex, refreshData } = useInvestigation();
  const { auditLog, loadState } = useGraphStore();

  const genesisHash = "0".repeat(64);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            GTrace Pipeline
          </p>
          <h1 className="font-display text-2xl leading-tight">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Append-only hash-chained record of key-player identification events.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
            root {truncateHash(genesisHash)}
          </span>
          <Button
            size="icon"
            variant="outline"
            onClick={refreshData}
            aria-label="Reload audit log"
            className="size-8 rounded-none border-border bg-transparent hover:bg-accent"
          >
            <RefreshCw className={cn("size-3.5", loadState === "loading" && "animate-spin")} />
          </Button>
          <IntegrityBadge label="Verify Chain Integrity" />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {auditLog.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <p className="font-mono text-xs">
              {loadState === "loading" ? "Loading audit log…" : "No entries found"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-8  font-mono text-[10px] uppercase tracking-wider text-muted-foreground">#</TableHead>
                <TableHead className="w-44 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Timestamp</TableHead>
                <TableHead className="w-36 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Entity</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Event</TableHead>
                <TableHead className="w-48 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLog.map((entry) => {
                const isBroken = integrity === "tampered" && brokenIndex === entry.index;
                return (
                  <TableRow
                    key={entry.index}
                    className={cn("border-border", isBroken && "bg-destructive/10 hover:bg-destructive/15")}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{entry.index}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatTimestamp(entry.timestamp)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.details.node_id}
                    </TableCell>
                    <TableCell className="text-sm">{entry.event_type.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 font-mono text-xs" title={entry.entry_hash}>
                        <Link2
                          className={cn(
                            "size-3",
                            integrity === "verified" && "text-emerald-400",
                            isBroken && "text-red-400",
                            integrity !== "verified" && !isBroken && "text-muted-foreground",
                          )}
                        />
                        <span className={cn(isBroken && "text-red-300 line-through")}>
                          {truncateHash(entry.entry_hash)}
                        </span>
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}
