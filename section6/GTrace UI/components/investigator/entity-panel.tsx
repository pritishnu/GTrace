"use client";

import { X, ArrowUpRight, FileText, Phone, Eye, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useIsMobile } from "@/components/ui/use-mobile";
import { cn } from "@/lib/utils";
import { ENTITY_TYPE_META, getLinkedRecords, type LinkedRecord } from "@/lib/investigation/graph-data";
import { getScoredNode, getLinkRelation, riskLevel, type RiskLevel } from "@/lib/investigation/centrality";
import { useInvestigation } from "./investigation-context";

const RISK_STYLES: Record<RiskLevel, string> = {
  "Key Player": "border-highlight/70 bg-highlight/10 text-highlight glow-highlight",
  "Mid-Tier": "border-orange-400/50 bg-orange-400/10 text-orange-300",
  Associate: "border-border bg-secondary text-foreground/80",
  Peripheral: "border-border bg-transparent text-muted-foreground",
};

const RECORD_ICONS: Record<LinkedRecord["kind"], typeof FileText> = {
  FIR: FileWarning,
  CDR: Phone,
  Report: FileText,
  Surveillance: Eye,
};

export function EntityPanel() {
  const { selectedNodeId, selectNode, clearSelection } = useInvestigation();
  const isMobile = useIsMobile();
  const node = selectedNodeId ? getScoredNode(selectedNodeId) : undefined;

  if (isMobile) {
    return (
      <Drawer open={Boolean(node)} onOpenChange={(open) => !open && selectNode(null)}>
        <DrawerContent className="dark max-h-[85dvh] rounded-none border-border bg-card text-foreground">
          {node && (
            <>
              <DrawerTitle className="sr-only">{node.name}</DrawerTitle>
              <DrawerDescription className="sr-only">Entity details</DrawerDescription>
              <PanelBody nodeId={node.id} onClose={clearSelection} />
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
      {node && <PanelBody nodeId={node.id} onClose={clearSelection} />}
    </aside>
  );
}

function PanelBody({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { selectNode } = useInvestigation();
  const node = getScoredNode(nodeId);
  if (!node) return null;

  const meta = ENTITY_TYPE_META[node.type];
  const risk = riskLevel(node);
  const records = getLinkedRecords(node.id);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <span
          className="mt-1.5 size-3 shrink-0 rounded-full"
          style={{ backgroundColor: meta.color, boxShadow: `0 0 10px ${meta.color}` }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{meta.label}</p>
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
          aria-label="Close panel and clear highlight"
          className="size-8 shrink-0 rounded-none text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-6 p-4">
          <section aria-labelledby="centrality-heading">
            <h3 id="centrality-heading" className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Centrality
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Degree" value={node.degree} pct={node.degreeNorm} />
              <StatCard label="Betweenness" value={node.betweenness} pct={node.betweennessNorm} />
            </div>
          </section>

          <section aria-labelledby="connections-heading">
            <h3 id="connections-heading" className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Connections {"·"} {node.neighbors.length}
            </h3>
            {node.neighbors.length === 0 ? (
              <p className="border border-dashed border-border p-3 text-xs text-muted-foreground">
                No links to the network. Possible red herring.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border border border-border">
                {node.neighbors.map((id) => {
                  const n = getScoredNode(id);
                  if (!n) return null;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => selectNode(id)}
                        className="group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent"
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: ENTITY_TYPE_META[n.type].color }}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{n.name}</span>
                          <span className="block truncate font-mono text-[10px] text-muted-foreground">
                            {getLinkRelation(node.id, id)}
                          </span>
                        </span>
                        <ArrowUpRight className="size-3.5 text-muted-foreground transition-colors group-hover:text-highlight" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="records-heading">
            <h3 id="records-heading" className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Linked Records {"·"} {records.length}
            </h3>
            <ul className="flex flex-col gap-2">
              {records.map((r) => {
                const Icon = RECORD_ICONS[r.kind];
                return (
                  <li key={r.id} className="border border-border bg-background/40 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Icon className="size-3.5 text-highlight" />
                      <span className="truncate text-xs font-medium">{r.title}</span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{r.date}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{r.excerpt}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

function StatCard({ label, value, pct }: { label: string; value: number; pct: number }) {
  return (
    <div className="border border-border bg-background/40 p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl leading-none">{value}</p>
      <div className="mt-2 h-1 w-full bg-secondary" role="presentation">
        <div
          className="h-full bg-highlight transition-[width] duration-500"
          style={{ width: `${Math.max(4, Math.round(pct * 100))}%` }}
        />
      </div>
    </div>
  );
}
