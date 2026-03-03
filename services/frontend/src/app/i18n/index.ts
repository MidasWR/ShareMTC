import { useSettings } from "../providers/SettingsProvider";

export const translations = {
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
    },
    common: {
      navigation: {
        skipToContent: "Skip to content"
      },
      auth: {
        title: "Platform Access",
        signIn: "Sign in",
        register: "Register",
        createFirstInstance: "Create first instance"
      },
      marketplace: {
        title: "Marketplace / Deploy",
        filters: "Filters",
        deployWizard: "Deploy wizard",
        reviewDeploy: "Review & Deploy"
      },
      instances: {
        title: "My Instances",
        details: "Instance Details",
        actions: "Actions"
      },
      settings: {
        title: "Settings",
        ssh: "SSH keys CRUD"
      }
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
      admin: "Админка",
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
    },
    common: {
      navigation: {
        skipToContent: "Пропустить навигацию"
      },
      auth: {
        title: "Доступ к платформе",
        signIn: "Вход",
        register: "Регистрация",
        createFirstInstance: "Создать первый инстанс"
      },
      marketplace: {
        title: "Маркетплейс / Деплой",
        filters: "Фильтры",
        deployWizard: "Мастер деплоя",
        reviewDeploy: "Проверить и задеплоить"
      },
      instances: {
        title: "Мои инстансы",
        details: "Детали инстанса",
        actions: "Действия"
      },
      settings: {
        title: "Настройки",
        ssh: "Управление SSH-ключами"
      }
    }
  }
} as const;

export type Language = keyof typeof translations;

export function useTranslation() {
  const { settings } = useSettings();
  const lang = (settings.language as Language) || "en";
  return translations[lang];
}
