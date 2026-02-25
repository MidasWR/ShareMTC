import { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  kind?: "empty" | "error";
};

export function EmptyState({ title, description, action, kind = "empty" }: EmptyStateProps) {
  return (
    <div className={`rounded-lg border p-6 text-center ${kind === "error" ? "border-danger/50 bg-danger/10" : "border-dashed border-border"}`}>
      <h4 className="text-base font-semibold">{title}</h4>
      <p className="mt-1 text-sm text-textSecondary">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
