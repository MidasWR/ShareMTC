package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/orchestrator"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/models"
)

type repoStub struct {
	resource     models.HostResource
	vm           models.VM
	sharedVMs    []models.SharedVM
	sharedPods   []models.SharedPod
	k8sByID      map[string]models.KubernetesCluster
	templates    []models.VMTemplate
	healthChecks []models.HealthCheck
	metricPoints []models.MetricPoint
	sharedOffers []models.SharedInventoryOffer
	agentLogs    []models.AgentLog
}

func (r *repoStub) UpsertHostResource(_ context.Context, resource models.HostResource) error {
	r.resource = resource
	return nil
}
func (r *repoStub) GetHostResource(_ context.Context, _ string) (models.HostResource, error) {
	return r.resource, nil
}
func (r *repoStub) CreateAllocation(_ context.Context, alloc models.Allocation) (models.Allocation, error) {
	alloc.ID = "a1"
	alloc.StartedAt = time.Now().UTC()
	return alloc, nil
}
func (r *repoStub) ReleaseAllocation(_ context.Context, _ string) error { return nil }
func (r *repoStub) ListAllocations(_ context.Context, _ string) ([]models.Allocation, error) {
	return nil, nil
}
func (r *repoStub) ListAllAllocations(_ context.Context, _ int, _ int) ([]models.Allocation, error) {
	return nil, nil
}
func (r *repoStub) Stats(_ context.Context) (models.ResourceStats, error) {
	return models.ResourceStats{}, nil
}
func (r *repoStub) UpsertVMTemplate(_ context.Context, tpl models.VMTemplate) (models.VMTemplate, error) {
	if tpl.ID == "" {
		tpl.ID = "tpl-1"
	}
	r.templates = append(r.templates, tpl)
	return tpl, nil
}
func (r *repoStub) ListVMTemplates(_ context.Context, _ models.CatalogFilter) ([]models.VMTemplate, error) {
	return r.templates, nil
}
func (r *repoStub) CreateVM(_ context.Context, vm models.VM) (models.VM, error) {
	vm.ID = "vm-1"
	vm.CreatedAt = time.Now().UTC()
	vm.UpdatedAt = vm.CreatedAt
	r.vm = vm
	return vm, nil
}
func (r *repoStub) GetVM(_ context.Context, vmID string) (models.VM, error) {
	if r.vm.ID == "" || vmID != r.vm.ID {
		return models.VM{}, errors.New("not found")
	}
	return r.vm, nil
}
func (r *repoStub) ListVMs(_ context.Context, _ string, _ models.CatalogFilter) ([]models.VM, error) {
	if r.vm.ID == "" {
		return []models.VM{}, nil
	}
	return []models.VM{r.vm}, nil
}
func (r *repoStub) UpdateVMStatus(_ context.Context, vmID string, status models.VMStatus) error {
	if vmID != r.vm.ID {
		return errors.New("not found")
	}
	r.vm.Status = status
	r.vm.UpdatedAt = time.Now().UTC()
	return nil
}
func (r *repoStub) CreateSharedVM(_ context.Context, item models.SharedVM) (models.SharedVM, error) {
	item.ID = "svm-1"
	r.sharedVMs = append(r.sharedVMs, item)
	return item, nil
}
func (r *repoStub) ListSharedVMs(_ context.Context, _ string) ([]models.SharedVM, error) {
	return r.sharedVMs, nil
}
func (r *repoStub) CreateSharedPod(_ context.Context, item models.SharedPod) (models.SharedPod, error) {
	item.ID = "spod-1"
	r.sharedPods = append(r.sharedPods, item)
	return item, nil
}
func (r *repoStub) ListSharedPods(_ context.Context, _ string) ([]models.SharedPod, error) {
	return r.sharedPods, nil
}
func (r *repoStub) UpsertSharedInventoryOffer(_ context.Context, item models.SharedInventoryOffer) (models.SharedInventoryOffer, error) {
	if item.ID == "" {
		item.ID = "offer-1"
	}
	r.sharedOffers = append(r.sharedOffers, item)
	return item, nil
}
func (r *repoStub) ListSharedInventoryOffers(_ context.Context, status string, providerID string) ([]models.SharedInventoryOffer, error) {
	out := make([]models.SharedInventoryOffer, 0)
	for _, item := range r.sharedOffers {
		if status != "" && string(item.Status) != status {
			continue
		}
		if providerID != "" && item.ProviderID != providerID {
			continue
		}
		out = append(out, item)
	}
	return out, nil
}
func (r *repoStub) ReserveSharedInventoryOffer(_ context.Context, offerID string, quantity int) (models.SharedInventoryOffer, error) {
	for i := range r.sharedOffers {
		if r.sharedOffers[i].ID == offerID {
			if r.sharedOffers[i].AvailableQty < quantity {
				return models.SharedInventoryOffer{}, errors.New("insufficient available quantity")
			}
			r.sharedOffers[i].AvailableQty -= quantity
			return r.sharedOffers[i], nil
		}
	}
	return models.SharedInventoryOffer{}, errors.New("not found")
}
func (r *repoStub) CreateHealthCheck(_ context.Context, item models.HealthCheck) (models.HealthCheck, error) {
	item.ID = "health-1"
	r.healthChecks = append(r.healthChecks, item)
	return item, nil
}
func (r *repoStub) ListHealthChecks(_ context.Context, _, _ string, _ int) ([]models.HealthCheck, error) {
	return r.healthChecks, nil
}
func (r *repoStub) CreateMetricPoint(_ context.Context, item models.MetricPoint) (models.MetricPoint, error) {
	item.ID = "metric-1"
	r.metricPoints = append(r.metricPoints, item)
	return item, nil
}
func (r *repoStub) ListMetricPoints(_ context.Context, _, _, _ string, _ time.Time, _ time.Time, _ int) ([]models.MetricPoint, error) {
	return r.metricPoints, nil
}
func (r *repoStub) MetricSummaries(_ context.Context, _ int) ([]models.MetricSummary, error) {
	if len(r.metricPoints) == 0 {
		return []models.MetricSummary{}, nil
	}
	return []models.MetricSummary{{
		ResourceType: r.metricPoints[0].ResourceType,
		ResourceID:   r.metricPoints[0].ResourceID,
		MetricType:   r.metricPoints[0].MetricType,
		Samples:      len(r.metricPoints),
		MinValue:     r.metricPoints[0].Value,
		MaxValue:     r.metricPoints[0].Value,
		AvgValue:     r.metricPoints[0].Value,
		LastValue:    r.metricPoints[len(r.metricPoints)-1].Value,
	}}, nil
}
func (r *repoStub) CreateAgentLog(_ context.Context, item models.AgentLog) (models.AgentLog, error) {
	item.ID = "log-1"
	r.agentLogs = append(r.agentLogs, item)
	return item, nil
}
func (r *repoStub) ListAgentLogs(_ context.Context, providerID string, resourceID string, level string, _ int) ([]models.AgentLog, error) {
	out := make([]models.AgentLog, 0)
	for _, item := range r.agentLogs {
		if providerID != "" && item.ProviderID != providerID {
			continue
		}
		if resourceID != "" && item.ResourceID != resourceID {
			continue
		}
		if level != "" && string(item.Level) != level {
			continue
		}
		out = append(out, item)
	}
	return out, nil
}
func (r *repoStub) CreateKubernetesCluster(_ context.Context, item models.KubernetesCluster) (models.KubernetesCluster, error) {
	item.CreatedAt = time.Now().UTC()
	item.UpdatedAt = item.CreatedAt
	if r.k8sByID == nil {
		r.k8sByID = make(map[string]models.KubernetesCluster)
	}
	r.k8sByID[item.ID] = item
	return item, nil
}
func (r *repoStub) GetKubernetesCluster(_ context.Context, clusterID string) (models.KubernetesCluster, error) {
	item, ok := r.k8sByID[clusterID]
	if !ok {
		return models.KubernetesCluster{}, errors.New("not found")
	}
	return item, nil
}
func (r *repoStub) ListKubernetesClusters(_ context.Context, _ string) ([]models.KubernetesCluster, error) {
	out := make([]models.KubernetesCluster, 0, len(r.k8sByID))
	for _, item := range r.k8sByID {
		out = append(out, item)
	}
	return out, nil
}
func (r *repoStub) UpdateKubernetesClusterStatus(_ context.Context, clusterID string, status models.ClusterStatus) error {
	item, ok := r.k8sByID[clusterID]
	if !ok {
		return errors.New("not found")
	}
	item.Status = status
	item.UpdatedAt = time.Now().UTC()
	r.k8sByID[clusterID] = item
	return nil
}
func (r *repoStub) DeleteKubernetesCluster(_ context.Context, clusterID string) error {
	delete(r.k8sByID, clusterID)
	return nil
}

type cgStub struct{}

func (cgStub) Apply(_ string, _ int, _ int, _ int) error { return nil }
func (cgStub) Release(_ string) error                    { return nil }

type orchestratorStub struct{}

func (orchestratorStub) ProvisionCluster(_ context.Context, spec orchestrator.ClusterSpec) (orchestrator.RuntimeCluster, error) {
	return orchestrator.RuntimeCluster{
		Endpoint:   "https://cluster.local",
		Kubeconfig: "kubeconfig-content-" + spec.Name,
	}, nil
}

func (orchestratorStub) DeleteCluster(_ context.Context, _ string) error { return nil }

func (orchestratorStub) RefreshClusterStatus(_ context.Context, _ string) (string, error) {
	return "running", nil
}

func TestAllocateChecksFreeResources(t *testing.T) {
	repo := &repoStub{
		resource: models.HostResource{
			ProviderID:   "p1",
			CPUFreeCores: 4,
			RAMFreeMB:    4096,
			GPUFreeUnits: 1,
			HeartbeatAt:  time.Now().UTC(),
		},
	}
	svc := NewResourceService(repo, cgStub{}, orchestratorStub{}, 30*time.Second)

	_, err := svc.Allocate(context.Background(), models.Allocation{
		ProviderID: "p1",
		CPUCores:   8,
		RAMMB:      4096,
		GPUUnits:   1,
	})
	if err == nil {
		t.Fatal("expected insufficient resources error")
	}
}

func TestAllocateRejectsStaleHeartbeat(t *testing.T) {
	repo := &repoStub{
		resource: models.HostResource{
			ProviderID:   "p1",
			CPUFreeCores: 8,
			RAMFreeMB:    8192,
			GPUFreeUnits: 1,
			HeartbeatAt:  time.Now().UTC().Add(-2 * time.Minute),
		},
	}
	svc := NewResourceService(repo, cgStub{}, orchestratorStub{}, 30*time.Second)

	_, err := svc.Allocate(context.Background(), models.Allocation{
		ProviderID: "p1",
		CPUCores:   1,
		RAMMB:      512,
		GPUUnits:   0,
	})
	if err == nil {
		t.Fatal("expected stale heartbeat error")
	}
}

func TestAllocateRejectsInvalidHeartbeatValues(t *testing.T) {
	repo := &repoStub{
		resource: models.HostResource{
			ProviderID:   "p1",
			CPUFreeCores: -1,
			RAMFreeMB:    8192,
			GPUFreeUnits: 1,
			HeartbeatAt:  time.Now().UTC(),
		},
	}
	svc := NewResourceService(repo, cgStub{}, orchestratorStub{}, 30*time.Second)

	_, err := svc.Allocate(context.Background(), models.Allocation{
		ProviderID: "p1",
		CPUCores:   1,
		RAMMB:      512,
		GPUUnits:   0,
	})
	if err == nil {
		t.Fatal("expected invalid heartbeat value error")
	}
}

func TestVMLifecycle(t *testing.T) {
	repo := &repoStub{}
	svc := NewResourceService(repo, cgStub{}, orchestratorStub{}, 30*time.Second)
	ctx := context.Background()

	vm, err := svc.CreateVM(ctx, models.VM{
		UserID:      "u1",
		ProviderID:  "p1",
		Name:        "vm-alpha",
		Template:    "fastpanel",
		OSName:      "Ubuntu 22.04",
		CPUCores:    4,
		RAMMB:       8192,
		GPUUnits:    1,
		NetworkMbps: 500,
	})
	if err != nil {
		t.Fatalf("create vm: %v", err)
	}
	if vm.Status != models.VMStatusRunning {
		t.Fatalf("expected running after provision, got %s", vm.Status)
	}
	if vm.Region != "any" {
		t.Fatalf("expected default region any, got %s", vm.Region)
	}
	if vm.CloudType != "secure" {
		t.Fatalf("expected default cloud type secure, got %s", vm.CloudType)
	}
	if vm.AvailabilityTier != "low" {
		t.Fatalf("expected default availability low, got %s", vm.AvailabilityTier)
	}
	if vm.VCPU != vm.CPUCores {
		t.Fatalf("expected vcpu mirror cpu_cores, got %d", vm.VCPU)
	}

	vm, err = svc.StopVM(ctx, vm.ID)
	if err != nil {
		t.Fatalf("stop vm: %v", err)
	}
	if vm.Status != models.VMStatusStopped {
		t.Fatalf("expected stopped, got %s", vm.Status)
	}

	vm, err = svc.StartVM(ctx, vm.ID)
	if err != nil {
		t.Fatalf("start vm: %v", err)
	}
	if vm.Status != models.VMStatusRunning {
		t.Fatalf("expected running, got %s", vm.Status)
	}

	vm, err = svc.TerminateVM(ctx, vm.ID)
	if err != nil {
		t.Fatalf("terminate vm: %v", err)
	}
	if vm.Status != models.VMStatusTerminated {
		t.Fatalf("expected terminated, got %s", vm.Status)
	}
}

func TestCreateKubernetesCluster(t *testing.T) {
	repo := &repoStub{k8sByID: map[string]models.KubernetesCluster{}}
	svc := NewResourceService(repo, cgStub{}, orchestratorStub{}, 30*time.Second)

	cluster, err := svc.CreateKubernetesCluster(context.Background(), models.KubernetesCluster{
		UserID:     "u1",
		Name:       "core-cluster",
		ProviderID: "p1",
		NodeCount:  3,
		NodeType:   "shared-cpu",
		K8sVersion: "1.30",
	})
	if err != nil {
		t.Fatalf("create cluster: %v", err)
	}
	if cluster.Status != models.ClusterStatusRunning {
		t.Fatalf("expected running cluster, got %s", cluster.Status)
	}
	if cluster.Endpoint == "" {
		t.Fatal("expected endpoint to be set")
	}
}

func TestSharedInventoryReserveFlow(t *testing.T) {
	repo := &repoStub{}
	svc := NewResourceService(repo, cgStub{}, orchestratorStub{}, 30*time.Second)

	offer, err := svc.UpsertSharedInventoryOffer(context.Background(), models.SharedInventoryOffer{
		ProviderID:   "p1",
		ResourceType: "gpu",
		Title:        "Shared H100",
		Description:  "8x H100 pool",
		CPUCores:     32,
		RAMMB:        131072,
		GPUUnits:     8,
		NetworkMbps:  20000,
		Quantity:     8,
		AvailableQty: 8,
		PriceHourly:  4.2,
		CreatedBy:    "owner-1",
	})
	if err != nil {
		t.Fatalf("upsert shared offer: %v", err)
	}
	if offer.ID == "" {
		t.Fatal("expected non-empty offer id")
	}

	reserved, err := svc.ReserveSharedInventoryOffer(context.Background(), offer.ID, 3)
	if err != nil {
		t.Fatalf("reserve shared offer: %v", err)
	}
	if reserved.AvailableQty != 5 {
		t.Fatalf("expected available qty 5, got %d", reserved.AvailableQty)
	}
}

func TestAgentLogRecord(t *testing.T) {
	repo := &repoStub{}
	svc := NewResourceService(repo, cgStub{}, orchestratorStub{}, 30*time.Second)

	entry, err := svc.RecordAgentLog(context.Background(), models.AgentLog{
		ProviderID: "p1",
		ResourceID: "vm-1",
		Message:    "heartbeat ok",
	})
	if err != nil {
		t.Fatalf("record agent log: %v", err)
	}
	if entry.Level != models.AgentLogInfo {
		t.Fatalf("expected default level info, got %s", entry.Level)
	}
}
