import { useEffect, useState } from "react";

const ADMIN_BASE = import.meta.env.VITE_ADMIN_BASE_URL ?? "http://localhost:8082";

type Provider = {
  id: string;
  display_name: string;
  provider_type: string;
  machine_id: string;
  network_mbps: number;
  online: boolean;
};

export function AdminPanel() {
  const [providers, setProviders] = useState<Provider[]>([]);

  async function refresh() {
    const response = await fetch(`${ADMIN_BASE}/v1/admin/providers/`);
    if (response.ok) {
      setProviders(await response.json());
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="glass p-6 space-y-4">
      <h2 className="text-xl font-semibold">Admin Provider Management</h2>
      <button onClick={refresh} className="bg-accent px-4 py-2 rounded">Refresh</button>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider) => (
          <article key={provider.id} className="rounded-lg border border-slate-700 p-4 bg-slate-900">
            <h3 className="font-semibold">{provider.display_name}</h3>
            <p className="text-sm text-slate-300">Type: {provider.provider_type}</p>
            <p className="text-sm text-slate-300">Machine: {provider.machine_id}</p>
            <p className="text-sm text-slate-300">Network: {provider.network_mbps} Mbps</p>
            <p className="text-sm text-slate-300">Status: {provider.online ? "online" : "offline"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
