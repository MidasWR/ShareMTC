import { ReactNode } from "react";

type InlineAlertProps = {
  kind?: "info" | "error" | "success";
  children: ReactNode;
};

export function InlineAlert({ kind = "info", children }: InlineAlertProps) {
  const styles =
    kind === "error"
      ? "border-danger/40 bg-danger/15 text-danger"
      : kind === "success"
        ? "border-success/40 bg-success/15 text-success"
        : "border-info/40 bg-info/15 text-info";

  const role = kind === "error" ? "alert" : "status";
  const ariaLive = kind === "error" ? "assertive" : "polite";
  return <p role={role} aria-live={ariaLive} className={`rounded-md border px-3 py-2 text-sm ${styles}`}>{children}</p>;
}
