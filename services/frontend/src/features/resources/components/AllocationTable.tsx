import { useMemo } from "react";
import { ColumnPicker } from "../../../design/components/ColumnPicker";
import { Table, TableColumn } from "../../../design/components/Table";
import { TableToolbar } from "../../../design/components/TableToolbar";
import { useTableControls } from "../../../design/hooks/useTableControls";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { StatusBadge } from "../../../design/patterns/StatusBadge";
import { Button } from "../../../design/primitives/Button";
import { Allocation } from "../../../types/api";

type Props = {
  rows: Allocation[];
  visibleColumns: string[];
  onToggleColumn: (key: string) => void;
  onOpenDetails: (row: Allocation) => void;
  onStop: (row: Allocation) => void;
  onCreate: () => void;
};

export function AllocationTable({ rows, visibleColumns, onToggleColumn, onOpenDetails, onStop, onCreate }: Props) {
  const table = useTableControls(rows, 10);

  const allColumns: TableColumn<Allocation>[] = useMemo(
    () => [
      { key: "id", header: "Allocation ID", render: (item) => <span className="font-mono text-xs">{item.id}</span> },
      { key: "cpu", header: "CPU", render: (item) => <span className="tabular-nums">{item.cpu_cores}</span> },
      { key: "ram", header: "RAM MB", render: (item) => <span className="tabular-nums">{item.ram_mb}</span> },
      { key: "gpu", header: "GPU", render: (item) => <span className="tabular-nums">{item.gpu_units}</span> },
      { key: "status", header: "Status", render: (item) => <StatusBadge status={item.released_at ? "stopped" : "running"} /> },
      {
        key: "actions",
        header: "Actions",
        render: (item) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onOpenDetails(item)} aria-label={`Open allocation ${item.id} details`}>
              Details
            </Button>
            {!item.released_at ? (
              <Button variant="ghost" size="sm" onClick={() => onStop(item)} aria-label={`Stop allocation ${item.id}`}>
                Stop
              </Button>
            ) : null}
          </div>
        )
      }
    ],
    [onOpenDetails, onStop]
  );
  const activeColumns = useMemo(
    () => allColumns.filter((column) => visibleColumns.includes(column.key)),
    [allColumns, visibleColumns]
  );

  return (
    <>
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
        ariaLabel="Pod allocations table"
        rowKey={(item) => item.id}
        items={table.pagedItems}
        emptyState={
          <EmptyState
            title="No allocations found"
            description="Set provider ID, then load data or create a new allocation."
            action={<Button onClick={onCreate}>Create first pod</Button>}
          />
        }
        columns={activeColumns}
      />
    </>
  );
}
