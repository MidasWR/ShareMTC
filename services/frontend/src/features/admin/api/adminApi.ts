import { API_BASE } from "../../../config/apiBase";
import { apiClient } from "../../../lib/http";
import { AdminStats, Provider, ProviderMetrics } from "../../../types/api";

export function listProviders() {
  return apiClient.get<Provider[]>(`${API_BASE.admin}/v1/admin/providers/`);
}

export function createProvider(payload: {
  display_name: string;
  machine_id: string;
  provider_type: "internal" | "donor";
  network_mbps: number;
}) {
  return apiClient.post<Provider>(`${API_BASE.admin}/v1/admin/providers/`, payload);
}

export function getAdminStats() {
  return apiClient.get<AdminStats>(`${API_BASE.admin}/v1/admin/stats`);
}

export function getProvider(providerID: string) {
  return apiClient.get<Provider>(`${API_BASE.admin}/v1/admin/providers/${encodeURIComponent(providerID)}`);
}

export function getProviderMetrics(providerID: string) {
  return apiClient.get<ProviderMetrics>(`${API_BASE.admin}/v1/admin/providers/${encodeURIComponent(providerID)}/metrics`);
}
