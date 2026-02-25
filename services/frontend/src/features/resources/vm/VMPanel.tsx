import { useEffect, useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { Table } from "../../../design/components/Table";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { createVM, listVMTemplates, listVMs, rebootVM, startVM, stopVM, terminateVM } from "../api/resourcesApi";
import { VM, VMTemplate } from "../../../types/api";
import { StatusBadge } from "../../../design/patterns/StatusBadge";
import { ActionDropdown } from "../../../design/components/ActionDropdown";

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
  const [ramMb, setRamMb] = useState(8192);
  const [gpuUnits, setGpuUnits] = useState(1);
  const [networkMbps, setNetworkMbps] = useState(500);
  const { push } = useToast();

  const selectedTemplate = templates.find((item) => item.code === template);

  const region = selectedTemplate?.region || "any";
  const cloudType = selectedTemplate?.cloud_type || "secure";
  const availabilityTier = selectedTemplate?.availability_tier || "medium";
  const systemRamGB = selectedTemplate?.system_ram_gb || 16;
  const vramGB = selectedTemplate?.vram_gb || 24;
  const maxInstances = selectedTemplate?.max_instances || 8;
  const networkVolumeSupported = selectedTemplate?.network_volume_supported ?? true;
  const globalNetworkingSupported = selectedTemplate?.global_networking_supported ?? false;

  async function refresh() {
    setLoading(true);
    try {
      const [data, templateRows] = await Promise.all([listVMs({ search }), listVMTemplates()]);
      setRows(data);
      setTemplates(templateRows);
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to load VMs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createNewVM() {
    if (!providerID.trim() || !name.trim()) {
      push("error", "Provider ID and VM Name are required");
      return;
    }
    if (cpuCores <= 0 || ramMb <= 0 || gpuUnits < 0 || networkMbps <= 0) {
      push("error", "CPU, RAM and Network must be greater than 0; GPU cannot be negative");
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
        ram_mb: ramMb,
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
        <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Provider ID" value={providerID} onChange={(event) => setProviderID(event.target.value)} />
          <Input label="VM Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input label="Template code" value={template} onChange={(event) => setTemplate(event.target.value)} />
          <Input label="OS Name" value={osName} onChange={(event) => setOsName(event.target.value)} />
          <Input type="number" min={1} step={1} label="CPU Cores" value={`${cpuCores}`} onChange={(event) => setCpuCores(Number(event.target.value) || 0)} />
          <Input type="number" min={1} step={512} label="RAM (MB)" value={`${ramMb}`} onChange={(event) => setRamMb(Number(event.target.value) || 0)} />
          <Input type="number" min={0} step={1} label="GPU Units" value={`${gpuUnits}`} onChange={(event) => setGpuUnits(Number(event.target.value) || 0)} />
          <Input type="number" min={1} step={100} label="Network (Mbps)" value={`${networkMbps}`} onChange={(event) => setNetworkMbps(Number(event.target.value) || 0)} />
          <details className="xl:col-span-4 rounded-md border border-border bg-canvas p-3 text-sm text-textSecondary">
            <summary className="cursor-pointer text-textPrimary">You are going to deploy</summary>
            <div className="mt-2 space-y-1 text-xs">
              <div>Template: {selectedTemplate?.name || template} ({template})</div>
              <div>Shape: {cpuCores} CPU / {ramMb} MB / {gpuUnits} GPU</div>
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
            { key: "shape", header: "Shape", render: (row) => `${row.cpu_cores} CPU / ${row.ram_mb} MB / ${row.gpu_units} GPU` },
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
