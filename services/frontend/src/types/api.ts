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

export type AdminStats = {
  total_providers: number;
  online_providers: number;
  internal_providers: number;
  donor_providers: number;
};

export type ProviderMetrics = {
  provider_id: string;
  allocation_total: number;
  allocation_running: number;
  accrual_total_usd: number;
  accrual_vip_bonus_usd: number;
};

export type ResourceStats = {
  total_allocations: number;
  running_allocations: number;
  released_allocations: number;
  cpu_cores_running: number;
  ram_mb_running: number;
  gpu_units_running: number;
};

export type BillingStats = {
  accrual_count: number;
  total_amount_usd: number;
  total_bonus_usd: number;
  total_revenue_usd: number;
};

export type ApiError = {
  error?: string;
};
