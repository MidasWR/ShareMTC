import { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../utils/cx";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "info" | "warning";
type Size = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
};

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand text-canvas hover:bg-brandHover shadow-brand hover:shadow-brandStrong",
  secondary: "border border-border bg-transparent text-textPrimary hover:border-brand hover:text-brand hover:shadow-brand",
  ghost: "bg-transparent text-textSecondary hover:text-brand hover:bg-brand/10",
  destructive: "bg-danger text-white hover:bg-red-500 shadow-md",
  info: "bg-info text-white hover:bg-sky-400 shadow-md",
  warning: "bg-warning text-white hover:bg-yellow-400 shadow-md"
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm"
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  leftIcon,
  type,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      className={cx(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      type={type ?? "button"}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : leftIcon}
      <span>{children}</span>
    </button>
  );
}
