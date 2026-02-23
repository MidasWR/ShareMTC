import { FilterBar } from "../../../design/components/FilterBar";
import { Button } from "../../../design/primitives/Button";
import { Input } from "../../../design/primitives/Input";
import { Select } from "../../../design/primitives/Select";

type Props = {
  search: string;
  onSearch: (value: string) => void;
  statusFilter: "all" | "running" | "stopped";
  onStatusFilter: (value: "all" | "running" | "stopped") => void;
  sortBy: "newest" | "cpu" | "ram";
  onSortBy: (value: "newest" | "cpu" | "ram") => void;
};

export function AllocationFilters({ search, onSearch, statusFilter, onStatusFilter, sortBy, onSortBy }: Props) {
  return (
    <FilterBar
      search={
        <Input
          label="Search"
          placeholder="Allocation ID or provider ID"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
      }
      filters={
        <>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(event) => onStatusFilter(event.target.value as "all" | "running" | "stopped")}
            options={[
              { value: "all", label: "All" },
              { value: "running", label: "Running" },
              { value: "stopped", label: "Stopped" }
            ]}
          />
          <Select
            label="Sort"
            value={sortBy}
            onChange={(event) => onSortBy(event.target.value as "newest" | "cpu" | "ram")}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "cpu", label: "CPU high-low" },
              { value: "ram", label: "RAM high-low" }
            ]}
          />
        </>
      }
      actions={
        <Button
          variant="ghost"
          onClick={() => {
            onSearch("");
            onStatusFilter("all");
            onSortBy("newest");
          }}
        >
          Clear filters
        </Button>
      }
    />
  );
}
