import { InputHTMLAttributes, ReactNode, useId } from "react";
import { cx } from "../utils/cx";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  label?: string;
  helpText?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
};

export function Input({ className, error, label, helpText, id, leftIcon, rightSlot, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? `input-${generatedId}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const describedBy = error ? errorId : helpText ? helpId : undefined;
  return (
    <label className="block space-y-1.5">
      {label ? <span className="text-sm font-medium text-textSecondary">{label}</span> : null}
      <div className="relative">
        {leftIcon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted">{leftIcon}</span> : null}
        <input
          id={inputId}
          className={cx(
            "focus-ring h-10 w-full rounded-md border bg-canvas px-3 text-sm text-textPrimary placeholder:text-textMuted disabled:cursor-not-allowed disabled:opacity-60",
            leftIcon ? "pl-9" : "",
            rightSlot ? "pr-11" : "",
            error ? "border-danger bg-danger/5" : "border-border",
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
        {rightSlot ? <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{rightSlot}</span> : null}
      </div>
      {error ? <p id={errorId} className="text-xs text-danger">{error}</p> : helpText ? <p id={helpId} className="text-xs text-textMuted">{helpText}</p> : null}
    </label>
  );
}
