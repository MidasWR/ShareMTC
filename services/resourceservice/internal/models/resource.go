package models

import "time"

type HostResource struct {
	ID               string    `json:"id"`
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

type VMStatus string

const (
	VMStatusProvisioning VMStatus = "provisioning"
	VMStatusRunning      VMStatus = "running"
	VMStatusStopped      VMStatus = "stopped"
	VMStatusTerminated   VMStatus = "terminated"
)

type SharedAccessLevel string

const (
	SharedAccessRead  SharedAccessLevel = "read"
	SharedAccessWrite SharedAccessLevel = "write"
	SharedAccessAdmin SharedAccessLevel = "admin"
)

type HealthStatus string

const (
	HealthStatusOK       HealthStatus = "ok"
	HealthStatusWarning  HealthStatus = "warning"
	HealthStatusCritical HealthStatus = "critical"
)

type ClusterStatus string

const (
	ClusterStatusCreating  ClusterStatus = "creating"
	ClusterStatusRunning   ClusterStatus = "running"
	ClusterStatusDeleting  ClusterStatus = "deleting"
	ClusterStatusDeleted   ClusterStatus = "deleted"
	ClusterStatusFailed    ClusterStatus = "failed"
	ClusterStatusSuspended ClusterStatus = "suspended"
)

type VM struct {
	ID                      string    `json:"id"`
	UserID                  string    `json:"user_id"`
	ProviderID              string    `json:"provider_id"`
	Name                    string    `json:"name"`
	Template                string    `json:"template"`
	OSName                  string    `json:"os_name"`
	IPAddress               string    `json:"ip_address"`
	Region                  string    `json:"region"`
	CloudType               string    `json:"cloud_type"`
	CPUCores                int       `json:"cpu_cores"`
	VCPU                    int       `json:"vcpu"`
	RAMMB                   int       `json:"ram_mb"`
	SystemRAMGB             int       `json:"system_ram_gb"`
	GPUUnits                int       `json:"gpu_units"`
	VRAMGB                  int       `json:"vram_gb"`
	NetworkMbps             int       `json:"network_mbps"`
	NetworkVolumeSupported  bool      `json:"network_volume_supported"`
	GlobalNetworkingSupport bool      `json:"global_networking_supported"`
	AvailabilityTier        string    `json:"availability_tier"`
	MaxInstances            int       `json:"max_instances"`
	Status                  VMStatus  `json:"status"`
	CreatedAt               time.Time `json:"created_at"`
	UpdatedAt               time.Time `json:"updated_at"`
}

type VMTemplate struct {
	ID                      string    `json:"id"`
	Code                    string    `json:"code"`
	Name                    string    `json:"name"`
	Description             string    `json:"description"`
	LogoURL                 string    `json:"logo_url"`
	EnvJSON                 string    `json:"env_json"`
	SSHPublicKey            string    `json:"ssh_public_key"`
	BootstrapScript         string    `json:"bootstrap_script"`
	OSFamily                string    `json:"os_family"`
	IsPublic                bool      `json:"is_public"`
	OwnerUserID             string    `json:"owner_user_id"`
	OSName                  string    `json:"os_name"`
	Region                  string    `json:"region"`
	CloudType               string    `json:"cloud_type"`
	CPUCores                int       `json:"cpu_cores"`
	VCPU                    int       `json:"vcpu"`
	RAMMB                   int       `json:"ram_mb"`
	SystemRAMGB             int       `json:"system_ram_gb"`
	GPUUnits                int       `json:"gpu_units"`
	VRAMGB                  int       `json:"vram_gb"`
	NetworkMbps             int       `json:"network_mbps"`
	NetworkVolumeSupported  bool      `json:"network_volume_supported"`
	GlobalNetworkingSupport bool      `json:"global_networking_supported"`
	AvailabilityTier        string    `json:"availability_tier"`
	MaxInstances            int       `json:"max_instances"`
	CreatedAt               time.Time `json:"created_at"`
}

type SharedInventoryStatus string

const (
	SharedInventoryStatusActive  SharedInventoryStatus = "active"
	SharedInventoryStatusPaused  SharedInventoryStatus = "paused"
	SharedInventoryStatusSoldOut SharedInventoryStatus = "sold_out"
)

type SharedInventoryOffer struct {
	ID           string                `json:"id"`
	ProviderID   string                `json:"provider_id"`
	ResourceType string                `json:"resource_type"`
	Title        string                `json:"title"`
	Description  string                `json:"description"`
	CPUCores     int                   `json:"cpu_cores"`
	RAMMB        int                   `json:"ram_mb"`
	GPUUnits     int                   `json:"gpu_units"`
	NetworkMbps  int                   `json:"network_mbps"`
	Quantity     int                   `json:"quantity"`
	AvailableQty int                   `json:"available_qty"`
	PriceHourly  float64               `json:"price_hourly_usd"`
	Status       SharedInventoryStatus `json:"status"`
	CreatedBy    string                `json:"created_by"`
	CreatedAt    time.Time             `json:"created_at"`
	UpdatedAt    time.Time             `json:"updated_at"`
}

type AgentLogLevel string

const (
	AgentLogInfo  AgentLogLevel = "info"
	AgentLogWarn  AgentLogLevel = "warning"
	AgentLogError AgentLogLevel = "error"
)

type AgentLog struct {
	ID         string        `json:"id"`
	ProviderID string        `json:"provider_id"`
	ResourceID string        `json:"resource_id"`
	Level      AgentLogLevel `json:"level"`
	Message    string        `json:"message"`
	Source     string        `json:"source"`
	CreatedAt  time.Time     `json:"created_at"`
}

type CatalogFilter struct {
	Search                    string `json:"search"`
	Region                    string `json:"region"`
	CloudType                 string `json:"cloud_type"`
	AvailabilityTier          string `json:"availability_tier"`
	Status                    string `json:"status"`
	SortBy                    string `json:"sort_by"`
	NetworkVolumeSupported    string `json:"network_volume_supported"`
	GlobalNetworkingSupported string `json:"global_networking_supported"`
	MinVRAMGB                 int    `json:"min_vram_gb"`
}

type SharedVM struct {
	ID          string            `json:"id"`
	VMID        string            `json:"vm_id"`
	OwnerUserID string            `json:"owner_user_id"`
	SharedWith  []string          `json:"shared_with"`
	AccessLevel SharedAccessLevel `json:"access_level"`
	CreatedAt   time.Time         `json:"created_at"`
}

type SharedPod struct {
	ID          string            `json:"id"`
	PodCode     string            `json:"pod_code"`
	OwnerUserID string            `json:"owner_user_id"`
	SharedWith  []string          `json:"shared_with"`
	AccessLevel SharedAccessLevel `json:"access_level"`
	CreatedAt   time.Time         `json:"created_at"`
}

type HealthCheck struct {
	ID           string       `json:"id"`
	ResourceType string       `json:"resource_type"`
	ResourceID   string       `json:"resource_id"`
	CheckType    string       `json:"check_type"`
	Status       HealthStatus `json:"status"`
	Details      string       `json:"details"`
	CheckedAt    time.Time    `json:"checked_at"`
}

type MetricPoint struct {
	ID           string    `json:"id"`
	ResourceType string    `json:"resource_type"`
	ResourceID   string    `json:"resource_id"`
	MetricType   string    `json:"metric_type"`
	Value        float64   `json:"value"`
	CapturedAt   time.Time `json:"captured_at"`
}

type MetricSummary struct {
	ResourceType string  `json:"resource_type"`
	ResourceID   string  `json:"resource_id"`
	MetricType   string  `json:"metric_type"`
	Samples      int     `json:"samples"`
	MinValue     float64 `json:"min_value"`
	MaxValue     float64 `json:"max_value"`
	AvgValue     float64 `json:"avg_value"`
	LastValue    float64 `json:"last_value"`
}

type KubernetesCluster struct {
	ID         string        `json:"id"`
	UserID     string        `json:"user_id"`
	Name       string        `json:"name"`
	ProviderID string        `json:"provider_id"`
	NodeCount  int           `json:"node_count"`
	NodeType   string        `json:"node_type"`
	K8sVersion string        `json:"k8s_version"`
	Endpoint   string        `json:"endpoint"`
	Kubeconfig string        `json:"kubeconfig,omitempty"`
	Status     ClusterStatus `json:"status"`
	CreatedAt  time.Time     `json:"created_at"`
	UpdatedAt  time.Time     `json:"updated_at"`
}
