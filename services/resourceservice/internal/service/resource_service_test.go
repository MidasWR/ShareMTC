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
	resource      models.HostResource
	vm            models.VM
	sharedVMs     []models.SharedVM
	sharedPods    []models.SharedPod
	k8sByID       map[string]models.KubernetesCluster
	templates     []models.VMTemplate
	healthChecks  []models.HealthCheck
	metricPoints  []models.MetricPoint
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
func (r *repoStub) ListVMTemplates(_ context.Context) ([]models.VMTemplate, error) {
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
func (r *repoStub) ListVMs(_ context.Context, _ string, _ string, _ string) ([]models.VM, error) {
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
		},
	}
	svc := NewResourceService(repo, cgStub{}, orchestratorStub{})

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

func TestVMLifecycle(t *testing.T) {
	repo := &repoStub{}
	svc := NewResourceService(repo, cgStub{}, orchestratorStub{})
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
	svc := NewResourceService(repo, cgStub{}, orchestratorStub{})

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
