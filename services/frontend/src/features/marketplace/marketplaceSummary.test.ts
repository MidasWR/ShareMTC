import { describe, expect, it } from "vitest";

function buildDeploySummary(payload: {
  templateName: string;
  cpu: number;
  ramGB: number;
  gpu: number;
  networkMbps: number;
  os: string;
  period: "hourly" | "monthly";
}) {
  return `You are going to deploy: ${payload.templateName} | ${payload.cpu} CPU / ${payload.ramGB} GB RAM / ${payload.gpu} GPU | ${payload.networkMbps} Mbps | ${payload.os} | ${payload.period}`;
}

describe("marketplace deploy summary", () => {
  it("contains all required summary parts before deploy", () => {
    const summary = buildDeploySummary({
      templateName: "RTX 4090 High",
      cpu: 16,
      ramGB: 64,
      gpu: 1,
      networkMbps: 2000,
      os: "Ubuntu 22.04",
      period: "hourly"
    });
    expect(summary).toContain("You are going to deploy");
    expect(summary).toContain("16 CPU / 64 GB RAM / 1 GPU");
    expect(summary).toContain("2000 Mbps");
  });
});
