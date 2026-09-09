import { ROLE_COLOR } from "@/lib/investigation/graph-data";

const ROLES = [
  { role: "Key Person",  color: ROLE_COLOR["Key Person"] },
  { role: "Associate",   color: ROLE_COLOR["Associate"] },
  { role: "Unrelated",   color: ROLE_COLOR["Unrelated"] },
];

export function GraphLegend() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 border border-border bg-card/90 px-3 py-2.5 backdrop-blur-sm">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Node role
      </p>
      <ul className="flex flex-col gap-1.5">
        {ROLES.map(({ role, color }) => (
          <li key={role} className="flex items-center gap-2 text-xs text-foreground/85">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
            {role}
          </li>
        ))}
        <li className="flex items-center gap-2 text-xs text-foreground/85">
          <span className="size-2.5 rounded-full bg-[#e05c5c]" aria-hidden="true" />
          Flagged (top 10% betweenness)
        </li>
      </ul>
      <div className="mt-2.5 flex flex-col gap-1 border-t border-border pt-2 font-mono text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-px w-5 bg-[#f0b545]" aria-hidden="true" />
          CDR / Vehicle evidence
        </div>
        <div className="flex items-center gap-2">
          <span className="h-px w-5 bg-foreground/30" aria-hidden="true" />
          Co-occurrence only
        </div>
        <p className="mt-1">Node size = betweenness centrality</p>
      </div>
    </div>
  );
}
