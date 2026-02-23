import { FormEvent, useMemo, useState } from "react";
import { ColumnPicker } from "../design/components/ColumnPicker";
import { FilterBar } from "../design/components/FilterBar";
import { Table } from "../design/components/Table";
import { TableToolbar } from "../design/components/TableToolbar";
import { useToast } from "../design/components/Toast";
import { useTableControls } from "../design/hooks/useTableControls";
import { EmptyState } from "../design/patterns/EmptyState";
import { MetricTile } from "../design/patterns/MetricTile";
import { Button } from "../design/primitives/Button";
import { Card } from "../design/primitives/Card";
import { Input } from "../design/primitives/Input";
import { Select } from "../design/primitives/Select";
import { fetchJSON } from "../lib/http";
import { UsageAccrual } from "../types/api";
import { TableColumn } from "../design/components/Table";

const BILLING_BASE = import.meta.env.VITE_BILLING_BASE_URL ?? "http://localhost:8084";

export function BillingPanel() {
  const [providerID, setProviderID] = useState("");
  const [planID, setPlanID] = useState("");
  const [accruals, setAccruals] = useState<UsageAccrual[]>([]);
  const [costPreview, setCostPreview] = useState("--");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "total">("newest");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(["id", "usage", "amount", "bonus", "total", "created"]);
  const { push } = useToast();

  const totalAccrued = useMemo(() => accruals.reduce((sum, item) => sum + item.total_usd, 0), [accruals]);
  const totalBonus = useMemo(() => accruals.reduce((sum, item) => sum + item.vip_bonus_usd, 0), [accruals]);
  const filteredAccruals = useMemo(() => {
    const query = search.toLowerCase().trim();
    const filtered = accruals.filter(
      (item) => query.length === 0 || item.id.toLowerCase().includes(query) || item.usage_id.toLowerCase().includes(query)
    );
    return [...filtered].sort((a, b) => {
      if (sortBy === "total") return b.total_usd - a.total_usd;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [accruals, search, sortBy]);
  const table = useTableControls(filteredAccruals, 10);

  const allColumns: TableColumn<UsageAccrual>[] = useMemo(
    () => [
      { key: "id", header: "Accrual ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
      { key: "usage", header: "Usage ID", render: (row) => <span className="font-mono text-xs">{row.usage_id}</span> },
      { key: "amount", header: "Amount", render: (row) => <span className="tabular-nums">${row.amount_usd.toFixed(2)}</span> },
      { key: "bonus", header: "VIP bonus", render: (row) => <span className="tabular-nums">${row.vip_bonus_usd.toFixed(2)}</span> },
      { key: "total", header: "Total", render: (row) => <span className="tabular-nums">${row.total_usd.toFixed(2)}</span> },
      { key: "created", header: "Created", render: (row) => <span className="tabular-nums">{new Date(row.created_at).toLocaleString()}</span> }
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

  async function previewUsage(event: FormEvent) {
    event.preventDefault();
    if (!providerID || !planID) {
      push("error", "Provider ID and plan ID are required");
      return;
    }
    setLoading(true);
    try {
      const preview = await fetchJSON<{ total_usd: number; vip_bonus_usd: number }>(`${BILLING_BASE}/v1/billing/usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: providerID,
          plan_id: planID,
          cpu_cores_used: 2,
          ram_gb_used: 4,
          gpu_used: 1,
          hours: 1,
          network_mbps: 700
        })
      });
      setCostPreview(`$${preview.total_usd.toFixed(2)} (bonus: $${preview.vip_bonus_usd.toFixed(2)})`);
      push("success", "Usage accrual processed");
    } catch (requestError) {
      push("error", requestError instanceof Error ? requestError.message : "Usage preview failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadAccruals() {
    if (!providerID) {
      push("error", "Provider ID is required");
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchJSON<UsageAccrual[]>(`${BILLING_BASE}/v1/billing/accruals?provider_id=${encodeURIComponent(providerID)}`);
      setAccruals(rows);
      push("info", `Loaded ${rows.length} accruals`);
    } catch (requestError) {
      push("error", requestError instanceof Error ? requestError.message : "Accrual load failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <Card title="Billing usage" description="Use existing billing contract for cost preview and accrual history.">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_2fr_1fr_1fr]" onSubmit={previewUsage}>
          <Input label="Provider ID" value={providerID} onChange={(event) => setProviderID(event.target.value)} />
          <Input label="Plan ID" value={planID} onChange={(event) => setPlanID(event.target.value)} />
          <Button type="submit" className="md:mt-7" loading={loading}>
            Process usage
          </Button>
          <Button type="button" variant="secondary" className="md:mt-7" onClick={loadAccruals} loading={loading}>
            Load accruals
          </Button>
        </form>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MetricTile label="Last preview" value={costPreview} />
          <MetricTile label="Accrued total" value={`$${totalAccrued.toFixed(2)}`} />
          <MetricTile label="VIP bonus total" value={`$${totalBonus.toFixed(2)}`} />
        </div>
      </Card>

      <Card title="Accrual history" description="Data density mode for financial records.">
        <FilterBar
          search={
            <Input
              label="Search"
              placeholder="Accrual ID or usage ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          }
          filters={
            <Select
              label="Sort"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as "newest" | "total")}
              options={[
                { value: "newest", label: "Newest first" },
                { value: "total", label: "Total high-low" }
              ]}
            />
          }
          actions={<Button variant="ghost" onClick={() => { setSearch(""); setSortBy("newest"); }}>Reset</Button>}
        />
        <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
          <TableToolbar
            density={table.density}
            onDensityChange={table.setDensity}
            page={table.page}
            totalPages={table.totalPages}
            pageSize={table.pageSize}
            onPageSizeChange={table.setPageSize}
            totalItems={filteredAccruals.length}
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
          ariaLabel="Billing accrual history table"
          rowKey={(row) => row.id}
          items={table.pagedItems}
          emptyState={<EmptyState title="No accrual records" description="Process usage and load accruals for a provider." />}
          columns={activeColumns}
        />
      </Card>
    </section>
  );
}
