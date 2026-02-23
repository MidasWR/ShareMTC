import { featureFlags } from "../../config/featureFlags";

export type AppTab =
  | "myTemplates"
  | "vm"
  | "sharedVm"
  | "pods"
  | "sharedPods"
  | "k8sClusters"
  | "myServers"
  | "coreDashboard"
  | "billing"
  | "settings"
  | "providerDashboard"
  | "agentOnboarding"
  | "adminAccess"
  | "adminDashboard"
  | "adminServers"
  | "adminSharing"
  | "vip";

export type NavGroup = "core" | "provider" | "admin" | "ops";

export type MenuItem = {
  id: AppTab;
  label: string;
  group: NavGroup;
  requiresAdmin?: boolean;
  flag?: keyof typeof featureFlags;
};

export const menu: MenuItem[] = [
  { id: "myTemplates", label: "My Templates", group: "core" },
  { id: "vm", label: "VM", group: "core" },
  { id: "sharedVm", label: "Shared VM", group: "core" },
  { id: "pods", label: "PODs", group: "core" },
  { id: "sharedPods", label: "Shared PODs", group: "core" },
  { id: "k8sClusters", label: "Kubernetes Clusters", group: "core" },
  { id: "myServers", label: "My Servers", group: "core" },
  { id: "coreDashboard", label: "Core Dashboard", group: "core" },
  { id: "billing", label: "Billing", group: "core" },
  { id: "settings", label: "Settings", group: "core" },
  { id: "providerDashboard", label: "Provider Dashboard", group: "provider", flag: "providerDashboard" },
  { id: "agentOnboarding", label: "Agent Onboarding", group: "provider", flag: "agentOnboarding" },
  { id: "adminAccess", label: "Admin Login", group: "admin" },
  { id: "adminDashboard", label: "Admin Dashboard", group: "admin", requiresAdmin: true },
  { id: "adminServers", label: "Admin Console", group: "admin", requiresAdmin: true, flag: "adminServers" },
  { id: "adminSharing", label: "Sharing Control", group: "admin", requiresAdmin: true, flag: "adminSharing" },
  { id: "vip", label: "VIP Policy", group: "ops" }
];

export function isTab(value: string | null): value is AppTab {
  return value !== null && menu.some((item) => item.id === value);
}
