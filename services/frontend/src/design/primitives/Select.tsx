import { SelectHTMLAttributes } from "react";
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
  return (
    <label className="block space-y-1.5">
      {label ? <span className="text-sm font-medium text-textSecondary">{label}</span> : null}
      <select
        className={cx(
          "focus-ring h-10 w-full rounded-md border bg-canvas px-3 text-sm text-textPrimary",
          error ? "border-danger" : "border-border",
          className
        )}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-danger">{error}</p> : helpText ? <p className="text-xs text-textMuted">{helpText}</p> : null}
    </label>
  );
}
