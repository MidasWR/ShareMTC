import { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../utils/cx";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
};

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brandHover",
  secondary: "bg-elevated text-textPrimary border border-border hover:border-borderStrong hover:bg-slate-700/40",
  ghost: "bg-transparent text-textSecondary hover:text-textPrimary hover:bg-elevated/60",
  destructive: "bg-danger text-white hover:bg-red-500"
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
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : leftIcon}
      <span>{children}</span>
    </button>
  );
}
