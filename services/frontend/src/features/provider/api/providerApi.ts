import { getProviderMetrics } from "../../admin/api/adminApi";
import { listAccruals } from "../../billing/api/billingApi";
import { listAllocations } from "../../resources/api/resourcesApi";

export async function loadProviderDashboard(providerID: string) {
  const [allocations, accruals] = await Promise.all([listAllocations(providerID), listAccruals(providerID)]);
  let metrics = {
    provider_id: providerID,
    allocation_total: allocations.length,
    allocation_running: allocations.filter((item) => !item.released_at).length,
    accrual_total_usd: accruals.reduce((sum, item) => sum + item.total_usd, 0),
    accrual_vip_bonus_usd: accruals.reduce((sum, item) => sum + item.vip_bonus_usd, 0)
  };
  try {
    metrics = await getProviderMetrics(providerID);
  } catch {
    // Fallback is derived from resources/billing if provider metrics endpoint is unavailable.
  }
  return {
    metrics,
    allocations,
    accruals
  };
}
