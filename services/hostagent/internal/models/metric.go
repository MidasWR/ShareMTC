package models

import "time"

type HostMetric struct {
	ProviderID   string    `json:"provider_id"`
	CPUFreeCores int       `json:"cpu_free_cores"`
	RAMFreeMB    int       `json:"ram_free_mb"`
	GPUFreeUnits int       `json:"gpu_free_units"`
	NetworkMbps  int       `json:"network_mbps"`
	HeartbeatAt  time.Time `json:"heartbeat_at"`
}
