import { FormEvent, useMemo, useState } from "react";
import { ColumnPicker } from "../design/components/ColumnPicker";
import { Drawer } from "../design/components/Drawer";
import { FilterBar } from "../design/components/FilterBar";
import { Modal } from "../design/components/Modal";
import { Table } from "../design/components/Table";
import { TableToolbar } from "../design/components/TableToolbar";
import { useToast } from "../design/components/Toast";
import { useTableControls } from "../design/hooks/useTableControls";
import { EmptyState } from "../design/patterns/EmptyState";
import { LogViewer } from "../design/patterns/LogViewer";
import { MetricTile } from "../design/patterns/MetricTile";
import { StatusBadge } from "../design/patterns/StatusBadge";
import { Button } from "../design/primitives/Button";
import { Card } from "../design/primitives/Card";
import { Input } from "../design/primitives/Input";
import { Select } from "../design/primitives/Select";
import { fetchJSON } from "../lib/http";
import { Allocation } from "../types/api";
import { TableColumn } from "../design/components/Table";

const RESOURCE_BASE = import.meta.env.VITE_RESOURCE_BASE_URL ?? "http://localhost:8083";

export function HostPanel() {
  const [providerID, setProviderID] = useState("");
  const [cpuCores, setCpuCores] = useState("2");
  const [ramMB, setRamMB] = useState("4096");
  const [gpuUnits, setGpuUnits] = useState("0");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("No actions yet");
  const [selected, setSelected] = useState<Allocation | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<Allocation | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "stopped">("all");
  const [sortBy, setSortBy] = useState<"newest" | "cpu" | "ram">("newest");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(["id", "cpu", "ram", "gpu", "status", "actions"]);
  const { push } = useToast();

  const activeAllocations = useMemo(() => allocations.filter((item) => !item.released_at).length, [allocations]);
  const filteredAllocations = useMemo(() => {
    const query = search.toLowerCase().trim();
    const filtered = allocations.filter((item) => {
      const running = !item.released_at;
      const matchesStatus = statusFilter === "all" || (statusFilter === "running" && running) || (statusFilter === "stopped" && !running);
      const matchesQuery = query.length === 0 || item.id.toLowerCase().includes(query) || item.provider_id.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "cpu") return b.cpu_cores - a.cpu_cores;
      if (sortBy === "ram") return b.ram_mb - a.ram_mb;
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    });
  }, [allocations, search, statusFilter, sortBy]);
  const table = useTableControls(filteredAllocations, 10);

  const allColumns: TableColumn<Allocation>[] = useMemo(
    () => [
      { key: "id", header: "Allocation ID", render: (item) => <span className="font-mono text-xs">{item.id}</span> },
      { key: "cpu", header: "CPU", render: (item) => <span className="tabular-nums">{item.cpu_cores}</span> },
      { key: "ram", header: "RAM MB", render: (item) => <span className="tabular-nums">{item.ram_mb}</span> },
      { key: "gpu", header: "GPU", render: (item) => <span className="tabular-nums">{item.gpu_units}</span> },
      {
        key: "status",
        header: "Status",
        render: (item) => <StatusBadge status={item.released_at ? "stopped" : "running"} />
      },
      {
        key: "actions",
        header: "Actions",
        render: (item) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setSelected(item)} aria-label={`Open allocation ${item.id} details`}>
              Details
            </Button>
            {!item.released_at ? (
              <Button variant="ghost" size="sm" onClick={() => setReleaseTarget(item)} aria-label={`Stop allocation ${item.id}`}>
                Stop
              </Button>
            ) : null}
          </div>
        )
      }
    ],
    []
  );
  const activeColumns = useMemo(
    () => allColumns.filter((column) => visibleColumns.includes(column.key)),
    [allColumns, visibleColumns]
  );

  function toggleColumn(key: string) {
    setVisibleColumns((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      return [...prev, key];
    });
  }

  async function loadAllocations() {
    if (!providerID.trim()) {
      setStatusText("Provider ID is required to load allocations");
      return;
    }
    setLoading(true);
    try {
      const list = await fetchJSON<Allocation[]>(`${RESOURCE_BASE}/v1/resources/allocations?provider_id=${encodeURIComponent(providerID.trim())}`);
      setAllocations(list);
      setStatusText(`Loaded ${list.length} allocations`);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Allocation load failed";
      setStatusText(message);
      push("error", message);
    } finally {
      setLoading(false);
    }
  }

  async function createAllocation(event: FormEvent) {
    event.preventDefault();
    if (!providerID.trim()) {
      setStatusText("Provider ID is required before create");
      return;
    }
    setLoading(true);
    try {
      const created = await fetchJSON<Allocation>(`${RESOURCE_BASE}/v1/resources/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: providerID.trim(),
          cpu_cores: Number(cpuCores) || 0,
          ram_mb: Number(ramMB) || 0,
          gpu_units: Number(gpuUnits) || 0
        })
      });
      setStatusText(`Allocation created: ${created.id}`);
      push("success", "Allocation created");
      setShowCreateModal(false);
      await loadAllocations();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Allocation create failed";
      setStatusText(message);
      push("error", message);
    } finally {
      setLoading(false);
    }
  }

  async function releaseAllocation(allocationID: string) {
    setLoading(true);
    try {
      await fetchJSON<{ status: string }>(`${RESOURCE_BASE}/v1/resources/release/${allocationID}`, {
        method: "POST"
      });
      setStatusText(`Released allocation ${allocationID}`);
      push("success", "Allocation released");
      setReleaseTarget(null);
      await loadAllocations();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Release failed";
      setStatusText(message);
      push("error", message);
    } finally {
      setLoading(false);
    }
  }

  async function heartbeat() {
    if (!providerID.trim()) {
      setStatusText("Provider ID is required before heartbeat");
      return;
    }
    setLoading(true);
    try {
      await fetchJSON<{ status: string }>(`${RESOURCE_BASE}/v1/resources/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: providerID.trim(),
          cpu_free_cores: 8,
          ram_free_mb: 16384,
          gpu_free_units: 1,
          network_mbps: 900,
          heartbeat_at: new Date().toISOString()
        })
      });
      setStatusText("Heartbeat accepted");
      push("info", "Heartbeat accepted");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Heartbeat failed";
      setStatusText(message);
      push("error", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <Card title="Pod allocations" description="Create and monitor running allocations for provider compute capacity.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
          <Input
            label="Provider ID"
            value={providerID}
            onChange={(event) => setProviderID(event.target.value)}
            placeholder="Provider UUID"
            helpText="Used for list/create/release API operations."
          />
          <Button variant="secondary" className="md:mt-7" onClick={loadAllocations} loading={loading}>
            Refresh list
          </Button>
          <Button variant="secondary" className="md:mt-7" onClick={heartbeat} loading={loading}>
            Send heartbeat
          </Button>
          <Button className="md:mt-7" onClick={() => setShowCreateModal(true)}>
            Create pod
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MetricTile label="Total allocations" value={`${allocations.length}`} />
          <MetricTile label="Running" value={`${activeAllocations}`} />
          <MetricTile label="Released" value={`${Math.max(0, allocations.length - activeAllocations)}`} />
        </div>
        <p className="mt-4 text-sm text-textSecondary">{statusText}</p>
      </Card>

      <Card title="Allocation list" description="Data-dense table with details and safe actions.">
        <FilterBar
          search={
            <Input
              label="Search"
              placeholder="Allocation ID or provider ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          }
          filters={
            <>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | "running" | "stopped")}
                options={[
                  { value: "all", label: "All" },
                  { value: "running", label: "Running" },
                  { value: "stopped", label: "Stopped" }
                ]}
              />
              <Select
                label="Sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as "newest" | "cpu" | "ram")}
                options={[
                  { value: "newest", label: "Newest first" },
                  { value: "cpu", label: "CPU high-low" },
                  { value: "ram", label: "RAM high-low" }
                ]}
              />
            </>
          }
          actions={<Button variant="ghost" onClick={() => { setSearch(""); setStatusFilter("all"); setSortBy("newest"); }}>Reset</Button>}
        />
        <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
          <TableToolbar
            density={table.density}
            onDensityChange={table.setDensity}
            page={table.page}
            totalPages={table.totalPages}
            pageSize={table.pageSize}
            onPageSizeChange={table.setPageSize}
            totalItems={filteredAllocations.length}
            onPrevPage={() => table.setPage(Math.max(1, table.page - 1))}
            onNextPage={() => table.setPage(Math.min(table.totalPages, table.page + 1))}
          />
          <ColumnPicker
            options={allColumns.map((column) => ({
              key: column.key,
              label: column.header,
              visible: visibleColumns.includes(column.key)
            }))}
            onToggle={toggleColumn}
          />
        </div>
        <Table
          dense={table.density === "compact"}
          ariaLabel="Pod allocations table"
          rowKey={(item) => item.id}
          items={table.pagedItems}
          emptyState={
            <EmptyState
              title="No allocations found"
              description="Set provider ID and refresh list, or create a new allocation."
              action={<Button onClick={() => setShowCreateModal(true)}>Create first pod</Button>}
            />
          }
          columns={activeColumns}
        />
      </Card>

      <Drawer open={Boolean(selected)} title="Pod allocation details" onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <MetricTile label="CPU cores" value={`${selected.cpu_cores}`} />
              <MetricTile label="RAM MB" value={`${selected.ram_mb}`} />
              <MetricTile label="GPU units" value={`${selected.gpu_units}`} />
              <MetricTile label="State" value={selected.released_at ? "stopped" : "running"} />
            </div>
            <Card title="Endpoint" description="Resource API does not expose endpoint URL for allocation.">
              <p className="font-mono text-xs text-textSecondary">N/A in current API contract</p>
            </Card>
            <LogViewer
              title="Lifecycle log"
              lines={[
                `started_at=${selected.started_at}`,
                `released_at=${selected.released_at ?? "not released"}`,
                `provider_id=${selected.provider_id}`,
                `allocation_id=${selected.id}`
              ]}
            />
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={showCreateModal}
        title="Create pod allocation"
        description="Wizard step 1/1: capacity request. Contracts are unchanged."
        onClose={() => setShowCreateModal(false)}
      >
        <form className="space-y-3" onSubmit={createAllocation}>
          <Input label="CPU cores" value={cpuCores} onChange={(event) => setCpuCores(event.target.value)} />
          <Input label="RAM MB" value={ramMB} onChange={(event) => setRamMB(event.target.value)} />
          <Input label="GPU units" value={gpuUnits} onChange={(event) => setGpuUnits(event.target.value)} />
          <Button type="submit" className="w-full" loading={loading}>
            Create
          </Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(releaseTarget)}
        title="Stop pod allocation"
        description="This will release resources for the selected allocation."
        confirmVariant="destructive"
        confirmLabel="Stop"
        onClose={() => setReleaseTarget(null)}
        onConfirm={() => releaseTarget && releaseAllocation(releaseTarget.id)}
      />
    </section>
  );
}
