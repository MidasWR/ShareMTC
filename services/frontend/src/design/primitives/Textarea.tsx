import { TextareaHTMLAttributes } from "react";
import { cx } from "../utils/cx";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
  label?: string;
  helpText?: string;
};

export function Textarea({ className, error, label, helpText, id, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;
  return (
    <label className="block space-y-1.5">
      {label ? <span className="text-sm font-medium text-textSecondary">{label}</span> : null}
      <textarea
        id={textareaId}
        className={cx(
          "focus-ring min-h-24 w-full rounded-md border bg-canvas px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted",
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
