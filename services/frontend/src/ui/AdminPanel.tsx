import { useEffect, useMemo, useState } from "react";
import { ColumnPicker } from "../design/components/ColumnPicker";
import { Drawer } from "../design/components/Drawer";
import { FilterBar } from "../design/components/FilterBar";
import { Table } from "../design/components/Table";
import { TableToolbar } from "../design/components/TableToolbar";
import { useTableControls } from "../design/hooks/useTableControls";
import { useToast } from "../design/components/Toast";
import { EmptyState } from "../design/patterns/EmptyState";
import { MetricTile } from "../design/patterns/MetricTile";
import { SkeletonBlock } from "../design/patterns/SkeletonBlock";
import { StatusBadge } from "../design/patterns/StatusBadge";
import { Button } from "../design/primitives/Button";
import { Card } from "../design/primitives/Card";
import { Input } from "../design/primitives/Input";
import { Select } from "../design/primitives/Select";
import { API_BASE } from "../config/apiBase";
import { fetchJSON } from "../lib/http";
import { Provider } from "../types/api";
import { TableColumn } from "../design/components/Table";


export function AdminPanel() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Provider | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [sortBy, setSortBy] = useState<"name" | "network">("name");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(["name", "type", "machine", "network", "status", "actions"]);
  const { push } = useToast();

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const list = await fetchJSON<Provider[]>(`${API_BASE.admin}/v1/admin/providers/`);
      setProviders(list);
      push("info", `Providers synced: ${list.length}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load providers");
      push("error", "Provider list failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // Initial load on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <section className="section-stack">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricTile label="Total providers" value={`${providers.length}`} />
        <MetricTile label="Online nodes" value={`${onlineCount}`} />
        <MetricTile label="Offline nodes" value={`${Math.max(0, providers.length - onlineCount)}`} />
      </div>

      <Card
        title="Provider nodes"
        description="Admin view for compute supply health and machine inventory."
        actions={
          <Button variant="secondary" onClick={refresh} loading={loading}>
            Refresh
          </Button>
        }
      >
        {loading ? <SkeletonBlock lines={6} /> : null}
        {!loading && error ? <p role="alert" className="rounded-md border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p> : null}
        {!loading && !error ? (
          <>
            <FilterBar
              search={
                <Input
                  label="Search"
                  placeholder="Name, machine id, type"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              }
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
              ariaLabel="Provider nodes table"
              rowKey={(provider) => provider.id}
              items={table.pagedItems}
              emptyState={<EmptyState title="No providers found" description="Adjust filters or create providers in adminservice." />}
              columns={activeColumns}
            />
          </>
        ) : null}
      </Card>

      <Drawer open={Boolean(selected)} title="Provider details" onClose={() => setSelected(null)}>
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
    </section>
  );
}
