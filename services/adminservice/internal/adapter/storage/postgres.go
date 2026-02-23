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
		);
		CREATE TABLE IF NOT EXISTS pod_templates (
			id UUID PRIMARY KEY,
			code TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			description TEXT NOT NULL,
			gpu_class TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS pods_catalog (
			id UUID PRIMARY KEY,
			code TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			description TEXT NOT NULL,
			gpu_model TEXT NOT NULL,
			gpu_vram_gb INTEGER NOT NULL,
			cpu_cores INTEGER NOT NULL,
			ram_gb INTEGER NOT NULL,
			network_mbps INTEGER NOT NULL,
			hourly_price_usd DOUBLE PRECISION NOT NULL,
			monthly_price_usd DOUBLE PRECISION NOT NULL,
			os_name TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS pod_template_bindings (
			pod_id UUID NOT NULL REFERENCES pods_catalog(id) ON DELETE CASCADE,
			template_id UUID NOT NULL REFERENCES pod_templates(id) ON DELETE CASCADE,
			PRIMARY KEY (pod_id, template_id)
		)
	`)
	if err != nil {
		return err
	}
	return r.seedPodCatalog(ctx)
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

func (r *ProviderRepo) ListPodCatalog(ctx context.Context) ([]models.PodCatalogItem, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, code, name, description, gpu_model, gpu_vram_gb, cpu_cores, ram_gb, network_mbps, hourly_price_usd, monthly_price_usd, os_name, created_at
		FROM pods_catalog
		ORDER BY code
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]models.PodCatalogItem, 0)
	for rows.Next() {
		var item models.PodCatalogItem
		if err := rows.Scan(
			&item.ID,
			&item.Code,
			&item.Name,
			&item.Description,
			&item.GPUModel,
			&item.GPUVRAMGB,
			&item.CPUCores,
			&item.RAMGB,
			&item.NetworkMbps,
			&item.HourlyPriceUSD,
			&item.MonthlyPriceUSD,
			&item.OSName,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		templateIDs, err := r.listTemplateBindings(ctx, item.ID)
		if err != nil {
			return nil, err
		}
		item.TemplateIDs = templateIDs
		items = append(items, item)
	}
	return items, nil
}

func (r *ProviderRepo) UpsertPodCatalog(ctx context.Context, item models.PodCatalogItem) (models.PodCatalogItem, error) {
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO pods_catalog (id, code, name, description, gpu_model, gpu_vram_gb, cpu_cores, ram_gb, network_mbps, hourly_price_usd, monthly_price_usd, os_name)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		ON CONFLICT (id) DO UPDATE SET
			code = EXCLUDED.code,
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			gpu_model = EXCLUDED.gpu_model,
			gpu_vram_gb = EXCLUDED.gpu_vram_gb,
			cpu_cores = EXCLUDED.cpu_cores,
			ram_gb = EXCLUDED.ram_gb,
			network_mbps = EXCLUDED.network_mbps,
			hourly_price_usd = EXCLUDED.hourly_price_usd,
			monthly_price_usd = EXCLUDED.monthly_price_usd,
			os_name = EXCLUDED.os_name
		RETURNING created_at
	`, item.ID, item.Code, item.Name, item.Description, item.GPUModel, item.GPUVRAMGB, item.CPUCores, item.RAMGB, item.NetworkMbps, item.HourlyPriceUSD, item.MonthlyPriceUSD, item.OSName).Scan(&item.CreatedAt)
	if err != nil {
		return models.PodCatalogItem{}, err
	}
	if _, err := r.db.Exec(ctx, `DELETE FROM pod_template_bindings WHERE pod_id = $1`, item.ID); err != nil {
		return models.PodCatalogItem{}, err
	}
	for _, templateID := range item.TemplateIDs {
		if _, err := r.db.Exec(ctx, `INSERT INTO pod_template_bindings (pod_id, template_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, item.ID, templateID); err != nil {
			return models.PodCatalogItem{}, err
		}
	}
	return item, nil
}

func (r *ProviderRepo) DeletePodCatalog(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM pods_catalog WHERE id = $1`, id)
	return err
}

func (r *ProviderRepo) ListPodTemplates(ctx context.Context) ([]models.PodTemplate, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, code, name, description, gpu_class, created_at
		FROM pod_templates
		ORDER BY code
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]models.PodTemplate, 0)
	for rows.Next() {
		var item models.PodTemplate
		if err := rows.Scan(&item.ID, &item.Code, &item.Name, &item.Description, &item.GPUClass, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *ProviderRepo) UpsertPodTemplate(ctx context.Context, item models.PodTemplate) (models.PodTemplate, error) {
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO pod_templates (id, code, name, description, gpu_class)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (id) DO UPDATE SET
			code = EXCLUDED.code,
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			gpu_class = EXCLUDED.gpu_class
		RETURNING created_at
	`, item.ID, item.Code, item.Name, item.Description, item.GPUClass).Scan(&item.CreatedAt)
	return item, err
}

func (r *ProviderRepo) DeletePodTemplate(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM pod_templates WHERE id = $1`, id)
	return err
}

func (r *ProviderRepo) listTemplateBindings(ctx context.Context, podID string) ([]string, error) {
	rows, err := r.db.Query(ctx, `SELECT template_id FROM pod_template_bindings WHERE pod_id = $1 ORDER BY template_id`, podID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]string, 0)
	for rows.Next() {
		var templateID string
		if err := rows.Scan(&templateID); err != nil {
			return nil, err
		}
		result = append(result, templateID)
	}
	return result, nil
}

func (r *ProviderRepo) seedPodCatalog(ctx context.Context) error {
	var templatesCount int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM pod_templates`).Scan(&templatesCount); err != nil {
		return err
	}
	if templatesCount == 0 {
		templateSeed := []models.PodTemplate{
			{Code: "gpu-infer", Name: "Инференс", Description: "Оптимизировано под инференс и низкую задержку", GPUClass: "infer"},
			{Code: "gpu-train", Name: "Обучение", Description: "Шаблон для тренировки больших моделей", GPUClass: "train"},
			{Code: "gpu-finetune", Name: "Файнтюнинг", Description: "Сбалансированный шаблон для дообучения", GPUClass: "finetune"},
			{Code: "gpu-vision", Name: "Computer Vision", Description: "Конфиг для vision и мультимодальных задач", GPUClass: "vision"},
			{Code: "gpu-batch", Name: "Batch jobs", Description: "Пакетная обработка задач с высокой утилизацией", GPUClass: "batch"},
		}
		for _, item := range templateSeed {
			if _, err := r.UpsertPodTemplate(ctx, item); err != nil {
				return err
			}
		}
	}

	var podsCount int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM pods_catalog`).Scan(&podsCount); err != nil {
		return err
	}
	if podsCount > 0 {
		return nil
	}
	templates, err := r.ListPodTemplates(ctx)
	if err != nil {
		return err
	}
	templateIDs := make([]string, 0, len(templates))
	for _, t := range templates {
		templateIDs = append(templateIDs, t.ID)
	}
	oses := []string{"Ubuntu 22.04", "Ubuntu 24.04", "Debian 12"}
	gpuModels := []struct {
		model string
		vram  int
		price float64
	}{
		{model: "NVIDIA RTX 3080", vram: 10, price: 0.85},
		{model: "NVIDIA RTX 3090", vram: 24, price: 1.15},
		{model: "NVIDIA A5000", vram: 24, price: 1.35},
		{model: "NVIDIA A6000", vram: 48, price: 1.90},
	}
	for i := 1; i <= 36; i++ {
		gpu := gpuModels[(i-1)%len(gpuModels)]
		item := models.PodCatalogItem{
			Code:            "pod-gpu-" + uuid.New().String()[0:8],
			Name:            "GPU Pod #" + string(rune('A'+((i-1)%26))) + "-" + string(rune('0'+(i%10))),
			Description:     "Выделенный GPU pod для ML/AI workload",
			GPUModel:        gpu.model,
			GPUVRAMGB:       gpu.vram,
			CPUCores:        8 + (i % 5 * 4),
			RAMGB:           32 + (i % 4 * 16),
			NetworkMbps:     1000 + (i%3)*500,
			HourlyPriceUSD:  gpu.price + float64(i%5)*0.08,
			MonthlyPriceUSD: (gpu.price + float64(i%5)*0.08) * 24 * 30 * 0.78,
			OSName:          oses[(i-1)%len(oses)],
			TemplateIDs:     templateIDs,
		}
		if _, err := r.UpsertPodCatalog(ctx, item); err != nil {
			return err
		}
	}
	return nil
}
