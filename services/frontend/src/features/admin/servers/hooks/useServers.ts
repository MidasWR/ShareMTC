import { FormEvent, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../design/components/Toast";
import { formatOperationMessage } from "../../../../design/utils/operationFeedback";
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
  const [formErrors, setFormErrors] = useState<Partial<Record<"display_name" | "machine_id" | "network_mbps", string>>>({});
  const { push } = useToast();

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const list = await listProviders();
      setProviders(list);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load servers");
      push("error", "Server list failed to load", "Admin servers");
    } finally {
      setLoading(false);
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Partial<Record<"display_name" | "machine_id" | "network_mbps", string>> = {};
    if (!form.display_name.trim()) nextErrors.display_name = "Display name is required";
    if (!form.machine_id.trim()) nextErrors.machine_id = "Machine ID is required";
    if (!/^\d+$/.test(form.network_mbps.trim()) || Number(form.network_mbps) <= 0) {
      nextErrors.network_mbps = "Network Mbps must be a positive integer";
    }
    setFormErrors(nextErrors);
    const firstError = Object.values(nextErrors)[0];
    if (firstError) {
      push("error", firstError, "Add server");
      return;
    }
    setCreating(true);
    try {
      await createProvider({
        display_name: form.display_name.trim(),
        machine_id: form.machine_id.trim(),
        provider_type: form.provider_type,
        network_mbps: Number(form.network_mbps)
      });
      push("success", formatOperationMessage({ action: "Create", entityType: "Server", entityName: form.display_name.trim(), result: "success" }), "Admin servers");
      setIsCreateOpen(false);
      setForm({ display_name: "", machine_id: "", provider_type: "donor", network_mbps: "100" });
      setFormErrors({});
      await refresh();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Create server failed";
      if (message.toLowerCase().includes("machine_id")) {
        setFormErrors((prev) => ({ ...prev, machine_id: message }));
      }
      push("error", message, "Admin servers");
    } finally {
      setCreating(false);
    }
  }

  function updateFormField(name: keyof NewServerForm, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "display_name" || name === "machine_id" || name === "network_mbps") {
      setFormErrors((prev) => {
        if (!prev[name]) {
          return prev;
        }
        const next = { ...prev };
        delete next[name];
        return next;
      });
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
    formErrors,
    setForm,
    updateFormField,
    onlineCount,
    filteredProviders,
    refresh,
    create
  };
}
