import { useState } from "react";
import { Tabs } from "../../design/primitives/Tabs";
import { HostPanel } from "../../ui/HostPanel";
import { SharedVMPanel } from "../resources/shared/SharedVMPanel";
import { SharedPodsPanel } from "../resources/shared/SharedPodsPanel";
import { K8sClustersPanel } from "../resources/k8s/K8sClustersPanel";
import { ProviderDashboardPanel } from "./dashboard/ProviderDashboardPanel";

type ProvideComputeTab = "dashboard" | "allocations" | "sharedVm" | "sharedPods" | "k8s";

export function ProvideComputePanel() {
  const [tab, setTab] = useState<ProvideComputeTab>("dashboard");

  return (
    <section className="section-stack">
      <Tabs
        items={[
          { id: "dashboard", label: "Provider Dashboard" },
          { id: "allocations", label: "Pods & Allocations" },
          { id: "sharedVm", label: "Shared VM" },
          { id: "sharedPods", label: "Shared PODs" },
          { id: "k8s", label: "Kubernetes" }
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "dashboard" ? <ProviderDashboardPanel /> : null}
      {tab === "allocations" ? <HostPanel /> : null}
      {tab === "sharedVm" ? <SharedVMPanel /> : null}
      {tab === "sharedPods" ? <SharedPodsPanel /> : null}
      {tab === "k8s" ? <K8sClustersPanel /> : null}
    </section>
  );
}
