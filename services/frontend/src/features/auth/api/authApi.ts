import { API_BASE } from "../../../config/apiBase";
import { apiClient } from "../../../lib/http";
import { SSHKey, UserSettings } from "../../../types/api";

type AuthResponse = {
  token: string;
  user: { id: string; email: string; role: string; created_at?: string };
};

export function loginDirectAdmin(username: string, password: string) {
  return apiClient.post<AuthResponse>(`${API_BASE.auth}/v1/auth/admin/direct`, { username, password });
}

export function getUserSettings() {
  return apiClient.get<UserSettings>(`${API_BASE.auth}/v1/auth/settings`);
}

export function upsertUserSettings(settings: UserSettings) {
  return apiClient.put<UserSettings>(`${API_BASE.auth}/v1/auth/settings`, settings);
}

export function listSSHKeys() {
  return apiClient.get<SSHKey[]>(`${API_BASE.auth}/v1/auth/ssh-keys`);
}

export function createSSHKey(payload: { name: string; public_key: string }) {
  return apiClient.post<SSHKey>(`${API_BASE.auth}/v1/auth/ssh-keys`, payload);
}

export function deleteSSHKey(id: string) {
  return apiClient.del<{ status: string }>(`${API_BASE.auth}/v1/auth/ssh-keys/${encodeURIComponent(id)}`);
}
