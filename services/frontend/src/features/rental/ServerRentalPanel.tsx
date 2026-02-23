import { FormEvent, useEffect, useMemo, useState } from "react";
import { createServerOrder, estimateServerOrder, listRentalPlans, listServerOrders } from "../billing/api/billingApi";
import { RentalPlan, ServerOrder } from "../../types/api";
import { PageSectionHeader } from "../../design/patterns/PageSectionHeader";
import { Card } from "../../design/primitives/Card";
import { Select } from "../../design/primitives/Select";
import { Input } from "../../design/primitives/Input";
import { Button } from "../../design/primitives/Button";
import { useToast } from "../../design/components/Toast";
import { Table } from "../../design/components/Table";
import { EmptyState } from "../../design/patterns/EmptyState";

export function ServerRentalPanel() {
  const [plans, setPlans] = useState<RentalPlan[]>([]);
  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const [form, setForm] = useState<ServerOrder>({
    plan_id: "",
    os_name: "Ubuntu 22.04",
    network_mbps: 1000,
    cpu_cores: 8,
    ram_gb: 32,
    gpu_units: 1,
    period: "hourly"
  });
  const [estimate, setEstimate] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const selectedPlan = useMemo(() => plans.find((item) => item.id === form.plan_id), [plans, form.plan_id]);

  useEffect(() => {
    async function load() {
      try {
        const [planRows, orderRows] = await Promise.all([listRentalPlans(), listServerOrders()]);
        setPlans(planRows);
        setOrders(orderRows);
        if (planRows.length && !form.plan_id) {
          setForm((prev) => ({ ...prev, plan_id: planRows[0].id, period: planRows[0].period }));
        }
      } catch (error) {
        push("error", error instanceof Error ? error.message : "Не удалось загрузить аренду");
      }
    }
    load();
  }, []);

  async function handleEstimate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await estimateServerOrder(form);
      setEstimate(response.estimated_price_usd ?? 0);
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Ошибка расчета");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOrder() {
    setLoading(true);
    try {
      const created = await createServerOrder(form);
      setOrders((prev) => [created, ...prev]);
      setEstimate(created.estimated_price_usd ?? estimate);
      push("success", "Заказ на аренду сервера создан");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Ошибка создания заказа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Аренда серверов"
        description="Почасовые и помесячные планы с выбором ОС, сети и вычислительной конфигурации."
      />
      <Card title="Конфигуратор аренды" description="Шаг 1/3: выберите план и параметры сервера.">
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleEstimate}>
          <Select
            label="План"
            value={form.plan_id}
            onChange={(event) => {
              const nextPlan = plans.find((item) => item.id === event.target.value);
              setForm((prev) => ({
                ...prev,
                plan_id: event.target.value,
                period: (nextPlan?.period as "hourly" | "monthly") ?? prev.period
              }));
            }}
            options={plans.map((item) => ({ value: item.id, label: `${item.name} (${item.period === "hourly" ? "час" : "месяц"})` }))}
          />
          <Select
            label="ОС"
            value={form.os_name}
            onChange={(event) => setForm((prev) => ({ ...prev, os_name: event.target.value }))}
            options={[
              { value: "Ubuntu 22.04", label: "Ubuntu 22.04" },
              { value: "Ubuntu 24.04", label: "Ubuntu 24.04" },
              { value: "Debian 12", label: "Debian 12" }
            ]}
          />
          <Input label="CPU" value={`${form.cpu_cores}`} onChange={(event) => setForm((prev) => ({ ...prev, cpu_cores: Number(event.target.value) || 0 }))} />
          <Input label="RAM (GB)" value={`${form.ram_gb}`} onChange={(event) => setForm((prev) => ({ ...prev, ram_gb: Number(event.target.value) || 0 }))} />
          <Input label="GPU units" value={`${form.gpu_units}`} onChange={(event) => setForm((prev) => ({ ...prev, gpu_units: Number(event.target.value) || 0 }))} />
          <Input label="Сеть (Mbps)" value={`${form.network_mbps}`} onChange={(event) => setForm((prev) => ({ ...prev, network_mbps: Number(event.target.value) || 0 }))} />
          <div className="md:col-span-2 flex items-center gap-2">
            <Button type="submit" loading={loading}>Рассчитать стоимость</Button>
            <Button type="button" variant="secondary" onClick={handleCreateOrder} loading={loading}>
              Оформить аренду
            </Button>
            <span className="ml-auto text-sm text-textSecondary">
              {selectedPlan ? `Период: ${selectedPlan.period === "hourly" ? "почасовой" : "помесячный"} · ` : null}
              Итог: ${estimate.toFixed(2)}
            </span>
          </div>
        </form>
      </Card>

      <Card title="История заказов" description="Ваши созданные аренды серверов.">
        <Table
          ariaLabel="История аренды серверов"
          rowKey={(row) => row.id ?? `${row.plan_id}-${row.created_at}`}
          items={orders}
          emptyState={<EmptyState title="Нет заказов" description="Создайте первый заказ через конфигуратор." />}
          columns={[
            { key: "plan", header: "План", render: (row) => row.plan_id },
            { key: "os", header: "ОС", render: (row) => row.os_name },
            { key: "shape", header: "Конфиг", render: (row) => `${row.cpu_cores} CPU / ${row.ram_gb} RAM / ${row.gpu_units} GPU` },
            { key: "period", header: "Период", render: (row) => (row.period === "hourly" ? "час" : "месяц") },
            { key: "price", header: "Цена", render: (row) => `$${(row.estimated_price_usd ?? 0).toFixed(2)}` },
            { key: "status", header: "Статус", render: (row) => row.status ?? "created" }
          ]}
        />
      </Card>
    </section>
  );
}
