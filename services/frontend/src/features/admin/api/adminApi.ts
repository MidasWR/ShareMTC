import { API_BASE } from "../../../config/apiBase";
import { apiClient } from "../../../lib/http";
import { AdminStats, PodCatalogItem, PodTemplate, Provider, ProviderMetrics } from "../../../types/api";

export function listProviders() {
  return apiClient.get<unknown>(`${API_BASE.admin}/v1/admin/providers/`, { preserveSessionOnAuthError: true }).then(normalizeProvidersResponse);
}

function normalizeProvidersResponse(payload: unknown): Provider[] {
  const raw = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.providers)
      ? payload.providers
      : isRecord(payload) && Array.isArray(payload.items)
        ? payload.items
        : isRecord(payload) && Array.isArray(payload.data)
          ? payload.data
          : [];
  return raw
    .map(normalizeProvider)
    .filter((item): item is Provider => item !== null);
}

function normalizeProvider(input: unknown): Provider | null {
  if (!isRecord(input)) return null;
  const id = toString(input.id);
  if (!id) return null;
  return {
    id,
    display_name: toString(input.display_name) || toString(input.name) || `Provider ${id}`,
    provider_type: toString(input.provider_type) || "donor",
    machine_id: toString(input.machine_id) || "unknown",
    network_mbps: toNumber(input.network_mbps),
    online: Boolean(input.online),
    created_at: toString(input.created_at) || undefined
  };
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object";
}

function toString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
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

export function getAgentInstallCommand(params?: { user_id?: string }) {
  const search = new URLSearchParams();
  if (params?.user_id) search.set("user_id", params.user_id);
  const query = search.toString();
  return apiClient.get<{ command: string; installer_url: string }>(
    `${API_BASE.admin}/v1/admin/agent/install-command${query ? `?${query}` : ""}`,
    { preserveSessionOnAuthError: true }
  );
}

export function getPodProxyInfo(podID: string) {
  return apiClient.get<{ pod_id: string; route_target: string; host_ip: string; ssh_user: string }>(
    `${API_BASE.admin}/v1/admin/pods/${encodeURIComponent(podID)}/proxy-info`
  );
}

export function getPodProxyURL(podID: string, path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE.admin}/v1/admin/pods/${encodeURIComponent(podID)}/proxy${normalized}`;
}
