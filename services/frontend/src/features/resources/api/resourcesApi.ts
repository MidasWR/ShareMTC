import { API_BASE } from "../../../config/apiBase";
import { apiClient } from "../../../lib/http";
import { Allocation, ResourceStats } from "../../../types/api";

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
