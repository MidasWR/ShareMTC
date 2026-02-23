import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { listProviders } from "../../admin/api/adminApi";
import { listAllAccruals, getBillingStats } from "../../billing/api/billingApi";
import { listAllAllocations, getResourceStats } from "../../resources/api/resourcesApi";
import { useToast } from "../../../design/components/Toast";
import { Table } from "../../../design/components/Table";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { MetricTile } from "../../../design/patterns/MetricTile";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";

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
  const { push } = useToast();

  async function refresh() {
    setLoading(true);
    try {
      const [providers, allocations, accruals, nextResourceStats, nextBillingStats] = await Promise.all([
        listProviders(),
        listAllAllocations(500, 0),
        listAllAccruals(500, 0),
        getResourceStats(),
        getBillingStats()
      ]);
      setResourceStats(nextResourceStats);
      setBillingStats(nextBillingStats);

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
            return { provider: provider.display_name, issue: "Offline provider with active allocations", severity: "high" };
          }
          if (provider.online && running === 0) {
            return { provider: provider.display_name, issue: "Online but idle", severity: "medium" };
          }
          return null;
        })
        .filter((item): item is { provider: string; issue: string; severity: string } => item !== null)
        .slice(0, 12);
      setRiskRows(risks);
      push("info", "Admin dashboard refreshed");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Admin dashboard load failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Admin Dashboard"
        description="Operational admin cockpit for supply, risk, and monetization."
        actions={
          <Button variant="secondary" onClick={refresh} loading={loading}>
            Refresh admin data
          </Button>
        }
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Running allocations" value={`${resourceStats.running_allocations}`} />
        <MetricTile label="GPU units committed" value={`${resourceStats.gpu_units_running}`} />
        <MetricTile label="Accrual events" value={`${billingStats.accrual_count}`} />
        <MetricTile label="Revenue" value={`$${billingStats.total_revenue_usd.toFixed(2)}`} />
      </div>

      <Card title="Top providers by revenue" description="Current leaders based on accrual totals.">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topProviders}>
              <XAxis dataKey="provider" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#4f8cff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Risk feed" description="Provider state anomalies that require action.">
        <Table
          dense
          ariaLabel="Admin risk feed"
          rowKey={(row) => `${row.provider}-${row.issue}`}
          items={riskRows}
          emptyState={<EmptyState title="No risks detected" description="No anomalies across provider state and allocation patterns." />}
          columns={[
            { key: "provider", header: "Provider", render: (row) => row.provider },
            { key: "issue", header: "Issue", render: (row) => row.issue },
            { key: "severity", header: "Severity", render: (row) => row.severity }
          ]}
        />
      </Card>
    </section>
  );
}
