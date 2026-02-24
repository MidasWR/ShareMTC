export type UsageInput = {
  provider_id: string;
  plan_id: string;
  cpu_cores_used: number;
  ram_gb_used: number;
  gpu_used: number;
  hours: number;
  network_mbps: number;
};

export function validateUsageInput(input: UsageInput): string | null {
  if (!input.provider_id.trim()) return "Provider ID is required";
  if (!input.plan_id.trim()) return "Plan ID is required";
  if (input.cpu_cores_used <= 0) return "CPU cores used must be greater than 0";
  if (input.ram_gb_used <= 0) return "RAM used must be greater than 0";
  if (input.gpu_used < 0) return "GPU used cannot be negative";
  if (input.hours <= 0) return "Hours must be greater than 0";
  if (input.network_mbps <= 0) return "Network Mbps must be greater than 0";
  return null;
}

export function toUsagePayload(input: UsageInput): UsageInput {
  return {
    provider_id: input.provider_id.trim(),
    plan_id: input.plan_id.trim(),
    cpu_cores_used: input.cpu_cores_used,
    ram_gb_used: input.ram_gb_used,
    gpu_used: input.gpu_used,
    hours: input.hours,
    network_mbps: input.network_mbps
  };
}
