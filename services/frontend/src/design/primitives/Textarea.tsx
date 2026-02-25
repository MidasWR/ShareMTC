import { TextareaHTMLAttributes, useId } from "react";
import { cx } from "../utils/cx";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
  label?: string;
  helpText?: string;
};

export function Textarea({ className, error, label, helpText, id, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? props.name ?? `textarea-${generatedId}`;
  const errorId = `${textareaId}-error`;
  const helpId = `${textareaId}-help`;
  const describedBy = error ? errorId : helpText ? helpId : undefined;
  return (
    <label className="block space-y-1.5">
      {label ? <span className="text-sm font-medium text-textSecondary">{label}</span> : null}
      <textarea
        id={textareaId}
        className={cx(
          "focus-ring min-h-24 w-full rounded-none border bg-canvas px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted",
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
