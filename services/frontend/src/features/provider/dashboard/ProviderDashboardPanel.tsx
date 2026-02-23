import { useMemo, useState } from "react";
import { Table } from "../../../design/components/Table";
import { useToast } from "../../../design/components/Toast";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { InlineAlert } from "../../../design/patterns/InlineAlert";
import { MetricTile } from "../../../design/patterns/MetricTile";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { SkeletonBlock } from "../../../design/patterns/SkeletonBlock";
import { StatusBadge } from "../../../design/patterns/StatusBadge";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { fetchJSON } from "../../../lib/http";
import { Allocation, UsageAccrual } from "../../../types/api";

const RESOURCE_BASE = import.meta.env.VITE_RESOURCE_BASE_URL ?? "http://localhost:8083";
const BILLING_BASE = import.meta.env.VITE_BILLING_BASE_URL ?? "http://localhost:8084";

export function ProviderDashboardPanel() {
  const [providerID, setProviderID] = useState("");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [accruals, setAccruals] = useState<UsageAccrual[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { push } = useToast();

  const runningCount = useMemo(() => allocations.filter((item) => !item.released_at).length, [allocations]);
  const totalRevenue = useMemo(() => accruals.reduce((sum, item) => sum + item.total_usd, 0), [accruals]);

  async function refresh() {
    if (!providerID.trim()) {
      push("error", "Provider ID is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [alloc, billing] = await Promise.all([
        fetchJSON<Allocation[]>(`${RESOURCE_BASE}/v1/resources/allocations?provider_id=${encodeURIComponent(providerID.trim())}`),
        fetchJSON<UsageAccrual[]>(`${BILLING_BASE}/v1/billing/accruals?provider_id=${encodeURIComponent(providerID.trim())}`)
      ]);
      setAllocations(alloc);
      setAccruals(billing);
      push("info", "Provider dashboard synced");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Dashboard refresh failed");
      push("error", requestError instanceof Error ? requestError.message : "Dashboard refresh failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Provider Dashboard"
        description="Track utilization, earnings, and current allocation health for shared resources."
      />

      <Card title="Provider selector" description="Load dashboard data for a specific provider ID.">
        <div className="grid gap-3 md:grid-cols-[2fr_auto]">
          <Input label="Provider ID" value={providerID} onChange={(event) => setProviderID(event.target.value)} placeholder="Provider UUID" />
          <Button className="md:mt-7" onClick={refresh} loading={loading}>
            Load dashboard
          </Button>
        </div>
        {!loading && error ? <div className="mt-4"><InlineAlert kind="error">{error}</InlineAlert></div> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <MetricTile label="Total allocations" value={`${allocations.length}`} />
          <MetricTile label="Running allocations" value={`${runningCount}`} />
          <MetricTile label="Total revenue" value={`$${totalRevenue.toFixed(2)}`} />
          <MetricTile label="Health state" value={runningCount > 0 ? "active" : "idle"} />
        </div>
      </Card>

      <Card title="Live allocations" description="Current and historical resource allocations.">
        {loading ? <SkeletonBlock lines={5} /> : null}
        <Table
          dense
          ariaLabel="Provider allocations dashboard table"
          rowKey={(item) => item.id}
          items={!loading ? allocations : []}
          emptyState={<EmptyState title="No allocations yet" description="Start sharing resources to see utilization here." />}
          columns={[
            { key: "id", header: "Allocation ID", render: (item) => <span className="font-mono text-xs">{item.id}</span> },
            { key: "cpu", header: "CPU", render: (item) => <span className="tabular-nums">{item.cpu_cores}</span> },
            { key: "ram", header: "RAM MB", render: (item) => <span className="tabular-nums">{item.ram_mb}</span> },
            { key: "gpu", header: "GPU", render: (item) => <span className="tabular-nums">{item.gpu_units}</span> },
            { key: "status", header: "Status", render: (item) => <StatusBadge status={item.released_at ? "stopped" : "running"} /> }
          ]}
        />
      </Card>
    </section>
  );
}
