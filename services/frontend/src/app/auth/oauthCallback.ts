import { AuthUser, setSession } from "../../lib/auth";
import { AppTab } from "../navigation/menu";

type OAuthCallbackPayload = {
  token: string;
  user: AuthUser;
  targetTab: AppTab;
};

function decodeUser(encodedUser: string): AuthUser | null {
  try {
    const normalized = encodedUser.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = window.atob(padded);
    return JSON.parse(json) as AuthUser;
  } catch {
    return null;
  }
}

function normalizeTab(value: string | null): AppTab {
  if (value === "admin" || value === "myCompute" || value === "marketplace" || value === "provideCompute" || value === "billing" || value === "settings") {
    return value;
  }
  return "myCompute";
}

function parseFromLocation(): OAuthCallbackPayload | null {
  if (!window.location.hash) {
    return null;
  }
  const fragment = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(fragment);
  const token = params.get("token");
  const encodedUser = params.get("user");
  const authError = params.get("auth_error");
  if (authError) {
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
    return null;
  }
  if (!token || !encodedUser) {
    return null;
  }
  const user = decodeUser(encodedUser);
  if (!user) {
    return null;
  }
  const querySection = new URLSearchParams(window.location.search).get("section");
  return {
    token,
    user,
    targetTab: normalizeTab(querySection)
  };
}

export function consumeOAuthCallback(): AppTab | null {
  const payload = parseFromLocation();
  if (!payload) {
    return null;
  }
  setSession(payload.token, payload.user);
  const cleanURL = new URL(window.location.href);
  cleanURL.hash = "";
  cleanURL.searchParams.set("section", payload.targetTab);
  window.history.replaceState({}, "", cleanURL.toString());
  return payload.targetTab;
}
