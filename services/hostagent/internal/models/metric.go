package models

import "time"

type HostMetric struct {
	ProviderID       string    `json:"provider_id"`
	CPUFreeCores     int       `json:"cpu_free_cores"`
	RAMFreeMB        int       `json:"ram_free_mb"`
	GPUFreeUnits     int       `json:"gpu_free_units"`
	GPUTotalUnits    int       `json:"gpu_total_units"`
	GPUMemoryTotalMB int       `json:"gpu_memory_total_mb"`
	GPUMemoryUsedMB  int       `json:"gpu_memory_used_mb"`
	NetworkMbps      int       `json:"network_mbps"`
	HeartbeatAt      time.Time `json:"heartbeat_at"`
}

type AgentLog struct {
	ProviderID string    `json:"provider_id"`
	ResourceID string    `json:"resource_id"`
	Level      string    `json:"level"`
	Message    string    `json:"message"`
	Source     string    `json:"source"`
	CreatedAt  time.Time `json:"created_at"`
}
