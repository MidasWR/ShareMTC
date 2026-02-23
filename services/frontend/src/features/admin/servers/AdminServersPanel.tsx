import { FormEvent, useEffect, useMemo, useState } from "react";
import { ColumnPicker } from "../../../design/components/ColumnPicker";
import { Drawer } from "../../../design/components/Drawer";
import { FilterBar } from "../../../design/components/FilterBar";
import { Modal } from "../../../design/components/Modal";
import { Table, TableColumn } from "../../../design/components/Table";
import { TableToolbar } from "../../../design/components/TableToolbar";
import { useToast } from "../../../design/components/Toast";
import { useTableControls } from "../../../design/hooks/useTableControls";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { MetricTile } from "../../../design/patterns/MetricTile";
import { SkeletonBlock } from "../../../design/patterns/SkeletonBlock";
import { StatusBadge } from "../../../design/patterns/StatusBadge";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { Select } from "../../../design/primitives/Select";
import { fetchJSON } from "../../../lib/http";
import { Provider } from "../../../types/api";

const ADMIN_BASE = import.meta.env.VITE_ADMIN_BASE_URL ?? "http://localhost:8082";

type NewServerForm = {
  display_name: string;
  machine_id: string;
  provider_type: "internal" | "donor";
  network_mbps: string;
};

export function AdminServersPanel() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Provider | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [sortBy, setSortBy] = useState<"name" | "network">("name");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(["name", "type", "machine", "network", "status", "actions"]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<NewServerForm>({
    display_name: "",
    machine_id: "",
    provider_type: "donor",
    network_mbps: "100"
  });
  const { push } = useToast();

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const list = await fetchJSON<Provider[]>(`${ADMIN_BASE}/v1/admin/providers/`);
      setProviders(list);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load servers");
      push("error", "Server list failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function createServer(event: FormEvent) {
    event.preventDefault();
    if (!form.display_name.trim() || !form.machine_id.trim()) {
      push("error", "Display name and machine ID are required");
      return;
    }
    setCreating(true);
    try {
      await fetchJSON<Provider>(`${ADMIN_BASE}/v1/admin/providers/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: form.display_name.trim(),
          machine_id: form.machine_id.trim(),
          provider_type: form.provider_type,
          network_mbps: Number(form.network_mbps) || 0
        })
      });
      push("success", "Server added");
      setIsCreateOpen(false);
      setForm({ display_name: "", machine_id: "", provider_type: "donor", network_mbps: "100" });
      await refresh();
    } catch (requestError) {
      push("error", requestError instanceof Error ? requestError.message : "Create server failed");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const onlineCount = providers.filter((provider) => provider.online).length;
  const filteredProviders = useMemo(() => {
    const filtered = providers.filter((provider) => {
      const query = search.toLowerCase().trim();
      const matchesQuery =
        query.length === 0 ||
        provider.display_name.toLowerCase().includes(query) ||
        provider.machine_id.toLowerCase().includes(query) ||
        provider.provider_type.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "online" && provider.online) ||
        (statusFilter === "offline" && !provider.online);
      return matchesQuery && matchesStatus;
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "network") return b.network_mbps - a.network_mbps;
      return a.display_name.localeCompare(b.display_name);
    });
  }, [providers, search, statusFilter, sortBy]);

  const table = useTableControls(filteredProviders, 10);
  const allColumns: TableColumn<Provider>[] = useMemo(
    () => [
      { key: "name", header: "Display name", render: (provider) => provider.display_name },
      { key: "type", header: "Type", render: (provider) => provider.provider_type },
      { key: "machine", header: "Machine", render: (provider) => provider.machine_id },
      { key: "network", header: "Network", render: (provider) => <span className="tabular-nums">{provider.network_mbps} Mbps</span> },
      { key: "status", header: "Status", render: (provider) => <StatusBadge status={provider.online ? "online" : "offline"} /> },
      {
        key: "actions",
        header: "Actions",
        render: (provider) => (
          <Button variant="ghost" size="sm" onClick={() => setSelected(provider)} aria-label={`Open details for ${provider.display_name}`}>
            Details
          </Button>
        )
      }
    ],
    []
  );
  const activeColumns = useMemo(() => allColumns.filter((column) => visibleColumns.includes(column.key)), [allColumns, visibleColumns]);

  function toggleColumn(key: string) {
    setVisibleColumns((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  }

  return (
    <section className="section-stack">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricTile label="Total servers" value={`${providers.length}`} />
        <MetricTile label="Online" value={`${onlineCount}`} />
        <MetricTile label="Offline" value={`${Math.max(0, providers.length - onlineCount)}`} />
      </div>

      <Card
        title="Admin server control center"
        description="Fleet inventory, server onboarding, and operational visibility."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={refresh} loading={loading}>
              Refresh
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>Add server</Button>
          </div>
        }
      >
        {loading ? <SkeletonBlock lines={6} /> : null}
        {!loading && error ? <p role="alert" className="rounded-md border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p> : null}
        {!loading && !error ? (
          <>
            <FilterBar
              search={<Input label="Search" placeholder="Name, machine id, type" value={search} onChange={(event) => setSearch(event.target.value)} />}
              filters={
                <>
                  <Select
                    label="Status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as "all" | "online" | "offline")}
                    options={[
                      { value: "all", label: "All" },
                      { value: "online", label: "Online" },
                      { value: "offline", label: "Offline" }
                    ]}
                  />
                  <Select
                    label="Sort"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as "name" | "network")}
                    options={[
                      { value: "name", label: "Name A-Z" },
                      { value: "network", label: "Network high-low" }
                    ]}
                  />
                </>
              }
              actions={<Button variant="ghost" onClick={() => { setSearch(""); setStatusFilter("all"); setSortBy("name"); }}>Reset</Button>}
            />
            <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
              <TableToolbar
                density={table.density}
                onDensityChange={table.setDensity}
                page={table.page}
                totalPages={table.totalPages}
                pageSize={table.pageSize}
                onPageSizeChange={table.setPageSize}
                totalItems={filteredProviders.length}
                onPrevPage={() => table.setPage(Math.max(1, table.page - 1))}
                onNextPage={() => table.setPage(Math.min(table.totalPages, table.page + 1))}
              />
              <ColumnPicker
                options={allColumns.map((column) => ({ key: column.key, label: column.header, visible: visibleColumns.includes(column.key) }))}
                onToggle={toggleColumn}
              />
            </div>
            <Table
              dense={table.density === "compact"}
              ariaLabel="Admin servers table"
              rowKey={(provider) => provider.id}
              items={table.pagedItems}
              emptyState={<EmptyState title="No servers found" description="Add server to start building your provider fleet." />}
              columns={activeColumns}
            />
          </>
        ) : null}
      </Card>

      <Drawer open={Boolean(selected)} title="Server details" onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-3 text-sm text-textSecondary">
            <p><span className="text-textMuted">ID:</span> {selected.id}</p>
            <p><span className="text-textMuted">Display name:</span> {selected.display_name}</p>
            <p><span className="text-textMuted">Machine:</span> {selected.machine_id}</p>
            <p><span className="text-textMuted">Type:</span> {selected.provider_type}</p>
            <p><span className="text-textMuted">Network:</span> {selected.network_mbps} Mbps</p>
            <div><StatusBadge status={selected.online ? "online" : "offline"} /></div>
          </div>
        ) : null}
      </Drawer>

      <Modal open={isCreateOpen} title="Add server" description="Register a server/provider in admin service." onClose={() => setIsCreateOpen(false)}>
        <form className="space-y-3" onSubmit={createServer}>
          <Input label="Display name" value={form.display_name} onChange={(event) => setForm((prev) => ({ ...prev, display_name: event.target.value }))} />
          <Input label="Machine ID" value={form.machine_id} onChange={(event) => setForm((prev) => ({ ...prev, machine_id: event.target.value }))} />
          <Select
            label="Provider type"
            value={form.provider_type}
            onChange={(event) => setForm((prev) => ({ ...prev, provider_type: event.target.value as "internal" | "donor" }))}
            options={[
              { value: "donor", label: "Donor" },
              { value: "internal", label: "Internal" }
            ]}
          />
          <Input
            label="Network Mbps"
            value={form.network_mbps}
            onChange={(event) => setForm((prev) => ({ ...prev, network_mbps: event.target.value }))}
          />
          <Button type="submit" className="w-full" loading={creating}>
            Add server
          </Button>
        </form>
      </Modal>
    </section>
  );
}
