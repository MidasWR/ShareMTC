package models

import "time"

type HostMetric struct {
	ProviderID       string    `json:"provider_id"`
	CPUTotalCores    int       `json:"cpu_total_cores"`
	CPUFreeCores     int       `json:"cpu_free_cores"`
	RAMTotalMB       int       `json:"ram_total_mb"`
	RAMFreeMB        int       `json:"ram_free_mb"`
	GPUFreeUnits     int       `json:"gpu_free_units"`
	GPUTotalUnits    int       `json:"gpu_total_units"`
	GPUMemoryTotalMB int       `json:"gpu_memory_total_mb"`
	GPUMemoryUsedMB  int       `json:"gpu_memory_used_mb"`
	DiskTotalMB      int       `json:"disk_total_mb"`
	DiskFreeMB       int       `json:"disk_free_mb"`
	NetworkMbps      int       `json:"network_mbps"`
	LoadAvg1m        float64   `json:"load_avg_1m"`
	UptimeSeconds    int64     `json:"uptime_seconds"`
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

type AgentCommand struct {
	ID            string `json:"id"`
	ProviderID    string `json:"provider_id"`
	ResourceID    string `json:"resource_id"`
	SessionID     string `json:"session_id"`
	Command       string `json:"command"`
	Payload       string `json:"payload"`
	Rows          int    `json:"rows"`
	Cols          int    `json:"cols"`
	Status        string `json:"status"`
	RequestedBy   string `json:"requested_by"`
	ResultMessage string `json:"result_message"`
}
