"use client";

import { ShieldCheck, ShieldX, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useInvestigation } from "./investigation-context";

interface IntegrityBadgeProps {
  label?: string;
  className?: string;
}

export function IntegrityBadge({ label = "Verify Integrity", className }: IntegrityBadgeProps) {
  const { integrity, runIntegrityCheck } = useInvestigation();

  if (integrity === "verified") {
    return (
      <button
        type="button"
        onClick={runIntegrityCheck}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 border border-emerald-400/50 bg-emerald-400/10 px-3 text-xs font-medium text-emerald-300 glow-success transition-colors hover:bg-emerald-400/15",
          className,
        )}
        aria-live="polite"
      >
        <ShieldCheck className="size-3.5" />
        Verified <span aria-hidden="true" style={{ fontFamily: "system-ui, sans-serif" }}>{"✓"}</span>
      </button>
    );
  }

  if (integrity === "tampered") {
    return (
      <button
        type="button"
        onClick={runIntegrityCheck}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 border border-destructive/60 bg-destructive/10 px-3 text-xs font-medium text-red-300 glow-danger transition-colors hover:bg-destructive/15",
          className,
        )}
        aria-live="assertive"
      >
        <ShieldX className="size-3.5" />
        Tampered <span aria-hidden="true" style={{ fontFamily: "system-ui, sans-serif" }}>{"✗"}</span>
      </button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={runIntegrityCheck}
      disabled={integrity === "checking"}
      className={cn("rounded-none bg-highlight text-highlight-foreground hover:bg-highlight/90", className)}
    >
      {integrity === "checking" ? <Spinner className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
      {integrity === "checking" ? "Checking chain…" : label}
    </Button>
  );
}
