package storage

import (
	"context"

	"github.com/MidasWR/ShareMTC/services/billingservice/internal/models"
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
		CREATE TABLE IF NOT EXISTS billing_plans (
			id UUID PRIMARY KEY,
			provider_id TEXT NOT NULL,
			name TEXT NOT NULL,
			price_per_cpu DOUBLE PRECISION NOT NULL,
			price_per_ram_gb DOUBLE PRECISION NOT NULL,
			price_per_gpu DOUBLE PRECISION NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS usage_records (
			id UUID PRIMARY KEY,
			provider_id TEXT NOT NULL,
			plan_id UUID NOT NULL,
			cpu_cores_used DOUBLE PRECISION NOT NULL,
			ram_gb_used DOUBLE PRECISION NOT NULL,
			gpu_used DOUBLE PRECISION NOT NULL,
			hours DOUBLE PRECISION NOT NULL,
			network_mbps INTEGER NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS accruals (
			id UUID PRIMARY KEY,
			provider_id TEXT NOT NULL,
			usage_id UUID NOT NULL,
			amount_usd DOUBLE PRECISION NOT NULL,
			vip_bonus_usd DOUBLE PRECISION NOT NULL,
			total_usd DOUBLE PRECISION NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS rental_plans (
			id UUID PRIMARY KEY,
			name TEXT NOT NULL,
			period TEXT NOT NULL,
			base_price_usd DOUBLE PRECISION NOT NULL,
			price_per_cpu DOUBLE PRECISION NOT NULL,
			price_per_ram_gb DOUBLE PRECISION NOT NULL,
			price_per_gpu DOUBLE PRECISION NOT NULL,
			price_per_net_100mbps DOUBLE PRECISION NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS server_orders (
			id UUID PRIMARY KEY,
			user_id TEXT NOT NULL,
			plan_id UUID NOT NULL REFERENCES rental_plans(id),
			os_name TEXT NOT NULL,
			network_mbps INTEGER NOT NULL,
			cpu_cores INTEGER NOT NULL,
			ram_gb INTEGER NOT NULL,
			gpu_units INTEGER NOT NULL,
			period TEXT NOT NULL,
			estimated_price_usd DOUBLE PRECISION NOT NULL,
			status TEXT NOT NULL DEFAULT 'created',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`)
	if err != nil {
		return err
	}
	return r.seedRentalPlans(ctx)
}

func (r *Repo) CreatePlan(ctx context.Context, plan models.Plan) (models.Plan, error) {
	plan.ID = uuid.NewString()
	err := r.db.QueryRow(ctx, `
		INSERT INTO billing_plans (id, provider_id, name, price_per_cpu, price_per_ram_gb, price_per_gpu)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at
	`, plan.ID, plan.ProviderID, plan.Name, plan.PricePerCPU, plan.PricePerRAMGB, plan.PricePerGPU).Scan(&plan.CreatedAt)
	return plan, err
}

func (r *Repo) GetPlan(ctx context.Context, planID string) (models.Plan, error) {
	var p models.Plan
	err := r.db.QueryRow(ctx, `
		SELECT id, provider_id, name, price_per_cpu, price_per_ram_gb, price_per_gpu, created_at
		FROM billing_plans
		WHERE id = $1
	`, planID).Scan(&p.ID, &p.ProviderID, &p.Name, &p.PricePerCPU, &p.PricePerRAMGB, &p.PricePerGPU, &p.CreatedAt)
	return p, err
}

func (r *Repo) CreateUsage(ctx context.Context, usage models.UsageRecord) (models.UsageRecord, error) {
	usage.ID = uuid.NewString()
	err := r.db.QueryRow(ctx, `
		INSERT INTO usage_records (id, provider_id, plan_id, cpu_cores_used, ram_gb_used, gpu_used, hours, network_mbps)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at
	`, usage.ID, usage.ProviderID, usage.PlanID, usage.CPUCoresUsed, usage.RAMGBUsed, usage.GPUUsed, usage.Hours, usage.NetworkMbps).Scan(&usage.CreatedAt)
	return usage, err
}

func (r *Repo) CreateAccrual(ctx context.Context, accrual models.Accrual) (models.Accrual, error) {
	accrual.ID = uuid.NewString()
	err := r.db.QueryRow(ctx, `
		INSERT INTO accruals (id, provider_id, usage_id, amount_usd, vip_bonus_usd, total_usd)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at
	`, accrual.ID, accrual.ProviderID, accrual.UsageID, accrual.AmountUSD, accrual.VIPBonusUSD, accrual.TotalUSD).Scan(&accrual.CreatedAt)
	return accrual, err
}

func (r *Repo) ListAccruals(ctx context.Context, providerID string) ([]models.Accrual, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, provider_id, usage_id, amount_usd, vip_bonus_usd, total_usd, created_at
		FROM accruals
		WHERE provider_id = $1
		ORDER BY created_at DESC
	`, providerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]models.Accrual, 0)
	for rows.Next() {
		var a models.Accrual
		if err := rows.Scan(&a.ID, &a.ProviderID, &a.UsageID, &a.AmountUSD, &a.VIPBonusUSD, &a.TotalUSD, &a.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, a)
	}
	return result, nil
}

func (r *Repo) ListAllAccruals(ctx context.Context, limit int, offset int) ([]models.Accrual, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, provider_id, usage_id, amount_usd, vip_bonus_usd, total_usd, created_at
		FROM accruals
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]models.Accrual, 0)
	for rows.Next() {
		var a models.Accrual
		if err := rows.Scan(&a.ID, &a.ProviderID, &a.UsageID, &a.AmountUSD, &a.VIPBonusUSD, &a.TotalUSD, &a.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, a)
	}
	return result, nil
}

func (r *Repo) Stats(ctx context.Context) (models.BillingStats, error) {
	var stats models.BillingStats
	err := r.db.QueryRow(ctx, `
		SELECT
			COUNT(*) AS accrual_count,
			COALESCE(SUM(amount_usd), 0) AS total_amount_usd,
			COALESCE(SUM(vip_bonus_usd), 0) AS total_bonus_usd,
			COALESCE(SUM(total_usd), 0) AS total_revenue_usd
		FROM accruals
	`).Scan(&stats.AccrualCount, &stats.TotalAmountUSD, &stats.TotalBonusUSD, &stats.TotalRevenueUSD)
	return stats, err
}

func (r *Repo) ListRentalPlans(ctx context.Context) ([]models.RentalPlan, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, name, period, base_price_usd, price_per_cpu, price_per_ram_gb, price_per_gpu, price_per_net_100mbps, created_at
		FROM rental_plans
		ORDER BY period, base_price_usd
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]models.RentalPlan, 0)
	for rows.Next() {
		var item models.RentalPlan
		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Period,
			&item.BasePriceUSD,
			&item.PricePerCPU,
			&item.PricePerRAMGB,
			&item.PricePerGPU,
			&item.PricePerNet100,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *Repo) GetRentalPlan(ctx context.Context, planID string) (models.RentalPlan, error) {
	var item models.RentalPlan
	err := r.db.QueryRow(ctx, `
		SELECT id, name, period, base_price_usd, price_per_cpu, price_per_ram_gb, price_per_gpu, price_per_net_100mbps, created_at
		FROM rental_plans
		WHERE id = $1
	`, planID).Scan(
		&item.ID,
		&item.Name,
		&item.Period,
		&item.BasePriceUSD,
		&item.PricePerCPU,
		&item.PricePerRAMGB,
		&item.PricePerGPU,
		&item.PricePerNet100,
		&item.CreatedAt,
	)
	return item, err
}

func (r *Repo) CreateServerOrder(ctx context.Context, order models.ServerOrder) (models.ServerOrder, error) {
	order.ID = uuid.NewString()
	err := r.db.QueryRow(ctx, `
		INSERT INTO server_orders (id, user_id, plan_id, os_name, network_mbps, cpu_cores, ram_gb, gpu_units, period, estimated_price_usd, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING created_at
	`, order.ID, order.UserID, order.PlanID, order.OSName, order.NetworkMbps, order.CPUCores, order.RAMGB, order.GPUUnits, order.Period, order.EstimatedPrice, order.Status).Scan(&order.CreatedAt)
	return order, err
}

func (r *Repo) ListServerOrders(ctx context.Context, userID string) ([]models.ServerOrder, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, plan_id, os_name, network_mbps, cpu_cores, ram_gb, gpu_units, period, estimated_price_usd, status, created_at
		FROM server_orders
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]models.ServerOrder, 0)
	for rows.Next() {
		var item models.ServerOrder
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.PlanID,
			&item.OSName,
			&item.NetworkMbps,
			&item.CPUCores,
			&item.RAMGB,
			&item.GPUUnits,
			&item.Period,
			&item.EstimatedPrice,
			&item.Status,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *Repo) seedRentalPlans(ctx context.Context) error {
	var count int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM rental_plans`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	seed := []models.RentalPlan{
		{Name: "GPU Часовой Старт", Period: "hourly", BasePriceUSD: 0.25, PricePerCPU: 0.03, PricePerRAMGB: 0.01, PricePerGPU: 0.40, PricePerNet100: 0.02},
		{Name: "GPU Часовой Pro", Period: "hourly", BasePriceUSD: 0.45, PricePerCPU: 0.04, PricePerRAMGB: 0.015, PricePerGPU: 0.65, PricePerNet100: 0.025},
		{Name: "GPU Месячный Старт", Period: "monthly", BasePriceUSD: 120, PricePerCPU: 9, PricePerRAMGB: 3, PricePerGPU: 180, PricePerNet100: 8},
		{Name: "GPU Месячный Pro", Period: "monthly", BasePriceUSD: 220, PricePerCPU: 11, PricePerRAMGB: 4, PricePerGPU: 260, PricePerNet100: 12},
	}
	for _, item := range seed {
		_, err := r.db.Exec(ctx, `
			INSERT INTO rental_plans (id, name, period, base_price_usd, price_per_cpu, price_per_ram_gb, price_per_gpu, price_per_net_100mbps)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		`, uuid.NewString(), item.Name, item.Period, item.BasePriceUSD, item.PricePerCPU, item.PricePerRAMGB, item.PricePerGPU, item.PricePerNet100)
		if err != nil {
			return err
		}
	}
	return nil
}
