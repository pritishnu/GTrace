import { NetworkGraph } from "@/components/investigator/network-graph";
import { EntityPanel } from "@/components/investigator/entity-panel";

export default function GraphViewPage() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <NetworkGraph />
      <EntityPanel />
    </div>
  );
}
