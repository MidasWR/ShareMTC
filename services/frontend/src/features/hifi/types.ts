export type CountryCode = "BY" | "RU" | "KZ" | "DE" | "NL" | "US" | "CA" | "SG";

export type InstanceSize = "Small" | "Medium" | "Large" | "XL";

export type InstanceStatus = "provisioning" | "running" | "stopped" | "error" | "interrupted" | "queued";

export type InstanceError = "Insufficient capacity in selected region" | "CUDA mismatch" | "Auth required" | "SSH key missing";

export type DeployCatalogItem = {
  id: string;
  gpuModel: string;
  vramGb: number;
  vcpu: number;
  ramGb: number;
  country: CountryCode;
  region: string;
  datacenter: string;
  pricePerHour: number;
  availability: "high" | "medium" | "low";
  networkFeatures: string[];
  computeType: "GPU" | "CPU";
};

export type DemoInstance = {
  id: string;
  name: string;
  created_at: string;
  uptime: string;
  last_action: string;
  cost_to_date: number;
  status: InstanceStatus;
  country: CountryCode;
  size: InstanceSize;
  gpuModel: string;
  vramGb: number;
  pricePerHour: number;
  endpoints: string[];
  sshCommand: string;
  lastEvents: string[];
  billingSummary: {
    onDemandHours: number;
    spotHours: number;
    total: number;
  };
  warnings: InstanceError[];
  slaAvailability: string;
};
