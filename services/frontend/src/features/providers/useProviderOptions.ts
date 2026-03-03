import { useCallback, useEffect, useMemo, useState } from "react";
import { listProviders } from "../admin/api/adminApi";
import { Provider } from "../../types/api";
import { listK8sClusters, listPods, listSharedOffers, listVMs } from "../resources/api/resourcesApi";
import { readUser } from "../../lib/auth";

type ProviderOption = {
  value: string;
  label: string;
};

type Params = {
  initialProviderID?: string;
};

export function useProviderOptions(params?: Params) {
  const currentUser = readUser();
  const [providerID, setProviderID] = useState(params?.initialProviderID || "");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const options = useMemo<ProviderOption[]>(
    () =>
      providers.map((provider) => ({
        value: provider.id,
        label: `${provider.display_name} (${provider.id})`
      })),
    [providers]
  );

  const refreshProviders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await listProviders();
      setProviders(rows);
    } catch (requestError) {
      try {
        const [vms, pods, offers, clusters] = await Promise.all([
          listVMs(),
          listPods(),
          listSharedOffers(),
          listK8sClusters()
        ]);
        const discoveredIDs = new Set<string>();
        for (const item of vms) if (item.provider_id) discoveredIDs.add(item.provider_id);
        for (const item of pods) if (item.provider_id) discoveredIDs.add(item.provider_id);
        for (const item of offers) if (item.provider_id) discoveredIDs.add(item.provider_id);
        for (const item of clusters) if (item.provider_id) discoveredIDs.add(item.provider_id);
        if (currentUser?.id) discoveredIDs.add(currentUser.id);
        const discoveredProviders = [...discoveredIDs].map<Provider>((id) => ({
          id,
          display_name: id === currentUser?.id ? "Current user provider" : `Provider ${id}`,
          provider_type: "donor",
          machine_id: "unknown",
          network_mbps: 0,
          online: true
        }));
        if (discoveredProviders.length === 0) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load providers");
          setProviders([]);
        } else {
          setProviders(discoveredProviders);
        }
      } catch {
        setError(requestError instanceof Error ? requestError.message : "Failed to load providers");
        setProviders([]);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void refreshProviders();
  }, [refreshProviders]);

  useEffect(() => {
    if (!providerID && providers.length > 0) {
      setProviderID(providers[0].id);
    }
  }, [providerID, providers]);

  return {
    providerID,
    setProviderID,
    providers,
    options,
    loading,
    error,
    refreshProviders
  };
}
