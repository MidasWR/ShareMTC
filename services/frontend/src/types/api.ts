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

export type PodTemplate = {
  id: string;
  code: string;
  name: string;
  description: string;
  gpu_class: string;
  created_at?: string;
};

export type PodCatalogItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  gpu_model: string;
  gpu_vram_gb: number;
  cpu_cores: number;
  ram_gb: number;
  network_mbps: number;
  hourly_price_usd: number;
  monthly_price_usd: number;
  os_name: string;
  template_ids: string[];
};

export type RentalPlan = {
  id: string;
  name: string;
  period: "hourly" | "monthly";
  base_price_usd: number;
  price_per_cpu: number;
  price_per_ram_gb: number;
  price_per_gpu: number;
  price_per_net_100mbps: number;
};

export type ServerOrder = {
  id?: string;
  user_id?: string;
  plan_id: string;
  os_name: string;
  network_mbps: number;
  cpu_cores: number;
  ram_gb: number;
  gpu_units: number;
  period: "hourly" | "monthly";
  estimated_price_usd?: number;
  status?: string;
  created_at?: string;
};

export type UserSettings = {
  user_id?: string;
  theme: string;
  language: string;
  timezone: string;
  updated_at?: string;
};

export type SSHKey = {
  id?: string;
  user_id?: string;
  name: string;
  public_key: string;
  created_at?: string;
};
