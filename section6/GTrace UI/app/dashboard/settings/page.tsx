import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — GTrace Investigator Console",
};

const SETTINGS = [
  { label: "Investigator", value: "INV-2291" },
  { label: "Clearance", value: "Level 3" },
  { label: "Active case", value: "OP-KESTREL" },
  { label: "Session timeout", value: "30 min" },
  { label: "Audit hashing", value: "SHA-256, chained" },
  { label: "Graph physics", value: "d3-force, decay 0.32" },
];

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Console</p>
        <h1 className="font-display text-2xl leading-tight">Settings</h1>
      </div>
      <dl className="grid max-w-2xl grid-cols-1 gap-px bg-border sm:grid-cols-2">
        {SETTINGS.map((s) => (
          <div key={s.label} className="bg-background px-6 py-4">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-sm">{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
