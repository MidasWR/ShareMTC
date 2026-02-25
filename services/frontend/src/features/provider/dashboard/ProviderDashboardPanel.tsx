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
import { AgentLog, Allocation, UsageAccrual } from "../../../types/api";
import { loadProviderDashboard } from "../api/providerApi";
import { listAgentLogs, listHealthChecks, listMetrics, listSharedOffers, upsertSharedOffer } from "../../resources/api/resourcesApi";
import { PROVIDER_SHARED_CAPACITY_DEFAULTS } from "../../resources/defaults";


export function ProviderDashboardPanel() {
  const [providerID, setProviderID] = useState("");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [accruals, setAccruals] = useState<UsageAccrual[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState({ allocation_total: 0, allocation_running: 0, accrual_total_usd: 0, accrual_vip_bonus_usd: 0 });
  const [healthCount, setHealthCount] = useState(0);
  const [metricCount, setMetricCount] = useState(0);
  const [agentLogsCount, setAgentLogsCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState<AgentLog[]>([]);
  const [sharedOfferQty, setSharedOfferQty] = useState(0);
  const { push } = useToast();
  const installerCommand =
    "curl -fsSL https://raw.githubusercontent.com/MidasWR/ShareMTC/latest/installer/hostagent-node-installer.sh | sudo RESOURCE_API_URL=http://167.71.47.177 KAFKA_BROKERS=167.71.47.177:9092 IMAGE_REPO=midaswr/host-hostagent IMAGE_TAG=latest bash";

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
      const data = await loadProviderDashboard(providerID.trim());
      setAllocations(data.allocations);
      setAccruals(data.accruals);
      setMetrics(data.metrics);
      const [healthRows, metricRows] = await Promise.all([
        listHealthChecks({ resource_type: "vm", limit: 200 }),
        listMetrics({ resource_type: "vm", limit: 200 })
      ]);
      setHealthCount(healthRows.length);
      setMetricCount(metricRows.length);
      const [agentLogs, sharedOffers] = await Promise.all([
        listAgentLogs({ provider_id: providerID.trim(), limit: 200 }),
        listSharedOffers({ provider_id: providerID.trim() })
      ]);
      setAgentLogsCount(agentLogs.length);
      setRecentLogs(agentLogs.slice(0, 8));
      setSharedOfferQty(sharedOffers.reduce((sum, item) => sum + (item.available_qty || 0), 0));
      push("info", "Provider data synchronized");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to refresh provider dashboard");
      push("error", requestError instanceof Error ? requestError.message : "Failed to refresh provider dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function copyInstallerCommand() {
    try {
      await navigator.clipboard.writeText(installerCommand);
      push("success", "Installer command copied");
    } catch {
      push("error", "Clipboard unavailable");
    }
  }

  async function publishSharedCapacity() {
    if (!providerID.trim()) {
      push("error", "Provider ID is required");
      return;
    }
    try {
      await upsertSharedOffer({
        provider_id: providerID.trim(),
        resource_type: "gpu",
        title: "Provider Shared GPU Pool",
        description: "Shared GPU capacity for marketplace users",
        cpu_cores: PROVIDER_SHARED_CAPACITY_DEFAULTS.cpuCores,
        ram_mb: PROVIDER_SHARED_CAPACITY_DEFAULTS.ramMB,
        gpu_units: PROVIDER_SHARED_CAPACITY_DEFAULTS.gpuUnits,
        network_mbps: PROVIDER_SHARED_CAPACITY_DEFAULTS.networkMbps,
        quantity: PROVIDER_SHARED_CAPACITY_DEFAULTS.quantity,
        available_qty: PROVIDER_SHARED_CAPACITY_DEFAULTS.quantity,
        price_hourly_usd: PROVIDER_SHARED_CAPACITY_DEFAULTS.priceHourlyUSD,
        status: "active"
      });
      push("success", "Shared capacity published");
      await refresh();
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to publish shared capacity");
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Provider Dashboard"
        description="Utilization, revenue, and health of active shared-resource allocations."
      />

      <Card title="Provider Selector" description="Load dashboard data by provider ID.">
        <div className="grid gap-3 md:grid-cols-[2fr_auto]">
          <Input label="Provider ID" value={providerID} onChange={(event) => setProviderID(event.target.value)} placeholder="Provider UUID" />
          <Button className="md:mt-7" onClick={refresh} loading={loading}>
            Load dashboard
          </Button>
        </div>
        {!loading && error ? <div className="mt-4"><InlineAlert kind="error">{error}</InlineAlert></div> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <MetricTile label="Total allocations" value={`${allocations.length}`} />
          <MetricTile label="Running allocations" value={`${metrics.allocation_running || runningCount}`} />
          <MetricTile label="Total revenue" value={`$${totalRevenue.toFixed(2)}`} />
          <MetricTile label="Health/Metrics" value={`${healthCount}/${metricCount}`} />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <MetricTile label="Agent logs" value={`${agentLogsCount}`} />
          <MetricTile label="Shared offer qty" value={`${sharedOfferQty}`} />
        </div>
        <div className="mt-3">
          <p className="mb-2 text-xs text-textMuted">
            Publish source: <span className="font-medium text-textPrimary">Provider preset offer</span>
          </p>
          <Button variant="secondary" onClick={publishSharedCapacity}>Publish shared capacity</Button>
        </div>
      </Card>

      <Card title="Hostagent Install" description="One-command installer for provider hosts on cluster 167.71.47.177.">
        <div className="rounded-md border border-border bg-canvas p-3">
          <pre className="overflow-auto font-mono text-xs text-textSecondary">{installerCommand}</pre>
        </div>
        <div className="mt-3">
          <Button variant="secondary" onClick={copyInstallerCommand}>Copy curl command</Button>
        </div>
      </Card>

      <Card title="Allocation Feed" description="Current and historical resource allocations.">
        {loading ? <SkeletonBlock lines={5} /> : null}
        <Table
          dense
          ariaLabel="Provider allocation table"
          rowKey={(item) => item.id}
          items={!loading ? allocations : []}
          emptyState={<EmptyState title="No allocations yet" description="Start sharing resources to see utilization." />}
          columns={[
            { key: "id", header: "Allocation ID", render: (item) => <span className="font-mono text-xs">{item.id}</span> },
            { key: "cpu", header: "CPU", render: (item) => <span className="tabular-nums">{item.cpu_cores}</span> },
            { key: "ram", header: "RAM MB", render: (item) => <span className="tabular-nums">{item.ram_mb}</span> },
            { key: "gpu", header: "GPU", render: (item) => <span className="tabular-nums">{item.gpu_units}</span> },
            { key: "status", header: "Status", render: (item) => <StatusBadge status={item.released_at ? "stopped" : "running"} /> }
          ]}
        />
      </Card>
      <Card title="Recent Agent Logs" description="Latest messages delivered by hostagent for this provider.">
        <Table
          dense
          ariaLabel="Provider agent logs table"
          rowKey={(row) => `${row.created_at ?? ""}-${row.level}-${row.message}`}
          items={recentLogs}
          emptyState={<EmptyState title="No logs" description="No hostagent logs were received yet." />}
          columns={[
            { key: "level", header: "Level", render: (row) => row.level },
            { key: "message", header: "Message", render: (row) => row.message },
            { key: "created", header: "Created", render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : "-" }
          ]}
        />
      </Card>
    </section>
  );
}
