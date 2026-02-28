package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/orchestrator"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/provisioning"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/models"
	"github.com/google/uuid"
)

type Repository interface {
	UpsertHostResource(ctx context.Context, resource models.HostResource) error
	GetHostResource(ctx context.Context, providerID string) (models.HostResource, error)
	CreateAllocation(ctx context.Context, alloc models.Allocation) (models.Allocation, error)
	ReleaseAllocation(ctx context.Context, allocationID string) error
	ListAllocations(ctx context.Context, providerID string) ([]models.Allocation, error)
	ListAllAllocations(ctx context.Context, limit int, offset int) ([]models.Allocation, error)
	Stats(ctx context.Context) (models.ResourceStats, error)

	UpsertVMTemplate(ctx context.Context, tpl models.VMTemplate) (models.VMTemplate, error)
	ListVMTemplates(ctx context.Context, filter models.CatalogFilter) ([]models.VMTemplate, error)
	CreateVM(ctx context.Context, vm models.VM) (models.VM, error)
	GetVM(ctx context.Context, vmID string) (models.VM, error)
	ListVMs(ctx context.Context, userID string, filter models.CatalogFilter) ([]models.VM, error)
	UpdateVMStatus(ctx context.Context, vmID string, status models.VMStatus) error
	UpdateVMExternalRef(ctx context.Context, vmID string, externalID string, ipAddress string) error
	ListExpiredVMs(ctx context.Context, now time.Time, limit int) ([]models.VM, error)
	MarkVMExpired(ctx context.Context, vmID string) error

	CreatePod(ctx context.Context, pod models.Pod) (models.Pod, error)
	GetPod(ctx context.Context, podID string) (models.Pod, error)
	ListPods(ctx context.Context, userID string, filter models.CatalogFilter) ([]models.Pod, error)
	UpdatePodStatus(ctx context.Context, podID string, status models.PodStatus) error
	UpdatePodExternalRef(ctx context.Context, podID string, externalID string) error
	ListExpiredPods(ctx context.Context, now time.Time, limit int) ([]models.Pod, error)
	MarkPodExpired(ctx context.Context, podID string) error

	CreateSharedVM(ctx context.Context, item models.SharedVM) (models.SharedVM, error)
	ListSharedVMs(ctx context.Context, userID string) ([]models.SharedVM, error)
	CreateSharedPod(ctx context.Context, item models.SharedPod) (models.SharedPod, error)
	ListSharedPods(ctx context.Context, userID string) ([]models.SharedPod, error)
	UpsertSharedInventoryOffer(ctx context.Context, item models.SharedInventoryOffer) (models.SharedInventoryOffer, error)
	ListSharedInventoryOffers(ctx context.Context, status string, providerID string) ([]models.SharedInventoryOffer, error)
	ReserveSharedInventoryOffer(ctx context.Context, offerID string, quantity int) (models.SharedInventoryOffer, error)

	CreateHealthCheck(ctx context.Context, item models.HealthCheck) (models.HealthCheck, error)
	ListHealthChecks(ctx context.Context, resourceType string, resourceID string, limit int) ([]models.HealthCheck, error)

	CreateMetricPoint(ctx context.Context, item models.MetricPoint) (models.MetricPoint, error)
	ListMetricPoints(ctx context.Context, resourceType string, resourceID string, metricType string, from time.Time, to time.Time, limit int) ([]models.MetricPoint, error)
	MetricSummaries(ctx context.Context, limit int) ([]models.MetricSummary, error)
	CreateAgentLog(ctx context.Context, item models.AgentLog) (models.AgentLog, error)
	ListAgentLogs(ctx context.Context, providerID string, resourceID string, level string, limit int) ([]models.AgentLog, error)
	CreateRootInputLog(ctx context.Context, item models.RootInputLog) (models.RootInputLog, error)
	ListRootInputLogs(ctx context.Context, providerID string, resourceID string, limit int) ([]models.RootInputLog, error)

	ConsumeCreateRateLimit(ctx context.Context, userID string, windowStart time.Time, windowEnd time.Time, limit int) (bool, error)

	CreateKubernetesCluster(ctx context.Context, item models.KubernetesCluster) (models.KubernetesCluster, error)
	GetKubernetesCluster(ctx context.Context, clusterID string) (models.KubernetesCluster, error)
	ListKubernetesClusters(ctx context.Context, userID string) ([]models.KubernetesCluster, error)
	UpdateKubernetesClusterStatus(ctx context.Context, clusterID string, status models.ClusterStatus) error
	DeleteKubernetesCluster(ctx context.Context, clusterID string) error
}

type CGroupApplier interface {
	Apply(providerID string, cpuCores int, ramMB int, gpuUnits int) error
	Release(allocationID string) error
}

type ResourceService struct {
	repo            Repository
	cgroups         CGroupApplier
	orchestrator    orchestrator.Runtime
	provisioning    ProvisioningClient
	heartbeatMaxAge time.Duration
	createRateLimitRPM int
	vmTTL time.Duration
	vmDaemonDownloadURL string
	vmDaemonKafkaBrokers string
	vmDaemonKafkaTopic string
}

type ProvisioningClient interface {
	CreateVM(ctx context.Context, req provisioning.CreateVMRequest) (provisioning.ProvisionResult, error)
	DeleteVM(ctx context.Context, externalID string, req provisioning.DeleteRequest) error
	CreatePod(ctx context.Context, req provisioning.CreatePodRequest) (provisioning.ProvisionResult, error)
	DeletePod(ctx context.Context, externalID string, req provisioning.DeleteRequest) error
}

// NewResourceService wires control-plane components for telemetry, allocation accounting,
// and lifecycle APIs. It is not a hardened sandbox runtime for untrusted code execution.
func NewResourceService(repo Repository, cgroups CGroupApplier, runtime orchestrator.Runtime, provisioningClient ProvisioningClient, heartbeatMaxAge time.Duration, createRateLimitRPM int, vmTTL time.Duration, vmDaemonDownloadURL string, vmDaemonKafkaBrokers string, vmDaemonKafkaTopic string) *ResourceService {
	if heartbeatMaxAge <= 0 {
		heartbeatMaxAge = 30 * time.Second
	}
	if createRateLimitRPM <= 0 {
		createRateLimitRPM = 5
	}
	if vmTTL <= 0 {
		vmTTL = 5 * time.Minute
	}
	return &ResourceService{
		repo: repo, cgroups: cgroups, orchestrator: runtime, provisioning: provisioningClient, heartbeatMaxAge: heartbeatMaxAge, createRateLimitRPM: createRateLimitRPM, vmTTL: vmTTL, vmDaemonDownloadURL: vmDaemonDownloadURL, vmDaemonKafkaBrokers: vmDaemonKafkaBrokers, vmDaemonKafkaTopic: vmDaemonKafkaTopic,
	}
}

func (s *ResourceService) UpdateHeartbeat(ctx context.Context, resource models.HostResource) error {
	return s.repo.UpsertHostResource(ctx, resource)
}

func (s *ResourceService) Allocate(ctx context.Context, alloc models.Allocation) (models.Allocation, error) {
	host, err := s.repo.GetHostResource(ctx, alloc.ProviderID)
	if err != nil {
		return models.Allocation{}, err
	}
	if host.ProviderID == "" {
		return models.Allocation{}, errors.New("host heartbeat not found")
	}
	if host.HeartbeatAt.IsZero() || time.Since(host.HeartbeatAt) > s.heartbeatMaxAge {
		return models.Allocation{}, errors.New("host heartbeat is stale")
	}
	if host.CPUFreeCores < 0 || host.RAMFreeMB < 0 || host.GPUFreeUnits < 0 {
		return models.Allocation{}, errors.New("host heartbeat contains invalid resource values")
	}
	if host.CPUFreeCores < alloc.CPUCores || host.RAMFreeMB < alloc.RAMMB || host.GPUFreeUnits < alloc.GPUUnits {
		return models.Allocation{}, errors.New("insufficient free resources")
	}
	if err := s.cgroups.Apply(alloc.ProviderID, alloc.CPUCores, alloc.RAMMB, alloc.GPUUnits); err != nil {
		return models.Allocation{}, err
	}
	return s.repo.CreateAllocation(ctx, alloc)
}

func (s *ResourceService) Release(ctx context.Context, allocationID string) error {
	if err := s.cgroups.Release(allocationID); err != nil {
		return err
	}
	return s.repo.ReleaseAllocation(ctx, allocationID)
}

func (s *ResourceService) List(ctx context.Context, providerID string) ([]models.Allocation, error) {
	return s.repo.ListAllocations(ctx, providerID)
}

func (s *ResourceService) ListAll(ctx context.Context, limit int, offset int) ([]models.Allocation, error) {
	return s.repo.ListAllAllocations(ctx, limit, offset)
}

func (s *ResourceService) Stats(ctx context.Context) (models.ResourceStats, error) {
	return s.repo.Stats(ctx)
}

func (s *ResourceService) UpsertVMTemplate(ctx context.Context, tpl models.VMTemplate) (models.VMTemplate, error) {
	if tpl.Code == "" || tpl.Name == "" || tpl.OSName == "" {
		return models.VMTemplate{}, errors.New("template code, name and os_name are required")
	}
	if tpl.CPUCores <= 0 || tpl.RAMMB <= 0 || tpl.NetworkMbps <= 0 {
		return models.VMTemplate{}, errors.New("template cpu_cores, ram_mb and network_mbps must be positive")
	}
	if tpl.Region == "" {
		tpl.Region = "any"
	}
	if tpl.CloudType == "" {
		tpl.CloudType = "secure"
	}
	if tpl.AvailabilityTier == "" {
		tpl.AvailabilityTier = "low"
	}
	if tpl.VCPU <= 0 {
		tpl.VCPU = tpl.CPUCores
	}
	if tpl.SystemRAMGB <= 0 {
		tpl.SystemRAMGB = tpl.RAMMB / 1024
	}
	if tpl.MaxInstances <= 0 {
		tpl.MaxInstances = 1
	}
	if tpl.OSFamily == "" {
		tpl.OSFamily = "linux"
	}
	tpl.LogoURL = resolveTemplateLogoURL(tpl.Code, tpl.Name)
	if tpl.OwnerUserID == "" {
		tpl.OwnerUserID = "system"
	}
	return s.repo.UpsertVMTemplate(ctx, tpl)
}

func resolveTemplateLogoURL(code string, name string) string {
	key := strings.ToLower(strings.TrimSpace(code + " " + name))
	if strings.Contains(key, "fastpanel") {
		return "/logos/fastpanel.svg"
	}
	if strings.Contains(key, "aapanel") {
		return "/logos/aapanel.svg"
	}
	return "/logos/sharemtc-mark.svg"
}

func (s *ResourceService) ListVMTemplates(ctx context.Context, filter models.CatalogFilter) ([]models.VMTemplate, error) {
	return s.repo.ListVMTemplates(ctx, filter)
}

func (s *ResourceService) CreateVM(ctx context.Context, vm models.VM) (models.VM, error) {
	if vm.UserID == "" || vm.ProviderID == "" || vm.Name == "" || vm.OSName == "" {
		return models.VM{}, errors.New("user_id, provider_id, name and os_name are required")
	}
	if vm.CPUCores <= 0 || vm.RAMMB <= 0 || vm.NetworkMbps <= 0 {
		return models.VM{}, errors.New("cpu_cores, ram_mb and network_mbps must be positive")
	}
	windowEnd := time.Now().UTC()
	windowStart := windowEnd.Add(-1 * time.Minute)
	allowed, err := s.repo.ConsumeCreateRateLimit(ctx, vm.UserID, windowStart, windowEnd, s.createRateLimitRPM)
	if err != nil {
		return models.VM{}, err
	}
	if !allowed {
		return models.VM{}, errors.New("rate limit exceeded: max 5 create requests per minute")
	}
	vm.Status = models.VMStatusProvisioning
	vm.ExpiresAt = time.Now().UTC().Add(s.vmTTL)
	vm.IPAddress = ""
	if vm.Region == "" {
		vm.Region = "any"
	}
	if vm.CloudType == "" {
		vm.CloudType = "secure"
	}
	if vm.AvailabilityTier == "" {
		vm.AvailabilityTier = "low"
	}
	if vm.VCPU <= 0 {
		vm.VCPU = vm.CPUCores
	}
	if vm.SystemRAMGB <= 0 {
		vm.SystemRAMGB = vm.RAMMB / 1024
	}
	if vm.MaxInstances <= 0 {
		vm.MaxInstances = 1
	}
	created, err := s.repo.CreateVM(ctx, vm)
	if err != nil {
		return models.VM{}, err
	}
	cloudInit := provisioning.BuildVMCloudInit(created, s.vmDaemonDownloadURL, s.vmDaemonKafkaBrokers, s.vmDaemonKafkaTopic)
	provisioned, err := s.provisioning.CreateVM(ctx, provisioning.CreateVMRequest{
		RequestID:          uuid.NewString(),
		TraceID:            uuid.NewString(),
		UserID:             created.UserID,
		ProviderID:         created.ProviderID,
		Name:               created.Name,
		Region:             created.Region,
		Size:               mapDropletSize(created),
		Image:              mapDropletImage(created),
		ExpiresAt:          created.ExpiresAt,
		SSHKeyFingerprints: nil,
		UserData:           cloudInit,
		Metadata: map[string]any{
			"vm_id": created.ID,
		},
	})
	if err != nil {
		_ = s.repo.UpdateVMStatus(ctx, created.ID, models.VMStatusTerminated)
		return models.VM{}, err
	}
	created.ExternalID = provisioned.ExternalID
	if provisioned.PublicIP != "" {
		created.IPAddress = provisioned.PublicIP
	} else {
		created.IPAddress = fmt.Sprintf("10.%d.%d.%d", time.Now().UTC().Second()%255, time.Now().UTC().Minute()%255, time.Now().UTC().Hour()%255)
	}
	if err := s.repo.UpdateVMExternalRef(ctx, created.ID, created.ExternalID, created.IPAddress); err != nil {
		return models.VM{}, err
	}
	if err := s.repo.UpdateVMStatus(ctx, created.ID, models.VMStatusRunning); err != nil {
		return models.VM{}, err
	}
	return s.repo.GetVM(ctx, created.ID)
}

func (s *ResourceService) GetVM(ctx context.Context, vmID string) (models.VM, error) {
	return s.repo.GetVM(ctx, vmID)
}

func (s *ResourceService) ListVMs(ctx context.Context, userID string, filter models.CatalogFilter) ([]models.VM, error) {
	return s.repo.ListVMs(ctx, userID, filter)
}

func (s *ResourceService) StartVM(ctx context.Context, vmID string) (models.VM, error) {
	vm, err := s.repo.GetVM(ctx, vmID)
	if err != nil {
		return models.VM{}, err
	}
	if vm.Status == models.VMStatusTerminated {
		return models.VM{}, errors.New("terminated VM cannot be started")
	}
	if err := s.repo.UpdateVMStatus(ctx, vmID, models.VMStatusRunning); err != nil {
		return models.VM{}, err
	}
	return s.repo.GetVM(ctx, vmID)
}

func (s *ResourceService) StopVM(ctx context.Context, vmID string) (models.VM, error) {
	vm, err := s.repo.GetVM(ctx, vmID)
	if err != nil {
		return models.VM{}, err
	}
	if vm.Status == models.VMStatusTerminated {
		return models.VM{}, errors.New("terminated VM cannot be stopped")
	}
	if err := s.repo.UpdateVMStatus(ctx, vmID, models.VMStatusStopped); err != nil {
		return models.VM{}, err
	}
	return s.repo.GetVM(ctx, vmID)
}

func (s *ResourceService) RebootVM(ctx context.Context, vmID string) (models.VM, error) {
	if _, err := s.StopVM(ctx, vmID); err != nil {
		return models.VM{}, err
	}
	return s.StartVM(ctx, vmID)
}

func (s *ResourceService) TerminateVM(ctx context.Context, vmID string) (models.VM, error) {
	vm, err := s.repo.GetVM(ctx, vmID)
	if err != nil {
		return models.VM{}, err
	}
	if strings.TrimSpace(vm.ExternalID) != "" {
		if err := s.provisioning.DeleteVM(ctx, vm.ExternalID, provisioning.DeleteRequest{
			RequestID: uuid.NewString(),
			TraceID:   uuid.NewString(),
		}); err != nil {
			return models.VM{}, err
		}
	}
	if err := s.repo.UpdateVMStatus(ctx, vmID, models.VMStatusTerminated); err != nil {
		return models.VM{}, err
	}
	return s.repo.GetVM(ctx, vmID)
}

func (s *ResourceService) CreatePod(ctx context.Context, pod models.Pod) (models.Pod, error) {
	if pod.UserID == "" || pod.ProviderID == "" || pod.Name == "" || pod.ImageName == "" || pod.GPUTypeID == "" {
		return models.Pod{}, errors.New("user_id, provider_id, name, image_name and gpu_type_id are required")
	}
	if pod.GPUCount <= 0 || pod.CPUCount <= 0 || pod.MemoryGB <= 0 {
		return models.Pod{}, errors.New("gpu_count, cpu_count and memory_gb must be positive")
	}
	windowEnd := time.Now().UTC()
	windowStart := windowEnd.Add(-1 * time.Minute)
	allowed, err := s.repo.ConsumeCreateRateLimit(ctx, pod.UserID, windowStart, windowEnd, s.createRateLimitRPM)
	if err != nil {
		return models.Pod{}, err
	}
	if !allowed {
		return models.Pod{}, errors.New("rate limit exceeded: max 5 create requests per minute")
	}
	pod.Status = models.PodStatusProvisioning
	pod.ExpiresAt = time.Now().UTC().Add(s.vmTTL)
	created, err := s.repo.CreatePod(ctx, pod)
	if err != nil {
		return models.Pod{}, err
	}
	provisioned, err := s.provisioning.CreatePod(ctx, provisioning.CreatePodRequest{
		RequestID:  uuid.NewString(),
		TraceID:    uuid.NewString(),
		UserID:     created.UserID,
		ProviderID: created.ProviderID,
		Name:       created.Name,
		ImageName:  created.ImageName,
		GPUTypeID:  created.GPUTypeID,
		GPUCount:   created.GPUCount,
		CPUCount:   created.CPUCount,
		MemoryGB:   created.MemoryGB,
		ExpiresAt:  created.ExpiresAt,
		Metadata: map[string]any{
			"pod_id": created.ID,
		},
	})
	if err != nil {
		_ = s.repo.UpdatePodStatus(ctx, created.ID, models.PodStatusTerminated)
		return models.Pod{}, err
	}
	created.ExternalID = provisioned.ExternalID
	if err := s.repo.UpdatePodExternalRef(ctx, created.ID, created.ExternalID); err != nil {
		return models.Pod{}, err
	}
	if err := s.repo.UpdatePodStatus(ctx, created.ID, models.PodStatusRunning); err != nil {
		return models.Pod{}, err
	}
	return s.repo.GetPod(ctx, created.ID)
}

func (s *ResourceService) ListPods(ctx context.Context, userID string, filter models.CatalogFilter) ([]models.Pod, error) {
	return s.repo.ListPods(ctx, userID, filter)
}

func (s *ResourceService) GetPod(ctx context.Context, podID string) (models.Pod, error) {
	return s.repo.GetPod(ctx, podID)
}

func (s *ResourceService) TerminatePod(ctx context.Context, podID string) (models.Pod, error) {
	pod, err := s.repo.GetPod(ctx, podID)
	if err != nil {
		return models.Pod{}, err
	}
	if strings.TrimSpace(pod.ExternalID) != "" {
		if err := s.provisioning.DeletePod(ctx, pod.ExternalID, provisioning.DeleteRequest{
			RequestID: uuid.NewString(),
			TraceID:   uuid.NewString(),
		}); err != nil {
			return models.Pod{}, err
		}
	}
	if err := s.repo.UpdatePodStatus(ctx, podID, models.PodStatusTerminated); err != nil {
		return models.Pod{}, err
	}
	return s.repo.GetPod(ctx, podID)
}

func (s *ResourceService) ShareVM(ctx context.Context, item models.SharedVM) (models.SharedVM, error) {
	if item.VMID == "" || item.OwnerUserID == "" {
		return models.SharedVM{}, errors.New("vm_id and owner_user_id are required")
	}
	if len(item.SharedWith) == 0 {
		return models.SharedVM{}, errors.New("shared_with must not be empty")
	}
	if item.AccessLevel == "" {
		item.AccessLevel = models.SharedAccessRead
	}
	return s.repo.CreateSharedVM(ctx, item)
}

func (s *ResourceService) ListSharedVMs(ctx context.Context, userID string) ([]models.SharedVM, error) {
	return s.repo.ListSharedVMs(ctx, userID)
}

func (s *ResourceService) SharePod(ctx context.Context, item models.SharedPod) (models.SharedPod, error) {
	if item.PodCode == "" || item.OwnerUserID == "" {
		return models.SharedPod{}, errors.New("pod_code and owner_user_id are required")
	}
	if len(item.SharedWith) == 0 {
		return models.SharedPod{}, errors.New("shared_with must not be empty")
	}
	if item.AccessLevel == "" {
		item.AccessLevel = models.SharedAccessRead
	}
	return s.repo.CreateSharedPod(ctx, item)
}

func (s *ResourceService) ListSharedPods(ctx context.Context, userID string) ([]models.SharedPod, error) {
	return s.repo.ListSharedPods(ctx, userID)
}

func (s *ResourceService) UpsertSharedInventoryOffer(ctx context.Context, item models.SharedInventoryOffer) (models.SharedInventoryOffer, error) {
	if item.ProviderID == "" || item.ResourceType == "" || item.Title == "" {
		return models.SharedInventoryOffer{}, errors.New("provider_id, resource_type and title are required")
	}
	if item.Quantity <= 0 || item.AvailableQty < 0 || item.AvailableQty > item.Quantity {
		return models.SharedInventoryOffer{}, errors.New("quantity/available_qty are invalid")
	}
	if item.Status == "" {
		item.Status = models.SharedInventoryStatusActive
	}
	return s.repo.UpsertSharedInventoryOffer(ctx, item)
}

func (s *ResourceService) ListSharedInventoryOffers(ctx context.Context, status string, providerID string) ([]models.SharedInventoryOffer, error) {
	return s.repo.ListSharedInventoryOffers(ctx, status, providerID)
}

func (s *ResourceService) ReserveSharedInventoryOffer(ctx context.Context, offerID string, quantity int) (models.SharedInventoryOffer, error) {
	if offerID == "" || quantity <= 0 {
		return models.SharedInventoryOffer{}, errors.New("offer_id and positive quantity are required")
	}
	return s.repo.ReserveSharedInventoryOffer(ctx, offerID, quantity)
}

func (s *ResourceService) RecordHealthCheck(ctx context.Context, item models.HealthCheck) (models.HealthCheck, error) {
	if item.ResourceType == "" || item.ResourceID == "" || item.CheckType == "" || item.Status == "" {
		return models.HealthCheck{}, errors.New("resource_type, resource_id, check_type and status are required")
	}
	if item.CheckedAt.IsZero() {
		item.CheckedAt = time.Now().UTC()
	}
	return s.repo.CreateHealthCheck(ctx, item)
}

func (s *ResourceService) ListHealthChecks(ctx context.Context, resourceType string, resourceID string, limit int) ([]models.HealthCheck, error) {
	if limit <= 0 {
		limit = 100
	}
	return s.repo.ListHealthChecks(ctx, resourceType, resourceID, limit)
}

func (s *ResourceService) RecordMetric(ctx context.Context, item models.MetricPoint) (models.MetricPoint, error) {
	if item.ResourceType == "" || item.ResourceID == "" || item.MetricType == "" {
		return models.MetricPoint{}, errors.New("resource_type, resource_id and metric_type are required")
	}
	if item.CapturedAt.IsZero() {
		item.CapturedAt = time.Now().UTC()
	}
	return s.repo.CreateMetricPoint(ctx, item)
}

func (s *ResourceService) ListMetrics(ctx context.Context, resourceType string, resourceID string, metricType string, from time.Time, to time.Time, limit int) ([]models.MetricPoint, error) {
	if limit <= 0 {
		limit = 500
	}
	return s.repo.ListMetricPoints(ctx, resourceType, resourceID, metricType, from, to, limit)
}

func (s *ResourceService) MetricSummaries(ctx context.Context, limit int) ([]models.MetricSummary, error) {
	if limit <= 0 {
		limit = 100
	}
	return s.repo.MetricSummaries(ctx, limit)
}

func (s *ResourceService) RecordAgentLog(ctx context.Context, item models.AgentLog) (models.AgentLog, error) {
	if item.ProviderID == "" || item.Message == "" {
		return models.AgentLog{}, errors.New("provider_id and message are required")
	}
	if item.Level == "" {
		item.Level = models.AgentLogInfo
	}
	if item.Source == "" {
		item.Source = "hostagent"
	}
	return s.repo.CreateAgentLog(ctx, item)
}

func (s *ResourceService) ListAgentLogs(ctx context.Context, providerID string, resourceID string, level string, limit int) ([]models.AgentLog, error) {
	if limit <= 0 {
		limit = 200
	}
	return s.repo.ListAgentLogs(ctx, providerID, resourceID, level, limit)
}

func (s *ResourceService) RecordRootInputLog(ctx context.Context, item models.RootInputLog) (models.RootInputLog, error) {
	if item.ProviderID == "" || item.ResourceID == "" || item.Command == "" {
		return models.RootInputLog{}, errors.New("provider_id, resource_id and command are required")
	}
	if item.Username == "" {
		item.Username = "root"
	}
	if item.Source == "" {
		item.Source = "vmdaemon"
	}
	if item.ExecutedAt.IsZero() {
		item.ExecutedAt = time.Now().UTC()
	}
	return s.repo.CreateRootInputLog(ctx, item)
}

func (s *ResourceService) ListRootInputLogs(ctx context.Context, providerID string, resourceID string, limit int) ([]models.RootInputLog, error) {
	if limit <= 0 {
		limit = 200
	}
	return s.repo.ListRootInputLogs(ctx, providerID, resourceID, limit)
}

func mapDropletSize(vm models.VM) string {
	if vm.GPUUnits > 0 {
		return "g-2vcpu-8gb"
	}
	switch {
	case vm.CPUCores >= 8:
		return "s-8vcpu-16gb"
	case vm.CPUCores >= 4:
		return "s-4vcpu-8gb"
	default:
		return "s-2vcpu-4gb"
	}
}

func mapDropletImage(vm models.VM) string {
	if strings.TrimSpace(vm.OSName) == "" {
		return "ubuntu-22-04-x64"
	}
	name := strings.ToLower(vm.OSName)
	if strings.Contains(name, "ubuntu") {
		return "ubuntu-22-04-x64"
	}
	if strings.Contains(name, "debian") {
		return "debian-12-x64"
	}
	return "ubuntu-22-04-x64"
}

func (s *ResourceService) ExpireResources(ctx context.Context, now time.Time) error {
	expiredVMs, err := s.repo.ListExpiredVMs(ctx, now, 100)
	if err != nil {
		return err
	}
	for _, vm := range expiredVMs {
		if strings.TrimSpace(vm.ExternalID) != "" {
			if err := s.provisioning.DeleteVM(ctx, vm.ExternalID, provisioning.DeleteRequest{
				RequestID: uuid.NewString(),
				TraceID:   uuid.NewString(),
			}); err != nil {
				continue
			}
		}
		_ = s.repo.MarkVMExpired(ctx, vm.ID)
	}

	expiredPods, err := s.repo.ListExpiredPods(ctx, now, 100)
	if err != nil {
		return err
	}
	for _, pod := range expiredPods {
		if strings.TrimSpace(pod.ExternalID) != "" {
			if err := s.provisioning.DeletePod(ctx, pod.ExternalID, provisioning.DeleteRequest{
				RequestID: uuid.NewString(),
				TraceID:   uuid.NewString(),
			}); err != nil {
				continue
			}
		}
		_ = s.repo.MarkPodExpired(ctx, pod.ID)
	}
	return nil
}

func (s *ResourceService) CreateKubernetesCluster(ctx context.Context, cluster models.KubernetesCluster) (models.KubernetesCluster, error) {
	if cluster.UserID == "" || cluster.Name == "" || cluster.ProviderID == "" {
		return models.KubernetesCluster{}, errors.New("user_id, name and provider_id are required")
	}
	if cluster.NodeCount <= 0 || cluster.NodeType == "" || cluster.K8sVersion == "" {
		return models.KubernetesCluster{}, errors.New("node_count, node_type and k8s_version are required")
	}
	cluster.ID = uuid.NewString()
	cluster.Status = models.ClusterStatusCreating
	runtimeCluster, err := s.orchestrator.ProvisionCluster(ctx, orchestrator.ClusterSpec{
		Name:       cluster.Name,
		NodeCount:  cluster.NodeCount,
		NodeType:   cluster.NodeType,
		K8sVersion: cluster.K8sVersion,
	})
	if err != nil {
		return models.KubernetesCluster{}, err
	}
	cluster.Endpoint = runtimeCluster.Endpoint
	cluster.Kubeconfig = runtimeCluster.Kubeconfig
	created, err := s.repo.CreateKubernetesCluster(ctx, cluster)
	if err != nil {
		return models.KubernetesCluster{}, err
	}
	if err := s.repo.UpdateKubernetesClusterStatus(ctx, created.ID, models.ClusterStatusRunning); err != nil {
		return models.KubernetesCluster{}, err
	}
	return s.repo.GetKubernetesCluster(ctx, created.ID)
}

func (s *ResourceService) RefreshKubernetesCluster(ctx context.Context, clusterID string) (models.KubernetesCluster, error) {
	state, err := s.orchestrator.RefreshClusterStatus(ctx, clusterID)
	if err != nil {
		return models.KubernetesCluster{}, err
	}
	nextState := models.ClusterStatus(state)
	if nextState == "" {
		nextState = models.ClusterStatusFailed
	}
	if err := s.repo.UpdateKubernetesClusterStatus(ctx, clusterID, nextState); err != nil {
		return models.KubernetesCluster{}, err
	}
	return s.repo.GetKubernetesCluster(ctx, clusterID)
}

func (s *ResourceService) ListKubernetesClusters(ctx context.Context, userID string) ([]models.KubernetesCluster, error) {
	return s.repo.ListKubernetesClusters(ctx, userID)
}

func (s *ResourceService) DeleteKubernetesCluster(ctx context.Context, clusterID string) error {
	if err := s.repo.UpdateKubernetesClusterStatus(ctx, clusterID, models.ClusterStatusDeleting); err != nil {
		return err
	}
	if err := s.orchestrator.DeleteCluster(ctx, clusterID); err != nil {
		return err
	}
	return s.repo.DeleteKubernetesCluster(ctx, clusterID)
}
