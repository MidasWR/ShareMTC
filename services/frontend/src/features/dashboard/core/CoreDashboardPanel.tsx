import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { listAllAccruals, getBillingStats } from "../../billing/api/billingApi";
import { getAdminStats } from "../../admin/api/adminApi";
import { getResourceStats, listHealthChecks, listMetricSummaries } from "../../resources/api/resourcesApi";
import { useToast } from "../../../design/components/Toast";
import { Card } from "../../../design/primitives/Card";
import { Button } from "../../../design/primitives/Button";
import { MetricTile } from "../../../design/patterns/MetricTile";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { SkeletonBlock } from "../../../design/patterns/SkeletonBlock";
import { Table } from "../../../design/components/Table";
import { EmptyState } from "../../../design/patterns/EmptyState";

type ChartPoint = {
  day: string;
  revenue: number;
};

export function CoreDashboardPanel() {
  const [loading, setLoading] = useState(false);
  const [adminStats, setAdminStats] = useState({ total_providers: 0, online_providers: 0, internal_providers: 0, donor_providers: 0 });
  const [resourceStats, setResourceStats] = useState({
    total_allocations: 0,
    running_allocations: 0,
    released_allocations: 0,
    cpu_cores_running: 0,
    ram_mb_running: 0,
    gpu_units_running: 0
  });
  const [billingStats, setBillingStats] = useState({ accrual_count: 0, total_amount_usd: 0, total_bonus_usd: 0, total_revenue_usd: 0 });
  const [healthSummary, setHealthSummary] = useState({ ok: 0, warning: 0, critical: 0 });
  const [metricSummaryCount, setMetricSummaryCount] = useState(0);
  const [anomalies, setAnomalies] = useState<Array<{ scope: string; issue: string; severity: "high" | "medium" | "low" }>>([]);
  const [series, setSeries] = useState<ChartPoint[]>([]);
  const { push } = useToast();

  const onlineRatio = useMemo(() => {
    if (!adminStats.total_providers) return "0%";
    return `${Math.round((adminStats.online_providers / adminStats.total_providers) * 100)}%`;
  }, [adminStats]);

  async function refresh() {
    setLoading(true);
    try {
      const [nextAdmin, nextResource, nextBilling, accrualRows, healthRows, metricSummary] = await Promise.all([
        getAdminStats(),
        getResourceStats(),
        getBillingStats(),
        listAllAccruals(200, 0),
        listHealthChecks({ limit: 200 }),
        listMetricSummaries(200)
      ]);
      setAdminStats(nextAdmin);
      setResourceStats(nextResource);
      setBillingStats(nextBilling);
      setMetricSummaryCount(metricSummary.length);
      const summary = healthRows.reduce(
        (acc, row) => {
          if (row.status === "critical") acc.critical += 1;
          else if (row.status === "warning") acc.warning += 1;
          else acc.ok += 1;
          return acc;
        },
        { ok: 0, warning: 0, critical: 0 }
      );
      setHealthSummary(summary);
      setAnomalies([
        ...(summary.critical > 0 ? [{ scope: "Global", issue: "Critical health checks detected", severity: "high" as const }] : []),
        ...(summary.warning > summary.ok ? [{ scope: "Global", issue: "Warning checks exceed healthy checks", severity: "medium" as const }] : []),
        ...(metricSummary.length === 0 ? [{ scope: "Metrics", issue: "No metric streams reported", severity: "low" as const }] : [])
      ]);

      const byDay = new Map<string, number>();
      for (const row of accrualRows) {
        const day = new Date(row.created_at).toISOString().slice(0, 10);
        byDay.set(day, (byDay.get(day) ?? 0) + row.total_usd);
      }
      const chartData = [...byDay.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .slice(-14)
        .map(([day, revenue]) => ({ day: day.slice(5), revenue: Number(revenue.toFixed(2)) }));
      setSeries(chartData);
      push("info", "Core dashboard updated");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to load core dashboard");
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
        title="Core Dashboard"
        description="System health, resource utilization, and revenue trend in one operational view."
        actions={
          <Button variant="secondary" onClick={refresh} loading={loading}>
            Refresh dashboard
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Online provider ratio" value={onlineRatio} />
        <MetricTile label="Running allocations" value={`${resourceStats.running_allocations}`} />
        <MetricTile label="Health checks (critical)" value={`${healthSummary.critical}`} />
        <MetricTile label="Metrics tracked" value={`${metricSummaryCount}`} />
      </div>

      <Card title="Revenue Trend (14 days)" description="Daily accrual flow from billing.">
        {loading ? <SkeletonBlock lines={4} /> : null}
        {!loading ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="rgb(var(--brand-rgb))" fill="rgba(var(--brand-rgb), 0.25)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricTile label="Health OK" value={`${healthSummary.ok}`} />
        <MetricTile label="Health warning" value={`${healthSummary.warning}`} />
        <MetricTile label="Total revenue" value={`$${billingStats.total_revenue_usd.toFixed(2)}`} />
      </div>

      <Card title="Anomaly Feed" description="Operational alerts to drive fast triage.">
        <Table
          dense
          ariaLabel="Core anomaly feed"
          rowKey={(row) => `${row.scope}-${row.issue}`}
          items={anomalies}
          emptyState={<EmptyState title="No active anomalies" description="Current checks and metrics are in expected range." />}
          columns={[
            { key: "scope", header: "Scope", render: (row) => row.scope },
            { key: "issue", header: "Issue", render: (row) => row.issue },
            { key: "severity", header: "Severity", render: (row) => row.severity }
          ]}
        />
      </Card>
    </section>
  );
}
