import type { Metadata } from "next";
import { FileText, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Reports — Optimus Investigator Console",
};

const REPORTS = [
  { id: "OP-KESTREL_v3", title: "Network analysis — OP-KESTREL v3", date: "2024-05-30", status: "Draft" },
  { id: "FIN-22", title: "Financial intelligence note FIN-22", date: "2024-04-28", status: "Filed" },
  { id: "SR-117", title: "Surveillance summary SR-117", date: "2024-04-19", status: "Filed" },
];

export default function ReportsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Case OP-KESTREL</p>
        <h1 className="font-display text-2xl leading-tight">Reports</h1>
      </div>
      <ul className="divide-y divide-border">
        {REPORTS.map((r) => (
          <li key={r.id} className="flex items-center gap-4 px-6 py-4">
            <FileText className="size-4 text-highlight" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{r.title}</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {r.id} {"·"} {r.date}
              </p>
            </div>
            <span className="border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {r.status}
            </span>
            <Lock className="size-3.5 text-muted-foreground" aria-label="Restricted" />
          </li>
        ))}
      </ul>
    </div>
  );
}
