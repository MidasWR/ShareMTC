import { API_BASE } from "../../../config/apiBase";
import { apiClient } from "../../../lib/http";
import { BillingStats, RentalPlan, ServerOrder, UsageAccrual } from "../../../types/api";

export function listAccruals(providerID: string) {
  return apiClient.get<UsageAccrual[]>(`${API_BASE.billing}/v1/billing/accruals?provider_id=${encodeURIComponent(providerID)}`);
}

export function processUsage(payload: {
  provider_id: string;
  plan_id: string;
  cpu_cores_used: number;
  ram_gb_used: number;
  gpu_used: number;
  hours: number;
  network_mbps: number;
}) {
  return apiClient.post<{ total_usd: number; vip_bonus_usd: number }>(`${API_BASE.billing}/v1/billing/usage`, payload);
}

export function listAllAccruals(limit = 50, offset = 0) {
  return apiClient.get<UsageAccrual[]>(`${API_BASE.billing}/v1/billing/admin/accruals?limit=${limit}&offset=${offset}`);
}

export function getBillingStats() {
  return apiClient.get<BillingStats>(`${API_BASE.billing}/v1/billing/admin/stats`);
}

export function listRentalPlans() {
  return apiClient.get<RentalPlan[]>(`${API_BASE.billing}/v1/billing/rental/plans`);
}

export function estimateServerOrder(payload: ServerOrder) {
  return apiClient.post<ServerOrder>(`${API_BASE.billing}/v1/billing/rental/estimate`, payload);
}

export function createServerOrder(payload: ServerOrder) {
  return apiClient.post<ServerOrder>(`${API_BASE.billing}/v1/billing/rental/orders`, payload);
}

export function listServerOrders() {
  return apiClient.get<ServerOrder[]>(`${API_BASE.billing}/v1/billing/rental/orders`);
}
