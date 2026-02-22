package models

import "time"

type ProviderType string

const (
	ProviderTypeInternal ProviderType = "internal"
	ProviderTypeDonor    ProviderType = "donor"
)

type Provider struct {
	ID            string       `json:"id"`
	DisplayName   string       `json:"display_name"`
	ProviderType  ProviderType `json:"provider_type"`
	MachineID     string       `json:"machine_id"`
	NetworkMbps   int          `json:"network_mbps"`
	Online        bool         `json:"online"`
	CreatedAt     time.Time    `json:"created_at"`
}
