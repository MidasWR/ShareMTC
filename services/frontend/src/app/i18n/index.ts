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
      marketplace: "Marketplace",
      myCompute: "My Compute",
      provideCompute: "Provide Compute",
      billing: "Billing",
      admin: "Admin",
      settings: "Settings",
      // Legacy labels stay for deep screens and old links.
      myTemplates: "My Templates",
      vm: "GPU Servers",
      sharedVm: "Shared VM",
      sharedPods: "Shared PODs",
      k8sClusters: "Kubernetes Clusters",
      myServers: "Manage Servers",
      coreDashboard: "Platform Dashboard",
      pods: "PODs",
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
      subtitle: "GPU POD-ы, аренда серверов и инфраструктура шаринга",
      core: "Ядро",
      provider: "Провайдер",
      admin: "Администрирование",
      ops: "Операции",
      shortcuts: "Горячие клавиши",
      settings: "Настройки",
      logout: "Выйти"
    },
    menu: {
      marketplace: "Маркетплейс",
      myCompute: "Мои мощности",
      provideCompute: "Предоставить мощности",
      billing: "Биллинг",
      admin: "Admin",
      settings: "Настройки",
      myTemplates: "Мои шаблоны",
      vm: "GPU серверы",
      sharedVm: "Общие VM",
      sharedPods: "Общие POD-ы",
      k8sClusters: "Kubernetes кластеры",
      myServers: "Управление серверами",
      coreDashboard: "Дашборд платформы",
      pods: "POD-ы",
      providerDashboard: "Дашборд провайдера",
      agentOnboarding: "Подключение агента",
      adminAccess: "Вход в админку",
      adminDashboard: "Админ дашборд",
      adminServers: "Админ консоль",
      adminSharing: "Управление шарингом",
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
