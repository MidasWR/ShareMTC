import { useEffect, useMemo, useState } from "react";
import { LuExternalLink, LuFileText, LuPlay, LuPower, LuRefreshCw, LuTrash2 } from "react-icons/lu";
import { useSettings } from "../../app/providers/SettingsProvider";
import { EmptyState } from "../../design/patterns/EmptyState";
import { InlineAlert } from "../../design/patterns/InlineAlert";
import { PageSectionHeader } from "../../design/patterns/PageSectionHeader";
import { StatusBadge } from "../../design/patterns/StatusBadge";
import { DataFreshnessBadge } from "../../design/patterns/DataFreshnessBadge";
import { Button } from "../../design/primitives/Button";
import { Card } from "../../design/primitives/Card";
import { Icon } from "../../design/primitives/Icon";
import { Input } from "../../design/primitives/Input";
import { Select } from "../../design/primitives/Select";
import { useToast } from "../../design/components/Toast";
import { Modal } from "../../design/components/Modal";
import { formatOperationMessage } from "../../design/utils/operationFeedback";
import { getVM, listPods, listVMs, rebootVM, startVM, stopVM, terminatePod, terminateVM } from "../resources/api/resourcesApi";
import { formatDateTime } from "../hifi/formatters";
import { Pod, VM } from "../../types/api";

type RuntimeRow = {
  id: string;
  kind: "vm" | "pod";
  name: string;
  status: string;
  providerID: string;
  cpu: number;
  ramGB: number;
  gpu: number;
  createdAt?: string;
  ipAddress?: string;
};

type BadgeStatus = "starting" | "provisioning" | "running" | "sleeping" | "stopped" | "error" | "interrupted" | "queued" | "online" | "offline";

function toBadgeStatus(value: string): BadgeStatus {
  if (value === "running" || value === "provisioning" || value === "stopped" || value === "error" || value === "interrupted" || value === "queued") {
    return value;
  }
  if (value === "terminated" || value === "expired") {
    return "stopped";
  }
  return "provisioning";
}

export function ServerRentalPanel() {
  const { settings } = useSettings();
  const locale = settings.language === "ru" ? "ru" : "en";
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rows, setRows] = useState<RuntimeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<RuntimeRow | null>(null);

  async function refreshRows() {
    setLoading(true);
    setError("");
    try {
      const [vms, pods] = await Promise.all([listVMs(), listPods()]);
      const vmRows: RuntimeRow[] = vms.map((item: VM) => ({
        id: item.id || "",
        kind: "vm",
        name: item.name,
        status: item.status || "provisioning",
        providerID: item.provider_id,
        cpu: item.cpu_cores,
        ramGB: Math.max(1, Math.round(item.ram_mb / 1024)),
        gpu: item.gpu_units,
        createdAt: item.created_at,
        ipAddress: item.ip_address
      }));
      const podRows: RuntimeRow[] = pods.map((item: Pod) => ({
        id: item.id || "",
        kind: "pod",
        name: item.name,
        status: item.status || "provisioning",
        providerID: item.provider_id,
        cpu: item.cpu_count,
        ramGB: item.memory_gb,
        gpu: item.gpu_count,
        createdAt: item.created_at
      }));
      setRows([...vmRows, ...podRows]);
      setLastUpdatedAt(new Date());
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Failed to load resources";
      setError(message);
      push("error", message, "My Instances");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshRows();
  }, []);

  async function runAction(row: RuntimeRow, action: "start" | "stop" | "reboot" | "terminate") {
    if (!row.id) {
      push("error", "Resource ID is missing", "My Instances");
      return;
    }
    try {
      if (row.kind === "vm") {
        if (action === "start") await startVM(row.id);
        if (action === "stop") await stopVM(row.id);
        if (action === "reboot") await rebootVM(row.id);
        if (action === "terminate") await terminateVM(row.id);
      } else if (action === "terminate") {
        await terminatePod(row.id);
      } else {
        push("error", "This action is available only for VM resources", row.name);
        return;
      }
      push(
        "success",
        formatOperationMessage({ action: action[0].toUpperCase() + action.slice(1), entityType: row.kind.toUpperCase(), entityName: row.name, entityId: row.id, result: "success" }),
        "My Instances"
      );
      await refreshRows();
    } catch (requestError) {
      push("error", requestError instanceof Error ? requestError.message : "Action failed", "My Instances");
    }
  }

  async function openLogs(row: RuntimeRow) {
    if (row.kind !== "vm" || !row.id) {
      push("error", "Logs are available for VM resources only", row.name);
      return;
    }
    try {
      const vm = await getVM(row.id);
      const details = [vm.external_id, vm.updated_at, vm.status].filter(Boolean).join(" | ");
      push("info", details ? `VM logs metadata: ${details}` : "VM logs metadata unavailable", row.name);
    } catch (requestError) {
      push("error", requestError instanceof Error ? requestError.message : "Failed to load VM logs metadata", row.name);
    }
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !q || row.name.toLowerCase().includes(q) || row.id.toLowerCase().includes(q) || row.providerID.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  return (
    <section className="section-stack">
      <PageSectionHeader title={locale === "ru" ? "My Instances" : "My Instances"} description={locale === "ru" ? "Операционный список с быстрыми действиями и раскрытием деталей." : "Operational list with quick actions and expandable details."} />

      <Card
        title={locale === "ru" ? "Instances list" : "Instances list"}
        description={locale === "ru" ? "Start/Stop/Reboot/Terminate, Connect и Logs из одной строки." : "Start/Stop/Reboot/Terminate, Connect and Logs from a single row."}
        actions={(
          <div className="flex items-center gap-2">
            <DataFreshnessBadge ts={lastUpdatedAt} label="Instances" />
            <Button variant="secondary" onClick={refreshRows} loading={loading}>Refresh</Button>
          </div>
        )}
      >
        <div className="mb-3 grid gap-3 md:grid-cols-[2fr_1fr]">
          <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="name, id, provider..." />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[
              { value: "", label: "Any" },
              { value: "running", label: "running" },
              { value: "provisioning", label: "provisioning" },
              { value: "stopped", label: "stopped" },
              { value: "error", label: "error" },
              { value: "interrupted", label: "interrupted(spot)" },
              { value: "queued", label: "queued" }
            ]}
          />
        </div>

        {error ? <InlineAlert kind="error">{error}</InlineAlert> : null}
        {!loading && filteredRows.length === 0 ? <EmptyState title={locale === "ru" ? "Нет инстансов" : "No instances"} description={locale === "ru" ? "Проверьте фильтры." : "Check filters."} /> : null}

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-elevated text-textSecondary">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">CPU/RAM/GPU</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                return (
                  <tr key={`${row.kind}-${row.id}`} className="border-t border-border bg-surface hover:bg-elevated/40">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2 uppercase">{row.kind}</td>
                    <td className="px-3 py-2"><StatusBadge status={toBadgeStatus(row.status)} /></td>
                    <td className="px-3 py-2">{row.providerID}</td>
                    <td className="px-3 py-2">{row.cpu} / {row.ramGB}GB / {row.gpu}</td>
                    <td className="px-3 py-2">{row.createdAt ? formatDateTime(row.createdAt, locale) : "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="secondary" leftIcon={<Icon glyph={LuPlay} size={16} />} onClick={() => runAction(row, "start")} disabled={row.kind !== "vm"}>Start</Button>
                        <Button size="sm" variant="secondary" leftIcon={<Icon glyph={LuPower} size={16} />} onClick={() => runAction(row, "stop")} disabled={row.kind !== "vm"}>Stop</Button>
                        <Button size="sm" variant="secondary" leftIcon={<Icon glyph={LuRefreshCw} size={16} />} onClick={() => runAction(row, "reboot")} disabled={row.kind !== "vm"}>Reboot</Button>
                        <Button size="sm" variant="destructive" leftIcon={<Icon glyph={LuTrash2} size={16} />} onClick={() => setTerminateTarget(row)}>Terminate</Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Icon glyph={LuExternalLink} size={16} />}
                          disabled={!row.ipAddress}
                          onClick={() => row.ipAddress ? window.open(`ssh://${row.ipAddress}`, "_blank", "noopener,noreferrer") : undefined}
                        >
                          Connect
                        </Button>
                        <Button size="sm" variant="ghost" leftIcon={<Icon glyph={LuFileText} size={16} />} onClick={() => openLogs(row)}>Logs</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal
        open={Boolean(terminateTarget)}
        title={locale === "ru" ? "Подтверждение удаления" : "Confirm termination"}
        description={terminateTarget ? `${terminateTarget.kind.toUpperCase()} ${terminateTarget.name} will be terminated.` : undefined}
        confirmLabel={locale === "ru" ? "Удалить" : "Terminate"}
        confirmVariant="destructive"
        onClose={() => setTerminateTarget(null)}
        onConfirm={() => {
          if (!terminateTarget) return;
          void runAction(terminateTarget, "terminate");
          setTerminateTarget(null);
        }}
      />
    </section>
  );
}
