package service

import (
	"context"
	"errors"

	"github.com/MidasWR/ShareMTC/services/billingservice/internal/models"
)

type Repository interface {
	CreatePlan(ctx context.Context, plan models.Plan) (models.Plan, error)
	GetPlan(ctx context.Context, planID string) (models.Plan, error)
	CreateUsage(ctx context.Context, usage models.UsageRecord) (models.UsageRecord, error)
	CreateAccrual(ctx context.Context, accrual models.Accrual) (models.Accrual, error)
	ListAccruals(ctx context.Context, providerID string) ([]models.Accrual, error)
	ListAllAccruals(ctx context.Context, limit int, offset int) ([]models.Accrual, error)
	Stats(ctx context.Context) (models.BillingStats, error)
}

type BillingService struct {
	repo Repository
}

func New(repo Repository) *BillingService {
	return &BillingService{repo: repo}
}

func (s *BillingService) CreatePlan(ctx context.Context, plan models.Plan) (models.Plan, error) {
	if plan.ProviderID == "" || plan.Name == "" {
		return models.Plan{}, errors.New("provider_id and name are required")
	}
	return s.repo.CreatePlan(ctx, plan)
}

func (s *BillingService) ProcessUsage(ctx context.Context, usage models.UsageRecord) (models.Accrual, error) {
	plan, err := s.repo.GetPlan(ctx, usage.PlanID)
	if err != nil {
		return models.Accrual{}, err
	}
	usage, err = s.repo.CreateUsage(ctx, usage)
	if err != nil {
		return models.Accrual{}, err
	}

	base := usage.CPUCoresUsed*usage.Hours*plan.PricePerCPU +
		usage.RAMGBUsed*usage.Hours*plan.PricePerRAMGB +
		usage.GPUUsed*usage.Hours*plan.PricePerGPU

	vipBonus := 0.0
	if usage.NetworkMbps >= 500 {
		vipBonus = base * 0.10
	}
	if usage.NetworkMbps >= 1000 {
		vipBonus = base * 0.20
	}

	return s.repo.CreateAccrual(ctx, models.Accrual{
		ProviderID:  usage.ProviderID,
		UsageID:     usage.ID,
		AmountUSD:   base,
		VIPBonusUSD: vipBonus,
		TotalUSD:    base + vipBonus,
	})
}

func (s *BillingService) ListAccruals(ctx context.Context, providerID string) ([]models.Accrual, error) {
	return s.repo.ListAccruals(ctx, providerID)
}

func (s *BillingService) ListAllAccruals(ctx context.Context, limit int, offset int) ([]models.Accrual, error) {
	return s.repo.ListAllAccruals(ctx, limit, offset)
}

func (s *BillingService) Stats(ctx context.Context) (models.BillingStats, error) {
	return s.repo.Stats(ctx)
}
