import { ReactNode } from "react";

type FilterBarProps = {
  search: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
};

export function FilterBar({ search, filters, actions }: FilterBarProps) {
  return (
    <div className="mb-3 grid gap-2 rounded-md border border-border bg-elevated/20 p-2 md:grid-cols-[2fr_2fr_auto] md:items-end">
      <div>{search}</div>
      <div className="grid gap-2 sm:grid-cols-2">{filters}</div>
      <div className="flex justify-start gap-2 md:justify-end">{actions}</div>
    </div>
  );
}
