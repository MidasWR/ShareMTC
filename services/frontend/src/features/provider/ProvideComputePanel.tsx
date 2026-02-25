import { useState } from "react";
import { getTabElementID, getTabPanelElementID, Tabs } from "../../design/primitives/Tabs";
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
        mode="many"
        collapseAfter={4}
        moreLabel="More"
        instanceId="provide-compute-tabs"
        ariaLabel="Provide Compute sections"
      />
      {tab === "dashboard" ? (
        <div role="tabpanel" id={getTabPanelElementID("provide-compute-tabs", "dashboard")} aria-labelledby={getTabElementID("provide-compute-tabs", "dashboard")}>
          <ProviderDashboardPanel />
        </div>
      ) : null}
      {tab === "allocations" ? (
        <div role="tabpanel" id={getTabPanelElementID("provide-compute-tabs", "allocations")} aria-labelledby={getTabElementID("provide-compute-tabs", "allocations")}>
          <HostPanel />
        </div>
      ) : null}
      {tab === "sharedVm" ? (
        <div role="tabpanel" id={getTabPanelElementID("provide-compute-tabs", "sharedVm")} aria-labelledby={getTabElementID("provide-compute-tabs", "sharedVm")}>
          <SharedVMPanel />
        </div>
      ) : null}
      {tab === "sharedPods" ? (
        <div role="tabpanel" id={getTabPanelElementID("provide-compute-tabs", "sharedPods")} aria-labelledby={getTabElementID("provide-compute-tabs", "sharedPods")}>
          <SharedPodsPanel />
        </div>
      ) : null}
      {tab === "k8s" ? (
        <div role="tabpanel" id={getTabPanelElementID("provide-compute-tabs", "k8s")} aria-labelledby={getTabElementID("provide-compute-tabs", "k8s")}>
          <K8sClustersPanel />
        </div>
      ) : null}
    </section>
  );
}
