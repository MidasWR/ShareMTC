import { featureFlags } from "../../config/featureFlags";

export type AppTab =
  | "overview"
  | "coreDashboard"
  | "podsCatalog"
  | "pods"
  | "billing"
  | "serverRental"
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
  { id: "overview", label: "Обзор", group: "core" },
  { id: "coreDashboard", label: "Дашборд платформы", group: "core" },
  { id: "podsCatalog", label: "Каталог GPU Pods", group: "core" },
  { id: "pods", label: "Выделение Pods", group: "core" },
  { id: "billing", label: "Биллинг", group: "core" },
  { id: "serverRental", label: "Аренда серверов", group: "core" },
  { id: "settings", label: "Настройки", group: "core" },
  { id: "providerDashboard", label: "Дашборд провайдера", group: "provider", flag: "providerDashboard" },
  { id: "agentOnboarding", label: "Подключение агента", group: "provider", flag: "agentOnboarding" },
  { id: "adminAccess", label: "Вход в /admin", group: "admin" },
  { id: "adminDashboard", label: "Админ-дашборд", group: "admin", requiresAdmin: true },
  { id: "adminServers", label: "Админ-консоль", group: "admin", requiresAdmin: true, flag: "adminServers" },
  { id: "adminSharing", label: "Шеринг-контроль", group: "admin", requiresAdmin: true, flag: "adminSharing" },
  { id: "vip", label: "VIP политика", group: "ops" }
];

export function isTab(value: string | null): value is AppTab {
  return value !== null && menu.some((item) => item.id === value);
}
