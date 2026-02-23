package service

import (
	"context"
	"testing"
	"time"

	"github.com/MidasWR/ShareMTC/services/billingservice/internal/models"
)

type billingRepoStub struct {
	plan models.Plan
}

func (r *billingRepoStub) CreatePlan(_ context.Context, plan models.Plan) (models.Plan, error) {
	plan.ID = "p1"
	plan.CreatedAt = time.Now().UTC()
	r.plan = plan
	return plan, nil
}
func (r *billingRepoStub) GetPlan(_ context.Context, _ string) (models.Plan, error) {
	return r.plan, nil
}
func (r *billingRepoStub) CreateUsage(_ context.Context, usage models.UsageRecord) (models.UsageRecord, error) {
	usage.ID = "u1"
	return usage, nil
}
func (r *billingRepoStub) CreateAccrual(_ context.Context, accrual models.Accrual) (models.Accrual, error) {
	accrual.ID = "a1"
	return accrual, nil
}
func (r *billingRepoStub) ListAccruals(_ context.Context, _ string) ([]models.Accrual, error) {
	return nil, nil
}
func (r *billingRepoStub) ListAllAccruals(_ context.Context, _ int, _ int) ([]models.Accrual, error) {
	return nil, nil
}
func (r *billingRepoStub) Stats(_ context.Context) (models.BillingStats, error) {
	return models.BillingStats{}, nil
}
func (r *billingRepoStub) ListRentalPlans(_ context.Context) ([]models.RentalPlan, error) {
	return nil, nil
}
func (r *billingRepoStub) GetRentalPlan(_ context.Context, _ string) (models.RentalPlan, error) {
	return models.RentalPlan{}, nil
}
func (r *billingRepoStub) CreateServerOrder(_ context.Context, order models.ServerOrder) (models.ServerOrder, error) {
	return order, nil
}
func (r *billingRepoStub) ListServerOrders(_ context.Context, _ string) ([]models.ServerOrder, error) {
	return nil, nil
}

func TestUsageCreatesVipBonus(t *testing.T) {
	repo := &billingRepoStub{
		plan: models.Plan{
			ID:            "p1",
			PricePerCPU:   1.0,
			PricePerRAMGB: 0.25,
			PricePerGPU:   2.0,
		},
	}
	svc := New(repo)

	accrual, err := svc.ProcessUsage(context.Background(), models.UsageRecord{
		ProviderID:   "provider-1",
		PlanID:       "p1",
		CPUCoresUsed: 2,
		RAMGBUsed:    4,
		GPUUsed:      1,
		Hours:        1,
		NetworkMbps:  1000,
	})
	if err != nil {
		t.Fatalf("process usage failed: %v", err)
	}
	if accrual.VIPBonusUSD <= 0 {
		t.Fatal("vip bonus must be applied for fast network")
	}
	if accrual.TotalUSD <= accrual.AmountUSD {
		t.Fatal("total must include bonus")
	}
}
