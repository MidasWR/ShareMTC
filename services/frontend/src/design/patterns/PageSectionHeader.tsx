import { ReactNode } from "react";

type PageSectionHeaderProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageSectionHeader({ title, description, actions }: PageSectionHeaderProps) {
  return (
    <header className="mb-4 flex flex-col gap-3 border-b border-border pb-3 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-textSecondary">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
