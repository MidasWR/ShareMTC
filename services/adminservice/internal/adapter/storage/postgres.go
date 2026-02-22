package storage

import (
	"context"

	"github.com/MidasWR/ShareMTC/services/adminservice/internal/models"
	"github.com/google/uuid"
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
