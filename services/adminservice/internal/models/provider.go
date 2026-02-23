package models

import "time"

type ProviderType string

const (
	ProviderTypeInternal ProviderType = "internal"
	ProviderTypeDonor    ProviderType = "donor"
)

type Provider struct {
	ID           string       `json:"id"`
	DisplayName  string       `json:"display_name"`
	ProviderType ProviderType `json:"provider_type"`
	MachineID    string       `json:"machine_id"`
	NetworkMbps  int          `json:"network_mbps"`
	Online       bool         `json:"online"`
	CreatedAt    time.Time    `json:"created_at"`
}

type AdminStats struct {
	TotalProviders  int `json:"total_providers"`
	OnlineProviders int `json:"online_providers"`
	InternalCount   int `json:"internal_providers"`
	DonorCount      int `json:"donor_providers"`
}

type ProviderMetrics struct {
	ProviderID         string  `json:"provider_id"`
	AllocationTotal    int     `json:"allocation_total"`
	AllocationRunning  int     `json:"allocation_running"`
	AccrualTotalUSD    float64 `json:"accrual_total_usd"`
	AccrualVIPBonusUSD float64 `json:"accrual_vip_bonus_usd"`
}
