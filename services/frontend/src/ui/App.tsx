import { useEffect, useState } from "react";
import { featureFlags } from "../config/featureFlags";
import { ToastProvider } from "../design/components/Toast";
import { Breadcrumbs } from "../design/patterns/Breadcrumbs";
import { Button } from "../design/primitives/Button";
import { cx } from "../design/utils/cx";
import { AuthPanel } from "./AuthPanel";
import { BillingPanel } from "./BillingPanel";
import { AgentOnboardingPanel } from "../features/agent/onboarding/AgentOnboardingPanel";
import { SharingAdminPanel } from "../features/admin/sharing/SharingAdminPanel";
import { AdminServersPanel } from "../features/admin/servers/AdminServersPanel";
import { ProviderDashboardPanel } from "../features/provider/dashboard/ProviderDashboardPanel";
import { HostPanel } from "./HostPanel";
import { KeyboardShortcutsPanel } from "./KeyboardShortcutsPanel";
import { OverviewPanel } from "./OverviewPanel";
import { VipPanel } from "./VipPanel";
import { clearSession, getRole, isTokenValid } from "../lib/auth";

type Tab = "overview" | "pods" | "billing" | "providerDashboard" | "agentOnboarding" | "adminServers" | "adminSharing" | "vip";

const menu: Array<{ id: Tab; label: string; group: "core" | "provider" | "admin" | "ops" }> = [
  { id: "overview", label: "Overview", group: "core" },
  { id: "pods", label: "Pods & Allocations", group: "core" },
  { id: "billing", label: "Billing & Usage", group: "core" },
  { id: "providerDashboard", label: "Provider Dashboard", group: "provider" },
  { id: "agentOnboarding", label: "Agent Onboarding", group: "provider" },
  { id: "adminServers", label: "Admin Servers", group: "admin" },
  { id: "adminSharing", label: "Admin Sharing", group: "admin" },
  { id: "vip", label: "VIP policy", group: "ops" }
];

function isTab(value: string | null): value is Tab {
  return value !== null && menu.some((item) => item.id === value);
}

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isTokenValid());
  const [role, setRole] = useState(() => getRole());
  const [tab, setTab] = useState<Tab>(() => {
    const fromURL = new URLSearchParams(window.location.search).get("section");
    return isTab(fromURL) ? fromURL : "overview";
  });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const activeLabel = menu.find((item) => item.id === tab)?.label ?? "Overview";
  const canAdmin = role === "admin" || role === "super-admin" || role === "ops-admin";
  const enabledMenu = menu.filter((item) => {
    if (item.id === "providerDashboard" && !featureFlags.providerDashboard) return false;
    if (item.id === "agentOnboarding" && !featureFlags.agentOnboarding) return false;
    if (item.id === "adminServers" && !featureFlags.adminServers) return false;
    if (item.id === "adminSharing" && !featureFlags.adminSharing) return false;
    if ((item.id === "adminServers" || item.id === "adminSharing") && !canAdmin) return false;
    return true;
  });

  function canAccessTab(nextTab: Tab) {
    return enabledMenu.some((item) => item.id === nextTab);
  }

  function navigateToTab(nextTab: Tab, pushHistory = true) {
    if (!canAccessTab(nextTab)) return;
    setTab(nextTab);
    const url = new URL(window.location.href);
    url.searchParams.set("section", nextTab);
    if (pushHistory) {
      window.history.pushState({}, "", url);
    } else {
      window.history.replaceState({}, "", url);
    }
  }

  function handleAuthenticated() {
    setIsAuthenticated(isTokenValid());
    setRole(getRole());
  }

  function handleLogout() {
    clearSession();
    setIsAuthenticated(false);
    setShortcutsOpen(false);
    navigateToTab("overview", false);
  }

  useEffect(() => {
    const fromURL = new URLSearchParams(window.location.search).get("section");
    if (isTab(fromURL) && fromURL !== tab && canAccessTab(fromURL)) {
      setTab(fromURL);
      return;
    }
    const url = new URL(window.location.href);
    if (!isTab(fromURL)) {
      url.searchParams.set("section", tab);
      window.history.replaceState({}, "", url);
    }
  }, [tab]);

  useEffect(() => {
    if (!canAccessTab(tab)) {
      navigateToTab("overview", false);
    }
  }, [tab, role]);

  useEffect(() => {
    function onStorageUpdate() {
      setIsAuthenticated(isTokenValid());
      setRole(getRole());
    }
    window.addEventListener("storage", onStorageUpdate);
    return () => window.removeEventListener("storage", onStorageUpdate);
  }, []);

  useEffect(() => {
    function onPopState() {
      const fromURL = new URLSearchParams(window.location.search).get("section");
      if (isTab(fromURL)) {
        setTab(fromURL);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
        const quickTabs: Record<string, Tab> = {
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
  }, [canAdmin]);

  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <main className="page-container section-stack flex min-h-screen max-w-5xl flex-col justify-center">
          <header className="text-center">
            <h1 className="text-2xl font-semibold">ShareMTC Control Plane</h1>
            <p className="mt-2 text-sm text-textSecondary">Authentication required. Sign in to access pods, billing, and provider operations.</p>
          </header>
          <AuthPanel onAuthenticated={handleAuthenticated} />
        </main>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="page-shell">
        <a
          href="#content"
          className="focus-ring sr-only absolute left-2 top-2 z-[1500] rounded bg-surface px-3 py-2 text-sm text-textPrimary focus:not-sr-only"
        >
          Skip to content
        </a>
        <aside className="border-b border-border bg-surface px-4 py-4 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <h1 className="text-lg font-semibold">ShareMTC Control Plane</h1>
          <p className="mt-1 text-xs text-textSecondary">Pods-as-a-Service + Marketplace Compute</p>
          <nav className="mt-6 space-y-5" aria-label="Primary navigation">
            <div className="space-y-1">
              <p className="px-2 text-xs uppercase tracking-wide text-textMuted">Core</p>
              {enabledMenu
                .filter((item) => item.group === "core")
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateToTab(item.id)}
                    className={cx(
                      "focus-ring flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                      tab === item.id ? "bg-brand text-white" : "text-textSecondary hover:bg-elevated hover:text-textPrimary"
                    )}
                    aria-current={tab === item.id ? "page" : undefined}
                  >
                    {item.label}
                  </button>
                ))}
            </div>
            <div className="space-y-1">
              <p className="px-2 text-xs uppercase tracking-wide text-textMuted">Provider</p>
              {enabledMenu
                .filter((item) => item.group === "provider")
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateToTab(item.id)}
                    className={cx(
                      "focus-ring flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                      tab === item.id ? "bg-brand text-white" : "text-textSecondary hover:bg-elevated hover:text-textPrimary"
                    )}
                    aria-current={tab === item.id ? "page" : undefined}
                  >
                    {item.label}
                  </button>
                ))}
            </div>
            {enabledMenu.some((item) => item.group === "admin") ? (
              <div className="space-y-1">
                <p className="px-2 text-xs uppercase tracking-wide text-textMuted">Admin</p>
                {enabledMenu
                  .filter((item) => item.group === "admin")
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateToTab(item.id)}
                      className={cx(
                        "focus-ring flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                        tab === item.id ? "bg-brand text-white" : "text-textSecondary hover:bg-elevated hover:text-textPrimary"
                      )}
                      aria-current={tab === item.id ? "page" : undefined}
                    >
                      {item.label}
                    </button>
                  ))}
              </div>
            ) : null}
            <div className="space-y-1">
              <p className="px-2 text-xs uppercase tracking-wide text-textMuted">Operations</p>
              {enabledMenu
                .filter((item) => item.group === "ops")
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateToTab(item.id)}
                    className={cx(
                      "focus-ring flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                      tab === item.id ? "bg-brand text-white" : "text-textSecondary hover:bg-elevated hover:text-textPrimary"
                    )}
                    aria-current={tab === item.id ? "page" : undefined}
                  >
                    {item.label}
                  </button>
                ))}
            </div>
          </nav>
        </aside>

        <main id="content" className="page-container section-stack" tabIndex={-1}>
          <header className="glass p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <Breadcrumbs items={[{ id: "home", label: "Control Plane" }, { id: tab, label: activeLabel }]} />
                <div>
                  <h2 className="text-xl font-semibold">{activeLabel}</h2>
                  <p className="text-sm text-textSecondary">Single-CTA, data-dense, contract-safe frontend refactor baseline.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => navigateToTab("pods")} aria-label="Open pods and allocations section">
                  Create pod
                </Button>
                <Button variant="secondary" onClick={() => setShortcutsOpen(true)} aria-label="Open keyboard shortcuts">
                  Shortcuts
                </Button>
                <Button variant="ghost" onClick={handleLogout} aria-label="Sign out">
                  Logout
                </Button>
              </div>
            </div>
          </header>

          {tab === "overview" && <OverviewPanel />}
          {tab === "pods" && <HostPanel />}
          {tab === "billing" && <BillingPanel />}
          {tab === "providerDashboard" && <ProviderDashboardPanel />}
          {tab === "agentOnboarding" && <AgentOnboardingPanel />}
          {tab === "adminServers" && <AdminServersPanel />}
          {tab === "adminSharing" && <SharingAdminPanel />}
          {tab === "vip" && <VipPanel />}
        </main>
      </div>
      <KeyboardShortcutsPanel open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </ToastProvider>
  );
}
