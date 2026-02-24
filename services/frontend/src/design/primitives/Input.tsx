import { InputHTMLAttributes } from "react";
import { cx } from "../utils/cx";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  label?: string;
  helpText?: string;
};

export function Input({ className, error, label, helpText, id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className="block space-y-1.5">
      {label ? <span className="text-sm font-medium text-textSecondary">{label}</span> : null}
      <input
        id={inputId}
        className={cx(
          "focus-ring h-10 w-full rounded-none border bg-canvas px-3 text-sm text-textPrimary placeholder:text-textMuted",
          error ? "border-danger" : "border-border",
          className
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : helpText ? <p className="text-xs text-textMuted">{helpText}</p> : null}
    </label>
  );
}
