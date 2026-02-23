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
import { Drawer } from "../../design/components/Drawer";
import { FaTerminal, FaPlay, FaStop, FaRedo } from "react-icons/fa";

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
  const [selectedOrder, setSelectedOrder] = useState<ServerOrder | null>(null);
  const [serverState, setServerState] = useState<"running" | "stopped">("running");
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
        push("error", error instanceof Error ? error.message : "Failed to load rental data");
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

  function handleServerAction(action: "start" | "stop" | "reboot") {
    if (action === "stop") {
      setServerState("stopped");
      push("info", "Server stopped");
    } else {
      setServerState("running");
      push("success", `Server ${action === "start" ? "started" : "rebooted"}`);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="My Servers"
        description="Manage your running instances, view logs, and configure new servers."
      />
      
      <Card title="Your Instances" description="Active and past server rentals.">
        <Table
          ariaLabel="Server history"
          rowKey={(row) => row.id ?? `${row.plan_id}-${row.created_at}`}
          items={orders}
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
            { key: "actions", header: "Actions", render: (row) => (
              <Button size="sm" variant="secondary" onClick={() => setSelectedOrder(row)}>
                Manage
              </Button>
            )}
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

      <Drawer open={!!selectedOrder} title="Server Console" onClose={() => setSelectedOrder(null)}>
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex gap-2">
              <Button size="sm" variant={serverState === "running" ? "secondary" : "primary"} onClick={() => handleServerAction("start")} disabled={serverState === "running"}>
                <FaPlay className="mr-1" /> Start
              </Button>
              <Button size="sm" variant={serverState === "stopped" ? "secondary" : "warning"} onClick={() => handleServerAction("stop")} disabled={serverState === "stopped"}>
                <FaStop className="mr-1" /> Stop
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleServerAction("reboot")} disabled={serverState === "stopped"}>
                <FaRedo className="mr-1" /> Reboot
              </Button>
            </div>
            
            <div className="rounded-md border border-border bg-black p-4 font-mono text-xs overflow-x-auto shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
              <div className="flex items-center gap-2 mb-2 text-textMuted border-b border-[#222] pb-2">
                <FaTerminal /> System Logs & Healthchecks
              </div>
              <div className={serverState === "running" ? "text-brand" : "text-textMuted"}>
                {serverState === "running" ? (
                  <>
                    <p>[OK] Container network initialized (10.0.x.x)</p>
                    <p>[OK] GPU Driver loaded (NVIDIA 535.104)</p>
                    <p>[OK] SSH daemon listening on port 22</p>
                    <p className="mt-2 text-textSecondary">System is healthy. All checks passed.</p>
                    <p className="animate-pulse mt-2">Waiting for new incoming connections...</p>
                  </>
                ) : (
                  <>
                    <p>[INFO] Received stop signal</p>
                    <p>[INFO] Unmounting volumes...</p>
                    <p>[INFO] Container exited with code 0</p>
                    <p className="mt-2">System halted.</p>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded border border-border p-3">
                <div className="text-xs text-textMuted uppercase mb-1">CPU Usage</div>
                <div className="text-lg font-mono">{serverState === "running" ? "12%" : "0%"}</div>
                <div className="w-full bg-elevated h-1.5 mt-2 rounded overflow-hidden">
                  <div className="bg-brand h-full transition-all" style={{ width: serverState === "running" ? "12%" : "0%" }}></div>
                </div>
              </div>
              <div className="rounded border border-border p-3">
                <div className="text-xs text-textMuted uppercase mb-1">RAM Usage</div>
                <div className="text-lg font-mono">{serverState === "running" ? "4.2 GB" : "0 GB"}</div>
                <div className="w-full bg-elevated h-1.5 mt-2 rounded overflow-hidden">
                  <div className="bg-info h-full transition-all" style={{ width: serverState === "running" ? "24%" : "0%" }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </section>
  );
}
