package storage

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	db *pgxpool.Pool
}

func NewRepo(db *pgxpool.Pool) *Repo {
	return &Repo{db: db}
}

func (r *Repo) Migrate(ctx context.Context) error {
	_, err := r.db.Exec(ctx, `
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
		CREATE INDEX IF NOT EXISTS idx_vms_user_id ON vms(user_id);
		CREATE INDEX IF NOT EXISTS idx_vms_status ON vms(status);
		CREATE INDEX IF NOT EXISTS idx_vms_region_cloud ON vms(region, cloud_type);
		CREATE INDEX IF NOT EXISTS idx_vms_vram_availability ON vms(vram_gb, availability_tier);
		CREATE INDEX IF NOT EXISTS idx_templates_region_cloud ON vm_templates(region, cloud_type);
		CREATE INDEX IF NOT EXISTS idx_templates_vram_availability ON vm_templates(vram_gb, availability_tier);
		CREATE TABLE IF NOT EXISTS vm_template_profiles (
			template_code TEXT PRIMARY KEY,
			logo_url TEXT NOT NULL DEFAULT '',
			env_json TEXT NOT NULL DEFAULT '{}',
			ssh_public_key TEXT NOT NULL DEFAULT '',
			bootstrap_script TEXT NOT NULL DEFAULT '',
			os_family TEXT NOT NULL DEFAULT 'linux',
			is_public BOOLEAN NOT NULL DEFAULT TRUE,
			owner_user_id TEXT NOT NULL DEFAULT 'system',
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS shared_vms (
			id TEXT PRIMARY KEY,
			vm_id TEXT NOT NULL REFERENCES vms(id) ON DELETE CASCADE,
			owner_user_id TEXT NOT NULL,
			shared_with TEXT NOT NULL,
			access_level TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_shared_vms_owner ON shared_vms(owner_user_id);
		CREATE TABLE IF NOT EXISTS shared_pods (
			id TEXT PRIMARY KEY,
			pod_code TEXT NOT NULL,
			owner_user_id TEXT NOT NULL,
			shared_with TEXT NOT NULL,
			access_level TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_shared_pods_owner ON shared_pods(owner_user_id);
		CREATE TABLE IF NOT EXISTS shared_inventory_offers (
			id TEXT PRIMARY KEY,
			provider_id TEXT NOT NULL,
			resource_type TEXT NOT NULL,
			title TEXT NOT NULL,
			description TEXT NOT NULL,
			cpu_cores INTEGER NOT NULL,
			ram_mb INTEGER NOT NULL,
			gpu_units INTEGER NOT NULL,
			network_mbps INTEGER NOT NULL,
			quantity INTEGER NOT NULL,
			available_qty INTEGER NOT NULL,
			price_hourly_usd DOUBLE PRECISION NOT NULL,
			status TEXT NOT NULL DEFAULT 'active',
			created_by TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_shared_inventory_status ON shared_inventory_offers(status, updated_at DESC);
		CREATE INDEX IF NOT EXISTS idx_shared_inventory_provider ON shared_inventory_offers(provider_id, updated_at DESC);
		CREATE TABLE IF NOT EXISTS health_checks (
			id TEXT PRIMARY KEY,
			resource_type TEXT NOT NULL,
			resource_id TEXT NOT NULL,
			check_type TEXT NOT NULL,
			status TEXT NOT NULL,
			details TEXT NOT NULL,
			checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_health_checks_resource ON health_checks(resource_type, resource_id, checked_at DESC);
		CREATE TABLE IF NOT EXISTS metric_points (
			id TEXT PRIMARY KEY,
			resource_type TEXT NOT NULL,
			resource_id TEXT NOT NULL,
			metric_type TEXT NOT NULL,
			value DOUBLE PRECISION NOT NULL,
			captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_metric_points_rt ON metric_points(resource_type, resource_id, metric_type, captured_at DESC);
		CREATE TABLE IF NOT EXISTS agent_logs (
			id TEXT PRIMARY KEY,
			provider_id TEXT NOT NULL,
			resource_id TEXT NOT NULL DEFAULT '',
			level TEXT NOT NULL,
			message TEXT NOT NULL,
			source TEXT NOT NULL DEFAULT 'hostagent',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_agent_logs_provider ON agent_logs(provider_id, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_agent_logs_level ON agent_logs(level, created_at DESC);
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
		CREATE INDEX IF NOT EXISTS idx_k8s_clusters_user ON kubernetes_clusters(user_id, updated_at DESC);
	`)
	if err != nil {
		return err
	}
	return r.seedVMTemplates(ctx)
}

func (r *Repo) UpsertHostResource(ctx context.Context, resource models.HostResource) error {
	if resource.ID == "" {
		resource.ID = uuid.NewString()
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO host_resources (id, provider_id, cpu_free_cores, ram_free_mb, gpu_free_units, network_mbps, heartbeat_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (provider_id) DO UPDATE SET
			cpu_free_cores = EXCLUDED.cpu_free_cores,
			ram_free_mb = EXCLUDED.ram_free_mb,
			gpu_free_units = EXCLUDED.gpu_free_units,
			network_mbps = EXCLUDED.network_mbps,
			heartbeat_at = EXCLUDED.heartbeat_at
	`, resource.ID, resource.ProviderID, resource.CPUFreeCores, resource.RAMFreeMB, resource.GPUFreeUnits, resource.NetworkMbps, resource.HeartbeatAt)
	return err
}

func (r *Repo) GetHostResource(ctx context.Context, providerID string) (models.HostResource, error) {
	var out models.HostResource
	err := r.db.QueryRow(ctx, `
		SELECT id, provider_id, cpu_free_cores, ram_free_mb, gpu_free_units, network_mbps, heartbeat_at
		FROM host_resources WHERE provider_id = $1
	`, providerID).Scan(
		&out.ID, &out.ProviderID, &out.CPUFreeCores, &out.RAMFreeMB, &out.GPUFreeUnits, &out.NetworkMbps, &out.HeartbeatAt,
	)
	return out, err
}

func (r *Repo) CreateAllocation(ctx context.Context, alloc models.Allocation) (models.Allocation, error) {
	if alloc.ID == "" {
		alloc.ID = alloc.ProviderID + "_" + uuid.NewString()
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO allocations (id, provider_id, cpu_cores, ram_mb, gpu_units)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING started_at
	`, alloc.ID, alloc.ProviderID, alloc.CPUCores, alloc.RAMMB, alloc.GPUUnits).Scan(&alloc.StartedAt)
	return alloc, err
}

func (r *Repo) ReleaseAllocation(ctx context.Context, allocationID string) error {
	_, err := r.db.Exec(ctx, `UPDATE allocations SET released_at = $2 WHERE id = $1`, allocationID, time.Now().UTC())
	return err
}

func (r *Repo) ListAllocations(ctx context.Context, providerID string) ([]models.Allocation, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, provider_id, cpu_cores, ram_mb, gpu_units, started_at, released_at
		FROM allocations
		WHERE provider_id = $1
		ORDER BY started_at DESC
	`, providerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.Allocation, 0)
	for rows.Next() {
		var item models.Allocation
		if err := rows.Scan(&item.ID, &item.ProviderID, &item.CPUCores, &item.RAMMB, &item.GPUUnits, &item.StartedAt, &item.ReleasedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *Repo) ListAllAllocations(ctx context.Context, limit int, offset int) ([]models.Allocation, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, provider_id, cpu_cores, ram_mb, gpu_units, started_at, released_at
		FROM allocations
		ORDER BY started_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.Allocation, 0)
	for rows.Next() {
		var item models.Allocation
		if err := rows.Scan(&item.ID, &item.ProviderID, &item.CPUCores, &item.RAMMB, &item.GPUUnits, &item.StartedAt, &item.ReleasedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *Repo) Stats(ctx context.Context) (models.ResourceStats, error) {
	var stats models.ResourceStats
	err := r.db.QueryRow(ctx, `
		SELECT
			COUNT(*) AS total_allocations,
			COUNT(*) FILTER (WHERE released_at IS NULL) AS running_allocations,
			COUNT(*) FILTER (WHERE released_at IS NOT NULL) AS released_allocations,
			COALESCE(SUM(cpu_cores) FILTER (WHERE released_at IS NULL), 0) AS cpu_cores_running,
			COALESCE(SUM(ram_mb) FILTER (WHERE released_at IS NULL), 0) AS ram_mb_running,
			COALESCE(SUM(gpu_units) FILTER (WHERE released_at IS NULL), 0) AS gpu_units_running
		FROM allocations
	`).Scan(
		&stats.TotalAllocations,
		&stats.RunningAllocations,
		&stats.ReleasedAllocations,
		&stats.CPUCoresRunning,
		&stats.RAMMBRunning,
		&stats.GPUUnitsRunning,
	)
	return stats, err
}

func (r *Repo) UpsertVMTemplate(ctx context.Context, tpl models.VMTemplate) (models.VMTemplate, error) {
	if tpl.ID == "" {
		tpl.ID = uuid.NewString()
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO vm_templates (
			id, code, name, description, os_name, region, cloud_type, cpu_cores, vcpu, ram_mb, system_ram_gb, gpu_units, vram_gb, network_mbps,
			network_volume_supported, global_networking_supported, availability_tier, max_instances
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		ON CONFLICT (code) DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			os_name = EXCLUDED.os_name,
			region = EXCLUDED.region,
			cloud_type = EXCLUDED.cloud_type,
			cpu_cores = EXCLUDED.cpu_cores,
			vcpu = EXCLUDED.vcpu,
			ram_mb = EXCLUDED.ram_mb,
			system_ram_gb = EXCLUDED.system_ram_gb,
			gpu_units = EXCLUDED.gpu_units,
			vram_gb = EXCLUDED.vram_gb,
			network_mbps = EXCLUDED.network_mbps,
			network_volume_supported = EXCLUDED.network_volume_supported,
			global_networking_supported = EXCLUDED.global_networking_supported,
			availability_tier = EXCLUDED.availability_tier,
			max_instances = EXCLUDED.max_instances
		RETURNING id, created_at
	`,
		tpl.ID,
		tpl.Code,
		tpl.Name,
		tpl.Description,
		tpl.OSName,
		tpl.Region,
		tpl.CloudType,
		tpl.CPUCores,
		tpl.VCPU,
		tpl.RAMMB,
		tpl.SystemRAMGB,
		tpl.GPUUnits,
		tpl.VRAMGB,
		tpl.NetworkMbps,
		tpl.NetworkVolumeSupported,
		tpl.GlobalNetworkingSupport,
		tpl.AvailabilityTier,
		tpl.MaxInstances,
	).Scan(&tpl.ID, &tpl.CreatedAt)
	if err != nil {
		return tpl, err
	}
	if err := r.upsertVMTemplateProfile(ctx, tpl); err != nil {
		return tpl, err
	}
	return tpl, nil
}

func (r *Repo) ListVMTemplates(ctx context.Context, filter models.CatalogFilter) ([]models.VMTemplate, error) {
	orderBy := "created_at DESC"
	switch filter.SortBy {
	case "vram":
		orderBy = "vram_gb DESC"
	case "name":
		orderBy = "name ASC"
	case "availability":
		orderBy = "availability_tier ASC"
	}
	rows, err := r.db.Query(ctx, `
		SELECT
			t.id, t.code, t.name, t.description,
			COALESCE(p.logo_url, ''),
			COALESCE(p.env_json, '{}'),
			COALESCE(p.ssh_public_key, ''),
			COALESCE(p.bootstrap_script, ''),
			COALESCE(p.os_family, 'linux'),
			COALESCE(p.is_public, TRUE),
			COALESCE(p.owner_user_id, 'system'),
			t.os_name, t.region, t.cloud_type, t.cpu_cores, t.vcpu, t.ram_mb, t.system_ram_gb,
			gpu_units, vram_gb, network_mbps, network_volume_supported, global_networking_supported, availability_tier, max_instances, created_at
		FROM vm_templates t
		LEFT JOIN vm_template_profiles p ON p.template_code = t.code
		WHERE
			($1 = '' OR LOWER(t.name) LIKE '%' || LOWER($1) || '%' OR LOWER(t.code) LIKE '%' || LOWER($1) || '%')
			AND ($2 = '' OR t.region = $2)
			AND ($3 = '' OR t.cloud_type = $3)
			AND ($4 = '' OR t.availability_tier = $4)
			AND ($5 = '' OR t.network_volume_supported = ($5 = 'true'))
			AND ($6 = '' OR t.global_networking_supported = ($6 = 'true'))
			AND ($7 <= 0 OR t.vram_gb >= $7)
		ORDER BY `+orderBy+`
	`, filter.Search, filter.Region, filter.CloudType, filter.AvailabilityTier, filter.NetworkVolumeSupported, filter.GlobalNetworkingSupported, filter.MinVRAMGB)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.VMTemplate, 0)
	for rows.Next() {
		var item models.VMTemplate
		if err := rows.Scan(
			&item.ID, &item.Code, &item.Name, &item.Description, &item.LogoURL, &item.EnvJSON, &item.SSHPublicKey, &item.BootstrapScript, &item.OSFamily, &item.IsPublic, &item.OwnerUserID, &item.OSName, &item.Region, &item.CloudType,
			&item.CPUCores, &item.VCPU, &item.RAMMB, &item.SystemRAMGB, &item.GPUUnits, &item.VRAMGB, &item.NetworkMbps,
			&item.NetworkVolumeSupported, &item.GlobalNetworkingSupport, &item.AvailabilityTier, &item.MaxInstances, &item.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *Repo) CreateVM(ctx context.Context, vm models.VM) (models.VM, error) {
	if vm.ID == "" {
		vm.ID = uuid.NewString()
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO vms (
			id, user_id, provider_id, name, template, os_name, ip_address, region, cloud_type, cpu_cores, vcpu, ram_mb, system_ram_gb,
			gpu_units, vram_gb, network_mbps, network_volume_supported, global_networking_supported, availability_tier, max_instances, status
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
		RETURNING created_at, updated_at
	`,
		vm.ID,
		vm.UserID,
		vm.ProviderID,
		vm.Name,
		vm.Template,
		vm.OSName,
		vm.IPAddress,
		vm.Region,
		vm.CloudType,
		vm.CPUCores,
		vm.VCPU,
		vm.RAMMB,
		vm.SystemRAMGB,
		vm.GPUUnits,
		vm.VRAMGB,
		vm.NetworkMbps,
		vm.NetworkVolumeSupported,
		vm.GlobalNetworkingSupport,
		vm.AvailabilityTier,
		vm.MaxInstances,
		vm.Status,
	).Scan(&vm.CreatedAt, &vm.UpdatedAt)
	return vm, err
}

func (r *Repo) GetVM(ctx context.Context, vmID string) (models.VM, error) {
	var out models.VM
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, provider_id, name, template, os_name, ip_address, region, cloud_type, cpu_cores, vcpu, ram_mb, system_ram_gb, gpu_units, vram_gb, network_mbps,
		       network_volume_supported, global_networking_supported, availability_tier, max_instances, status, created_at, updated_at
		FROM vms
		WHERE id = $1
	`, vmID).Scan(
		&out.ID, &out.UserID, &out.ProviderID, &out.Name, &out.Template, &out.OSName, &out.IPAddress, &out.Region, &out.CloudType,
		&out.CPUCores, &out.VCPU, &out.RAMMB, &out.SystemRAMGB, &out.GPUUnits, &out.VRAMGB, &out.NetworkMbps,
		&out.NetworkVolumeSupported, &out.GlobalNetworkingSupport, &out.AvailabilityTier, &out.MaxInstances,
		&out.Status, &out.CreatedAt, &out.UpdatedAt,
	)
	return out, err
}

func (r *Repo) ListVMs(ctx context.Context, userID string, filter models.CatalogFilter) ([]models.VM, error) {
	orderBy := "updated_at DESC"
	switch filter.SortBy {
	case "vram":
		orderBy = "vram_gb DESC"
	case "name":
		orderBy = "name ASC"
	case "availability":
		orderBy = "availability_tier ASC"
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, provider_id, name, template, os_name, ip_address, region, cloud_type, cpu_cores, vcpu, ram_mb, system_ram_gb, gpu_units, vram_gb, network_mbps,
		       network_volume_supported, global_networking_supported, availability_tier, max_instances, status, created_at, updated_at
		FROM vms
		WHERE user_id = $1
		  AND ($2 = '' OR status = $2)
		  AND ($3 = '' OR LOWER(name) LIKE '%' || LOWER($3) || '%' OR LOWER(id) LIKE '%' || LOWER($3) || '%')
		  AND ($4 = '' OR region = $4)
		  AND ($5 = '' OR cloud_type = $5)
		  AND ($6 = '' OR availability_tier = $6)
		  AND ($7 = '' OR network_volume_supported = ($7 = 'true'))
		  AND ($8 = '' OR global_networking_supported = ($8 = 'true'))
		  AND ($9 <= 0 OR vram_gb >= $9)
		ORDER BY `+orderBy+`
	`, userID, filter.Status, filter.Search, filter.Region, filter.CloudType, filter.AvailabilityTier, filter.NetworkVolumeSupported, filter.GlobalNetworkingSupported, filter.MinVRAMGB)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.VM, 0)
	for rows.Next() {
		var item models.VM
		if err := rows.Scan(
			&item.ID, &item.UserID, &item.ProviderID, &item.Name, &item.Template, &item.OSName, &item.IPAddress,
			&item.Region, &item.CloudType, &item.CPUCores, &item.VCPU, &item.RAMMB, &item.SystemRAMGB, &item.GPUUnits, &item.VRAMGB, &item.NetworkMbps,
			&item.NetworkVolumeSupported, &item.GlobalNetworkingSupport, &item.AvailabilityTier, &item.MaxInstances,
			&item.Status, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *Repo) UpdateVMStatus(ctx context.Context, vmID string, status models.VMStatus) error {
	_, err := r.db.Exec(ctx, `
		UPDATE vms
		SET status = $2, updated_at = NOW()
		WHERE id = $1
	`, vmID, status)
	return err
}

func (r *Repo) CreateSharedVM(ctx context.Context, item models.SharedVM) (models.SharedVM, error) {
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO shared_vms (id, vm_id, owner_user_id, shared_with, access_level)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at
	`, item.ID, item.VMID, item.OwnerUserID, joinCSV(item.SharedWith), item.AccessLevel).Scan(&item.CreatedAt)
	return item, err
}

func (r *Repo) ListSharedVMs(ctx context.Context, userID string) ([]models.SharedVM, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, vm_id, owner_user_id, shared_with, access_level, created_at
		FROM shared_vms
		WHERE owner_user_id = $1 OR shared_with LIKE '%' || $1 || '%'
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.SharedVM, 0)
	for rows.Next() {
		var item models.SharedVM
		var sharedWith string
		if err := rows.Scan(&item.ID, &item.VMID, &item.OwnerUserID, &sharedWith, &item.AccessLevel, &item.CreatedAt); err != nil {
			return nil, err
		}
		item.SharedWith = splitCSV(sharedWith)
		out = append(out, item)
	}
	return out, nil
}

func (r *Repo) CreateSharedPod(ctx context.Context, item models.SharedPod) (models.SharedPod, error) {
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO shared_pods (id, pod_code, owner_user_id, shared_with, access_level)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at
	`, item.ID, item.PodCode, item.OwnerUserID, joinCSV(item.SharedWith), item.AccessLevel).Scan(&item.CreatedAt)
	return item, err
}

func (r *Repo) ListSharedPods(ctx context.Context, userID string) ([]models.SharedPod, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, pod_code, owner_user_id, shared_with, access_level, created_at
		FROM shared_pods
		WHERE owner_user_id = $1 OR shared_with LIKE '%' || $1 || '%'
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.SharedPod, 0)
	for rows.Next() {
		var item models.SharedPod
		var sharedWith string
		if err := rows.Scan(&item.ID, &item.PodCode, &item.OwnerUserID, &sharedWith, &item.AccessLevel, &item.CreatedAt); err != nil {
			return nil, err
		}
		item.SharedWith = splitCSV(sharedWith)
		out = append(out, item)
	}
	return out, nil
}

func (r *Repo) CreateHealthCheck(ctx context.Context, item models.HealthCheck) (models.HealthCheck, error) {
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO health_checks (id, resource_type, resource_id, check_type, status, details, checked_at)
		VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()))
		RETURNING checked_at
	`, item.ID, item.ResourceType, item.ResourceID, item.CheckType, item.Status, item.Details, nullableTime(item.CheckedAt)).Scan(&item.CheckedAt)
	return item, err
}

func (r *Repo) ListHealthChecks(ctx context.Context, resourceType string, resourceID string, limit int) ([]models.HealthCheck, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, resource_type, resource_id, check_type, status, details, checked_at
		FROM health_checks
		WHERE ($1 = '' OR resource_type = $1)
		  AND ($2 = '' OR resource_id = $2)
		ORDER BY checked_at DESC
		LIMIT $3
	`, resourceType, resourceID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.HealthCheck, 0)
	for rows.Next() {
		var item models.HealthCheck
		if err := rows.Scan(&item.ID, &item.ResourceType, &item.ResourceID, &item.CheckType, &item.Status, &item.Details, &item.CheckedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *Repo) CreateMetricPoint(ctx context.Context, item models.MetricPoint) (models.MetricPoint, error) {
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO metric_points (id, resource_type, resource_id, metric_type, value, captured_at)
		VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()))
		RETURNING captured_at
	`, item.ID, item.ResourceType, item.ResourceID, item.MetricType, item.Value, nullableTime(item.CapturedAt)).Scan(&item.CapturedAt)
	return item, err
}

func (r *Repo) ListMetricPoints(ctx context.Context, resourceType string, resourceID string, metricType string, from time.Time, to time.Time, limit int) ([]models.MetricPoint, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, resource_type, resource_id, metric_type, value, captured_at
		FROM metric_points
		WHERE ($1 = '' OR resource_type = $1)
		  AND ($2 = '' OR resource_id = $2)
		  AND ($3 = '' OR metric_type = $3)
		  AND ($4 IS NULL OR captured_at >= $4)
		  AND ($5 IS NULL OR captured_at <= $5)
		ORDER BY captured_at DESC
		LIMIT $6
	`, resourceType, resourceID, metricType, nullableTime(from), nullableTime(to), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.MetricPoint, 0)
	for rows.Next() {
		var item models.MetricPoint
		if err := rows.Scan(&item.ID, &item.ResourceType, &item.ResourceID, &item.MetricType, &item.Value, &item.CapturedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *Repo) MetricSummaries(ctx context.Context, limit int) ([]models.MetricSummary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			resource_type,
			resource_id,
			metric_type,
			COUNT(*) AS samples,
			COALESCE(MIN(value), 0) AS min_value,
			COALESCE(MAX(value), 0) AS max_value,
			COALESCE(AVG(value), 0) AS avg_value,
			COALESCE((ARRAY_AGG(value ORDER BY captured_at DESC))[1], 0) AS last_value
		FROM metric_points
		GROUP BY resource_type, resource_id, metric_type
		ORDER BY samples DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.MetricSummary, 0)
	for rows.Next() {
		var item models.MetricSummary
		if err := rows.Scan(&item.ResourceType, &item.ResourceID, &item.MetricType, &item.Samples, &item.MinValue, &item.MaxValue, &item.AvgValue, &item.LastValue); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *Repo) UpsertSharedInventoryOffer(ctx context.Context, item models.SharedInventoryOffer) (models.SharedInventoryOffer, error) {
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO shared_inventory_offers (
			id, provider_id, resource_type, title, description, cpu_cores, ram_mb, gpu_units, network_mbps,
			quantity, available_qty, price_hourly_usd, status, created_by
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		ON CONFLICT (id) DO UPDATE SET
			resource_type = EXCLUDED.resource_type,
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			cpu_cores = EXCLUDED.cpu_cores,
			ram_mb = EXCLUDED.ram_mb,
			gpu_units = EXCLUDED.gpu_units,
			network_mbps = EXCLUDED.network_mbps,
			quantity = EXCLUDED.quantity,
			available_qty = EXCLUDED.available_qty,
			price_hourly_usd = EXCLUDED.price_hourly_usd,
			status = EXCLUDED.status,
			updated_at = NOW()
		RETURNING created_at, updated_at
	`, item.ID, item.ProviderID, item.ResourceType, item.Title, item.Description, item.CPUCores, item.RAMMB, item.GPUUnits, item.NetworkMbps, item.Quantity, item.AvailableQty, item.PriceHourly, item.Status, item.CreatedBy).Scan(&item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (r *Repo) ListSharedInventoryOffers(ctx context.Context, status string, providerID string) ([]models.SharedInventoryOffer, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, provider_id, resource_type, title, description, cpu_cores, ram_mb, gpu_units, network_mbps, quantity, available_qty, price_hourly_usd, status, created_by, created_at, updated_at
		FROM shared_inventory_offers
		WHERE ($1 = '' OR status = $1)
		  AND ($2 = '' OR provider_id = $2)
		ORDER BY updated_at DESC
	`, status, providerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.SharedInventoryOffer, 0)
	for rows.Next() {
		var item models.SharedInventoryOffer
		if err := rows.Scan(&item.ID, &item.ProviderID, &item.ResourceType, &item.Title, &item.Description, &item.CPUCores, &item.RAMMB, &item.GPUUnits, &item.NetworkMbps, &item.Quantity, &item.AvailableQty, &item.PriceHourly, &item.Status, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *Repo) ReserveSharedInventoryOffer(ctx context.Context, offerID string, quantity int) (models.SharedInventoryOffer, error) {
	cmd, err := r.db.Exec(ctx, `
		UPDATE shared_inventory_offers
		SET available_qty = available_qty - $2,
		    status = CASE WHEN available_qty - $2 <= 0 THEN 'sold_out' ELSE status END,
		    updated_at = NOW()
		WHERE id = $1
		  AND available_qty >= $2
	`, offerID, quantity)
	if err != nil {
		return models.SharedInventoryOffer{}, err
	}
	if cmd.RowsAffected() == 0 {
		return models.SharedInventoryOffer{}, errors.New("offer not found or insufficient available quantity")
	}
	var item models.SharedInventoryOffer
	err = r.db.QueryRow(ctx, `
		SELECT id, provider_id, resource_type, title, description, cpu_cores, ram_mb, gpu_units, network_mbps, quantity, available_qty, price_hourly_usd, status, created_by, created_at, updated_at
		FROM shared_inventory_offers
		WHERE id = $1
	`, offerID).Scan(&item.ID, &item.ProviderID, &item.ResourceType, &item.Title, &item.Description, &item.CPUCores, &item.RAMMB, &item.GPUUnits, &item.NetworkMbps, &item.Quantity, &item.AvailableQty, &item.PriceHourly, &item.Status, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (r *Repo) CreateAgentLog(ctx context.Context, item models.AgentLog) (models.AgentLog, error) {
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO agent_logs (id, provider_id, resource_id, level, message, source)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at
	`, item.ID, item.ProviderID, item.ResourceID, item.Level, item.Message, item.Source).Scan(&item.CreatedAt)
	return item, err
}

func (r *Repo) ListAgentLogs(ctx context.Context, providerID string, resourceID string, level string, limit int) ([]models.AgentLog, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, provider_id, resource_id, level, message, source, created_at
		FROM agent_logs
		WHERE ($1 = '' OR provider_id = $1)
		  AND ($2 = '' OR resource_id = $2)
		  AND ($3 = '' OR level = $3)
		ORDER BY created_at DESC
		LIMIT $4
	`, providerID, resourceID, level, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.AgentLog, 0)
	for rows.Next() {
		var item models.AgentLog
		if err := rows.Scan(&item.ID, &item.ProviderID, &item.ResourceID, &item.Level, &item.Message, &item.Source, &item.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *Repo) CreateKubernetesCluster(ctx context.Context, item models.KubernetesCluster) (models.KubernetesCluster, error) {
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO kubernetes_clusters (id, user_id, name, provider_id, node_count, node_type, k8s_version, endpoint, kubeconfig, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING created_at, updated_at
	`, item.ID, item.UserID, item.Name, item.ProviderID, item.NodeCount, item.NodeType, item.K8sVersion, item.Endpoint, item.Kubeconfig, item.Status).Scan(&item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (r *Repo) GetKubernetesCluster(ctx context.Context, clusterID string) (models.KubernetesCluster, error) {
	var out models.KubernetesCluster
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, name, provider_id, node_count, node_type, k8s_version, endpoint, kubeconfig, status, created_at, updated_at
		FROM kubernetes_clusters
		WHERE id = $1
	`, clusterID).Scan(
		&out.ID, &out.UserID, &out.Name, &out.ProviderID, &out.NodeCount, &out.NodeType, &out.K8sVersion, &out.Endpoint, &out.Kubeconfig, &out.Status, &out.CreatedAt, &out.UpdatedAt,
	)
	return out, err
}

func (r *Repo) ListKubernetesClusters(ctx context.Context, userID string) ([]models.KubernetesCluster, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, name, provider_id, node_count, node_type, k8s_version, endpoint, kubeconfig, status, created_at, updated_at
		FROM kubernetes_clusters
		WHERE user_id = $1
		ORDER BY updated_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]models.KubernetesCluster, 0)
	for rows.Next() {
		var item models.KubernetesCluster
		if err := rows.Scan(&item.ID, &item.UserID, &item.Name, &item.ProviderID, &item.NodeCount, &item.NodeType, &item.K8sVersion, &item.Endpoint, &item.Kubeconfig, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (r *Repo) UpdateKubernetesClusterStatus(ctx context.Context, clusterID string, status models.ClusterStatus) error {
	_, err := r.db.Exec(ctx, `
		UPDATE kubernetes_clusters
		SET status = $2, updated_at = NOW()
		WHERE id = $1
	`, clusterID, status)
	return err
}

func (r *Repo) DeleteKubernetesCluster(ctx context.Context, clusterID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM kubernetes_clusters WHERE id = $1`, clusterID)
	return err
}

func joinCSV(items []string) string {
	cleaned := make([]string, 0, len(items))
	for _, item := range items {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		cleaned = append(cleaned, item)
	}
	return strings.Join(cleaned, ",")
}

func splitCSV(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return []string{}
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		out = append(out, part)
	}
	return out
}

func nullableTime(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	return &value
}

func (r *Repo) upsertVMTemplateProfile(ctx context.Context, tpl models.VMTemplate) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO vm_template_profiles (template_code, logo_url, env_json, ssh_public_key, bootstrap_script, os_family, is_public, owner_user_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT (template_code) DO UPDATE SET
			logo_url = EXCLUDED.logo_url,
			env_json = EXCLUDED.env_json,
			ssh_public_key = EXCLUDED.ssh_public_key,
			bootstrap_script = EXCLUDED.bootstrap_script,
			os_family = EXCLUDED.os_family,
			is_public = EXCLUDED.is_public,
			owner_user_id = EXCLUDED.owner_user_id,
			updated_at = NOW()
	`, tpl.Code, tpl.LogoURL, tpl.EnvJSON, tpl.SSHPublicKey, tpl.BootstrapScript, tpl.OSFamily, tpl.IsPublic, tpl.OwnerUserID)
	return err
}

func (r *Repo) seedVMTemplates(ctx context.Context) error {
	seed := []models.VMTemplate{
		{
			Code:            "fastpanel",
			Name:            "FastPanel",
			Description:     "FastPanel preinstalled web-hosting control panel",
			LogoURL:         "/logos/fastpanel.svg",
			EnvJSON:         "{\"APP_ENV\":\"production\",\"PANEL_PORT\":\"8888\"}",
			BootstrapScript: "#!/usr/bin/env bash\nset -e\ncurl -fsSL https://repo.fastpanel.direct/install_fastpanel.sh | bash",
			OSFamily:        "linux",
			IsPublic:        true,
			OwnerUserID:     "system",
			OSName:          "Ubuntu 22.04",
			Region:          "any",
			CloudType:       "secure",
			CPUCores:        4,
			VCPU:            4,
			RAMMB:           8192,
			SystemRAMGB:     8,
			GPUUnits:        0,
			VRAMGB:          0,
			NetworkMbps:     500,
			MaxInstances:    20,
		},
		{
			Code:            "aapanel",
			Name:            "aaPanel",
			Description:     "aaPanel control panel with Docker and Nginx stack",
			LogoURL:         "/logos/aapanel.svg",
			EnvJSON:         "{\"APP_ENV\":\"production\",\"PANEL_PORT\":\"7800\"}",
			BootstrapScript: "#!/usr/bin/env bash\nset -e\nURL=https://www.aapanel.com/script/install_7.0_en.sh && if [ -f /usr/bin/curl ]; then curl -ksSO $URL; else wget --no-check-certificate -O install_7.0_en.sh $URL; fi && bash install_7.0_en.sh",
			OSFamily:        "linux",
			IsPublic:        true,
			OwnerUserID:     "system",
			OSName:          "Ubuntu 22.04",
			Region:          "any",
			CloudType:       "community",
			CPUCores:        4,
			VCPU:            4,
			RAMMB:           8192,
			SystemRAMGB:     8,
			GPUUnits:        0,
			VRAMGB:          0,
			NetworkMbps:     500,
			MaxInstances:    20,
		},
	}
	for _, tpl := range seed {
		if _, err := r.UpsertVMTemplate(ctx, tpl); err != nil {
			return err
		}
	}
	return nil
}
