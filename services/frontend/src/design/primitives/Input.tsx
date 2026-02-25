import { InputHTMLAttributes, useId } from "react";
import { cx } from "../utils/cx";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  label?: string;
  helpText?: string;
};

export function Input({ className, error, label, helpText, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? `input-${generatedId}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const describedBy = error ? errorId : helpText ? helpId : undefined;
  return (
    <label className="block space-y-1.5">
      {label ? <span className="text-sm font-medium text-textSecondary">{label}</span> : null}
      <input
        id={inputId}
        className={cx(
          "focus-ring h-10 w-full rounded-md border bg-canvas px-3 text-sm text-textPrimary placeholder:text-textMuted",
          error ? "border-danger" : "border-border",
          className
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? <p id={errorId} className="text-xs text-danger">{error}</p> : helpText ? <p id={helpId} className="text-xs text-textMuted">{helpText}</p> : null}
    </label>
  );
}
