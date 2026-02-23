import { ReactNode } from "react";
import { cx } from "../utils/cx";

type Variant = "neutral" | "success" | "warning" | "danger" | "info";

const styles: Record<Variant, string> = {
  neutral: "bg-elevated text-textSecondary border border-border",
  success: "bg-success/15 text-success border border-success/40",
  warning: "bg-warning/15 text-warning border border-warning/40",
  danger: "bg-danger/15 text-danger border border-danger/40",
  info: "bg-info/15 text-info border border-info/40"
};

type BadgeProps = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", styles[variant], className)}>{children}</span>;
}
