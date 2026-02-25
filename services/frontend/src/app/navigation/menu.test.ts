import { describe, expect, it } from "vitest";
import { isTab, mapLegacySection } from "./menu";

describe("menu section mapping", () => {
  it("maps legacy sections to new top-level tabs", () => {
    expect(mapLegacySection("vm")).toBe("myCompute");
    expect(mapLegacySection("sharedPods")).toBe("provideCompute");
    expect(mapLegacySection("adminServers")).toBe("admin");
  });

  it("accepts only current top-level tabs", () => {
    expect(isTab("marketplace")).toBe(true);
    expect(isTab("myCompute")).toBe(true);
    expect(isTab("vm")).toBe(false);
  });
});
