import { ENTITY_TYPE_META, type EntityType } from "@/lib/investigation/graph-data";

const ORDER: EntityType[] = ["person", "organization", "location", "phone"];

export function GraphLegend() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 border border-border bg-card/90 px-3 py-2.5 backdrop-blur-sm">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Entity type</p>
      <ul className="flex flex-col gap-1.5">
        {ORDER.map((type) => (
          <li key={type} className="flex items-center gap-2 text-xs text-foreground/85">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: ENTITY_TYPE_META[type].color }}
              aria-hidden="true"
            />
            {ENTITY_TYPE_META[type].label}
          </li>
        ))}
      </ul>
      <p className="mt-2.5 border-t border-border pt-2 font-mono text-[10px] text-muted-foreground">
        Node size = degree centrality
      </p>
    </div>
  );
}
