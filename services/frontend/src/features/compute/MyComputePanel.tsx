import { useState } from "react";
import { getTabElementID, getTabPanelElementID, Tabs } from "../../design/primitives/Tabs";
import { MyTemplatesPanel } from "../resources/templates/MyTemplatesPanel";
import { VMPanel } from "../resources/vm/VMPanel";
import { ServerRentalPanel } from "../rental/ServerRentalPanel";

type MyComputeTab = "instances" | "vm" | "templates";

export function MyComputePanel() {
  const [tab, setTab] = useState<MyComputeTab>("instances");

  return (
    <section className="section-stack">
      <Tabs
        items={[
          { id: "instances", label: "My Instances" },
          { id: "vm", label: "VM Fleet" },
          { id: "templates", label: "Templates" }
        ]}
        value={tab}
        onChange={setTab}
        instanceId="my-compute-tabs"
        ariaLabel="My Compute sections"
      />
      {tab === "instances" ? (
        <div role="tabpanel" id={getTabPanelElementID("my-compute-tabs", "instances")} aria-labelledby={getTabElementID("my-compute-tabs", "instances")}>
          <ServerRentalPanel />
        </div>
      ) : null}
      {tab === "vm" ? (
        <div role="tabpanel" id={getTabPanelElementID("my-compute-tabs", "vm")} aria-labelledby={getTabElementID("my-compute-tabs", "vm")}>
          <VMPanel />
        </div>
      ) : null}
      {tab === "templates" ? (
        <div role="tabpanel" id={getTabPanelElementID("my-compute-tabs", "templates")} aria-labelledby={getTabElementID("my-compute-tabs", "templates")}>
          <MyTemplatesPanel />
        </div>
      ) : null}
    </section>
  );
}
