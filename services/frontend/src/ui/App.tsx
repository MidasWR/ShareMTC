import { useState } from "react";
import { AuthPanel } from "./AuthPanel";
import { AdminPanel } from "./AdminPanel";
import { HostPanel } from "./HostPanel";
import { VipPanel } from "./VipPanel";

type Tab = "auth" | "admin" | "host" | "vip";

export function App() {
  const [tab, setTab] = useState<Tab>("auth");

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <header className="flex items-center justify-between glass p-4">
        <div>
          <h1 className="text-2xl font-bold">Host Cloud Market</h1>
          <p className="text-slate-300 text-sm">RunPod-inspired control plane for VM and Pods</p>
        </div>
        <nav className="flex gap-2">
          {(["auth", "admin", "host", "vip"] as Tab[]).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`px-4 py-2 rounded-md text-sm ${
                tab === item ? "bg-accent text-white" : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </nav>
      </header>

      {tab === "auth" && <AuthPanel />}
      {tab === "admin" && <AdminPanel />}
      {tab === "host" && <HostPanel />}
      {tab === "vip" && <VipPanel />}
    </div>
  );
}
