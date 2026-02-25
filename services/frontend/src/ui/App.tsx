import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ToastProvider } from "../design/components/Toast";
import { useSessionState } from "../app/auth/useSessionState";
import { AppTab, menu } from "../app/navigation/menu";
import { useSectionRouting } from "../app/routing/useSectionRouting";
import { AppShell } from "../app/shell/AppShell";
import { AuthPanel } from "./AuthPanel";
import { KeyboardShortcutsPanel } from "./KeyboardShortcutsPanel";
import { AdminAccessPanel } from "../features/admin/access/AdminAccessPanel";

const BillingPanel = lazy(() => import("./BillingPanel").then((module) => ({ default: module.BillingPanel })));
const SettingsPanel = lazy(() => import("../features/settings/SettingsPanel").then((module) => ({ default: module.SettingsPanel })));
const MyComputePanel = lazy(() => import("../features/compute/MyComputePanel").then((module) => ({ default: module.MyComputePanel })));
const ProvideComputePanel = lazy(() => import("../features/provider/ProvideComputePanel").then((module) => ({ default: module.ProvideComputePanel })));
const MarketplacePanel = lazy(() => import("../features/marketplace/MarketplacePanel").then((module) => ({ default: module.MarketplacePanel })));
const AdminWorkspacePanel = lazy(() => import("../features/admin/AdminWorkspacePanel").then((module) => ({ default: module.AdminWorkspacePanel })));

export function App() {
  const { isAuthenticated, role, refreshSession, logout } = useSessionState();
  const canAdmin = role === "admin" || role === "super-admin" || role === "ops-admin";
  const { tab, enabledMenu, navigateToTab } = useSectionRouting(canAdmin);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const activeLabel = menu.find((item) => item.id === tab)?.label ?? "Marketplace";

  const content = useMemo<JSX.Element>(() => {
    if (tab === "marketplace") return <MarketplacePanel />;
    if (tab === "myCompute") return <MyComputePanel />;
    if (tab === "provideCompute") return <ProvideComputePanel />;
    if (tab === "billing") return <BillingPanel />;
    if (tab === "settings") return <SettingsPanel />;
    return <AdminWorkspacePanel canAdmin={canAdmin} onAuthenticated={refreshSession} />;
  }, [tab, canAdmin, refreshSession]);

  function handleLogout() {
    logout();
    setShortcutsOpen(false);
    navigateToTab("marketplace", false);
  }

  useEffect(() => {
    if (window.location.pathname === "/admin") {
      navigateToTab("admin", false);
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
          "1": "marketplace",
          "2": "myCompute",
          "3": "provideCompute",
          "4": "billing",
          "5": "settings",
          "6": "admin"
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
            <p className="mt-2 text-sm text-textSecondary">Sign in to use marketplace, manage compute, and control billing.</p>
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
        <Suspense fallback={<div className="rounded-md border border-border bg-surface p-4 text-sm text-textSecondary">Loading section...</div>}>
          {content}
        </Suspense>
      </AppShell>
      <KeyboardShortcutsPanel open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </ToastProvider>
  );
}
