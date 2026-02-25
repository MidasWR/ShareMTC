import { useEffect, useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { Table } from "../../../design/components/Table";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { Select } from "../../../design/primitives/Select";
import { createVM, listVMTemplates, listVMs, rebootVM, startVM, stopVM, terminateVM } from "../api/resourcesApi";
import { VM, VMTemplate } from "../../../types/api";
import { StatusBadge } from "../../../design/patterns/StatusBadge";
import { ActionDropdown } from "../../../design/components/ActionDropdown";
import { VM_TEMPLATE_FALLBACK } from "../defaults";

export function VMPanel() {
  const [rows, setRows] = useState<VM[]>([]);
  const [templates, setTemplates] = useState<VMTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [providerID, setProviderID] = useState("provider-default");
  const [name, setName] = useState("vm-instance");
  const [template, setTemplate] = useState("fastpanel");
  const [osName, setOsName] = useState("Ubuntu 22.04");
  const [cpuCores, setCpuCores] = useState(4);
  const [ramGB, setRamGB] = useState(8);
  const [gpuUnits, setGpuUnits] = useState(1);
  const [networkMbps, setNetworkMbps] = useState(500);
  const [manualOverride, setManualOverride] = useState(false);
  const [region, setRegion] = useState<string>(VM_TEMPLATE_FALLBACK.region);
  const [cloudType, setCloudType] = useState<"secure" | "community">(VM_TEMPLATE_FALLBACK.cloudType);
  const [availabilityTier, setAvailabilityTier] = useState<"low" | "medium" | "high">(VM_TEMPLATE_FALLBACK.availabilityTier);
  const [systemRamGB, setSystemRamGB] = useState<number>(VM_TEMPLATE_FALLBACK.systemRamGB);
  const [vramGB, setVramGB] = useState<number>(VM_TEMPLATE_FALLBACK.vramGB);
  const [maxInstances, setMaxInstances] = useState<number>(VM_TEMPLATE_FALLBACK.maxInstances);
  const [networkVolumeSupported, setNetworkVolumeSupported] = useState<boolean>(VM_TEMPLATE_FALLBACK.networkVolumeSupported);
  const [globalNetworkingSupported, setGlobalNetworkingSupported] = useState<boolean>(VM_TEMPLATE_FALLBACK.globalNetworkingSupported);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { push } = useToast();

  const selectedTemplate = templates.find((item) => item.code === template);
  const configSource = manualOverride ? "Manual override" : "From Template/Offer";

  async function refresh() {
    setLoading(true);
    try {
      const [data, templateRows] = await Promise.all([listVMs({ search }), listVMTemplates()]);
      setRows(data);
      setTemplates(templateRows);
      if (templateRows.length > 0 && !templateRows.some((item) => item.code === template)) {
        const first = templateRows[0];
        setTemplate(first.code);
        setOsName(first.os_name || osName);
      }
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to load VMs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (manualOverride) return;
    setRegion(selectedTemplate?.region || VM_TEMPLATE_FALLBACK.region);
    setCloudType(selectedTemplate?.cloud_type || VM_TEMPLATE_FALLBACK.cloudType);
    setAvailabilityTier(selectedTemplate?.availability_tier || VM_TEMPLATE_FALLBACK.availabilityTier);
    setSystemRamGB(selectedTemplate?.system_ram_gb || VM_TEMPLATE_FALLBACK.systemRamGB);
    setVramGB(selectedTemplate?.vram_gb || VM_TEMPLATE_FALLBACK.vramGB);
    setMaxInstances(selectedTemplate?.max_instances || VM_TEMPLATE_FALLBACK.maxInstances);
    setNetworkVolumeSupported(selectedTemplate?.network_volume_supported ?? VM_TEMPLATE_FALLBACK.networkVolumeSupported);
    setGlobalNetworkingSupported(selectedTemplate?.global_networking_supported ?? VM_TEMPLATE_FALLBACK.globalNetworkingSupported);
  }, [selectedTemplate, manualOverride]);

  async function createNewVM() {
    const nextErrors: Record<string, string> = {};
    if (!providerID.trim()) nextErrors.provider_id = "Provider ID is required";
    if (!name.trim()) nextErrors.name = "VM Name is required";
    if (!template.trim()) nextErrors.template = "Template is required";
    if (!osName.trim()) nextErrors.os_name = "OS Name is required";
    if (cpuCores <= 0) nextErrors.cpu_cores = "CPU cores must be greater than 0";
    if (ramGB <= 0) nextErrors.ram_gb = "RAM must be greater than 0";
    if (gpuUnits < 0) nextErrors.gpu_units = "GPU cannot be negative";
    if (networkMbps <= 0) nextErrors.network_mbps = "Network must be greater than 0";
    setErrors(nextErrors);
    const firstError = Object.values(nextErrors)[0];
    if (firstError) {
      push("error", firstError);
      return;
    }
    setLoading(true);
    try {
      await createVM({
        provider_id: providerID.trim(),
        name: name.trim(),
        template,
        os_name: osName,
        region,
        cloud_type: cloudType,
        cpu_cores: cpuCores,
        vcpu: cpuCores,
        ram_mb: ramGB * 1024,
        system_ram_gb: systemRamGB,
        gpu_units: gpuUnits,
        vram_gb: vramGB,
        network_mbps: networkMbps,
        network_volume_supported: networkVolumeSupported,
        global_networking_supported: globalNetworkingSupported,
        availability_tier: availabilityTier,
        max_instances: maxInstances
      });
      await refresh();
      push("success", "VM created successfully");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to create VM");
    } finally {
      setLoading(false);
    }
  }

  async function mutate(vmID: string, action: "start" | "stop" | "reboot" | "terminate") {
    setLoading(true);
    try {
      if (action === "start") await startVM(vmID);
      if (action === "stop") await stopVM(vmID);
      if (action === "reboot") await rebootVM(vmID);
      if (action === "terminate") await terminateVM(vmID);
      await refresh();
      push("success", `VM ${action} completed successfully`);
    } catch (error) {
      push("error", error instanceof Error ? error.message : `Failed to ${action} VM`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader title="VM" description="Create, control, and inspect dedicated virtual machines." />
      <Card title="Quick Create VM" description="Create VM with visible baseline parameters before provisioning.">
        <p className="mb-3 text-xs text-textMuted">
          Configuration source: <span className="font-medium text-textPrimary">{configSource}</span>
        </p>
        <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Provider ID" value={providerID} error={errors.provider_id} onChange={(event) => setProviderID(event.target.value)} />
          <Input label="VM Name" value={name} error={errors.name} onChange={(event) => setName(event.target.value)} />
          <Select
            label="Template"
            value={template}
            error={errors.template}
            onChange={(event) => {
              const nextTemplate = event.target.value;
              setTemplate(nextTemplate);
              const selected = templates.find((item) => item.code === nextTemplate);
              if (selected && !manualOverride) {
                setOsName(selected.os_name || osName);
                setCpuCores(selected.cpu_cores || cpuCores);
                setRamGB(Math.max(1, Math.ceil((selected.ram_mb || ramGB * 1024) / 1024)));
                setGpuUnits(selected.gpu_units);
                setNetworkMbps(selected.network_mbps || networkMbps);
              }
            }}
            options={templates.length > 0
              ? templates.map((item) => ({ value: item.code, label: `${item.name} (${item.code})` }))
              : [{ value: template, label: template }]}
          />
          <Input label="OS Name" value={osName} error={errors.os_name} onChange={(event) => setOsName(event.target.value)} />
          <Input type="number" min={1} step={1} label="CPU Cores" error={errors.cpu_cores} value={`${cpuCores}`} onChange={(event) => setCpuCores(Number(event.target.value) || 0)} />
          <Input type="number" min={1} step={1} label="RAM (GB)" error={errors.ram_gb} value={`${ramGB}`} onChange={(event) => setRamGB(Number(event.target.value) || 0)} />
          <Input type="number" min={0} step={1} label="GPU Units" error={errors.gpu_units} value={`${gpuUnits}`} onChange={(event) => setGpuUnits(Number(event.target.value) || 0)} />
          <Input type="number" min={1} step={100} label="Network (Mbps)" error={errors.network_mbps} value={`${networkMbps}`} onChange={(event) => setNetworkMbps(Number(event.target.value) || 0)} />
          <details className="xl:col-span-4 rounded-md border border-border bg-canvas p-3 text-sm text-textSecondary">
            <summary className="details-summary-focus cursor-pointer text-textPrimary">Advanced configuration</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="flex items-center gap-2 text-xs text-textSecondary xl:col-span-4">
                <input
                  type="checkbox"
                  checked={manualOverride}
                  onChange={(event) => setManualOverride(event.target.checked)}
                  className="checkbox-control"
                />
                Manual override template defaults
              </label>
              <Input label="Region" value={region} onChange={(event) => setRegion(event.target.value)} disabled={!manualOverride} />
              <Select
                label="Cloud Type"
                value={cloudType}
                onChange={(event) => setCloudType(event.target.value as "secure" | "community")}
                disabled={!manualOverride}
                options={[
                  { value: "secure", label: "secure" },
                  { value: "community", label: "community" }
                ]}
              />
              <Select
                label="Availability tier"
                value={availabilityTier}
                onChange={(event) => setAvailabilityTier(event.target.value as "low" | "medium" | "high")}
                disabled={!manualOverride}
                options={[
                  { value: "low", label: "low" },
                  { value: "medium", label: "medium" },
                  { value: "high", label: "high" }
                ]}
              />
              <Input
                type="number"
                min={1}
                step={1}
                label="System RAM (GB)"
                value={`${systemRamGB}`}
                onChange={(event) => setSystemRamGB(Number(event.target.value) || 0)}
                disabled={!manualOverride}
              />
              <Input
                type="number"
                min={0}
                step={1}
                label="VRAM (GB)"
                value={`${vramGB}`}
                onChange={(event) => setVramGB(Number(event.target.value) || 0)}
                disabled={!manualOverride}
              />
              <Input
                type="number"
                min={1}
                step={1}
                label="Max instances"
                value={`${maxInstances}`}
                onChange={(event) => setMaxInstances(Number(event.target.value) || 1)}
                disabled={!manualOverride}
              />
              <label className="flex items-center gap-2 text-xs text-textSecondary">
                <input
                  type="checkbox"
                  checked={networkVolumeSupported}
                  onChange={(event) => setNetworkVolumeSupported(event.target.checked)}
                  className="checkbox-control"
                  disabled={!manualOverride}
                />
                Network volume supported
              </label>
              <label className="flex items-center gap-2 text-xs text-textSecondary">
                <input
                  type="checkbox"
                  checked={globalNetworkingSupported}
                  onChange={(event) => setGlobalNetworkingSupported(event.target.checked)}
                  className="checkbox-control"
                  disabled={!manualOverride}
                />
                Global networking supported
              </label>
            </div>
          </details>
          <details className="xl:col-span-4 rounded-md border border-border bg-canvas p-3 text-sm text-textSecondary" open>
            <summary className="details-summary-focus cursor-pointer text-textPrimary">Deploy summary</summary>
            <div className="mt-2 space-y-1 text-xs">
              <div>Source: {configSource}</div>
              <div>Template: {selectedTemplate?.name || template} ({template})</div>
              <div>Shape: {cpuCores} CPU / {ramGB} GB / {gpuUnits} GPU</div>
              <div>Network: {networkMbps} Mbps</div>
              <div>Region: {region} · Cloud: {cloudType} · Availability: {availabilityTier}</div>
              <div>System RAM: {systemRamGB} GB · VRAM: {vramGB} GB · Max instances: {maxInstances}</div>
              <div>Network volume: {networkVolumeSupported ? "supported" : "not supported"} · Global networking: {globalNetworkingSupported ? "enabled" : "disabled"}</div>
            </div>
          </details>
          <Button onClick={createNewVM} loading={loading}>Create</Button>
        </div>
      </Card>
      <Card
        title="VM Fleet"
        description="Search and manage lifecycle actions."
        actions={<Button variant="secondary" onClick={refresh} loading={loading}>Refresh</Button>}
      >
        <div className="mb-3 grid gap-3 md:grid-cols-[2fr_auto]">
          <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="VM name or ID" />
        </div>
        <Table
          dense
          ariaLabel="VM table"
          rowKey={(row) => row.id ?? `${row.name}-${row.provider_id}`}
          items={rows}
          emptyState={<EmptyState title="No VMs yet" description="Create your first VM from the form above." />}
          columns={[
            { key: "name", header: "Name", render: (row) => row.name },
            { key: "provider", header: "Provider", render: (row) => row.provider_id },
            { key: "shape", header: "Shape", render: (row) => `${row.cpu_cores} CPU / ${Math.ceil(row.ram_mb / 1024)} GB / ${row.gpu_units} GPU` },
            { key: "ip", header: "IP", render: (row) => row.ip_address || "-" },
            {
              key: "status",
              header: "Status",
              render: (row) => {
                const value = row.status || "unknown";
                if (value === "running") return <StatusBadge status="running" />;
                if (value === "provisioning") return <StatusBadge status="starting" />;
                if (value === "stopped") return <StatusBadge status="stopped" />;
                return <StatusBadge status="error" />;
              }
            },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <ActionDropdown
                  label="Actions"
                  disabled={!row.id || loading}
                  options={[
                    { value: "start", label: "Start" },
                    { value: "stop", label: "Stop" },
                    { value: "reboot", label: "Reboot" },
                    { value: "terminate", label: "Terminate" }
                  ]}
                  onSelect={(action) => {
                    if (!row.id) return;
                    mutate(row.id, action as "start" | "stop" | "reboot" | "terminate");
                  }}
                />
              )
            }
          ]}
        />
      </Card>
    </section>
  );
}
