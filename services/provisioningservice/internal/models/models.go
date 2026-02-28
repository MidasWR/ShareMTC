package models

import "time"

type Action string

const (
	ActionCreate Action = "create"
	ActionDelete Action = "delete"
)

type ResourceType string

const (
	ResourceTypeVM  ResourceType = "vm"
	ResourceTypePod ResourceType = "pod"
)

type Provider string

const (
	ProviderDigitalOcean Provider = "digitalocean"
	ProviderRunPod       Provider = "runpod"
)

type JobStatus string

const (
	JobStatusPending   JobStatus = "pending"
	JobStatusRunning   JobStatus = "running"
	JobStatusSucceeded JobStatus = "succeeded"
	JobStatusFailed    JobStatus = "failed"
)

type ProvisionVMRequest struct {
	RequestID        string         `json:"request_id"`
	TraceID          string         `json:"trace_id"`
	UserID           string         `json:"user_id"`
	ProviderID       string         `json:"provider_id"`
	Name             string         `json:"name"`
	Region           string         `json:"region"`
	Size             string         `json:"size"`
	Image            string         `json:"image"`
	ExpiresAt        time.Time      `json:"expires_at"`
	SSHKeyFingerprints []string     `json:"ssh_key_fingerprints"`
	UserData         string         `json:"user_data"`
	Metadata         map[string]any `json:"metadata"`
}

type ProvisionPodRequest struct {
	RequestID  string         `json:"request_id"`
	TraceID    string         `json:"trace_id"`
	UserID     string         `json:"user_id"`
	ProviderID string         `json:"provider_id"`
	Name       string         `json:"name"`
	ImageName  string         `json:"image_name"`
	GPUTypeID  string         `json:"gpu_type_id"`
	GPUCount   int            `json:"gpu_count"`
	CPUCount   int            `json:"cpu_count"`
	MemoryGB   int            `json:"memory_gb"`
	ExpiresAt  time.Time      `json:"expires_at"`
	Metadata   map[string]any `json:"metadata"`
}

type DeleteResourceRequest struct {
	RequestID   string       `json:"request_id"`
	TraceID     string       `json:"trace_id"`
	Provider    Provider     `json:"provider"`
	ResourceType ResourceType `json:"resource_type"`
	ExternalID  string       `json:"external_id"`
}

type ProvisionResult struct {
	JobID       string       `json:"job_id"`
	RequestID   string       `json:"request_id"`
	TraceID     string       `json:"trace_id"`
	Provider    Provider     `json:"provider"`
	ResourceType ResourceType `json:"resource_type"`
	ExternalID  string       `json:"external_id"`
	PublicIP    string       `json:"public_ip,omitempty"`
	Status      JobStatus    `json:"status"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
	Error       string       `json:"error,omitempty"`
}

type Job struct {
	ID             string
	RequestID      string
	TraceID        string
	Action         Action
	ResourceType   ResourceType
	Provider       Provider
	Status         JobStatus
	ExternalID     string
	Error          string
	ResponseJSON   string
	Attempts       int
	NextRetryAt    time.Time
	ExpiresAt      time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type ExternalResource struct {
	ID             string
	Provider       Provider
	ResourceType   ResourceType
	ProviderID     string
	UserID         string
	InternalID     string
	ExternalID     string
	Status         string
	PublicIP       string
	ExpiresAt      time.Time
	DeletedAt      *time.Time
	LastError      string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}
