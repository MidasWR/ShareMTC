import { Drawer } from "../../../design/components/Drawer";
import { Card } from "../../../design/primitives/Card";
import { LogViewer } from "../../../design/patterns/LogViewer";
import { MetricTile } from "../../../design/patterns/MetricTile";
import { Allocation } from "../../../types/api";

type Props = {
  selected: Allocation | null;
  onClose: () => void;
};

export function AllocationDetailsDrawer({ selected, onClose }: Props) {
  return (
    <Drawer open={Boolean(selected)} title="Pod allocation details" onClose={onClose}>
      {selected ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <MetricTile label="CPU cores" value={`${selected.cpu_cores}`} />
            <MetricTile label="RAM MB" value={`${selected.ram_mb}`} />
            <MetricTile label="GPU units" value={`${selected.gpu_units}`} />
            <MetricTile label="State" value={selected.released_at ? "stopped" : "running"} />
          </div>
          <Card title="Endpoint" description="Resource API does not expose endpoint URL for allocation.">
            <p className="font-mono text-xs text-textSecondary">N/A in current API contract</p>
          </Card>
          <LogViewer
            title="Lifecycle log"
            lines={[
              `started_at=${selected.started_at}`,
              `released_at=${selected.released_at ?? "not released"}`,
              `provider_id=${selected.provider_id}`,
              `allocation_id=${selected.id}`
            ]}
          />
        </div>
      ) : null}
    </Drawer>
  );
}
