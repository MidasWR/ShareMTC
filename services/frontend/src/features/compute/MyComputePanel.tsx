import { useState } from "react";
import { Tabs } from "../../design/primitives/Tabs";
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
      />
      {tab === "instances" ? <ServerRentalPanel /> : null}
      {tab === "vm" ? <VMPanel /> : null}
      {tab === "templates" ? <MyTemplatesPanel /> : null}
    </section>
  );
}
