import { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center">
      <h4 className="text-base font-semibold">{title}</h4>
      <p className="mt-1 text-sm text-textSecondary">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
