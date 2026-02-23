import { useEffect, useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { Table } from "../../../design/components/Table";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { createVM, listVMs, rebootVM, startVM, stopVM, terminateVM } from "../api/resourcesApi";
import { VM } from "../../../types/api";
import { StatusBadge } from "../../../design/patterns/StatusBadge";
import { ActionDropdown } from "../../../design/components/ActionDropdown";

export function VMPanel() {
  const [rows, setRows] = useState<VM[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [providerID, setProviderID] = useState("provider-default");
  const [name, setName] = useState("vm-instance");
  const { push } = useToast();

  async function refresh() {
    setLoading(true);
    try {
      const data = await listVMs({ search });
      setRows(data);
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
    setLoading(true);
    try {
      await createVM({
        provider_id: providerID,
        name,
        template: "fastpanel",
        os_name: "Ubuntu 22.04",
        region: "any",
        cloud_type: "secure",
        cpu_cores: 4,
        vcpu: 4,
        ram_mb: 8192,
        system_ram_gb: 16,
        gpu_units: 1,
        vram_gb: 24,
        network_mbps: 500,
        network_volume_supported: true,
        global_networking_supported: false,
        availability_tier: "medium",
        max_instances: 8
      });
      await refresh();
      push("success", "VM created");
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
      push("info", `VM ${action} completed`);
    } catch (error) {
      push("error", error instanceof Error ? error.message : `Failed to ${action} VM`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader title="VM" description="Create, control, and inspect dedicated virtual machines." />
      <Card title="Quick Create VM" description="Minimal create form with default FastPanel profile.">
        <div className="grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input label="Provider ID" value={providerID} onChange={(event) => setProviderID(event.target.value)} />
          <Input label="VM Name" value={name} onChange={(event) => setName(event.target.value)} />
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
