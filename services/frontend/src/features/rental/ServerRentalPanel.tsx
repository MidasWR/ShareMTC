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
import { listVMs, startVM, stopVM, rebootVM, terminateVM } from "../resources/api/resourcesApi";
import { AppTab } from "../../app/navigation/menu";
import { StatusBadge } from "../../design/patterns/StatusBadge";
import { Badge } from "../../design/primitives/Badge";
import { FilterBar } from "../../design/components/FilterBar";
import { ActionDropdown } from "../../design/components/ActionDropdown";
import { listSharedOffers, reserveSharedOffer } from "../resources/api/resourcesApi";
import { SharedInventoryOffer } from "../../types/api";

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
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "queued" | "failed">("");
  const [typeFilter, setTypeFilter] = useState<"" | "hourly" | "monthly">("");
  const [createTarget, setCreateTarget] = useState<AppTab>("vm");
  const [vmByOrder, setVmByOrder] = useState<Record<string, string>>({});
  const [sharedOffers, setSharedOffers] = useState<SharedInventoryOffer[]>([]);
  const { push } = useToast();

  const selectedPlan = useMemo(() => plans.find((item) => item.id === form.plan_id), [plans, form.plan_id]);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [planRows, orderRows, offers] = await Promise.all([listRentalPlans(), listServerOrders(), listSharedOffers({ status: "active" })]);
        setPlans(planRows);
        setOrders(orderRows);
        setSharedOffers(offers);
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
      const [orderRows, offers] = await Promise.all([listServerOrders(), listSharedOffers({ status: "active" }), listVMs({ search })]);
      setOrders(orderRows);
      setSharedOffers(offers);
      push("info", "Server list refreshed");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to refresh servers");
    } finally {
      setLoading(false);
    }
  }

  async function handleLifecycle(row: ServerOrder, action: "start" | "stop" | "reboot" | "terminate") {
    const vmID = row.id ? vmByOrder[row.id] : undefined;
    if (!vmID) {
      push("error", "No VM mapping found for this order");
      return;
    }
    setLoading(true);
    try {
      if (action === "start") await startVM(vmID);
      if (action === "stop") await stopVM(vmID);
      if (action === "reboot") await rebootVM(vmID);
      if (action === "terminate") await terminateVM(vmID);
      push("success", `Lifecycle action '${action}' completed`);
    } catch (error) {
      push("error", error instanceof Error ? error.message : `Failed to ${action} VM`);
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
      if (created.id) {
        const allVms = await listVMs({ search: created.id });
        const match = allVms.find((item) => item.name === created.id || item.template === created.plan_id);
        if (match?.id) {
          setVmByOrder((prev) => ({ ...prev, [created.id as string]: match.id as string }));
        }
      }
      push("success", "Server order created");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to create order");
    } finally {
      setLoading(false);
    }
  }

  async function rentSharedOffer(offer: SharedInventoryOffer) {
    if (!offer.id) {
      push("error", "Offer id is missing");
      return;
    }
    setLoading(true);
    try {
      await reserveSharedOffer({ offer_id: offer.id, quantity: 1 });
      push("success", `Reserved 1 unit from ${offer.title}`);
      await refresh();
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to reserve shared offer");
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((row) => {
      const queryOk =
        q.length === 0 ||
        (row.id || "").toLowerCase().includes(q) ||
        row.plan_id.toLowerCase().includes(q) ||
        row.os_name.toLowerCase().includes(q);
      const statusOk = !statusFilter || (row.status || "").toLowerCase() === statusFilter;
      const typeOk = !typeFilter || row.period === typeFilter;
      return queryOk && statusOk && typeOk;
    });
  }, [orders, search, statusFilter, typeFilter]);

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="My Servers"
        description="Manage your running instances, view logs, and configure new servers."
      />

      <Card title="Controls" description="Search, filter, refresh, and route to create screens.">
        <FilterBar
          search={<Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ID, plan, OS" />}
          filters={
            <>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "" | "active" | "queued" | "failed")}
                options={[
                  { value: "", label: "Any status" },
                  { value: "active", label: "Active" },
                  { value: "queued", label: "Queued" },
                  { value: "failed", label: "Failed" }
                ]}
              />
              <Select
                label="Type"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as "" | "hourly" | "monthly")}
                options={[
                  { value: "", label: "Any type" },
                  { value: "hourly", label: "Hourly" },
                  { value: "monthly", label: "Monthly" }
                ]}
              />
            </>
          }
          actions={
            <>
              <Button variant="secondary" onClick={refresh} loading={loading}>
                Refresh
              </Button>
              <Select
                label="Create"
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
            </>
          }
        />
      </Card>
      
      <Card title="Your Instances" description="Active and past server rentals.">
        <Table
          dense
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
                <StatusBadge status={row.status === "active" ? "running" : row.status === "queued" ? "starting" : row.status === "failed" ? "error" : "running"} />
              </span>
            ) },
            { key: "period", header: "Billing", render: (row) => <Badge variant="neutral">{row.period}</Badge> },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <ActionDropdown
                  label="Actions"
                  disabled={loading}
                  options={[
                    { value: "start", label: "Start" },
                    { value: "stop", label: "Stop" },
                    { value: "reboot", label: "Reboot" },
                    { value: "terminate", label: "Terminate" }
                  ]}
                  onSelect={(action) => handleLifecycle(row, action as "start" | "stop" | "reboot" | "terminate")}
                />
              )
            }
          ]}
        />
      </Card>

      <Card title="Shared Resource Marketplace" description="Rent published shared capacities from providers.">
        <Table
          dense
          ariaLabel="Shared offers table"
          rowKey={(row) => row.id ?? `${row.provider_id}-${row.title}`}
          items={sharedOffers}
          emptyState={<EmptyState title="No shared offers" description="Providers have not published capacity yet." />}
          columns={[
            { key: "title", header: "Offer", render: (row) => row.title },
            { key: "provider", header: "Provider", render: (row) => row.provider_id },
            { key: "shape", header: "Shape", render: (row) => `${row.cpu_cores} CPU / ${row.ram_mb} MB / ${row.gpu_units} GPU` },
            { key: "available", header: "Available", render: (row) => `${row.available_qty}/${row.quantity}` },
            { key: "price", header: "$/hr", render: (row) => row.price_hourly_usd.toFixed(2) },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <Button variant="secondary" disabled={!row.id || row.available_qty <= 0 || loading} onClick={() => rentSharedOffer(row)}>
                  Rent 1
                </Button>
              )
            }
          ]}
        />
      </Card>

      <Card title="Quick Deploy" description="Compact order form for server provisioning.">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleEstimate}>
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
          <div className="md:col-span-2 xl:col-span-3 flex flex-wrap items-center gap-2">
            <Button type="submit" loading={loading} variant="secondary">Estimate</Button>
            <Button type="button" onClick={handleCreateOrder} loading={loading}>
              Deploy
            </Button>
            <Badge variant="info">Estimated ${estimate.toFixed(2)}/{selectedPlan?.period === "hourly" ? "hr" : "mo"}</Badge>
          </div>
        </form>
      </Card>
    </section>
  );
}
