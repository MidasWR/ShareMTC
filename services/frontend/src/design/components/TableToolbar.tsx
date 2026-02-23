import { Button } from "../primitives/Button";
import { Select } from "../primitives/Select";
import { TableDensity } from "../hooks/useTableControls";

type TableToolbarProps = {
  density: TableDensity;
  onDensityChange: (value: TableDensity) => void;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  totalItems: number;
  onPrevPage: () => void;
  onNextPage: () => void;
};

export function TableToolbar({
  density,
  onDensityChange,
  page,
  totalPages,
  pageSize,
  onPageSizeChange,
  totalItems,
  onPrevPage,
  onNextPage
}: TableToolbarProps) {
  return (
    <div className="mb-3 grid gap-2 rounded-md border border-border bg-elevated/20 p-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          label="Density"
          value={density}
          onChange={(event) => onDensityChange(event.target.value as TableDensity)}
          options={[
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfortable" }
          ]}
        />
        <Select
          label="Rows per page"
          value={`${pageSize}`}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          options={[
            { value: "5", label: "5" },
            { value: "10", label: "10" },
            { value: "20", label: "20" },
            { value: "50", label: "50" }
          ]}
        />
      </div>
      <p className="text-xs text-textMuted md:pb-2">{totalItems} rows total</p>
      <div className="flex items-center gap-2 md:justify-end">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={onPrevPage} aria-label="Previous page">
          Prev
        </Button>
        <span className="rounded-md border border-border px-3 py-2 text-xs text-textSecondary">
          Page {page} / {totalPages}
        </span>
        <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={onNextPage} aria-label="Next page">
          Next
        </Button>
      </div>
    </div>
  );
}
