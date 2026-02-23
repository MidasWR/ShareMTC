import { FormEvent, useMemo, useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { Allocation } from "../../../types/api";
import {
  createAllocation,
  listAllocations,
  releaseAllocation as releaseAllocationRequest,
  sendHeartbeat
} from "../api/resourcesApi";

export function useAllocations() {
  const [providerID, setProviderID] = useState("");
  const [cpuCores, setCpuCores] = useState("2");
  const [ramMB, setRamMB] = useState("4096");
  const [gpuUnits, setGpuUnits] = useState("0");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("No actions yet");
  const [selected, setSelected] = useState<Allocation | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<Allocation | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "stopped">("all");
  const [sortBy, setSortBy] = useState<"newest" | "cpu" | "ram">("newest");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(["id", "cpu", "ram", "gpu", "status", "actions"]);
  const { push } = useToast();

  const activeAllocations = useMemo(() => allocations.filter((item) => !item.released_at).length, [allocations]);
  const filteredAllocations = useMemo(() => {
    const query = search.toLowerCase().trim();
    const filtered = allocations.filter((item) => {
      const running = !item.released_at;
      const matchesStatus = statusFilter === "all" || (statusFilter === "running" && running) || (statusFilter === "stopped" && !running);
      const matchesQuery = query.length === 0 || item.id.toLowerCase().includes(query) || item.provider_id.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "cpu") return b.cpu_cores - a.cpu_cores;
      if (sortBy === "ram") return b.ram_mb - a.ram_mb;
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    });
  }, [allocations, search, statusFilter, sortBy]);

  async function load() {
    if (!providerID.trim()) {
      setStatusText("Provider ID is required to load allocations");
      return;
    }
    setLoading(true);
    try {
      const list = await listAllocations(providerID.trim());
      setAllocations(list);
      setStatusText(`Loaded ${list.length} allocations`);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Allocation load failed";
      setStatusText(message);
      push("error", message);
    } finally {
      setLoading(false);
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!providerID.trim()) {
      setStatusText("Provider ID is required before create");
      return;
    }
    setLoading(true);
    try {
      const created = await createAllocation({
        provider_id: providerID.trim(),
        cpu_cores: Number(cpuCores) || 0,
        ram_mb: Number(ramMB) || 0,
        gpu_units: Number(gpuUnits) || 0
      });
      setStatusText(`Allocation created: ${created.id}`);
      push("success", "Allocation created");
      setShowCreateModal(false);
      await load();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Allocation create failed";
      setStatusText(message);
      push("error", message);
    } finally {
      setLoading(false);
    }
  }

  async function release(allocationID: string) {
    setLoading(true);
    try {
      await releaseAllocationRequest(allocationID);
      setStatusText(`Released allocation ${allocationID}`);
      push("success", "Allocation released");
      setReleaseTarget(null);
      await load();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Release failed";
      setStatusText(message);
      push("error", message);
    } finally {
      setLoading(false);
    }
  }

  async function heartbeat() {
    if (!providerID.trim()) {
      setStatusText("Provider ID is required before heartbeat");
      return;
    }
    setLoading(true);
    try {
      await sendHeartbeat({
        provider_id: providerID.trim(),
        cpu_free_cores: 8,
        ram_free_mb: 16384,
        gpu_free_units: 1,
        network_mbps: 900,
        heartbeat_at: new Date().toISOString()
      });
      setStatusText("Heartbeat accepted");
      push("info", "Heartbeat accepted");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Heartbeat failed";
      setStatusText(message);
      push("error", message);
    } finally {
      setLoading(false);
    }
  }

  return {
    providerID,
    setProviderID,
    cpuCores,
    setCpuCores,
    ramMB,
    setRamMB,
    gpuUnits,
    setGpuUnits,
    allocations,
    loading,
    statusText,
    selected,
    setSelected,
    showCreateModal,
    setShowCreateModal,
    releaseTarget,
    setReleaseTarget,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    visibleColumns,
    setVisibleColumns,
    activeAllocations,
    filteredAllocations,
    load,
    create,
    release,
    heartbeat
  };
}
