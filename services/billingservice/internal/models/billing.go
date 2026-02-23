package models

import "time"

type Plan struct {
	ID            string    `json:"id"`
	ProviderID    string    `json:"provider_id"`
	Name          string    `json:"name"`
	PricePerCPU   float64   `json:"price_per_cpu"`
	PricePerRAMGB float64   `json:"price_per_ram_gb"`
	PricePerGPU   float64   `json:"price_per_gpu"`
	CreatedAt     time.Time `json:"created_at"`
}

type UsageRecord struct {
	ID           string    `json:"id"`
	ProviderID   string    `json:"provider_id"`
	PlanID       string    `json:"plan_id"`
	CPUCoresUsed float64   `json:"cpu_cores_used"`
	RAMGBUsed    float64   `json:"ram_gb_used"`
	GPUUsed      float64   `json:"gpu_used"`
	Hours        float64   `json:"hours"`
	NetworkMbps  int       `json:"network_mbps"`
	CreatedAt    time.Time `json:"created_at"`
}

type Accrual struct {
	ID          string    `json:"id"`
	ProviderID  string    `json:"provider_id"`
	UsageID     string    `json:"usage_id"`
	AmountUSD   float64   `json:"amount_usd"`
	VIPBonusUSD float64   `json:"vip_bonus_usd"`
	TotalUSD    float64   `json:"total_usd"`
	CreatedAt   time.Time `json:"created_at"`
}

type BillingStats struct {
	AccrualCount    int     `json:"accrual_count"`
	TotalAmountUSD  float64 `json:"total_amount_usd"`
	TotalBonusUSD   float64 `json:"total_bonus_usd"`
	TotalRevenueUSD float64 `json:"total_revenue_usd"`
}
