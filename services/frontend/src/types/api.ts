export type Provider = {
  id: string;
  display_name: string;
  provider_type: string;
  machine_id: string;
  network_mbps: number;
  online: boolean;
  created_at?: string;
};

export type Allocation = {
  id: string;
  provider_id: string;
  cpu_cores: number;
  ram_mb: number;
  gpu_units: number;
  started_at: string;
  released_at?: string | null;
};

export type UsageAccrual = {
  id: string;
  provider_id: string;
  usage_id: string;
  amount_usd: number;
  vip_bonus_usd: number;
  total_usd: number;
  created_at: string;
};

export type ApiError = {
  error?: string;
};
