import { ReactNode } from "react";
import { cx } from "../utils/cx";

export type TableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  render: (item: T) => ReactNode;
};

type TableProps<T> = {
  items: T[];
  columns: TableColumn<T>[];
  emptyState: ReactNode;
  dense?: boolean;
  ariaLabel?: string;
  rowKey?: (item: T, index: number) => string;
};

export function Table<T>({ items, columns, emptyState, dense = false, ariaLabel = "Data table", rowKey }: TableProps<T>) {
  if (items.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className={cx("min-w-full text-left", dense ? "text-xs" : "text-sm")} aria-label={ariaLabel}>
        <thead className="bg-elevated/70 text-textSecondary">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={cx("px-3 py-2 font-medium", column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={rowKey ? rowKey(item, index) : index} className="border-t border-border bg-surface">
              {columns.map((column) => (
                <td key={column.key} className={cx("px-3 py-2 align-top", column.className)}>
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
