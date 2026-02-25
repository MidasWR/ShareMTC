export const VM_TEMPLATE_FALLBACK = {
  region: "any",
  cloudType: "secure",
  availabilityTier: "medium",
  systemRamGB: 16,
  vramGB: 24,
  maxInstances: 8,
  networkVolumeSupported: true,
  globalNetworkingSupported: false
} as const;

export const SHARED_VM_OFFER_DEFAULTS = {
  providerID: "provider-default",
  cpuCores: 4,
  ramMB: 8192,
  gpuUnits: 1,
  networkMbps: 500,
  priceHourlyUSD: 0.79
} as const;

export const PROVIDER_SHARED_CAPACITY_DEFAULTS = {
  cpuCores: 16,
  ramMB: 65536,
  gpuUnits: 4,
  networkMbps: 5000,
  quantity: 4,
  priceHourlyUSD: 1.49
} as const;
