type ColumnOption = {
  key: string;
  label: string;
  visible: boolean;
};

type ColumnPickerProps = {
  options: ColumnOption[];
  onToggle: (key: string) => void;
};

export function ColumnPicker({ options, onToggle }: ColumnPickerProps) {
  return (
    <details className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
      <summary className="cursor-pointer select-none text-textSecondary">Columns</summary>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.key} className="flex items-center gap-2 text-sm text-textSecondary">
            <input
              type="checkbox"
              checked={option.visible}
              onChange={() => onToggle(option.key)}
              className="h-4 w-4 rounded border-border bg-canvas"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
