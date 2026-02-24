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
import { ServerRentalPanel } from "../features/rental/ServerRentalPanel";
import { SettingsPanel } from "../features/settings/SettingsPanel";
import { AdminAccessPanel } from "../features/admin/access/AdminAccessPanel";
import { SharingAdminPanel } from "../features/admin/sharing/SharingAdminPanel";
import { ProviderDashboardPanel } from "../features/provider/dashboard/ProviderDashboardPanel";
import { HostPanel } from "./HostPanel";
import { KeyboardShortcutsPanel } from "./KeyboardShortcutsPanel";
import { VipPanel } from "./VipPanel";
import { MyTemplatesPanel } from "../features/resources/templates/MyTemplatesPanel";
import { VMPanel } from "../features/resources/vm/VMPanel";
import { SharedVMPanel } from "../features/resources/shared/SharedVMPanel";
import { SharedPodsPanel } from "../features/resources/shared/SharedPodsPanel";
import { K8sClustersPanel } from "../features/resources/k8s/K8sClustersPanel";

export function App() {
  const { isAuthenticated, role, refreshSession, logout } = useSessionState();
  const canAdmin = role === "admin" || role === "super-admin" || role === "ops-admin";
  const { tab, enabledMenu, navigateToTab } = useSectionRouting(canAdmin);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const activeLabel = menu.find((item) => item.id === tab)?.label ?? "My Templates";

  const content = useMemo(() => {
    if (tab === "myTemplates") return <MyTemplatesPanel />;
    if (tab === "vm") return <VMPanel />;
    if (tab === "sharedVm") return <SharedVMPanel />;
    if (tab === "sharedPods") return <SharedPodsPanel />;
    if (tab === "k8sClusters") return <K8sClustersPanel />;
    if (tab === "coreDashboard") return <CoreDashboardPanel />;
    if (tab === "pods") return <HostPanel />;
    if (tab === "billing") return <BillingPanel />;
    if (tab === "myServers") return <ServerRentalPanel onNavigate={navigateToTab} />;
    if (tab === "settings") return <SettingsPanel />;
    if (tab === "providerDashboard") return <ProviderDashboardPanel />;
    if (tab === "agentOnboarding") return <AgentOnboardingPanel />;
    if (tab === "adminAccess") return <AdminAccessPanel onSuccess={() => navigateToTab("adminServers")} />;
    if (tab === "adminDashboard") return <AdminDashboardPanel />;
    if (tab === "adminServers") return <AdminConsolePanel />;
    if (tab === "adminSharing") return <SharingAdminPanel />;
    return <VipPanel />;
  }, [tab]);

  function handleLogout() {
    logout();
    setShortcutsOpen(false);
    navigateToTab("myTemplates", false);
  }

  useEffect(() => {
    if (window.location.pathname === "/admin") {
      navigateToTab("adminAccess", false);
    }
  }, [navigateToTab]);

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
          "1": "myTemplates",
          "2": "pods",
          "3": "vm",
          "4": "myServers",
          "5": "settings",
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
    if (window.location.pathname === "/admin") {
      return (
        <ToastProvider>
          <main className="page-container section-stack flex min-h-screen max-w-3xl flex-col justify-center">
            <AdminAccessPanel onSuccess={refreshSession} />
          </main>
        </ToastProvider>
      );
    }
    return (
      <ToastProvider>
        <main className="page-container section-stack flex min-h-screen max-w-5xl flex-col justify-center">
          <header className="text-center">
            <div className="mb-2 flex justify-center">
              <img src="/logo-sharemtc.svg" alt="ShareMTC logo" className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-semibold">ShareMTC Control Plane</h1>
            <p className="mt-2 text-sm text-textSecondary">Sign in to manage PODs, VMs, shared resources, and admin infrastructure.</p>
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
