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

  it("creates query string for runpod-style catalog filters", () => {
    const params = new URLSearchParams();
    params.set("search", "RTX");
    params.set("region", "EU-RO-1");
    params.set("cloud_type", "secure");
    params.set("availability_tier", "high");
    params.set("network_volume_supported", "true");
    params.set("global_networking_supported", "false");
    params.set("sort_by", "vram");
    params.set("min_vram_gb", "48");

    const query = params.toString();
    expect(query).toContain("search=RTX");
    expect(query).toContain("region=EU-RO-1");
    expect(query).toContain("cloud_type=secure");
    expect(query).toContain("availability_tier=high");
    expect(query).toContain("network_volume_supported=true");
    expect(query).toContain("global_networking_supported=false");
    expect(query).toContain("sort_by=vram");
    expect(query).toContain("min_vram_gb=48");
  });

  it("creates query string for shared offers and agent logs", () => {
    const offers = new URLSearchParams();
    offers.set("status", "active");
    offers.set("provider_id", "provider-1");
    expect(offers.toString()).toContain("status=active");
    expect(offers.toString()).toContain("provider_id=provider-1");

    const logs = new URLSearchParams();
    logs.set("provider_id", "provider-1");
    logs.set("level", "warning");
    logs.set("limit", "200");
    expect(logs.toString()).toContain("provider_id=provider-1");
    expect(logs.toString()).toContain("level=warning");
    expect(logs.toString()).toContain("limit=200");
  });
});
