import { MetricTile } from "../design/patterns/MetricTile";
import { Card } from "../design/primitives/Card";

export function OverviewPanel() {
  return (
    <section className="section-stack">
      <Card title="Platform overview" description="Operational summary for Pods-as-a-Service and marketplace compute roles.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Consumer flow" value="Create -> Run -> Stop" hint="CPU/GPU pod lifecycle" />
          <MetricTile label="Provider flow" value="Connect -> Heartbeat" hint="Node health and policy" />
          <MetricTile label="Billing flow" value="Usage -> Accrual" hint="VIP multiplier support" />
          <MetricTile label="Admin focus" value="Audit & blocks" hint="Anomaly management" />
        </div>
      </Card>
    </section>
  );
}
