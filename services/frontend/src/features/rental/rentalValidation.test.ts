import { describe, expect, it } from "vitest";
import { firstServerOrderError, validateServerOrder } from "./rentalValidation";
import { SERVER_ORDER_DEFAULTS } from "./defaults";

describe("rentalValidation", () => {
  it("returns no errors for valid server order", () => {
    const errors = validateServerOrder({
      ...SERVER_ORDER_DEFAULTS,
      plan_id: "plan-1",
      name: "demo-vm"
    });
    expect(errors).toEqual({});
  });

  it("reports required instance name", () => {
    const errors = validateServerOrder({
      ...SERVER_ORDER_DEFAULTS,
      plan_id: "plan-1",
      name: ""
    });
    expect(errors.name).toBe("Instance name is required");
    expect(firstServerOrderError(errors)).toBe("Instance name is required");
  });

  it("reports invalid numeric values", () => {
    const errors = validateServerOrder({
      ...SERVER_ORDER_DEFAULTS,
      plan_id: "p1",
      name: "bad-server",
      network_mbps: 0
    });
    expect(errors.network_mbps).toBe("Network Mbps must be greater than 0");
    expect(firstServerOrderError(errors)).toBe("Network Mbps must be greater than 0");
  });
});
