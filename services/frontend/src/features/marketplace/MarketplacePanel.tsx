import { useEffect, useMemo, useState } from "react";
import { createServerOrder, listRentalPlans, listServerOrders } from "../billing/api/billingApi";
import { listVMTemplates } from "../resources/api/resourcesApi";
import { useToast } from "../../design/components/Toast";
import { Table } from "../../design/components/Table";
import { EmptyState } from "../../design/patterns/EmptyState";
import { PageSectionHeader } from "../../design/patterns/PageSectionHeader";
import { Button } from "../../design/primitives/Button";
import { Card } from "../../design/primitives/Card";
import { Input } from "../../design/primitives/Input";
import { Select } from "../../design/primitives/Select";
import { RentalPlan, ServerOrder, VMTemplate } from "../../types/api";
import { resolveTemplateLogoURL } from "../../lib/logoResolver";
import { firstServerOrderError, ServerOrderValidationErrors, validateServerOrder } from "../rental/rentalValidation";

function toRamGB(value: number) {
  return Math.max(1, Math.ceil(value / 1024));
}

export function MarketplacePanel() {
  const [templates, setTemplates] = useState<VMTemplate[]>([]);
  const [plans, setPlans] = useState<RentalPlan[]>([]);
  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [search, setSearch] = useState("");
  const [minVram, setMinVram] = useState(0);
  const [form, setForm] = useState<ServerOrder>({
    plan_id: "",
    name: "demo-instance",
    os_name: "Ubuntu 22.04",
    network_mbps: 1000,
    cpu_cores: 8,
    ram_gb: 16,
    gpu_units: 1,
    period: "hourly"
  });
  const [formErrors, setFormErrors] = useState<ServerOrderValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.code === selectedCode) ?? null,
    [templates, selectedCode]
  );

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return templates
      .filter((item) => {
        const vram = item.vram_gb ?? 0;
        const matchesVram = vram >= minVram;
        if (!matchesVram) return false;
        if (!query) return true;
        return item.name.toLowerCase().includes(query) || item.code.toLowerCase().includes(query) || item.os_name.toLowerCase().includes(query);
      })
      .sort((a, b) => (b.vram_gb ?? 0) - (a.vram_gb ?? 0));
  }, [templates, search, minVram]);

  async function load() {
    setLoading(true);
    try {
      const [templateRows, planRows, orderRows] = await Promise.all([listVMTemplates(), listRentalPlans(), listServerOrders()]);
      setTemplates(templateRows);
      setPlans(planRows);
      setOrders(orderRows);
      if (planRows.length && !form.plan_id) {
        setForm((prev) => ({ ...prev, plan_id: planRows[0].id, period: planRows[0].period }));
      }
      if (templateRows.length && !selectedCode) {
        const first = templateRows[0];
        setSelectedCode(first.code);
        setForm((prev) => ({
          ...prev,
          os_name: first.os_name || prev.os_name,
          cpu_cores: first.cpu_cores || prev.cpu_cores,
          gpu_units: first.gpu_units,
          network_mbps: first.network_mbps || prev.network_mbps,
          ram_gb: toRamGB(first.ram_mb || prev.ram_gb * 1024)
        }));
      }
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to load marketplace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function selectTemplate(template: VMTemplate) {
    setSelectedCode(template.code);
    setForm((prev) => ({
      ...prev,
      os_name: template.os_name || prev.os_name,
      cpu_cores: template.cpu_cores || prev.cpu_cores,
      gpu_units: template.gpu_units,
      network_mbps: template.network_mbps || prev.network_mbps,
      ram_gb: toRamGB(template.ram_mb || prev.ram_gb * 1024)
    }));
  }

  async function deploy() {
    const errors = validateServerOrder(form);
    setFormErrors(errors);
    const validationError = firstServerOrderError(errors);
    if (validationError) {
      push("error", validationError);
      return;
    }
    if (!selectedTemplate) {
      push("error", "Select a template before deploy");
      return;
    }
    setLoading(true);
    try {
      const created = await createServerOrder(form);
      setOrders((prev) => [created, ...prev]);
      push("success", `Deploy started for ${created.name || form.name}`);
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to deploy instance");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Marketplace"
        description="Select compute, deploy in one click, and track your instances without leaving this screen."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card title="Catalog" description="Choose a template by price/performance profile.">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
            <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="GPU model, code, OS..." />
            <Input
              type="number"
              min={0}
              step={8}
              label="Min VRAM (GB)"
              value={`${minVram}`}
              onChange={(event) => setMinVram(Number(event.target.value) || 0)}
            />
            <Button className="md:mt-7" variant="secondary" onClick={load} loading={loading}>
              Refresh
            </Button>
          </div>
          <div className="mt-4 grid gap-2 lg:grid-cols-2">
            {filteredTemplates.map((item) => (
              <button
                key={item.code}
                type="button"
                aria-pressed={selectedCode === item.code}
                className={`rounded-md border p-3 text-left transition-colors ${
                  selectedCode === item.code ? "focus-ring border-brand bg-brand/10" : "focus-ring border-border bg-surface hover:border-brand/40"
                }`}
                onClick={() => selectTemplate(item)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <img src={resolveTemplateLogoURL(item.code, item.name)} alt={`${item.name} logo`} className="h-6 w-6 rounded-sm object-contain" />
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-textMuted">{item.code}</div>
                    </div>
                  </div>
                  <span className="text-xs text-textSecondary">
                    {selectedCode === item.code ? "Selected" : item.availability_tier || "medium"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-textSecondary">
                  {(item.vram_gb ?? 0)} GB VRAM · {item.cpu_cores} CPU · {toRamGB(item.ram_mb)} GB RAM
                </div>
              </button>
            ))}
            {filteredTemplates.length === 0 ? <EmptyState title="No templates found" description="Adjust filters to see more options." /> : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Deploy" description="Only a few required fields for a demo-ready launch.">
            <div className="grid gap-3">
              <Input
                label="Instance name"
                value={form.name}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((prev) => ({ ...prev, name: value }));
                  setFormErrors((prev) => ({ ...prev, name: undefined }));
                }}
                error={formErrors.name}
              />
              <Select
                label="Billing plan"
                value={form.plan_id}
                onChange={(event) => {
                  const nextPlan = plans.find((item) => item.id === event.target.value);
                  setForm((prev) => ({
                    ...prev,
                    plan_id: event.target.value,
                    period: (nextPlan?.period as "hourly" | "monthly") ?? prev.period
                  }));
                  setFormErrors((prev) => ({ ...prev, plan_id: undefined }));
                }}
                options={plans.map((plan) => ({ value: plan.id, label: `${plan.name} (${plan.period})` }))}
                error={formErrors.plan_id}
              />
              <div className="rounded-md border border-border bg-elevated p-3 text-sm text-textSecondary">
                <div className="text-xs uppercase tracking-wide text-textMuted">Summary</div>
                {selectedTemplate ? (
                  <div className="mt-2 space-y-1">
                    <div>You are going to deploy: <span className="text-textPrimary">{selectedTemplate.name}</span></div>
                    <div>{form.cpu_cores} CPU · {form.ram_gb} GB RAM · {form.gpu_units} GPU · {form.network_mbps} Mbps</div>
                    <div>OS: {form.os_name} · Plan: {form.period}</div>
                  </div>
                ) : (
                  <div className="mt-2">Select a template to build deployment summary.</div>
                )}
              </div>
              <details className="rounded-md border border-border bg-canvas px-3 py-2 text-sm text-textSecondary">
                <summary className="details-summary-focus cursor-pointer text-textPrimary">Advanced</summary>
                {selectedTemplate ? (
                  <div className="mt-2 space-y-1 text-xs">
                    <div>Region: {selectedTemplate.region || "any"}</div>
                    <div>Cloud: {selectedTemplate.cloud_type || "secure"}</div>
                    <div>Availability: {selectedTemplate.availability_tier || "medium"}</div>
                    <div>Network volume: {selectedTemplate.network_volume_supported ? "supported" : "not supported"}</div>
                    <div>Global networking: {selectedTemplate.global_networking_supported ? "enabled" : "disabled"}</div>
                    <div>Max instances: {selectedTemplate.max_instances || 1}</div>
                  </div>
                ) : null}
              </details>
              <Button onClick={deploy} loading={loading} disabled={!selectedTemplate || !form.plan_id}>
                Deploy
              </Button>
            </div>
          </Card>

          <Card title="My Instances" description="Recent server orders and statuses.">
            <Table
              dense
              ariaLabel="Marketplace instances table"
              rowKey={(row) => row.id ?? `${row.plan_id}-${row.created_at}`}
              items={orders}
              emptyState={<EmptyState title="No instances yet" description="Deploy your first instance from the panel above." />}
              columns={[
                { key: "name", header: "Instance", render: (row) => row.name || "-" },
                { key: "plan", header: "Plan", render: (row) => row.plan_id },
                { key: "shape", header: "Config", render: (row) => `${row.cpu_cores} CPU / ${row.ram_gb} GB / ${row.gpu_units} GPU` },
                { key: "os", header: "OS", render: (row) => row.os_name },
                { key: "status", header: "Status", render: (row) => row.status || "queued" }
              ]}
            />
          </Card>
        </div>
      </div>
    </section>
  );
}
