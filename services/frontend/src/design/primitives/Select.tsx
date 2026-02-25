import { SelectHTMLAttributes, useId } from "react";
import { cx } from "../utils/cx";

type Option = {
  value: string;
  label: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: Option[];
  error?: string;
  label?: string;
  helpText?: string;
};

export function Select({ className, options, error, label, helpText, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = props.id ?? props.name ?? `select-${generatedId}`;
  const errorId = `${selectId}-error`;
  const helpId = `${selectId}-help`;
  const describedBy = error ? errorId : helpText ? helpId : undefined;

  return (
    <label className="block space-y-1.5">
      {label ? <span className="text-sm font-medium text-textSecondary">{label}</span> : null}
      <select
        id={selectId}
        className={cx(
          "focus-ring h-10 w-full rounded-md border bg-canvas px-3 text-sm text-textPrimary disabled:cursor-not-allowed disabled:opacity-60",
          error ? "border-danger bg-danger/5" : "border-border",
          className
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p id={errorId} className="text-xs text-danger">{error}</p> : helpText ? <p id={helpId} className="text-xs text-textMuted">{helpText}</p> : null}
    </label>
  );
}
