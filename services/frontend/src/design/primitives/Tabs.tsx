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
};

export function Tabs<T extends string>({ items, value, onChange }: TabsProps<T>) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const currentIdx = items.findIndex((item) => item.id === value);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIdx = (currentIdx + direction + items.length) % items.length;
    onChange(items[nextIdx].id);
  }

  return (
    <div className="inline-flex rounded-none border border-border bg-surface p-1" role="tablist" onKeyDown={onKeyDown} aria-label="Sections">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === value}
          className={cx(
            "focus-ring rounded-none px-3 py-1.5 text-sm transition-colors",
            item.id === value ? "bg-brand text-white" : "text-textSecondary hover:text-textPrimary"
          )}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
