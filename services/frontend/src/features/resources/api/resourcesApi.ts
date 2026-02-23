import { API_BASE } from "../../../config/apiBase";
import { apiClient } from "../../../lib/http";
import {
  Allocation,
  HealthCheck,
  KubernetesCluster,
  MetricPoint,
  MetricSummary,
  ResourceStats,
  SharedPod,
  SharedVM,
  VM,
  VMTemplate,
  CatalogFilter
} from "../../../types/api";

export function listAllocations(providerID: string) {
  return apiClient.get<Allocation[]>(`${API_BASE.resource}/v1/resources/allocations?provider_id=${encodeURIComponent(providerID)}`);
}

export function listAllAllocations(limit = 50, offset = 0) {
  return apiClient.get<Allocation[]>(`${API_BASE.resource}/v1/resources/admin/allocations?limit=${limit}&offset=${offset}`);
}

export function createAllocation(payload: {
  provider_id: string;
  cpu_cores: number;
  ram_mb: number;
  gpu_units: number;
}) {
  return apiClient.post<Allocation>(`${API_BASE.resource}/v1/resources/allocate`, payload);
}

export function releaseAllocation(allocationID: string) {
  return apiClient.post<{ status: string }>(`${API_BASE.resource}/v1/resources/release/${encodeURIComponent(allocationID)}`);
}

export function sendHeartbeat(payload: {
  provider_id: string;
  cpu_free_cores: number;
  ram_free_mb: number;
  gpu_free_units: number;
  network_mbps: number;
  heartbeat_at: string;
}) {
  return apiClient.post<{ status: string }>(`${API_BASE.resource}/v1/resources/heartbeat`, payload);
}

export function getResourceStats() {
  return apiClient.get<ResourceStats>(`${API_BASE.resource}/v1/resources/admin/stats`);
}

export function listVMTemplates(params?: CatalogFilter) {
  const search = new URLSearchParams();
  if (params?.search) search.set("search", params.search);
  if (params?.region) search.set("region", params.region);
  if (params?.cloud_type) search.set("cloud_type", params.cloud_type);
  if (params?.availability_tier) search.set("availability_tier", params.availability_tier);
  if (params?.sort_by) search.set("sort_by", params.sort_by);
  if (params?.network_volume_supported) search.set("network_volume_supported", params.network_volume_supported);
  if (params?.global_networking_supported) search.set("global_networking_supported", params.global_networking_supported);
  if (typeof params?.min_vram_gb === "number") search.set("min_vram_gb", String(params.min_vram_gb));
  const query = search.toString();
  return apiClient.get<VMTemplate[]>(`${API_BASE.resource}/v1/resources/vm-templates${query ? `?${query}` : ""}`);
}

export function upsertVMTemplate(payload: VMTemplate) {
  return apiClient.post<VMTemplate>(`${API_BASE.resource}/v1/resources/vm-templates`, payload);
}

export function createVM(payload: VM) {
  return apiClient.post<VM>(`${API_BASE.resource}/v1/resources/vms`, payload);
}

export function listVMs(params?: CatalogFilter) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.search) search.set("search", params.search);
  if (params?.region) search.set("region", params.region);
  if (params?.cloud_type) search.set("cloud_type", params.cloud_type);
  if (params?.availability_tier) search.set("availability_tier", params.availability_tier);
  if (params?.sort_by) search.set("sort_by", params.sort_by);
  if (params?.network_volume_supported) search.set("network_volume_supported", params.network_volume_supported);
  if (params?.global_networking_supported) search.set("global_networking_supported", params.global_networking_supported);
  if (typeof params?.min_vram_gb === "number") search.set("min_vram_gb", String(params.min_vram_gb));
  const query = search.toString();
  return apiClient.get<VM[]>(`${API_BASE.resource}/v1/resources/vms${query ? `?${query}` : ""}`);
}

export function getVM(vmID: string) {
  return apiClient.get<VM>(`${API_BASE.resource}/v1/resources/vms/${encodeURIComponent(vmID)}`);
}

export function startVM(vmID: string) {
  return apiClient.post<VM>(`${API_BASE.resource}/v1/resources/vms/${encodeURIComponent(vmID)}/start`);
}

export function stopVM(vmID: string) {
  return apiClient.post<VM>(`${API_BASE.resource}/v1/resources/vms/${encodeURIComponent(vmID)}/stop`);
}

export function rebootVM(vmID: string) {
  return apiClient.post<VM>(`${API_BASE.resource}/v1/resources/vms/${encodeURIComponent(vmID)}/reboot`);
}

export function terminateVM(vmID: string) {
  return apiClient.post<VM>(`${API_BASE.resource}/v1/resources/vms/${encodeURIComponent(vmID)}/terminate`);
}

export function shareVM(payload: { vm_id: string; shared_with: string[]; access_level?: "read" | "write" | "admin" }) {
  return apiClient.post<SharedVM>(`${API_BASE.resource}/v1/resources/shared/vms`, payload);
}

export function listSharedVMs() {
  return apiClient.get<SharedVM[]>(`${API_BASE.resource}/v1/resources/shared/vms`);
}

export function sharePod(payload: { pod_code: string; shared_with: string[]; access_level?: "read" | "write" | "admin" }) {
  return apiClient.post<SharedPod>(`${API_BASE.resource}/v1/resources/shared/pods`, payload);
}

export function listSharedPods() {
  return apiClient.get<SharedPod[]>(`${API_BASE.resource}/v1/resources/shared/pods`);
}

export function recordHealthCheck(payload: HealthCheck) {
  return apiClient.post<HealthCheck>(`${API_BASE.resource}/v1/resources/health-checks`, payload);
}

export function listHealthChecks(params?: { resource_type?: string; resource_id?: string; limit?: number }) {
  const search = new URLSearchParams();
  if (params?.resource_type) search.set("resource_type", params.resource_type);
  if (params?.resource_id) search.set("resource_id", params.resource_id);
  if (params?.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return apiClient.get<HealthCheck[]>(`${API_BASE.resource}/v1/resources/health-checks${query ? `?${query}` : ""}`);
}

export function recordMetric(payload: MetricPoint) {
  return apiClient.post<MetricPoint>(`${API_BASE.resource}/v1/resources/metrics`, payload);
}

export function listMetrics(params?: {
  resource_type?: string;
  resource_id?: string;
  metric_type?: string;
  from?: string;
  to?: string;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.resource_type) search.set("resource_type", params.resource_type);
  if (params?.resource_id) search.set("resource_id", params.resource_id);
  if (params?.metric_type) search.set("metric_type", params.metric_type);
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return apiClient.get<MetricPoint[]>(`${API_BASE.resource}/v1/resources/metrics${query ? `?${query}` : ""}`);
}

export function listMetricSummaries(limit = 100) {
  return apiClient.get<MetricSummary[]>(`${API_BASE.resource}/v1/resources/metrics/summary?limit=${limit}`);
}

export function createK8sCluster(payload: KubernetesCluster) {
  return apiClient.post<KubernetesCluster>(`${API_BASE.resource}/v1/resources/k8s/clusters`, payload);
}

export function listK8sClusters() {
  return apiClient.get<KubernetesCluster[]>(`${API_BASE.resource}/v1/resources/k8s/clusters`);
}

export function refreshK8sCluster(clusterID: string) {
  return apiClient.post<KubernetesCluster>(`${API_BASE.resource}/v1/resources/k8s/clusters/${encodeURIComponent(clusterID)}/refresh`);
}

export function deleteK8sCluster(clusterID: string) {
  return apiClient.del<{ status: string }>(`${API_BASE.resource}/v1/resources/k8s/clusters/${encodeURIComponent(clusterID)}`);
}
