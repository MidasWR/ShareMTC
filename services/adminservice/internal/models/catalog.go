package models

import "time"

type PodTemplate struct {
	ID          string    `json:"id"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	GPUClass    string    `json:"gpu_class"`
	CreatedAt   time.Time `json:"created_at"`
}

type PodCatalogItem struct {
	ID              string    `json:"id"`
	Code            string    `json:"code"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	GPUModel        string    `json:"gpu_model"`
	GPUVRAMGB       int       `json:"gpu_vram_gb"`
	CPUCores        int       `json:"cpu_cores"`
	RAMGB           int       `json:"ram_gb"`
	NetworkMbps     int       `json:"network_mbps"`
	HourlyPriceUSD  float64   `json:"hourly_price_usd"`
	MonthlyPriceUSD float64   `json:"monthly_price_usd"`
	OSName          string    `json:"os_name"`
	LogoURL         string    `json:"logo_url"`
	HostIP          string    `json:"host_ip"`
	SSHUser         string    `json:"ssh_user"`
	SSHAuthRef      string    `json:"ssh_auth_ref"`
	RouteTarget     string    `json:"route_target"`
	TemplateIDs     []string  `json:"template_ids,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

type AgentInstallCommand struct {
	Command      string `json:"command"`
	InstallerURL string `json:"installer_url"`
}
