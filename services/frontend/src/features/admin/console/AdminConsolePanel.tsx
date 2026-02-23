import { useMemo, useState } from "react";
import { listAllAccruals } from "../../billing/api/billingApi";
import { listAllAllocations } from "../../resources/api/resourcesApi";
import { useToast } from "../../../design/components/Toast";
import { Tabs } from "../../../design/primitives/Tabs";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Card } from "../../../design/primitives/Card";
import { Button } from "../../../design/primitives/Button";
import { Table } from "../../../design/components/Table";
import { AdminDashboardPanel } from "../../dashboard/admin/AdminDashboardPanel";
import { AdminServersPanel } from "../servers/AdminServersPanel";
import { SharingAdminPanel } from "../sharing/SharingAdminPanel";
import { getAgentInstallCommand } from "../api/adminApi";
import { AdminPodsPanel } from "../catalog/AdminPodsPanel";

type AdminTab = "overview" | "providers" | "pods" | "allocations" | "billing" | "risk";

export function AdminConsolePanel() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(false);
  const [allocations, setAllocations] = useState<Array<{ id: string; provider_id: string; cpu_cores: number; ram_mb: number; gpu_units: number; released_at?: string | null }>>([]);
  const [accruals, setAccruals] = useState<Array<{ id: string; provider_id: string; total_usd: number; vip_bonus_usd: number; created_at: string }>>([]);
  const [installCommand, setInstallCommand] = useState("");
  const { push } = useToast();

  async function refreshData() {
    setLoading(true);
    try {
      const [allocRows, accrualRows] = await Promise.all([listAllAllocations(200, 0), listAllAccruals(200, 0)]);
      setAllocations(allocRows);
      setAccruals(accrualRows);
      push("info", "Данные админ-консоли обновлены");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Ошибка обновления админ-консоли");
    } finally {
      setLoading(false);
    }
  }

  async function refreshInstallCommand() {
    try {
      const payload = await getAgentInstallCommand();
      setInstallCommand(payload.command);
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Не удалось получить команду установки");
    }
  }

  const riskRows = useMemo(() => {
    const runningByProvider = new Map<string, number>();
    for (const item of allocations) {
      if (!item.released_at) runningByProvider.set(item.provider_id, (runningByProvider.get(item.provider_id) ?? 0) + 1);
    }
    return [...runningByProvider.entries()]
      .filter(([, count]) => count > 5)
      .map(([providerID, count]) => ({
        provider_id: providerID,
        issue: "Высокая нагрузка по активным аллокациям",
        score: count
      }));
  }, [allocations]);

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Админ-консоль"
        description="Единый административный модуль: обзор, провайдеры, аллокации, биллинг и риск."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={refreshInstallCommand}>
              Обновить curl
            </Button>
            <Button variant="secondary" onClick={refreshData} loading={loading}>
              Обновить консоль
            </Button>
          </div>
        }
      />
      <Card title="Установка агента (one-command)" description="Скопируйте команду для установки hostagent на хост-машину.">
        <div className="rounded-md border border-border bg-elevated p-3 font-mono text-xs text-textSecondary">
          {installCommand || "Нажмите «Обновить curl», чтобы получить актуальную команду."}
        </div>
      </Card>
      <Tabs
        items={[
          { id: "overview", label: "Обзор" },
          { id: "providers", label: "Провайдеры" },
          { id: "pods", label: "Каталог Pods" },
          { id: "allocations", label: "Аллокации" },
          { id: "billing", label: "Биллинг" },
          { id: "risk", label: "Риски/шеринг" }
        ]}
        value={tab}
        onChange={(next) => setTab(next)}
      />

      {tab === "overview" ? <AdminDashboardPanel /> : null}
      {tab === "providers" ? <AdminServersPanel /> : null}
      {tab === "pods" ? <AdminPodsPanel /> : null}
      {tab === "risk" ? <SharingAdminPanel /> : null}

      {tab === "allocations" ? (
        <Card title="Реестр аллокаций" description="Админский поток аллокаций по всем провайдерам.">
          <Table
            dense
            ariaLabel="Админские аллокации"
            rowKey={(row) => row.id}
            items={allocations}
            emptyState={<EmptyState title="Аллокации не найдены" description="Поток аллокаций пуст за выбранный период." />}
            columns={[
              { key: "id", header: "Аллокация", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
              { key: "provider", header: "Провайдер", render: (row) => <span className="font-mono text-xs">{row.provider_id}</span> },
              { key: "cpu", header: "CPU", render: (row) => row.cpu_cores },
              { key: "ram", header: "RAM МБ", render: (row) => row.ram_mb },
              { key: "gpu", header: "GPU", render: (row) => row.gpu_units },
              { key: "status", header: "Статус", render: (row) => (row.released_at ? "освобождён" : "активен") }
            ]}
          />
        </Card>
      ) : null}

      {tab === "billing" ? (
        <Card title="Реестр биллинга" description="Поток начислений для сверки и контроля выплат.">
          <Table
            dense
            ariaLabel="Админские начисления биллинга"
            rowKey={(row) => row.id}
            items={accruals}
            emptyState={<EmptyState title="Начисления не найдены" description="Поток биллинга пуст за выбранный период." />}
            columns={[
              { key: "id", header: "Начисление", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
              { key: "provider", header: "Провайдер", render: (row) => <span className="font-mono text-xs">{row.provider_id}</span> },
              { key: "bonus", header: "Бонус", render: (row) => `$${row.vip_bonus_usd.toFixed(2)}` },
              { key: "total", header: "Итого", render: (row) => `$${row.total_usd.toFixed(2)}` },
              { key: "created", header: "Создано", render: (row) => new Date(row.created_at).toLocaleString() }
            ]}
          />
        </Card>
      ) : null}

      {tab === "risk" ? (
        <Card title="Автоматические сигналы риска" description="Производные риски по паттернам утилизации.">
          <Table
            dense
            ariaLabel="Админские сигналы риска"
            rowKey={(row) => `${row.provider_id}-${row.issue}`}
            items={riskRows}
            emptyState={<EmptyState title="Риски не обнаружены" description="Провайдеры под высокой нагрузкой не выявлены." />}
            columns={[
              { key: "provider", header: "Провайдер", render: (row) => row.provider_id },
              { key: "issue", header: "Проблема", render: (row) => row.issue },
              { key: "score", header: "Скор", render: (row) => row.score }
            ]}
          />
        </Card>
      ) : null}
    </section>
  );
}
