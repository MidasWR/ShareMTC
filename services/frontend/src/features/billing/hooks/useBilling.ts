import { FormEvent, useMemo, useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { UsageAccrual } from "../../../types/api";
import { listAccruals, processUsage } from "../api/billingApi";

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
    if (!providerID || !planID) {
      setError("Provider ID and plan ID are required");
      push("error", "Provider ID and plan ID are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const preview = await processUsage({
        provider_id: providerID,
        plan_id: planID,
        cpu_cores_used: 2,
        ram_gb_used: 4,
        gpu_used: 1,
        hours: 1,
        network_mbps: 700
      });
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
    totalAccrued,
    totalBonus,
    filteredAccruals,
    previewUsage,
    loadAccrualRows
  };
}
