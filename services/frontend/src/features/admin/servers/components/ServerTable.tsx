import { useMemo } from "react";
import { ColumnPicker } from "../../../../design/components/ColumnPicker";
import { Table, TableColumn } from "../../../../design/components/Table";
import { TableToolbar } from "../../../../design/components/TableToolbar";
import { useTableControls } from "../../../../design/hooks/useTableControls";
import { EmptyState } from "../../../../design/patterns/EmptyState";
import { StatusBadge } from "../../../../design/patterns/StatusBadge";
import { Button } from "../../../../design/primitives/Button";
import { Provider } from "../../../../types/api";

type Props = {
  rows: Provider[];
  visibleColumns: string[];
  onToggleColumn: (key: string) => void;
  onOpenDetails: (provider: Provider) => void;
};

export function ServerTable({ rows, visibleColumns, onToggleColumn, onOpenDetails }: Props) {
  const table = useTableControls(rows, 10);
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
          <Button variant="ghost" size="sm" onClick={() => onOpenDetails(provider)} aria-label={`Open details for ${provider.display_name}`}>
            Details
          </Button>
        )
      }
    ],
    [onOpenDetails]
  );
  const activeColumns = useMemo(() => allColumns.filter((column) => visibleColumns.includes(column.key)), [allColumns, visibleColumns]);

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
          options={allColumns.map((column) => ({ key: column.key, label: column.header, visible: visibleColumns.includes(column.key) }))}
          onToggle={onToggleColumn}
        />
      </div>
      <Table
        dense={table.density === "compact"}
        ariaLabel="Admin servers table"
        rowKey={(provider) => provider.id}
        items={table.pagedItems}
        emptyState={<EmptyState title="No servers found" description="Try different filters or add a new server." />}
        columns={activeColumns}
      />
    </>
  );
}
