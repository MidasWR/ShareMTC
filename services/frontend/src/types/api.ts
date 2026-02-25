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
  logo_url?: string;
  host_ip?: string;
  ssh_user?: string;
  ssh_auth_ref?: string;
  route_target?: string;
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
  vm_id?: string;
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

export type VMStatus = "provisioning" | "running" | "stopped" | "terminated";

export type VM = {
  id?: string;
  user_id?: string;
  provider_id: string;
  name: string;
  template?: string;
  os_name: string;
  ip_address?: string;
  region?: string;
  cloud_type?: "secure" | "community";
  cpu_cores: number;
  vcpu?: number;
  ram_mb: number;
  system_ram_gb?: number;
  gpu_units: number;
  vram_gb?: number;
  network_mbps: number;
  network_volume_supported?: boolean;
  global_networking_supported?: boolean;
  availability_tier?: "low" | "medium" | "high";
  max_instances?: number;
  status?: VMStatus;
  created_at?: string;
  updated_at?: string;
};

export type VMTemplate = {
  id?: string;
  code: string;
  name: string;
  description: string;
  logo_url?: string;
  env_json?: string;
  ssh_public_key?: string;
  bootstrap_script?: string;
  os_family?: "linux" | "windows" | "bsd";
  is_public?: boolean;
  owner_user_id?: string;
  os_name: string;
  region?: string;
  cloud_type?: "secure" | "community";
  cpu_cores: number;
  vcpu?: number;
  ram_mb: number;
  system_ram_gb?: number;
  gpu_units: number;
  vram_gb?: number;
  network_mbps: number;
  network_volume_supported?: boolean;
  global_networking_supported?: boolean;
  availability_tier?: "low" | "medium" | "high";
  max_instances?: number;
  created_at?: string;
};

export type SharedInventoryOffer = {
  id?: string;
  provider_id: string;
  resource_type: "vm" | "pod" | "gpu";
  title: string;
  description: string;
  cpu_cores: number;
  ram_mb: number;
  gpu_units: number;
  network_mbps: number;
  quantity: number;
  available_qty: number;
  price_hourly_usd: number;
  status: "active" | "paused" | "sold_out";
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type CatalogFilter = {
  search?: string;
  region?: string;
  cloud_type?: "secure" | "community" | "";
  availability_tier?: "low" | "medium" | "high" | "";
  status?: VMStatus | "";
  sort_by?: "name" | "vram" | "availability" | "";
  network_volume_supported?: "true" | "false" | "";
  global_networking_supported?: "true" | "false" | "";
  min_vram_gb?: number;
};

export type SharedVM = {
  id?: string;
  vm_id: string;
  owner_user_id?: string;
  shared_with: string[];
  access_level: "read" | "write" | "admin";
  created_at?: string;
};

export type SharedPod = {
  id?: string;
  pod_code: string;
  owner_user_id?: string;
  shared_with: string[];
  access_level: "read" | "write" | "admin";
  created_at?: string;
};

export type HealthCheck = {
  id?: string;
  resource_type: string;
  resource_id: string;
  check_type: string;
  status: "ok" | "warning" | "critical";
  details: string;
  checked_at?: string;
};

export type MetricPoint = {
  id?: string;
  resource_type: string;
  resource_id: string;
  metric_type: string;
  value: number;
  captured_at?: string;
};

export type MetricSummary = {
  resource_type: string;
  resource_id: string;
  metric_type: string;
  samples: number;
  min_value: number;
  max_value: number;
  avg_value: number;
  last_value: number;
};

export type AgentLog = {
  id?: string;
  provider_id: string;
  resource_id?: string;
  level: "info" | "warning" | "error";
  message: string;
  source?: string;
  created_at?: string;
};

export type KubernetesCluster = {
  id?: string;
  user_id?: string;
  name: string;
  provider_id: string;
  node_count: number;
  node_type: string;
  k8s_version: string;
  endpoint?: string;
  kubeconfig?: string;
  status?: "creating" | "running" | "deleting" | "deleted" | "failed" | "suspended";
  created_at?: string;
  updated_at?: string;
};

export type SSHKey = {
  id?: string;
  user_id?: string;
  name: string;
  public_key: string;
  created_at?: string;
};
