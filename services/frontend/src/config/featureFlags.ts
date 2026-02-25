type FeatureFlags = {
  brandingV1: boolean;
  adminServers: boolean;
  adminSharing: boolean;
  providerDashboard: boolean;
  agentOnboarding: boolean;
  defaultBrandTheme: "mts" | "mono";
};

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

export const featureFlags: FeatureFlags = {
  brandingV1: envFlag(import.meta.env.VITE_FF_BRANDING_V1, true),
  adminServers: envFlag(import.meta.env.VITE_FF_ADMIN_SERVERS, true),
  adminSharing: envFlag(import.meta.env.VITE_FF_ADMIN_SHARING, true),
  providerDashboard: envFlag(import.meta.env.VITE_FF_PROVIDER_DASHBOARD, true),
  agentOnboarding: envFlag(import.meta.env.VITE_FF_AGENT_ONBOARDING, true),
  defaultBrandTheme: import.meta.env.VITE_DEFAULT_BRAND_THEME === "mono" ? "mono" : "mts"
};
