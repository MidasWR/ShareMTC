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
import { buildVmSelectOptions, getLinkedVMID } from "./orderVmMapping";
import { validateServerOrder } from "./rentalValidation";
import { SERVER_ORDER_DEFAULTS } from "./defaults";

type Props = {
  onNavigate?: (tab: AppTab) => void;
};

export function ServerRentalPanel({ onNavigate }: Props) {
  const [plans, setPlans] = useState<RentalPlan[]>([]);
  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const [form, setForm] = useState<ServerOrder>({ ...SERVER_ORDER_DEFAULTS });
  const [estimate, setEstimate] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "queued" | "failed">("");
  const [typeFilter, setTypeFilter] = useState<"" | "hourly" | "monthly">("");
  const [createTarget, setCreateTarget] = useState<AppTab>("myCompute");
  const [vmByOrder, setVmByOrder] = useState<Record<string, string>>({});
  const [vmOptions, setVmOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [sharedOffers, setSharedOffers] = useState<SharedInventoryOffer[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const { push } = useToast();

  const selectedPlan = useMemo(() => plans.find((item) => item.id === form.plan_id), [plans, form.plan_id]);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [planRows, orderRows, offers, vmRows] = await Promise.all([
          listRentalPlans(),
          listServerOrders(),
          listSharedOffers({ status: "active" }),
          listVMs()
        ]);
        setPlans(planRows);
        setOrders(orderRows);
        setSharedOffers(offers);
        setVmOptions(buildVmSelectOptions(vmRows));
        setLastRefreshedAt(new Date());
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
      const [orderRows, offers, vmRows] = await Promise.all([listServerOrders(), listSharedOffers({ status: "active" }), listVMs()]);
      setOrders(orderRows);
      setSharedOffers(offers);
      setVmOptions(buildVmSelectOptions(vmRows));
      setLastRefreshedAt(new Date());
      push("info", "Server list refreshed");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to refresh servers");
    } finally {
      setLoading(false);
    }
  }

  async function handleLifecycle(row: ServerOrder, action: "start" | "stop" | "reboot" | "terminate") {
    const vmID = getLinkedVMID(row, vmByOrder);
    if (!vmID) {
      push("error", "Link a VM ID to this order before lifecycle actions");
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
    const validationError = validateServerOrder(form);
    if (validationError) {
      push("error", validationError);
      return;
    }
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
    const validationError = validateServerOrder(form);
    if (validationError) {
      push("error", validationError);
      return;
    }
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
      const id = String(row.id || "").toLowerCase();
      const planID = String(row.plan_id || "").toLowerCase();
      const osName = String(row.os_name || "").toLowerCase();
      const queryOk =
        q.length === 0 ||
        id.includes(q) ||
        planID.includes(q) ||
        osName.includes(q);
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

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card title="Marketplace Catalog" description="Pick a published offer and reserve capacity in one click.">
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

        <Card title="Deploy" description="Compact server order form with explicit summary.">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleEstimate}>
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
            <Input
              type="number"
              min={1}
              step={1}
              label="CPU Cores"
              value={`${form.cpu_cores}`}
              onChange={(event) => setForm((prev) => ({ ...prev, cpu_cores: Number(event.target.value) || 0 }))}
            />
            <Input
              type="number"
              min={1}
              step={1}
              label="RAM (GB)"
              value={`${form.ram_gb}`}
              onChange={(event) => setForm((prev) => ({ ...prev, ram_gb: Number(event.target.value) || 0 }))}
            />
            <details className="md:col-span-2 rounded-md border border-border bg-canvas p-3">
              <summary className="cursor-pointer text-sm text-textPrimary">Advanced</summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  label="GPU units"
                  value={`${form.gpu_units}`}
                  onChange={(event) => setForm((prev) => ({ ...prev, gpu_units: Number(event.target.value) || 0 }))}
                />
                <Input
                  type="number"
                  min={1}
                  step={100}
                  label="Network (Mbps)"
                  value={`${form.network_mbps}`}
                  onChange={(event) => setForm((prev) => ({ ...prev, network_mbps: Number(event.target.value) || 0 }))}
                />
                {onNavigate ? (
                  <>
                    <Select
                      label="Create destination"
                      value={createTarget}
                      onChange={(event) => setCreateTarget(event.target.value as AppTab)}
                      options={[
                        { value: "myCompute", label: "My Compute workspace" },
                        { value: "provideCompute", label: "Provide Compute workspace" },
                        { value: "marketplace", label: "Marketplace" }
                      ]}
                    />
                    <div className="md:mt-7">
                      <Button onClick={() => onNavigate(createTarget)} variant="ghost">
                        Open destination
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </details>
            <div className="md:col-span-2 rounded-md border border-border bg-canvas p-3 text-xs text-textSecondary">
              <div className="mb-1 text-sm text-textPrimary">Summary</div>
              <div>Plan: {selectedPlan?.name || form.plan_id || "not selected"}</div>
              <div>Shape: {form.cpu_cores} CPU / {form.ram_gb} GB / {form.gpu_units} GPU</div>
              <div>Network: {form.network_mbps} Mbps · Billing: {form.period}</div>
              <div>Config source: <span className="font-medium text-textPrimary">Manual order form</span></div>
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center gap-2">
              <Button type="submit" loading={loading} variant="secondary">Estimate</Button>
              <Button type="button" onClick={handleCreateOrder} loading={loading}>
                Deploy
              </Button>
              <Button type="button" variant="ghost" onClick={() => setForm({ ...SERVER_ORDER_DEFAULTS, plan_id: form.plan_id, period: form.period })}>
                Reset
              </Button>
              <Badge variant="info">Estimated ${estimate.toFixed(2)}/{selectedPlan?.period === "hourly" ? "hr" : "mo"}</Badge>
            </div>
          </form>
        </Card>
      </div>

      <Card title="My Instances" description="Active and past server rentals with lifecycle actions.">
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
              <Badge variant={lastRefreshedAt ? "success" : "warning"}>
                {lastRefreshedAt ? `Fresh: ${lastRefreshedAt.toLocaleTimeString()}` : "Data not loaded yet"}
              </Badge>
              <Button variant="secondary" onClick={refresh} loading={loading}>
                Refresh
              </Button>
            </>
          }
        />
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
                <div className="flex min-w-[280px] items-end gap-2">
                  <div className="min-w-[120px] pb-1 text-xs text-textMuted">
                    {row.vm_id ? "From server vm_id" : "Manual link"}
                  </div>
                  <Select
                    label="Linked VM"
                    value={row.vm_id || (row.id && vmByOrder[row.id]) || ""}
                    onChange={(event) => {
                      if (row.vm_id) return;
                      if (!row.id) return;
                      setVmByOrder((prev) => ({ ...prev, [row.id as string]: event.target.value }));
                    }}
                    disabled={Boolean(row.vm_id)}
                    options={[{ value: "", label: "Select VM" }, ...vmOptions]}
                  />
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
                </div>
              )
            }
          ]}
        />
      </Card>
    </section>
  );
}
