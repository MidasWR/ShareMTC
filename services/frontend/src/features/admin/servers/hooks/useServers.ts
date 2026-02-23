import { FormEvent, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../design/components/Toast";
import { Provider } from "../../../../types/api";
import { createProvider, listProviders } from "../../api/adminApi";

type NewServerForm = {
  display_name: string;
  machine_id: string;
  provider_type: "internal" | "donor";
  network_mbps: string;
};

export function useServers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Provider | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [sortBy, setSortBy] = useState<"name" | "network">("name");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(["name", "type", "machine", "network", "status", "actions"]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<NewServerForm>({
    display_name: "",
    machine_id: "",
    provider_type: "donor",
    network_mbps: "100"
  });
  const { push } = useToast();

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const list = await listProviders();
      setProviders(list);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load servers");
      push("error", "Server list failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!form.display_name.trim() || !form.machine_id.trim()) {
      push("error", "Display name and machine ID are required");
      return;
    }
    setCreating(true);
    try {
      await createProvider({
        display_name: form.display_name.trim(),
        machine_id: form.machine_id.trim(),
        provider_type: form.provider_type,
        network_mbps: Number(form.network_mbps) || 0
      });
      push("success", "Server added");
      setIsCreateOpen(false);
      setForm({ display_name: "", machine_id: "", provider_type: "donor", network_mbps: "100" });
      await refresh();
    } catch (requestError) {
      push("error", requestError instanceof Error ? requestError.message : "Create server failed");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const onlineCount = providers.filter((provider) => provider.online).length;
  const filteredProviders = useMemo(() => {
    const filtered = providers.filter((provider) => {
      const query = search.toLowerCase().trim();
      const matchesQuery =
        query.length === 0 ||
        provider.display_name.toLowerCase().includes(query) ||
        provider.machine_id.toLowerCase().includes(query) ||
        provider.provider_type.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "online" && provider.online) ||
        (statusFilter === "offline" && !provider.online);
      return matchesQuery && matchesStatus;
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "network") return b.network_mbps - a.network_mbps;
      return a.display_name.localeCompare(b.display_name);
    });
  }, [providers, search, statusFilter, sortBy]);

  return {
    providers,
    loading,
    error,
    selected,
    setSelected,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    visibleColumns,
    setVisibleColumns,
    isCreateOpen,
    setIsCreateOpen,
    creating,
    form,
    setForm,
    onlineCount,
    filteredProviders,
    refresh,
    create
  };
}
