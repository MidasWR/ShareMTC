import { describe, expect, it } from "vitest";
import { resolvePodLogoURL, resolveTemplateLogoURL } from "./logoResolver";

describe("logo resolver", () => {
  it("resolves known template logos", () => {
    expect(resolveTemplateLogoURL("fastpanel", "FastPanel")).toBe("/logos/fastpanel.svg");
    expect(resolveTemplateLogoURL("aapanel", "aaPanel")).toBe("/logos/aapanel.svg");
  });

  it("falls back to brand mark for unknown templates", () => {
    expect(resolveTemplateLogoURL("custom", "Custom")).toBe("/logos/sharemtc-mark.svg");
  });

  it("resolves pod logo to shared brand mark", () => {
    expect(resolvePodLogoURL("pod-gpu", "NVIDIA RTX 4090")).toBe("/logos/sharemtc-mark.svg");
  });
});
