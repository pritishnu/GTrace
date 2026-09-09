"use client";

import { X, Phone, MapPin, FileText, ArrowUpRight, Hash, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useIsMobile } from "@/components/ui/use-mobile";
import { cn } from "@/lib/utils";
import { useGraphStore } from "@/lib/investigation/data-store";
import { getEdge, nodeColor } from "@/lib/investigation/graph-data";
import { riskLevel, type RiskLevel, type ScoredNode } from "@/lib/investigation/centrality";
import { useInvestigation } from "./investigation-context";

const RISK_STYLES: Record<RiskLevel, string> = {
  "Key Player":  "border-highlight/70 bg-highlight/10 text-highlight glow-highlight",
  "Mid-Tier":    "border-orange-400/50 bg-orange-400/10 text-orange-300",
  Associate:     "border-border bg-secondary text-foreground/80",
  Peripheral:    "border-border bg-transparent text-muted-foreground",
};

export function EntityPanel() {
  const { selectedNodeId, selectNode, clearSelection } = useInvestigation();
  const { scoredNodes } = useGraphStore();
  const isMobile = useIsMobile();

  const node = selectedNodeId ? scoredNodes.find((n) => n.id === selectedNodeId) : undefined;

  if (isMobile) {
    return (
      <Drawer open={Boolean(node)} onOpenChange={(open) => !open && selectNode(null)}>
        <DrawerContent className="dark max-h-[85dvh] rounded-none border-border bg-card text-foreground">
          {node && (
            <>
              <DrawerTitle className="sr-only">{node.name}</DrawerTitle>
              <DrawerDescription className="sr-only">Entity details</DrawerDescription>
              <PanelBody node={node} onClose={clearSelection} />
            </>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <aside
      aria-label="Entity details"
      aria-hidden={!node}
      className={cn(
        "absolute inset-y-0 right-0 z-20 w-[340px] border-l border-border bg-card/95 backdrop-blur-md transition-transform duration-300 ease-out",
        node ? "translate-x-0" : "translate-x-full",
      )}
    >
      {node && <PanelBody node={node} onClose={clearSelection} />}
    </aside>
  );
}

function PanelBody({ node, onClose }: { node: ScoredNode; onClose: () => void }) {
  const { selectNode } = useInvestigation();
  const { scoredNodes, graph } = useGraphStore();
  const color = nodeColor(node.role);
  const risk = riskLevel(node);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-border p-4">
        <span
          className="mt-1.5 size-3 shrink-0 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {node.role}
          </p>
          <h2 className="font-display text-xl leading-tight text-balance">{node.name}</h2>
          <span
            className={cn(
              "mt-2 inline-flex items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
              RISK_STYLES[risk],
            )}
          >
            {risk}
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close panel"
          className="size-8 shrink-0 rounded-none text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-6 p-4">

          {/* Attributes */}
          <section aria-labelledby="attrs-heading">
            <h3 id="attrs-heading" className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Attributes
            </h3>
            <ul className="flex flex-col gap-1.5">
              {node.phone && (
                <li className="flex items-center gap-2 border border-border bg-background/40 px-3 py-2 text-xs">
                  <Phone className="size-3.5 shrink-0 text-highlight" />
                  <span className="font-mono">{node.phone}</span>
                </li>
              )}
              {node.city && (
                <li className="flex items-center gap-2 border border-border bg-background/40 px-3 py-2 text-xs">
                  <MapPin className="size-3.5 shrink-0 text-highlight" />
                  <span>{node.city}</span>
                </li>
              )}
              {node.doc_count != null && (
                <li className="flex items-center gap-2 border border-border bg-background/40 px-3 py-2 text-xs">
                  <FileText className="size-3.5 shrink-0 text-highlight" />
                  <span>Appears in {node.doc_count} document{node.doc_count === 1 ? "" : "s"}</span>
                </li>
              )}
            </ul>
          </section>

          {/* Centrality */}
          <section aria-labelledby="centrality-heading">
            <h3 id="centrality-heading" className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Centrality
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Degree" value={node.degree} pct={node.degreeNorm} />
              <StatCard label="Betweenness" value={node.betweenness_centrality} pct={node.betweennessNorm} decimals={4} />
              <StatCard label="Closeness" value={node.closeness_centrality} pct={node.closeness_centrality} decimals={4} />
              <StatCard label="Eigenvector" value={node.eigenvector_centrality} pct={node.eigenvector_centrality} decimals={4} />
            </div>
          </section>

          {/* Connections */}
          <section aria-labelledby="connections-heading">
            <h3 id="connections-heading" className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Connections {"·"} {node.neighbours.length}
            </h3>
            {node.neighbours.length === 0 ? (
              <p className="border border-dashed border-border p-3 text-xs text-muted-foreground">
                No links to the network.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border border border-border">
                {node.neighbours.map((neighbourId) => {
                  const n = scoredNodes.find((s) => s.id === neighbourId);
                  const edge = graph ? getEdge(node.id, neighbourId, graph.edges) : undefined;
                  if (!n) return null;
                  return (
                    <li key={neighbourId}>
                      <button
                        type="button"
                        onClick={() => selectNode(neighbourId)}
                        className="group flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-accent"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: nodeColor(n.role) }}
                            aria-hidden="true"
                          />
                          <span className="flex-1 truncate text-sm">{n.name}</span>
                          <ArrowUpRight className="size-3.5 text-muted-foreground transition-colors group-hover:text-highlight" />
                        </div>
                        {edge && (
                          <EvidencePills edge={edge} />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Note about full record text */}
          <p className="border border-dashed border-border/50 p-3 font-mono text-[10px] text-muted-foreground/70">
            <Hash className="mb-0.5 inline size-3 mr-1" />
            Full FIR/CDR record text is not included in the current pipeline output
            (graph_output.json). <code>doc_count</code> and edge evidence IDs are
            available — document bodies require a separate ingestion step.
          </p>

        </div>
      </ScrollArea>
    </div>
  );
}

function EvidencePills({ edge }: { edge: { cdr_call: number; shared_vehicle: number; co_occurrence: number; shared_phone: number; shared_location: number; weight: number } }) {
  const pills: { label: string; val: number; cls: string }[] = [
    { label: "CDR",     val: edge.cdr_call,        cls: "text-amber-300 border-amber-400/50 bg-amber-400/10" },
    { label: "Vehicle", val: edge.shared_vehicle,   cls: "text-amber-300 border-amber-400/50 bg-amber-400/10" },
    { label: "Docs",    val: edge.co_occurrence,    cls: "text-muted-foreground border-border bg-transparent" },
    { label: "Phone",   val: edge.shared_phone,     cls: "text-muted-foreground border-border bg-transparent" },
    { label: "Loc",     val: edge.shared_location,  cls: "text-muted-foreground border-border bg-transparent" },
  ].filter((p) => p.val > 0);

  return (
    <div className="ml-4 flex flex-wrap gap-1">
      {pills.map((p) => (
        <span key={p.label} className={cn("border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide", p.cls)}>
          {p.label} ×{p.val}
        </span>
      ))}
      <span className="ml-auto font-mono text-[9px] text-muted-foreground/60">
        <Activity className="inline size-2.5 mr-0.5" />w={edge.weight}
      </span>
    </div>
  );
}

function StatCard({ label, value, pct, decimals = 0 }: { label: string; value: number; pct: number; decimals?: number }) {
  return (
    <div className="border border-border bg-background/40 p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl leading-none">
        {decimals > 0 ? value.toFixed(decimals) : value}
      </p>
      <div className="mt-2 h-1 w-full bg-secondary" role="presentation">
        <div
          className="h-full bg-highlight transition-[width] duration-500"
          style={{ width: `${Math.max(4, Math.round(pct * 100))}%` }}
        />
      </div>
    </div>
  );
}
