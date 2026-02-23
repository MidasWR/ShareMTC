import { API_BASE } from "../../../config/apiBase";
import { apiClient } from "../../../lib/http";
import { AdminStats, PodCatalogItem, PodTemplate, Provider, ProviderMetrics } from "../../../types/api";

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

export function listPodCatalog() {
  return apiClient.get<PodCatalogItem[]>(`${API_BASE.admin}/v1/catalog/pods`);
}

export function listPodTemplates() {
  return apiClient.get<PodTemplate[]>(`${API_BASE.admin}/v1/catalog/templates`);
}

export function upsertPodCatalog(item: PodCatalogItem) {
  return apiClient.post<PodCatalogItem>(`${API_BASE.admin}/v1/admin/pods/`, item);
}

export function deletePodCatalog(podID: string) {
  return apiClient.del<{ status: string }>(`${API_BASE.admin}/v1/admin/pods/${encodeURIComponent(podID)}`);
}

export function upsertPodTemplate(item: PodTemplate) {
  return apiClient.post<PodTemplate>(`${API_BASE.admin}/v1/admin/templates/`, item);
}

export function deletePodTemplate(templateID: string) {
  return apiClient.del<{ status: string }>(`${API_BASE.admin}/v1/admin/templates/${encodeURIComponent(templateID)}`);
}

export function getAgentInstallCommand() {
  return apiClient.get<{ command: string }>(`${API_BASE.admin}/v1/admin/agent/install-command`);
}
