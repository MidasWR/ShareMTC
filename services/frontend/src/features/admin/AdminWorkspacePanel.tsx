import { useState } from "react";
import { Tabs } from "../../design/primitives/Tabs";
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
      />
      {tab === "console" ? <AdminConsolePanel /> : null}
      {tab === "dashboard" ? <AdminDashboardPanel /> : null}
      {tab === "sharing" ? <SharingAdminPanel /> : null}
    </section>
  );
}
