import { KeyboardEvent, useRef } from "react";
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
  mode?: "default" | "many";
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

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  collapseAfter = Number.POSITIVE_INFINITY,
  moreLabel = "More",
  mode = "default"
}: TabsProps<T>) {
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const overflowSelectRef = useRef<HTMLSelectElement | null>(null);

  const effectiveCollapseAfter =
    mode === "many" && !Number.isFinite(collapseAfter) ? Math.min(4, Math.max(1, items.length)) : collapseAfter;
  const { visibleItems, overflowItems } = splitTabItems(items, effectiveCollapseAfter);
  const selectedOverflow = overflowItems.find((item) => item.id === value);
  const visibleTabIDs = new Set(visibleItems.map((item) => item.id));

  function focusTab(next: T) {
    if (visibleTabIDs.has(next)) {
      const button = buttonRefs.current[next];
      if (button) {
        button.focus();
        return;
      }
    }
    if (overflowSelectRef.current) {
      overflowSelectRef.current.focus();
    }
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, itemID: T) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const next = nextTabByArrow(items, itemID, event.key);
      onChange(next);
      requestAnimationFrame(() => focusTab(next));
      return;
    }
    if (event.key === "Home" && items.length > 0) {
      event.preventDefault();
      const first = items[0].id;
      onChange(first);
      requestAnimationFrame(() => focusTab(first));
      return;
    }
    if (event.key === "End" && items.length > 0) {
      event.preventDefault();
      const last = items[items.length - 1].id;
      onChange(last);
      requestAnimationFrame(() => focusTab(last));
    }
  }

  return (
    <div className="overflow-x-auto" role="tablist" aria-label="Sections">
      <div className="inline-flex min-w-full whitespace-nowrap rounded-lg border border-border bg-surface">
        {visibleItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            ref={(node) => {
              buttonRefs.current[item.id] = node;
            }}
            aria-selected={item.id === value}
            tabIndex={item.id === value ? 0 : -1}
            className={cx(
              "focus-ring relative border-b-2 px-3 py-2 text-sm transition-colors",
              index < visibleItems.length - 1 || overflowItems.length > 0 ? "border-r border-r-border" : "",
              item.id === value
                ? "border-b-brand bg-canvas text-brand"
                : "border-b-transparent text-textSecondary hover:text-textPrimary hover:bg-elevated"
            )}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => onTabKeyDown(event, item.id)}
          >
            {item.label}
            {item.id === value ? <span className="pointer-events-none absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" /> : null}
          </button>
        ))}
        {overflowItems.length > 0 ? (
          <label className="focus-ring flex items-center gap-2 border-b-2 border-b-transparent border-r border-r-border px-2 py-1 text-xs text-textMuted">
            <span className="uppercase tracking-wide">{moreLabel}</span>
            <select
              ref={overflowSelectRef}
              className={cx(
                "rounded-md border border-border bg-canvas px-2 py-1 text-sm outline-none",
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
