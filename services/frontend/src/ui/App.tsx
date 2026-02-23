import { useEffect, useMemo, useState } from "react";
import { ToastProvider } from "../design/components/Toast";
import { useSessionState } from "../app/auth/useSessionState";
import { AppTab, menu } from "../app/navigation/menu";
import { useSectionRouting } from "../app/routing/useSectionRouting";
import { AppShell } from "../app/shell/AppShell";
import { AuthPanel } from "./AuthPanel";
import { BillingPanel } from "./BillingPanel";
import { AgentOnboardingPanel } from "../features/agent/onboarding/AgentOnboardingPanel";
import { AdminDashboardPanel } from "../features/dashboard/admin/AdminDashboardPanel";
import { CoreDashboardPanel } from "../features/dashboard/core/CoreDashboardPanel";
import { AdminConsolePanel } from "../features/admin/console/AdminConsolePanel";
import { SharingAdminPanel } from "../features/admin/sharing/SharingAdminPanel";
import { ProviderDashboardPanel } from "../features/provider/dashboard/ProviderDashboardPanel";
import { HostPanel } from "./HostPanel";
import { KeyboardShortcutsPanel } from "./KeyboardShortcutsPanel";
import { OverviewPanel } from "./OverviewPanel";
import { VipPanel } from "./VipPanel";

export function App() {
  const { isAuthenticated, role, refreshSession, logout } = useSessionState();
  const canAdmin = role === "admin" || role === "super-admin" || role === "ops-admin";
  const { tab, enabledMenu, navigateToTab } = useSectionRouting(canAdmin);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const activeLabel = menu.find((item) => item.id === tab)?.label ?? "Overview";

  const content = useMemo(() => {
    if (tab === "overview") return <OverviewPanel />;
    if (tab === "coreDashboard") return <CoreDashboardPanel />;
    if (tab === "pods") return <HostPanel />;
    if (tab === "billing") return <BillingPanel />;
    if (tab === "providerDashboard") return <ProviderDashboardPanel />;
    if (tab === "agentOnboarding") return <AgentOnboardingPanel />;
    if (tab === "adminDashboard") return <AdminDashboardPanel />;
    if (tab === "adminServers") return <AdminConsolePanel />;
    if (tab === "adminSharing") return <SharingAdminPanel />;
    return <VipPanel />;
  }, [tab]);

  function handleLogout() {
    logout();
    setShortcutsOpen(false);
    navigateToTab("overview", false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT" || target?.isContentEditable;
      if (isTypingTarget) return;
      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (event.altKey) {
        const quickTabs: Record<string, AppTab> = {
          "1": "overview",
          "2": "pods",
          "3": "billing",
          "4": "providerDashboard",
          "5": "agentOnboarding",
          "6": canAdmin ? "adminServers" : "vip"
        };
        const nextTab = quickTabs[event.key];
        if (nextTab) {
          event.preventDefault();
          navigateToTab(nextTab);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canAdmin, navigateToTab]);

  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <main className="page-container section-stack flex min-h-screen max-w-5xl flex-col justify-center">
          <header className="text-center">
            <h1 className="text-2xl font-semibold">ShareMTC Control Plane</h1>
            <p className="mt-2 text-sm text-textSecondary">Sign in to access operational modules, dashboards, and server management controls.</p>
          </header>
          <AuthPanel onAuthenticated={refreshSession} />
        </main>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <AppShell
        tab={tab}
        activeLabel={activeLabel}
        enabledMenu={enabledMenu}
        onNavigate={navigateToTab}
        onShortcuts={() => setShortcutsOpen(true)}
        onLogout={handleLogout}
      >
        {content}
      </AppShell>
      <KeyboardShortcutsPanel open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </ToastProvider>
  );
}
