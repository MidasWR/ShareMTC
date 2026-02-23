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
      myTemplates: "My Templates",
      vm: "GPU Servers",
      sharedVm: "Shared VM",
      sharedPods: "Shared PODs",
      k8sClusters: "Kubernetes Clusters",
      myServers: "Manage Servers",
      coreDashboard: "Platform Dashboard",
      pods: "PODs",
      billing: "Billing",
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
      myTemplates: "My Templates",
      vm: "GPU Servers",
      sharedVm: "Shared VM",
      sharedPods: "Shared PODs",
      k8sClusters: "Kubernetes Clusters",
      myServers: "Manage Servers",
      coreDashboard: "Platform Dashboard",
      pods: "PODs",
      billing: "Billing",
      settings: "Settings",
      providerDashboard: "Provider Dashboard",
      agentOnboarding: "Agent Onboarding",
      adminAccess: "Admin Login",
      adminDashboard: "Admin Dashboard",
      adminServers: "Admin Console",
      adminSharing: "Sharing Control",
      vip: "VIP Policy"
    }
  }
} as const;

export type Language = keyof typeof translations;

export function useTranslation() {
  const { settings } = useSettings();
  const lang = (settings.language as Language) || "en";
  return translations[lang];
}
