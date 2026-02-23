-- Baseline resourceservice schema managed by Atlas.
-- This migration is intentionally idempotent for clusters with partial legacy schema.

CREATE TABLE IF NOT EXISTS host_resources (
	id UUID PRIMARY KEY,
	provider_id TEXT UNIQUE NOT NULL,
	cpu_free_cores INTEGER NOT NULL,
	ram_free_mb INTEGER NOT NULL,
	gpu_free_units INTEGER NOT NULL,
	network_mbps INTEGER NOT NULL,
	heartbeat_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS allocations (
	id TEXT PRIMARY KEY,
	provider_id TEXT NOT NULL,
	cpu_cores INTEGER NOT NULL,
	ram_mb INTEGER NOT NULL,
	gpu_units INTEGER NOT NULL,
	started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	released_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS vm_templates (
	id TEXT PRIMARY KEY,
	code TEXT UNIQUE NOT NULL,
	name TEXT NOT NULL,
	description TEXT NOT NULL,
	os_name TEXT NOT NULL,
	region TEXT NOT NULL DEFAULT 'any',
	cloud_type TEXT NOT NULL DEFAULT 'secure',
	cpu_cores INTEGER NOT NULL,
	vcpu INTEGER NOT NULL DEFAULT 0,
	ram_mb INTEGER NOT NULL,
	system_ram_gb INTEGER NOT NULL DEFAULT 0,
	gpu_units INTEGER NOT NULL,
	vram_gb INTEGER NOT NULL DEFAULT 0,
	network_mbps INTEGER NOT NULL,
	network_volume_supported BOOLEAN NOT NULL DEFAULT FALSE,
	global_networking_supported BOOLEAN NOT NULL DEFAULT FALSE,
	availability_tier TEXT NOT NULL DEFAULT 'low',
	max_instances INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'any';
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS cloud_type TEXT NOT NULL DEFAULT 'secure';
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS vcpu INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS system_ram_gb INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS vram_gb INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS network_volume_supported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS global_networking_supported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS availability_tier TEXT NOT NULL DEFAULT 'low';
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS max_instances INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS vms (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	provider_id TEXT NOT NULL,
	name TEXT NOT NULL,
	template TEXT NOT NULL,
	os_name TEXT NOT NULL,
	ip_address TEXT NOT NULL,
	region TEXT NOT NULL DEFAULT 'any',
	cloud_type TEXT NOT NULL DEFAULT 'secure',
	cpu_cores INTEGER NOT NULL,
	vcpu INTEGER NOT NULL DEFAULT 0,
	ram_mb INTEGER NOT NULL,
	system_ram_gb INTEGER NOT NULL DEFAULT 0,
	gpu_units INTEGER NOT NULL,
	vram_gb INTEGER NOT NULL DEFAULT 0,
	network_mbps INTEGER NOT NULL,
	network_volume_supported BOOLEAN NOT NULL DEFAULT FALSE,
	global_networking_supported BOOLEAN NOT NULL DEFAULT FALSE,
	availability_tier TEXT NOT NULL DEFAULT 'low',
	max_instances INTEGER NOT NULL DEFAULT 1,
	status TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vms ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'any';
ALTER TABLE vms ADD COLUMN IF NOT EXISTS cloud_type TEXT NOT NULL DEFAULT 'secure';
ALTER TABLE vms ADD COLUMN IF NOT EXISTS vcpu INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vms ADD COLUMN IF NOT EXISTS system_ram_gb INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vms ADD COLUMN IF NOT EXISTS vram_gb INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vms ADD COLUMN IF NOT EXISTS network_volume_supported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vms ADD COLUMN IF NOT EXISTS global_networking_supported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vms ADD COLUMN IF NOT EXISTS availability_tier TEXT NOT NULL DEFAULT 'low';
ALTER TABLE vms ADD COLUMN IF NOT EXISTS max_instances INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS shared_vms (
	id TEXT PRIMARY KEY,
	vm_id TEXT NOT NULL REFERENCES vms(id) ON DELETE CASCADE,
	owner_user_id TEXT NOT NULL,
	shared_with TEXT NOT NULL,
	access_level TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared_pods (
	id TEXT PRIMARY KEY,
	pod_code TEXT NOT NULL,
	owner_user_id TEXT NOT NULL,
	shared_with TEXT NOT NULL,
	access_level TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health_checks (
	id TEXT PRIMARY KEY,
	resource_type TEXT NOT NULL,
	resource_id TEXT NOT NULL,
	check_type TEXT NOT NULL,
	status TEXT NOT NULL,
	details TEXT NOT NULL,
	checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metric_points (
	id TEXT PRIMARY KEY,
	resource_type TEXT NOT NULL,
	resource_id TEXT NOT NULL,
	metric_type TEXT NOT NULL,
	value DOUBLE PRECISION NOT NULL,
	captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kubernetes_clusters (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	name TEXT NOT NULL,
	provider_id TEXT NOT NULL,
	node_count INTEGER NOT NULL,
	node_type TEXT NOT NULL,
	k8s_version TEXT NOT NULL,
	endpoint TEXT NOT NULL,
	kubeconfig TEXT NOT NULL,
	status TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vms_user_id ON vms(user_id);
CREATE INDEX IF NOT EXISTS idx_vms_status ON vms(status);
CREATE INDEX IF NOT EXISTS idx_vms_region_cloud ON vms(region, cloud_type);
CREATE INDEX IF NOT EXISTS idx_vms_vram_availability ON vms(vram_gb, availability_tier);
CREATE INDEX IF NOT EXISTS idx_templates_region_cloud ON vm_templates(region, cloud_type);
CREATE INDEX IF NOT EXISTS idx_templates_vram_availability ON vm_templates(vram_gb, availability_tier);
CREATE INDEX IF NOT EXISTS idx_shared_vms_owner ON shared_vms(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_pods_owner ON shared_pods(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_health_checks_resource ON health_checks(resource_type, resource_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_metric_points_rt ON metric_points(resource_type, resource_id, metric_type, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_k8s_clusters_user ON kubernetes_clusters(user_id, updated_at DESC);
