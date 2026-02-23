import { useMemo } from "react";
import { Select } from "../primitives/Select";

type ActionDropdownOption = {
  value: string;
  label: string;
};

type ActionDropdownProps = {
  label?: string;
  options: ActionDropdownOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
};

export function ActionDropdown({ label = "Actions", options, onSelect, disabled = false }: ActionDropdownProps) {
  const selectOptions = useMemo(
    () => [{ value: "", label }, ...options.map((item) => ({ value: item.value, label: item.label }))],
    [label, options]
  );

  return (
    <div className="min-w-[140px]">
      <Select
        aria-label={label}
        label={undefined}
        disabled={disabled}
        value=""
        onChange={(event) => {
          const value = event.target.value;
          if (!value) return;
          onSelect(value);
        }}
        options={selectOptions}
        className="h-8 min-w-[140px] py-0 text-xs"
      />
    </div>
  );
}
