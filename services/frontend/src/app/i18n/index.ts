import { useSettings } from "../providers/SettingsProvider";

const translations = {
  en: {
    sidebar: {
      title: "ShareMTC Control Plane",
      subtitle: "GPU Pods, server rental and sharing infrastructure",
      core: "Core",
      provider: "Provider",
      admin: "Administration",
      ops: "Operations",
      shortcuts: "Shortcuts",
      settings: "Settings",
      logout: "Log out"
    },
    menu: {
      overview: "Overview",
      coreDashboard: "Platform Dashboard",
      podsCatalog: "GPU Pods Catalog",
      pods: "My Servers",
      billing: "Billing",
      serverRental: "Rent Server",
      settings: "Settings",
      providerDashboard: "Provider Dashboard",
      agentOnboarding: "Agent Onboarding",
      adminAccess: "Admin Login",
      adminDashboard: "Admin Dashboard",
      adminServers: "Admin Console",
      adminSharing: "Sharing Control",
      vip: "VIP Policy"
    }
  },
  ru: {
    sidebar: {
      title: "ShareMTC Control Plane",
      subtitle: "GPU Pods, аренда серверов и шеринговая инфраструктура",
      core: "Основное",
      provider: "Провайдер",
      admin: "Администрирование",
      ops: "Операции",
      shortcuts: "Горячие клавиши",
      settings: "Настройки",
      logout: "Выйти"
    },
    menu: {
      overview: "Обзор",
      coreDashboard: "Дашборд платформы",
      podsCatalog: "Каталог GPU Pods",
      pods: "Мои серверы",
      billing: "Биллинг",
      serverRental: "Аренда серверов",
      settings: "Настройки",
      providerDashboard: "Дашборд провайдера",
      agentOnboarding: "Подключение агента",
      adminAccess: "Вход в /admin",
      adminDashboard: "Админ-дашборд",
      adminServers: "Админ-консоль",
      adminSharing: "Шеринг-контроль",
      vip: "VIP политика"
    }
  }
} as const;

export type Language = keyof typeof translations;

export function useTranslation() {
  const { settings } = useSettings();
  const lang = (settings.language as Language) || "en";
  return translations[lang];
}
