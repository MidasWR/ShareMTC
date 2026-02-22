import { useState } from "react";

const RESOURCE_BASE = import.meta.env.VITE_RESOURCE_BASE_URL ?? "http://localhost:8083";
const BILLING_BASE = import.meta.env.VITE_BILLING_BASE_URL ?? "http://localhost:8084";

export function HostPanel() {
  const [providerID, setProviderID] = useState("");
  const [planID, setPlanID] = useState("");
  const [price, setPrice] = useState("No preview");

  async function preview() {
    const payload = {
      provider_id: providerID,
      plan_id: planID,
      cpu_cores_used: 2,
      ram_gb_used: 4,
      gpu_used: 1,
      hours: 1,
      network_mbps: 700
    };
    const response = await fetch(`${BILLING_BASE}/v1/billing/usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    if (!response.ok) {
      setPrice(json.error ?? "failed");
      return;
    }
    setPrice(`Accrued: $${json.total_usd.toFixed(2)} (bonus: $${json.vip_bonus_usd.toFixed(2)})`);
  }

  async function heartbeat() {
    const response = await fetch(`${RESOURCE_BASE}/v1/resources/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider_id: providerID,
        cpu_free_cores: 8,
        ram_free_mb: 16384,
        gpu_free_units: 1,
        network_mbps: 900,
        heartbeat_at: new Date().toISOString()
      })
    });
    if (!response.ok) {
      setPrice("heartbeat failed");
      return;
    }
    setPrice("heartbeat accepted");
  }

  return (
    <section className="glass p-6 space-y-4">
      <h2 className="text-xl font-semibold">Host Marketplace Panel</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <input
          className="rounded bg-slate-900 border border-slate-700 p-3"
          placeholder="provider_id"
          value={providerID}
          onChange={(e) => setProviderID(e.target.value)}
        />
        <input
          className="rounded bg-slate-900 border border-slate-700 p-3"
          placeholder="plan_id"
          value={planID}
          onChange={(e) => setPlanID(e.target.value)}
        />
      </div>
      <div className="flex gap-3">
        <button className="bg-accent px-4 py-2 rounded" onClick={heartbeat}>Send Heartbeat</button>
        <button className="bg-slate-700 px-4 py-2 rounded" onClick={preview}>Run 1h Billing</button>
      </div>
      <p className="text-slate-300">{price}</p>
    </section>
  );
}
