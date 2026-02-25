import { featureFlags } from "../../config/featureFlags";

export type AppTab =
  | "marketplace"
  | "myCompute"
  | "provideCompute"
  | "billing"
  | "admin"
  | "settings"
  ;

export type NavGroup = "main" | "account";

export type MenuItem = {
  id: AppTab;
  label: string;
  group: NavGroup;
  requiresAdmin?: boolean;
  flag?: keyof typeof featureFlags;
};

export const menu: MenuItem[] = [
  { id: "marketplace", label: "Marketplace", group: "main" },
  { id: "myCompute", label: "My Compute", group: "main" },
  { id: "provideCompute", label: "Provide Compute", group: "main" },
  { id: "billing", label: "Billing", group: "main" },
  { id: "admin", label: "Admin", group: "main" },
  { id: "settings", label: "Settings", group: "account" }
];

export function isTab(value: string | null): value is AppTab {
  return value !== null && menu.some((item) => item.id === value);
}

const legacySectionMap: Record<string, AppTab> = {
  myTemplates: "myCompute",
  vm: "myCompute",
  sharedVm: "provideCompute",
  pods: "provideCompute",
  sharedPods: "provideCompute",
  k8sClusters: "provideCompute",
  myServers: "myCompute",
  coreDashboard: "myCompute",
  providerDashboard: "provideCompute",
  agentOnboarding: "provideCompute",
  adminAccess: "admin",
  adminDashboard: "admin",
  adminServers: "admin",
  adminSharing: "admin",
  vip: "admin"
};

export function mapLegacySection(value: string | null): AppTab | null {
  if (!value) return null;
  return legacySectionMap[value] ?? null;
}
