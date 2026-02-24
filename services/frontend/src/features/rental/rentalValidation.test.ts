import { describe, expect, it } from "vitest";
import { validateServerOrder } from "./rentalValidation";

describe("rental order validation", () => {
  it("rejects invalid numeric values", () => {
    const error = validateServerOrder({
      plan_id: "p1",
      os_name: "Ubuntu",
      network_mbps: 0,
      cpu_cores: 2,
      ram_gb: 4,
      gpu_units: 1,
      period: "hourly"
    });
    expect(error).toBe("Network Mbps must be greater than 0");
  });

  it("accepts valid server order", () => {
    const error = validateServerOrder({
      plan_id: "p1",
      os_name: "Ubuntu",
      network_mbps: 1000,
      cpu_cores: 8,
      ram_gb: 32,
      gpu_units: 1,
      period: "monthly"
    });
    expect(error).toBeNull();
  });
});
