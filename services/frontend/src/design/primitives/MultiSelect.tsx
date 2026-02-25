import { useMemo, useState } from "react";
import { LuCheck, LuChevronDown, LuSearch, LuX } from "react-icons/lu";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Input } from "./Input";
import { cx } from "../utils/cx";

export type MultiSelectOption = {
  value: string;
  label: string;
  meta?: string;
};

type MultiSelectProps = {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
};

export function MultiSelect({ label, options, value, onChange, placeholder = "Search...", className }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => options.filter((option) => value.includes(option.value)), [options, value]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized) || (option.meta || "").toLowerCase().includes(normalized));
  }, [options, query]);

  function toggle(nextValue: string) {
    if (value.includes(nextValue)) {
      onChange(value.filter((item) => item !== nextValue));
      return;
    }
    onChange([...value, nextValue]);
  }

  return (
    <div className={cx("relative space-y-1.5", className)}>
      <span className="text-sm font-medium text-textSecondary">{label}</span>
      <Button
        variant="secondary"
        className="w-full justify-between px-3"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="truncate text-left text-sm text-textPrimary">{selected.length ? selected.map((item) => item.label).join(", ") : "Select..."}</span>
        <Icon glyph={LuChevronDown} size={16} className={cx("shrink-0 transition-transform", open ? "rotate-180" : "")} />
      </Button>
      {open ? (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-surface p-2 shadow-lg">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} leftIcon={<Icon glyph={LuSearch} size={16} />} />
          <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto" role="listbox" aria-label={label}>
            {filtered.map((option) => {
              const checked = value.includes(option.value);
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    className={cx(
                      "focus-ring flex min-h-9 w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-sm",
                      checked ? "border-brand bg-brand/10 text-textPrimary" : "border-transparent text-textSecondary hover:border-border hover:bg-elevated"
                    )}
                    onClick={() => toggle(option.value)}
                  >
                    <span className="truncate">{option.label}</span>
                    {checked ? <Icon glyph={LuCheck} size={16} className="text-brand" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {selected.length ? (
            <div className="mt-2 flex justify-end">
              <Button variant="ghost" size="sm" leftIcon={<Icon glyph={LuX} size={16} />} onClick={() => onChange([])}>
                Clear
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
