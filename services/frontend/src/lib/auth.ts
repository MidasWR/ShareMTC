type JwtPayload = {
  exp?: number;
  role?: string;
};

export type AuthUser = {
  id?: string;
  email?: string;
  role?: string;
  created_at?: string;
};

const TOKEN_KEY = "host_token";
const USER_KEY = "host_user";

function parsePayload(token: string): JwtPayload | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = window.atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function readUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getRole(): string {
  const user = readUser();
  if (user?.role) return user.role;
  const token = readToken();
  if (!token) return "guest";
  return parsePayload(token)?.role ?? "user";
}

export function isTokenValid(): boolean {
  const token = readToken();
  if (!token) return false;
  const payload = parsePayload(token);
  if (!payload?.exp) return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp > nowSec;
}

export function setSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
