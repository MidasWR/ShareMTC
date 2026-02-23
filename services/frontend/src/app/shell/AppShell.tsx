import { ReactNode } from "react";
import { SidebarNav } from "../navigation/SidebarNav";
import { AppTab } from "../navigation/menu";

type Props = {
  tab: AppTab;
  activeLabel: string;
  enabledMenu: Array<{ id: AppTab; label: string; group: "core" | "provider" | "admin" | "ops" }>;
  onNavigate: (tab: AppTab) => void;
  onShortcuts: () => void;
  onLogout: () => void;
  children: ReactNode;
};

export function AppShell({ tab, enabledMenu, onNavigate, onShortcuts, onLogout, children }: Props) {
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
        groups={["core", "provider", "admin", "ops"]}
        enabledMenu={enabledMenu}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onShortcuts={onShortcuts}
      />
      <main id="content" className="page-container section-stack" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
