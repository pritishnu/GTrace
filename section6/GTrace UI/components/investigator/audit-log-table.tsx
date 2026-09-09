"use client";

import { Link2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { auditEntries, CHAIN_ROOT_HASH } from "@/lib/investigation/audit-log";
import { IntegrityBadge } from "./integrity-badge";
import { useInvestigation } from "./investigation-context";
import { cn } from "@/lib/utils";

function truncateHash(h: string) {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

export function AuditLogTable() {
  const { integrity } = useInvestigation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Case OP-KESTREL</p>
          <h1 className="font-display text-2xl leading-tight">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Append-only record of investigator and system actions. Each entry is hash-chained to its predecessor.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
            root {truncateHash(CHAIN_ROOT_HASH)}
          </span>
          <IntegrityBadge label="Verify Chain Integrity" />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-44 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Timestamp</TableHead>
              <TableHead className="w-24 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Actor</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Action</TableHead>
              <TableHead className="w-48 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Hash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditEntries.map((entry, i) => {
              const compromised = integrity === "tampered" && i === auditEntries.length - 4;
              return (
                <TableRow
                  key={entry.id}
                  className={cn("border-border", compromised && "bg-destructive/10 hover:bg-destructive/15")}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">{entry.timestamp}</TableCell>
                  <TableCell className="font-mono text-xs">{entry.actor}</TableCell>
                  <TableCell className="text-sm">{entry.action}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 font-mono text-xs" title={entry.hash}>
                      <Link2
                        className={cn(
                          "size-3",
                          integrity === "verified" && "text-emerald-400",
                          compromised && "text-red-400",
                          integrity !== "verified" && !compromised && "text-muted-foreground",
                        )}
                      />
                      <span className={cn(compromised && "text-red-300 line-through")}>{truncateHash(entry.hash)}</span>
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
