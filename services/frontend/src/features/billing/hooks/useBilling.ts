import { FormEvent, useMemo, useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { UsageAccrual } from "../../../types/api";
import { listAccruals, processUsage } from "../api/billingApi";
import { toUsagePayload, validateUsageInput } from "../usagePayload";

export function useBilling() {
  const [providerID, setProviderID] = useState("");
  const [planID, setPlanID] = useState("");
  const [accruals, setAccruals] = useState<UsageAccrual[]>([]);
  const [costPreview, setCostPreview] = useState("--");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("No usage operation yet");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "total">("newest");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(["id", "usage", "amount", "bonus", "total", "payment", "created"]);
  const [cpuCoresUsed, setCpuCoresUsed] = useState(2);
  const [ramGbUsed, setRamGbUsed] = useState(4);
  const [gpuUsed, setGpuUsed] = useState(1);
  const [hoursUsed, setHoursUsed] = useState(1);
  const [networkMbps, setNetworkMbps] = useState(700);
  const { push } = useToast();

  const totalAccrued = useMemo(() => accruals.reduce((sum, item) => sum + item.total_usd, 0), [accruals]);
  const totalBonus = useMemo(() => accruals.reduce((sum, item) => sum + item.vip_bonus_usd, 0), [accruals]);
  const filteredAccruals = useMemo(() => {
    const query = search.toLowerCase().trim();
    const filtered = accruals.filter(
      (item) => query.length === 0 || item.id.toLowerCase().includes(query) || item.usage_id.toLowerCase().includes(query)
    );
    return [...filtered].sort((a, b) => {
      if (sortBy === "total") return b.total_usd - a.total_usd;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [accruals, search, sortBy]);

  async function previewUsage(event: FormEvent) {
    event.preventDefault();
    const validationError = validateUsageInput({
      provider_id: providerID,
      plan_id: planID,
      cpu_cores_used: cpuCoresUsed,
      ram_gb_used: ramGbUsed,
      gpu_used: gpuUsed,
      hours: hoursUsed,
      network_mbps: networkMbps
    });
    if (validationError) {
      setError(validationError);
      push("error", validationError);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = toUsagePayload({
        provider_id: providerID,
        plan_id: planID,
        cpu_cores_used: cpuCoresUsed,
        ram_gb_used: ramGbUsed,
        gpu_used: gpuUsed,
        hours: hoursUsed,
        network_mbps: networkMbps
      });
      const preview = await processUsage(payload);
      setCostPreview(`$${preview.total_usd.toFixed(2)} (bonus: $${preview.vip_bonus_usd.toFixed(2)})`);
      setStatusMessage("Usage processed and preview updated");
      push("success", "Usage accrual processed");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Usage preview failed");
      push("error", requestError instanceof Error ? requestError.message : "Usage preview failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadAccrualRows() {
    if (!providerID) {
      setError("Provider ID is required");
      push("error", "Provider ID is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const rows = await listAccruals(providerID);
      setAccruals(rows);
      setStatusMessage(`Loaded ${rows.length} accrual rows`);
      push("info", `Loaded ${rows.length} accruals`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Accrual load failed");
      push("error", requestError instanceof Error ? requestError.message : "Accrual load failed");
    } finally {
      setLoading(false);
    }
  }

  return {
    providerID,
    setProviderID,
    planID,
    setPlanID,
    accruals,
    costPreview,
    loading,
    statusMessage,
    error,
    search,
    setSearch,
    sortBy,
    setSortBy,
    visibleColumns,
    setVisibleColumns,
    cpuCoresUsed,
    setCpuCoresUsed,
    ramGbUsed,
    setRamGbUsed,
    gpuUsed,
    setGpuUsed,
    hoursUsed,
    setHoursUsed,
    networkMbps,
    setNetworkMbps,
    totalAccrued,
    totalBonus,
    filteredAccruals,
    previewUsage,
    loadAccrualRows
  };
}
