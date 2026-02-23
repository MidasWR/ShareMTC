package storage

import (
	"context"
	"errors"

	"github.com/MidasWR/ShareMTC/services/adminservice/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProviderRepo struct {
	db *pgxpool.Pool
}

func NewProviderRepo(db *pgxpool.Pool) *ProviderRepo {
	return &ProviderRepo{db: db}
}

func (r *ProviderRepo) Migrate(ctx context.Context) error {
	_, err := r.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS providers (
			id UUID PRIMARY KEY,
			display_name TEXT NOT NULL,
			provider_type TEXT NOT NULL,
			machine_id TEXT NOT NULL,
			network_mbps INTEGER NOT NULL,
			online BOOLEAN NOT NULL DEFAULT false,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	return err
}

func (r *ProviderRepo) Create(ctx context.Context, provider models.Provider) (models.Provider, error) {
	provider.ID = uuid.NewString()
	err := r.db.QueryRow(ctx, `
		INSERT INTO providers (id, display_name, provider_type, machine_id, network_mbps, online)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at
	`, provider.ID, provider.DisplayName, provider.ProviderType, provider.MachineID, provider.NetworkMbps, provider.Online).Scan(&provider.CreatedAt)
	return provider, err
}

func (r *ProviderRepo) List(ctx context.Context) ([]models.Provider, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, display_name, provider_type, machine_id, network_mbps, online, created_at
		FROM providers
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	providers := make([]models.Provider, 0)
	for rows.Next() {
		var p models.Provider
		if err := rows.Scan(&p.ID, &p.DisplayName, &p.ProviderType, &p.MachineID, &p.NetworkMbps, &p.Online, &p.CreatedAt); err != nil {
			return nil, err
		}
		providers = append(providers, p)
	}
	return providers, nil
}

func (r *ProviderRepo) UpdateOnlineStatus(ctx context.Context, providerID string, online bool) error {
	_, err := r.db.Exec(ctx, `UPDATE providers SET online = $2 WHERE id = $1`, providerID, online)
	return err
}

func (r *ProviderRepo) GetByID(ctx context.Context, providerID string) (models.Provider, error) {
	var p models.Provider
	err := r.db.QueryRow(ctx, `
		SELECT id, display_name, provider_type, machine_id, network_mbps, online, created_at
		FROM providers
		WHERE id = $1
	`, providerID).Scan(&p.ID, &p.DisplayName, &p.ProviderType, &p.MachineID, &p.NetworkMbps, &p.Online, &p.CreatedAt)
	return p, err
}

func (r *ProviderRepo) Stats(ctx context.Context) (models.AdminStats, error) {
	var stats models.AdminStats
	err := r.db.QueryRow(ctx, `
		SELECT
			COUNT(*) AS total_providers,
			COUNT(*) FILTER (WHERE online) AS online_providers,
			COUNT(*) FILTER (WHERE provider_type = 'internal') AS internal_providers,
			COUNT(*) FILTER (WHERE provider_type = 'donor') AS donor_providers
		FROM providers
	`).Scan(&stats.TotalProviders, &stats.OnlineProviders, &stats.InternalCount, &stats.DonorCount)
	return stats, err
}

func (r *ProviderRepo) ProviderMetrics(ctx context.Context, providerID string) (models.ProviderMetrics, error) {
	metrics := models.ProviderMetrics{ProviderID: providerID}

	if _, err := r.GetByID(ctx, providerID); err != nil {
		return models.ProviderMetrics{}, err
	}

	hasAllocations, err := r.tableExists(ctx, "allocations")
	if err != nil {
		return models.ProviderMetrics{}, err
	}
	if hasAllocations {
		err = r.db.QueryRow(ctx, `
			SELECT
				COUNT(*) AS allocation_total,
				COUNT(*) FILTER (WHERE released_at IS NULL) AS allocation_running
			FROM allocations
			WHERE provider_id = $1
		`, providerID).Scan(&metrics.AllocationTotal, &metrics.AllocationRunning)
		if err != nil {
			return models.ProviderMetrics{}, err
		}
	}

	hasAccruals, err := r.tableExists(ctx, "accruals")
	if err != nil {
		return models.ProviderMetrics{}, err
	}
	if hasAccruals {
		err = r.db.QueryRow(ctx, `
			SELECT
				COALESCE(SUM(total_usd), 0) AS accrual_total_usd,
				COALESCE(SUM(vip_bonus_usd), 0) AS accrual_vip_bonus_usd
			FROM accruals
			WHERE provider_id = $1
		`, providerID).Scan(&metrics.AccrualTotalUSD, &metrics.AccrualVIPBonusUSD)
		if err != nil {
			return models.ProviderMetrics{}, err
		}
	}

	return metrics, nil
}

func (r *ProviderRepo) tableExists(ctx context.Context, tableName string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = $1
		)
	`, tableName).Scan(&exists)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return exists, err
}
