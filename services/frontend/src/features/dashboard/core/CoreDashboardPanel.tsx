import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { listAllAccruals, getBillingStats } from "../../billing/api/billingApi";
import { getAdminStats } from "../../admin/api/adminApi";
import { getResourceStats } from "../../resources/api/resourcesApi";
import { useToast } from "../../../design/components/Toast";
import { Card } from "../../../design/primitives/Card";
import { Button } from "../../../design/primitives/Button";
import { MetricTile } from "../../../design/patterns/MetricTile";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { SkeletonBlock } from "../../../design/patterns/SkeletonBlock";

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
  const [series, setSeries] = useState<ChartPoint[]>([]);
  const { push } = useToast();

  const onlineRatio = useMemo(() => {
    if (!adminStats.total_providers) return "0%";
    return `${Math.round((adminStats.online_providers / adminStats.total_providers) * 100)}%`;
  }, [adminStats]);

  async function refresh() {
    setLoading(true);
    try {
      const [nextAdmin, nextResource, nextBilling, accrualRows] = await Promise.all([
        getAdminStats(),
        getResourceStats(),
        getBillingStats(),
        listAllAccruals(200, 0)
      ]);
      setAdminStats(nextAdmin);
      setResourceStats(nextResource);
      setBillingStats(nextBilling);

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
      push("info", "Дашборд платформы обновлён");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Ошибка загрузки дашборда платформы");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Дашборд платформы"
        description="Единый срез по здоровью системы, утилизации ресурсов и динамике выручки."
        actions={
          <Button variant="secondary" onClick={refresh} loading={loading}>
            Обновить дашборд
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Доля онлайн провайдеров" value={onlineRatio} />
        <MetricTile label="Активные аллокации" value={`${resourceStats.running_allocations}`} />
        <MetricTile label="Задействованные CPU" value={`${resourceStats.cpu_cores_running}`} />
        <MetricTile label="Суммарная выручка" value={`$${billingStats.total_revenue_usd.toFixed(2)}`} />
      </div>

      <Card title="Тренд выручки (14 дней)" description="Ежедневный поток начислений из биллинга.">
        {loading ? <SkeletonBlock lines={4} /> : null}
        {!loading ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#4f8cff" fill="#4f8cff55" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
