import { FilterBar } from "../../../../design/components/FilterBar";
import { Button } from "../../../../design/primitives/Button";
import { Input } from "../../../../design/primitives/Input";
import { Select } from "../../../../design/primitives/Select";

type Props = {
  search: string;
  statusFilter: "all" | "online" | "offline";
  sortBy: "name" | "network";
  onSearch: (value: string) => void;
  onStatus: (value: "all" | "online" | "offline") => void;
  onSort: (value: "name" | "network") => void;
};

export function ServerFilters({ search, statusFilter, sortBy, onSearch, onStatus, onSort }: Props) {
  return (
    <FilterBar
      search={<Input label="Search" placeholder="Name, machine id, type" value={search} onChange={(event) => onSearch(event.target.value)} />}
      filters={
        <>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(event) => onStatus(event.target.value as "all" | "online" | "offline")}
            options={[
              { value: "all", label: "All" },
              { value: "online", label: "Online" },
              { value: "offline", label: "Offline" }
            ]}
          />
          <Select
            label="Sort"
            value={sortBy}
            onChange={(event) => onSort(event.target.value as "name" | "network")}
            options={[
              { value: "name", label: "Name A-Z" },
              { value: "network", label: "Network high-low" }
            ]}
          />
        </>
      }
      actions={
        <Button
          variant="ghost"
          onClick={() => {
            onSearch("");
            onStatus("all");
            onSort("name");
          }}
        >
          Clear filters
        </Button>
      }
    />
  );
}
