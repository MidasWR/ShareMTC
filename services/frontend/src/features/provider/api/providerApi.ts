import { getProviderMetrics } from "../../admin/api/adminApi";
import { listAccruals } from "../../billing/api/billingApi";
import { listAllocations } from "../../resources/api/resourcesApi";

export async function loadProviderDashboard(providerID: string) {
  const [metrics, allocations, accruals] = await Promise.all([
    getProviderMetrics(providerID),
    listAllocations(providerID),
    listAccruals(providerID)
  ]);
  return {
    metrics,
    allocations,
    accruals
  };
}
