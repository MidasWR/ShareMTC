import { useState } from "react";
import { getTabElementID, getTabPanelElementID, Tabs } from "../../design/primitives/Tabs";
import { AdminAccessPanel } from "./access/AdminAccessPanel";
import { AdminConsolePanel } from "./console/AdminConsolePanel";
import { AdminDashboardPanel } from "../dashboard/admin/AdminDashboardPanel";
import { SharingAdminPanel } from "./sharing/SharingAdminPanel";

type AdminWorkspaceTab = "console" | "dashboard" | "sharing";

type Props = {
  canAdmin: boolean;
  onAuthenticated: () => void;
};

export function AdminWorkspacePanel({ canAdmin, onAuthenticated }: Props) {
  const [tab, setTab] = useState<AdminWorkspaceTab>("console");

  if (!canAdmin) {
    return <AdminAccessPanel onSuccess={onAuthenticated} />;
  }

  return (
    <section className="section-stack">
      <Tabs
        items={[
          { id: "console", label: "Admin Console" },
          { id: "dashboard", label: "Admin Dashboard" },
          { id: "sharing", label: "Sharing Control" }
        ]}
        value={tab}
        onChange={setTab}
        instanceId="admin-workspace-tabs"
        ariaLabel="Admin workspace sections"
      />
      {tab === "console" ? (
        <div role="tabpanel" id={getTabPanelElementID("admin-workspace-tabs", "console")} aria-labelledby={getTabElementID("admin-workspace-tabs", "console")}>
          <AdminConsolePanel />
        </div>
      ) : null}
      {tab === "dashboard" ? (
        <div role="tabpanel" id={getTabPanelElementID("admin-workspace-tabs", "dashboard")} aria-labelledby={getTabElementID("admin-workspace-tabs", "dashboard")}>
          <AdminDashboardPanel />
        </div>
      ) : null}
      {tab === "sharing" ? (
        <div role="tabpanel" id={getTabPanelElementID("admin-workspace-tabs", "sharing")} aria-labelledby={getTabElementID("admin-workspace-tabs", "sharing")}>
          <SharingAdminPanel />
        </div>
      ) : null}
    </section>
  );
}
