import { describe, expect, it } from "vitest";
import { toUsagePayload, validateUsageInput } from "./usagePayload";

describe("usage payload helpers", () => {
  it("validates required and numeric constraints", () => {
    expect(
      validateUsageInput({
        provider_id: "",
        plan_id: "plan-1",
        cpu_cores_used: 1,
        ram_gb_used: 1,
        gpu_used: 0,
        hours: 1,
        network_mbps: 100
      })
    ).toBe("Provider ID is required");

    expect(
      validateUsageInput({
        provider_id: "provider-1",
        plan_id: "plan-1",
        cpu_cores_used: 0,
        ram_gb_used: 1,
        gpu_used: 0,
        hours: 1,
        network_mbps: 100
      })
    ).toBe("CPU cores used must be greater than 0");
  });

  it("builds trimmed payload", () => {
    const payload = toUsagePayload({
      provider_id: " provider-1 ",
      plan_id: " plan-1 ",
      cpu_cores_used: 2,
      ram_gb_used: 4,
      gpu_used: 1,
      hours: 3,
      network_mbps: 700
    });
    expect(payload.provider_id).toBe("provider-1");
    expect(payload.plan_id).toBe("plan-1");
    expect(payload.cpu_cores_used).toBe(2);
  });
});
