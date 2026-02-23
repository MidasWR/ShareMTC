import { featureFlags } from "../../config/featureFlags";

export type AppTab =
  | "overview"
  | "coreDashboard"
  | "pods"
  | "billing"
  | "providerDashboard"
  | "agentOnboarding"
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
  { id: "overview", label: "Overview", group: "core" },
  { id: "coreDashboard", label: "Core Dashboard", group: "core" },
  { id: "pods", label: "Pods & Allocations", group: "core" },
  { id: "billing", label: "Billing & Usage", group: "core" },
  { id: "providerDashboard", label: "Provider Dashboard", group: "provider", flag: "providerDashboard" },
  { id: "agentOnboarding", label: "Agent Onboarding", group: "provider", flag: "agentOnboarding" },
  { id: "adminDashboard", label: "Admin Dashboard", group: "admin", requiresAdmin: true },
  { id: "adminServers", label: "Admin Console", group: "admin", requiresAdmin: true, flag: "adminServers" },
  { id: "adminSharing", label: "Admin Sharing", group: "admin", requiresAdmin: true, flag: "adminSharing" },
  { id: "vip", label: "VIP policy", group: "ops" }
];

export function isTab(value: string | null): value is AppTab {
  return value !== null && menu.some((item) => item.id === value);
}
