package models

import "time"

type HostResource struct {
	ID           string    `json:"id"`
	ProviderID   string    `json:"provider_id"`
	CPUFreeCores int       `json:"cpu_free_cores"`
	RAMFreeMB    int       `json:"ram_free_mb"`
	GPUFreeUnits int       `json:"gpu_free_units"`
	NetworkMbps  int       `json:"network_mbps"`
	HeartbeatAt  time.Time `json:"heartbeat_at"`
}

type Allocation struct {
	ID         string     `json:"id"`
	ProviderID string     `json:"provider_id"`
	CPUCores   int        `json:"cpu_cores"`
	RAMMB      int        `json:"ram_mb"`
	GPUUnits   int        `json:"gpu_units"`
	StartedAt  time.Time  `json:"started_at"`
	ReleasedAt *time.Time `json:"released_at,omitempty"`
}

type ResourceStats struct {
	TotalAllocations    int `json:"total_allocations"`
	RunningAllocations  int `json:"running_allocations"`
	ReleasedAllocations int `json:"released_allocations"`
	CPUCoresRunning     int `json:"cpu_cores_running"`
	RAMMBRunning        int `json:"ram_mb_running"`
	GPUUnitsRunning     int `json:"gpu_units_running"`
}
