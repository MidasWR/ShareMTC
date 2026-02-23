import { describe, expect, it } from "vitest";

describe("resources API query composition", () => {
  it("creates query string for VM list filters", () => {
    const params = new URLSearchParams();
    params.set("status", "running");
    params.set("search", "vm-1");
    expect(params.toString()).toBe("status=running&search=vm-1");
  });

  it("creates query string for metric filters", () => {
    const params = new URLSearchParams();
    params.set("resource_type", "vm");
    params.set("resource_id", "vm-1");
    params.set("metric_type", "cpu_usage_percent");
    params.set("limit", "200");
    expect(params.toString()).toContain("resource_type=vm");
    expect(params.toString()).toContain("resource_id=vm-1");
    expect(params.toString()).toContain("metric_type=cpu_usage_percent");
    expect(params.toString()).toContain("limit=200");
  });
});
