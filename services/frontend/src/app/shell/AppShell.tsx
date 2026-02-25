import { ReactNode } from "react";
import { SidebarNav } from "../navigation/SidebarNav";
import { AppTab } from "../navigation/menu";

type Props = {
  tab: AppTab;
  activeLabel: string;
  enabledMenu: Array<{ id: AppTab; label: string; group: "main" | "account" }>;
  onNavigate: (tab: AppTab) => void;
  onShortcuts: () => void;
  onLogout: () => void;
  children: ReactNode;
};

export function AppShell({ tab, enabledMenu, onNavigate, onShortcuts, onLogout, children }: Props) {
  const activeItem = enabledMenu.find((item) => item.id === tab);
  const groupLabel = activeItem?.group === "account" ? "Account" : "Workspace";

  return (
    <div className="page-shell">
      <a
        href="#content"
        className="focus-ring sr-only absolute left-2 top-2 z-[1500] rounded bg-surface px-3 py-2 text-sm text-textPrimary focus:not-sr-only"
      >
        Skip to content
      </a>
      <SidebarNav
        tab={tab}
        enabledMenu={enabledMenu}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onShortcuts={onShortcuts}
      />
      <main id="content" className="page-container section-stack" tabIndex={-1}>
        <header className="mb-2 flex items-center justify-between gap-2 text-textSecondary">
          <div className="flex items-center gap-2">
            <BadgeLabel label={groupLabel} />
            <span className="text-sm font-medium text-textPrimary">{activeItem?.label ?? "Marketplace"}</span>
          </div>
          <img src="/logo-sharemtc.svg" alt="ShareMTC logo" className="h-6 w-6" />
        </header>
        {children}
      </main>
    </div>
  );
}

function BadgeLabel({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] uppercase tracking-wide text-textMuted">
      {label}
    </span>
  );
}
