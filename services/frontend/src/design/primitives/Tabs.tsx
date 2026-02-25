import { KeyboardEvent } from "react";
import { cx } from "../utils/cx";

export type TabItem<T extends string> = {
  id: T;
  label: string;
};

type TabsProps<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (next: T) => void;
  collapseAfter?: number;
  moreLabel?: string;
};

export function nextTabByArrow<T extends string>(items: TabItem<T>[], value: T, key: "ArrowLeft" | "ArrowRight"): T {
  if (items.length === 0) return value;
  const currentIdx = items.findIndex((item) => item.id === value);
  if (currentIdx < 0) return items[0].id;
  const direction = key === "ArrowRight" ? 1 : -1;
  const nextIdx = (currentIdx + direction + items.length) % items.length;
  return items[nextIdx].id;
}

export function splitTabItems<T extends string>(items: TabItem<T>[], collapseAfter: number) {
  const normalizedCollapseAfter = Number.isFinite(collapseAfter) ? Math.max(1, collapseAfter) : items.length;
  return {
    visibleItems: items.slice(0, normalizedCollapseAfter),
    overflowItems: items.slice(normalizedCollapseAfter)
  };
}

export function Tabs<T extends string>({ items, value, onChange, collapseAfter = Number.POSITIVE_INFINITY, moreLabel = "More" }: TabsProps<T>) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    onChange(nextTabByArrow(items, value, event.key));
  }

  const { visibleItems, overflowItems } = splitTabItems(items, collapseAfter);
  const selectedOverflow = overflowItems.find((item) => item.id === value);

  return (
    <div className="overflow-x-auto" role="tablist" onKeyDown={onKeyDown} aria-label="Sections">
      <div className="inline-flex min-w-full whitespace-nowrap rounded-md border border-border bg-surface">
        {visibleItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === value}
            className={cx(
              "focus-ring border-b-2 px-3 py-2 text-sm transition-colors",
              index < visibleItems.length - 1 || overflowItems.length > 0 ? "border-r border-r-border" : "",
              item.id === value
                ? "border-b-brand bg-canvas text-brand"
                : "border-b-transparent text-textSecondary hover:text-textPrimary hover:bg-elevated"
            )}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
        {overflowItems.length > 0 ? (
          <label className="focus-ring flex items-center gap-2 border-b-2 border-b-transparent border-r border-r-border px-2 py-1 text-xs text-textMuted">
            <span>{moreLabel}</span>
            <select
              className={cx(
                "bg-transparent text-sm outline-none",
                selectedOverflow ? "text-brand" : "text-textSecondary"
              )}
              aria-label={moreLabel}
              value={selectedOverflow ? selectedOverflow.id : ""}
              onChange={(event) => onChange(event.target.value as T)}
            >
              <option value="" disabled>
                {moreLabel}
              </option>
              {overflowItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </div>
  );
}
