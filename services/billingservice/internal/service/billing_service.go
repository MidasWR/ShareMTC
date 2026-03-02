package service

import (
	"context"
	"errors"

	"github.com/MidasWR/ShareMTC/services/billingservice/internal/models"
	"github.com/rs/zerolog/log"
)

type Repository interface {
	CreatePlan(ctx context.Context, plan models.Plan) (models.Plan, error)
	GetPlan(ctx context.Context, planID string) (models.Plan, error)
	CreateUsage(ctx context.Context, usage models.UsageRecord) (models.UsageRecord, error)
	CreateAccrual(ctx context.Context, accrual models.Accrual) (models.Accrual, error)
	ListAccruals(ctx context.Context, providerID string) ([]models.Accrual, error)
	ListAllAccruals(ctx context.Context, limit int, offset int) ([]models.Accrual, error)
	Stats(ctx context.Context) (models.BillingStats, error)
	ListRentalPlans(ctx context.Context) ([]models.RentalPlan, error)
	GetRentalPlan(ctx context.Context, planID string) (models.RentalPlan, error)
	CreateServerOrder(ctx context.Context, order models.ServerOrder) (models.ServerOrder, error)
	ListServerOrders(ctx context.Context, userID string) ([]models.ServerOrder, error)
}

type BillingService struct {
	repo Repository
}

func New(repo Repository) *BillingService {
	log.Info().Msg("billing service initialized")
	return &BillingService{repo: repo}
}

func (s *BillingService) CreatePlan(ctx context.Context, plan models.Plan) (models.Plan, error) {
	log.Info().Str("provider_id", plan.ProviderID).Str("name", plan.Name).Msg("create plan requested")
	if plan.ProviderID == "" || plan.Name == "" {
		log.Warn().Msg("create plan rejected: missing provider_id or name")
		return models.Plan{}, errors.New("provider_id and name are required")
	}
	return s.repo.CreatePlan(ctx, plan)
}

func (s *BillingService) ProcessUsage(ctx context.Context, usage models.UsageRecord) (models.Accrual, error) {
	log.Info().Str("provider_id", usage.ProviderID).Str("plan_id", usage.PlanID).Msg("processing usage")
	plan, err := s.repo.GetPlan(ctx, usage.PlanID)
	if err != nil {
		log.Error().Err(err).Str("plan_id", usage.PlanID).Msg("process usage failed on get plan")
		return models.Accrual{}, err
	}
	usage, err = s.repo.CreateUsage(ctx, usage)
	if err != nil {
		log.Error().Err(err).Str("provider_id", usage.ProviderID).Msg("process usage failed on usage create")
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

	accrual, err := s.repo.CreateAccrual(ctx, models.Accrual{
		ProviderID:  usage.ProviderID,
		UsageID:     usage.ID,
		AmountUSD:   base,
		VIPBonusUSD: vipBonus,
		TotalUSD:    base + vipBonus,
	})
	if err != nil {
		log.Error().Err(err).Str("provider_id", usage.ProviderID).Msg("process usage failed on accrual create")
		return models.Accrual{}, err
	}
	log.Info().Str("provider_id", usage.ProviderID).Float64("total_usd", accrual.TotalUSD).Msg("usage processed")
	return accrual, nil
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

func (s *BillingService) ListRentalPlans(ctx context.Context) ([]models.RentalPlan, error) {
	return s.repo.ListRentalPlans(ctx)
}

func (s *BillingService) EstimateServerOrder(ctx context.Context, order models.ServerOrder) (models.ServerOrder, error) {
	log.Debug().Str("plan_id", order.PlanID).Int("cpu", order.CPUCores).Int("ram_gb", order.RAMGB).Int("gpu", order.GPUUnits).Msg("estimating server order")
	plan, err := s.repo.GetRentalPlan(ctx, order.PlanID)
	if err != nil {
		log.Error().Err(err).Str("plan_id", order.PlanID).Msg("estimate order failed on plan lookup")
		return models.ServerOrder{}, err
	}
	if order.Period == "" {
		order.Period = plan.Period
	}
	networkUnits := float64(order.NetworkMbps) / 100
	order.EstimatedPrice = plan.BasePriceUSD +
		float64(order.CPUCores)*plan.PricePerCPU +
		float64(order.RAMGB)*plan.PricePerRAMGB +
		float64(order.GPUUnits)*plan.PricePerGPU +
		networkUnits*plan.PricePerNet100
	order.Status = "created"
	log.Debug().Str("plan_id", order.PlanID).Float64("estimated_price", order.EstimatedPrice).Msg("server order estimated")
	return order, nil
}

func (s *BillingService) CreateServerOrder(ctx context.Context, order models.ServerOrder) (models.ServerOrder, error) {
	log.Info().Str("user_id", order.UserID).Str("name", order.Name).Msg("creating server order")
	if order.Name == "" {
		log.Warn().Msg("create server order rejected: missing name")
		return models.ServerOrder{}, errors.New("name is required")
	}
	estimated, err := s.EstimateServerOrder(ctx, order)
	if err != nil {
		log.Error().Err(err).Str("user_id", order.UserID).Msg("create server order failed on estimate")
		return models.ServerOrder{}, err
	}
	created, err := s.repo.CreateServerOrder(ctx, estimated)
	if err != nil {
		log.Error().Err(err).Str("user_id", order.UserID).Msg("create server order failed on repository create")
		return models.ServerOrder{}, err
	}
	log.Info().Str("order_id", created.ID).Str("user_id", created.UserID).Float64("estimated_price", created.EstimatedPrice).Msg("server order created")
	return created, nil
}

func (s *BillingService) ListServerOrders(ctx context.Context, userID string) ([]models.ServerOrder, error) {
	return s.repo.ListServerOrders(ctx, userID)
}
