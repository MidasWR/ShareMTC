const SAME_ORIGIN = typeof window !== "undefined" ? window.location.origin : "";

function normalize(base: string | undefined): string {
  if (!base) return SAME_ORIGIN;
  return base.replace(/\/+$/, "");
}

export const API_BASE = {
  auth: normalize(import.meta.env.VITE_AUTH_BASE_URL),
  admin: normalize(import.meta.env.VITE_ADMIN_BASE_URL),
  resource: normalize(import.meta.env.VITE_RESOURCE_BASE_URL),
  billing: normalize(import.meta.env.VITE_BILLING_BASE_URL)
};
