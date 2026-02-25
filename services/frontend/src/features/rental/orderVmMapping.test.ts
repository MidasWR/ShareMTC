import { describe, expect, it } from "vitest";
import { buildVmSelectOptions, getLinkedVMID } from "./orderVmMapping";

describe("order VM mapping helpers", () => {
  it("returns linked VM from server contract first", () => {
    const linked = getLinkedVMID(
      {
        id: "order-1",
        vm_id: "vm-from-server",
        plan_id: "p1",
        os_name: "Ubuntu 22.04",
        network_mbps: 1000,
        cpu_cores: 8,
        ram_gb: 32,
        gpu_units: 1,
        period: "hourly"
      },
      { "order-1": "vm-123" }
    );
    expect(linked).toBe("vm-from-server");
  });

  it("falls back to manual linkage when server vm_id is missing", () => {
    const linked = getLinkedVMID(
      { id: "order-1", plan_id: "p1", os_name: "Ubuntu 22.04", network_mbps: 1000, cpu_cores: 8, ram_gb: 32, gpu_units: 1, period: "hourly" },
      { "order-1": "vm-123" }
    );
    expect(linked).toBe("vm-123");
  });

  it("returns undefined when mapping is missing", () => {
    const linked = getLinkedVMID(
      { id: "order-2", plan_id: "p1", os_name: "Ubuntu 22.04", network_mbps: 1000, cpu_cores: 8, ram_gb: 32, gpu_units: 1, period: "hourly" },
      {}
    );
    expect(linked).toBeUndefined();
  });

  it("creates select options from VMs with ids", () => {
    const options = buildVmSelectOptions([
      { id: "vm-1", provider_id: "p", name: "alpha", os_name: "Ubuntu", cpu_cores: 4, ram_mb: 8192, gpu_units: 1, network_mbps: 500, status: "running" },
      { provider_id: "p", name: "no-id", os_name: "Ubuntu", cpu_cores: 4, ram_mb: 8192, gpu_units: 1, network_mbps: 500 }
    ]);
    expect(options).toEqual([{ value: "vm-1", label: "alpha (running)" }]);
  });
});
