package storage

import (
	"context"
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
	`)
	return err
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
