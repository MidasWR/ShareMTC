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
import { Allocation, UsageAccrual } from "../../../types/api";
import { loadProviderDashboard } from "../api/providerApi";


export function ProviderDashboardPanel() {
  const [providerID, setProviderID] = useState("");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [accruals, setAccruals] = useState<UsageAccrual[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState({ allocation_total: 0, allocation_running: 0, accrual_total_usd: 0, accrual_vip_bonus_usd: 0 });
  const { push } = useToast();

  const runningCount = useMemo(() => allocations.filter((item) => !item.released_at).length, [allocations]);
  const totalRevenue = useMemo(() => accruals.reduce((sum, item) => sum + item.total_usd, 0), [accruals]);

  async function refresh() {
    if (!providerID.trim()) {
      push("error", "Требуется Provider ID");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await loadProviderDashboard(providerID.trim());
      setAllocations(data.allocations);
      setAccruals(data.accruals);
      setMetrics(data.metrics);
      push("info", "Данные провайдера синхронизированы");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Ошибка обновления дашборда");
      push("error", requestError instanceof Error ? requestError.message : "Ошибка обновления дашборда");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Дашборд провайдера"
        description="Утилизация, доходность и состояние активных аллокаций для shared-ресурсов."
      />

      <Card title="Выбор провайдера" description="Загрузка дашборда по конкретному Provider ID.">
        <div className="grid gap-3 md:grid-cols-[2fr_auto]">
          <Input label="Provider ID" value={providerID} onChange={(event) => setProviderID(event.target.value)} placeholder="UUID провайдера" />
          <Button className="md:mt-7" onClick={refresh} loading={loading}>
            Загрузить дашборд
          </Button>
        </div>
        {!loading && error ? <div className="mt-4"><InlineAlert kind="error">{error}</InlineAlert></div> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <MetricTile label="Всего аллокаций" value={`${allocations.length}`} />
          <MetricTile label="Активные аллокации" value={`${metrics.allocation_running || runningCount}`} />
          <MetricTile label="Общая выручка" value={`$${totalRevenue.toFixed(2)}`} />
          <MetricTile label="Состояние" value={metrics.allocation_running > 0 ? "активно" : "idle"} />
        </div>
      </Card>

      <Card title="Лента аллокаций" description="Текущие и исторические аллокации ресурсов.">
        {loading ? <SkeletonBlock lines={5} /> : null}
        <Table
          dense
          ariaLabel="Таблица аллокаций провайдера"
          rowKey={(item) => item.id}
          items={!loading ? allocations : []}
          emptyState={<EmptyState title="Аллокаций пока нет" description="Начните шеринг ресурсов, чтобы увидеть утилизацию." />}
          columns={[
            { key: "id", header: "ID аллокации", render: (item) => <span className="font-mono text-xs">{item.id}</span> },
            { key: "cpu", header: "CPU", render: (item) => <span className="tabular-nums">{item.cpu_cores}</span> },
            { key: "ram", header: "RAM МБ", render: (item) => <span className="tabular-nums">{item.ram_mb}</span> },
            { key: "gpu", header: "GPU", render: (item) => <span className="tabular-nums">{item.gpu_units}</span> },
            { key: "status", header: "Статус", render: (item) => <StatusBadge status={item.released_at ? "stopped" : "running"} /> }
          ]}
        />
      </Card>
    </section>
  );
}
