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
import { listVMs } from "../resources/api/resourcesApi";
import { AppTab } from "../../app/navigation/menu";

type Props = {
  onNavigate: (tab: AppTab) => void;
};

export function ServerRentalPanel({ onNavigate }: Props) {
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
  const [search, setSearch] = useState("");
  const [createTarget, setCreateTarget] = useState<AppTab>("vm");
  const { push } = useToast();

  const selectedPlan = useMemo(() => plans.find((item) => item.id === form.plan_id), [plans, form.plan_id]);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [planRows, orderRows] = await Promise.all([listRentalPlans(), listServerOrders()]);
        setPlans(planRows);
        setOrders(orderRows);
        if (planRows.length && !form.plan_id) {
          setForm((prev) => ({ ...prev, plan_id: planRows[0].id, period: planRows[0].period }));
        }
      } catch (error) {
        push("error", error instanceof Error ? error.message : "Failed to load rental data");
      }
    }
    loadInitial();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const [orderRows] = await Promise.all([listServerOrders(), listVMs({ search })]);
      setOrders(orderRows);
      push("info", "Server list refreshed");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to refresh servers");
    } finally {
      setLoading(false);
    }
  }

  async function handleEstimate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await estimateServerOrder(form);
      setEstimate(response.estimated_price_usd ?? 0);
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Estimation error");
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
      push("success", "Server order created");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to create order");
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((row) => (row.id || "").toLowerCase().includes(q) || row.plan_id.toLowerCase().includes(q) || row.os_name.toLowerCase().includes(q));
  }, [orders, search]);

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="My Servers"
        description="Manage your running instances, view logs, and configure new servers."
      />

      <Card title="Controls" description="Search, refresh, and create resources from one entry point.">
        <div className="grid gap-3 md:grid-cols-[2fr_auto_auto]">
          <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ID, plan, OS" />
          <Button className="md:mt-7" variant="secondary" onClick={refresh} loading={loading}>
            Refresh
          </Button>
          <div className="md:mt-7 flex items-center gap-2">
            <Select
              label="Create route"
              value={createTarget}
              onChange={(event) => setCreateTarget(event.target.value as AppTab)}
              options={[
                { value: "vm", label: "VM" },
                { value: "sharedVm", label: "Shared VM" },
                { value: "pods", label: "PODs" },
                { value: "sharedPods", label: "Shared PODs" },
                { value: "k8sClusters", label: "Kubernetes Cluster" }
              ]}
            />
            <Button onClick={() => onNavigate(createTarget)}>Create</Button>
          </div>
        </div>
      </Card>
      
      <Card title="Your Instances" description="Active and past server rentals.">
        <Table
          ariaLabel="Server history"
          rowKey={(row) => row.id ?? `${row.plan_id}-${row.created_at}`}
          items={filteredOrders}
          emptyState={<EmptyState title="No active servers" description="Configure and deploy your first server below." />}
          columns={[
            { key: "plan", header: "Plan", render: (row) => <span className="font-medium">{row.plan_id}</span> },
            { key: "shape", header: "Config", render: (row) => <span className="font-mono text-xs text-textSecondary">{row.cpu_cores} CPU / {row.ram_gb}GB / {row.gpu_units} GPU</span> },
            { key: "os", header: "OS", render: (row) => row.os_name },
            { key: "status", header: "Status", render: (row) => (
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${row.status === "active" ? "bg-success" : "bg-brand animate-pulseSoft"}`}></span>
                {row.status ?? "running"}
              </span>
            ) },
            { key: "actions", header: "Actions", render: () => <span className="text-textMuted text-xs">Use VM/POD tabs</span> }
          ]}
        />
      </Card>

      <Card title="Deploy New Server" description="Step 1/3: Select plan and configuration.">
        <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" onSubmit={handleEstimate}>
          <Select
            label="Plan"
            value={form.plan_id}
            onChange={(event) => {
              const nextPlan = plans.find((item) => item.id === event.target.value);
              setForm((prev) => ({
                ...prev,
                plan_id: event.target.value,
                period: (nextPlan?.period as "hourly" | "monthly") ?? prev.period
              }));
            }}
            options={plans.map((item) => ({ value: item.id, label: `${item.name} (${item.period})` }))}
          />
          <Select
            label="OS Template"
            value={form.os_name}
            onChange={(event) => setForm((prev) => ({ ...prev, os_name: event.target.value }))}
            options={[
              { value: "Ubuntu 22.04", label: "Ubuntu 22.04" },
              { value: "Ubuntu 24.04", label: "Ubuntu 24.04" },
              { value: "Debian 12", label: "Debian 12" }
            ]}
          />
          <Input label="CPU Cores" value={`${form.cpu_cores}`} onChange={(event) => setForm((prev) => ({ ...prev, cpu_cores: Number(event.target.value) || 0 }))} />
          <Input label="RAM (GB)" value={`${form.ram_gb}`} onChange={(event) => setForm((prev) => ({ ...prev, ram_gb: Number(event.target.value) || 0 }))} />
          <Input label="GPU units" value={`${form.gpu_units}`} onChange={(event) => setForm((prev) => ({ ...prev, gpu_units: Number(event.target.value) || 0 }))} />
          <Input label="Network (Mbps)" value={`${form.network_mbps}`} onChange={(event) => setForm((prev) => ({ ...prev, network_mbps: Number(event.target.value) || 0 }))} />
          <div className="md:col-span-2 lg:col-span-3 flex items-center gap-3 mt-2 border-t border-border pt-4">
            <Button type="submit" loading={loading} variant="secondary">Estimate Cost</Button>
            <Button type="button" onClick={handleCreateOrder} loading={loading}>
              Deploy Server
            </Button>
            <div className="ml-auto text-sm bg-elevated px-4 py-2 rounded-md border border-border">
              <span className="text-textSecondary mr-2">Estimated:</span>
              <span className="font-mono text-brand font-bold">${estimate.toFixed(2)}</span>
              <span className="text-xs text-textMuted ml-1">/{selectedPlan?.period === "hourly" ? "hr" : "mo"}</span>
            </div>
          </div>
        </form>
      </Card>
    </section>
  );
}
