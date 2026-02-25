import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { listProviders } from "../../admin/api/adminApi";
import { listAllAccruals, getBillingStats } from "../../billing/api/billingApi";
import { listAgentLogs, listAllAllocations, getResourceStats, listHealthChecks, listMetricSummaries } from "../../resources/api/resourcesApi";
import { useToast } from "../../../design/components/Toast";
import { Table } from "../../../design/components/Table";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { MetricTile } from "../../../design/patterns/MetricTile";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Badge } from "../../../design/primitives/Badge";
import { AgentLog } from "../../../types/api";

type ProviderLoad = {
  provider: string;
  revenue: number;
};

export function AdminDashboardPanel() {
  const [loading, setLoading] = useState(false);
  const [resourceStats, setResourceStats] = useState({
    total_allocations: 0,
    running_allocations: 0,
    released_allocations: 0,
    cpu_cores_running: 0,
    ram_mb_running: 0,
    gpu_units_running: 0
  });
  const [billingStats, setBillingStats] = useState({ accrual_count: 0, total_amount_usd: 0, total_bonus_usd: 0, total_revenue_usd: 0 });
  const [topProviders, setTopProviders] = useState<ProviderLoad[]>([]);
  const [riskRows, setRiskRows] = useState<Array<{ provider: string; issue: string; severity: string }>>([]);
  const [healthRowsCount, setHealthRowsCount] = useState(0);
  const [metricRowsCount, setMetricRowsCount] = useState(0);
  const [agentLogRowsCount, setAgentLogRowsCount] = useState(0);
  const [agentLogRows, setAgentLogRows] = useState<AgentLog[]>([]);
  const { push } = useToast();

  async function refresh() {
    setLoading(true);
    try {
      const [providers, allocations, accruals, nextResourceStats, nextBillingStats, healthRows, metricRows, agentLogs] = await Promise.all([
        listProviders(),
        listAllAllocations(500, 0),
        listAllAccruals(500, 0),
        getResourceStats(),
        getBillingStats(),
        listHealthChecks({ limit: 300 }),
        listMetricSummaries(300),
        listAgentLogs({ limit: 300 })
      ]);
      setResourceStats(nextResourceStats);
      setBillingStats(nextBillingStats);
      setHealthRowsCount(healthRows.length);
      setMetricRowsCount(metricRows.length);
      setAgentLogRowsCount(agentLogs.length);
      setAgentLogRows(agentLogs.slice(0, 12));

      const revenueByProvider = new Map<string, number>();
      for (const item of accruals) {
        revenueByProvider.set(item.provider_id, (revenueByProvider.get(item.provider_id) ?? 0) + item.total_usd);
      }

      const providerName = new Map<string, string>();
      for (const provider of providers) {
        providerName.set(provider.id, provider.display_name);
      }

      const ranked = [...revenueByProvider.entries()]
        .map(([providerID, revenue]) => ({
          provider: providerName.get(providerID) ?? providerID,
          revenue: Number(revenue.toFixed(2))
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);
      setTopProviders(ranked);

      const runningByProvider = new Map<string, number>();
      for (const alloc of allocations) {
        if (!alloc.released_at) {
          runningByProvider.set(alloc.provider_id, (runningByProvider.get(alloc.provider_id) ?? 0) + 1);
        }
      }

      const risks = providers
        .map((provider) => {
          const running = runningByProvider.get(provider.id) ?? 0;
          if (!provider.online && running > 0) {
            return { provider: provider.display_name, issue: "Provider offline with active allocations", severity: "high" };
          }
          if (provider.online && running === 0) {
            return { provider: provider.display_name, issue: "Online but has zero running workload", severity: "medium" };
          }
          return null;
        })
        .filter((item): item is { provider: string; issue: string; severity: string } => item !== null)
        .slice(0, 12);
      setRiskRows(risks);
      push("info", "Admin dashboard updated");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Admin Dashboard"
        description="Operational cockpit for supply, risk, and monetization."
        actions={
          <Button variant="secondary" onClick={refresh} loading={loading}>
            Refresh data
          </Button>
        }
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Running allocations" value={`${resourceStats.running_allocations}`} />
        <MetricTile label="GPU in use" value={`${resourceStats.gpu_units_running}`} />
        <MetricTile label="Health records" value={`${healthRowsCount}`} />
        <MetricTile label="Metric streams" value={`${metricRowsCount}`} />
        <MetricTile label="Agent logs" value={`${agentLogRowsCount}`} />
      </div>

      <Card title="Top Providers by Revenue" description="Leaders by total accrual value.">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topProviders}>
              <XAxis dataKey="provider" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="rgba(var(--brand-rgb), 0.25)" stroke="rgb(var(--brand-rgb))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Risk Feed" description="Provider anomalies that require operations actions.">
        <Table
          dense
          ariaLabel="Admin risk feed"
          rowKey={(row) => `${row.provider}-${row.issue}`}
          items={riskRows}
          emptyState={<EmptyState title="No risks detected" description="No anomalies found for providers and allocations." />}
          columns={[
            { key: "provider", header: "Provider", render: (row) => row.provider },
            { key: "issue", header: "Issue", render: (row) => row.issue },
            {
              key: "severity",
              header: "Severity",
              render: (row) => (
                <Badge variant={row.severity === "high" ? "danger" : row.severity === "medium" ? "warning" : "neutral"}>
                  {row.severity}
                </Badge>
              )
            }
          ]}
        />
      </Card>

      <Card title="Agent Log Feed" description="Latest logs from provider agents for triage.">
        <Table
          dense
          ariaLabel="Admin agent logs"
          rowKey={(row) => `${row.id ?? ""}-${row.provider_id}-${row.message}`}
          items={agentLogRows}
          emptyState={<EmptyState title="No agent logs" description="No logs were ingested from hostagent." />}
          columns={[
            { key: "provider", header: "Provider", render: (row) => row.provider_id },
            { key: "level", header: "Level", render: (row) => row.level },
            { key: "message", header: "Message", render: (row) => row.message },
            { key: "created", header: "Created", render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : "-" }
          ]}
        />
      </Card>
    </section>
  );
}
