import { useMemo } from "react";
import { ColumnPicker } from "../../../design/components/ColumnPicker";
import { FilterBar } from "../../../design/components/FilterBar";
import { Table, TableColumn } from "../../../design/components/Table";
import { TableToolbar } from "../../../design/components/TableToolbar";
import { useTableControls } from "../../../design/hooks/useTableControls";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { Button } from "../../../design/primitives/Button";
import { Input } from "../../../design/primitives/Input";
import { Select } from "../../../design/primitives/Select";
import { UsageAccrual } from "../../../types/api";

type Props = {
  rows: UsageAccrual[];
  visibleColumns: string[];
  sortBy: "newest" | "total";
  search: string;
  onSortBy: (value: "newest" | "total") => void;
  onSearch: (value: string) => void;
  onToggleColumn: (key: string) => void;
  loading: boolean;
};

export function AccrualTable({ rows, visibleColumns, sortBy, search, onSortBy, onSearch, onToggleColumn, loading }: Props) {
  const table = useTableControls(rows, 10);
  const allColumns: TableColumn<UsageAccrual>[] = useMemo(
    () => [
      { key: "id", header: "Accrual ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
      { key: "usage", header: "Usage ID", render: (row) => <span className="font-mono text-xs">{row.usage_id}</span> },
      { key: "amount", header: "Amount", render: (row) => <span className="tabular-nums">${row.amount_usd.toFixed(2)}</span> },
      { key: "bonus", header: "VIP bonus", render: (row) => <span className="tabular-nums">${row.vip_bonus_usd.toFixed(2)}</span> },
      { key: "total", header: "Total", render: (row) => <span className="tabular-nums">${row.total_usd.toFixed(2)}</span> },
      { key: "payment", header: "Method", render: () => <span className="text-xs text-textMuted">N/A</span> },
      { key: "created", header: "Created", render: (row) => <span className="tabular-nums">{new Date(row.created_at).toLocaleString()}</span> }
    ],
    []
  );
  const activeColumns = useMemo(
    () => allColumns.filter((column) => visibleColumns.includes(column.key)),
    [allColumns, visibleColumns]
  );

  return (
    <>
      <FilterBar
        search={
          <Input
            label="Search"
            placeholder="Accrual ID or usage ID"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        }
        filters={
          <Select
            label="Sort"
            value={sortBy}
            onChange={(event) => onSortBy(event.target.value as "newest" | "total")}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "total", label: "Total high-low" }
            ]}
          />
        }
        actions={
          <Button
            variant="ghost"
            onClick={() => {
              onSearch("");
              onSortBy("newest");
            }}
          >
            Clear filters
          </Button>
        }
      />
      <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
        <TableToolbar
          density={table.density}
          onDensityChange={table.setDensity}
          page={table.page}
          totalPages={table.totalPages}
          pageSize={table.pageSize}
          onPageSizeChange={table.setPageSize}
          totalItems={rows.length}
          onPrevPage={() => table.setPage(Math.max(1, table.page - 1))}
          onNextPage={() => table.setPage(Math.min(table.totalPages, table.page + 1))}
        />
        <ColumnPicker
          options={allColumns.map((column) => ({
            key: column.key,
            label: column.header,
            visible: visibleColumns.includes(column.key)
          }))}
          onToggle={onToggleColumn}
        />
      </div>
      <Table
        dense={table.density === "compact"}
        ariaLabel="Billing accrual history table"
        rowKey={(row) => row.id}
        items={!loading ? table.pagedItems : []}
        emptyState={<EmptyState title="No accrual records" description="Process usage and load accruals for a provider." />}
        columns={activeColumns}
      />
    </>
  );
}
