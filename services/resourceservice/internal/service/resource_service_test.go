package service

import (
	"context"
	"testing"
	"time"

	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/models"
)

type repoStub struct {
	resource models.HostResource
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

type cgStub struct{}

func (cgStub) Apply(_ string, _ int, _ int, _ int) error { return nil }
func (cgStub) Release(_ string) error                    { return nil }

func TestAllocateChecksFreeResources(t *testing.T) {
	repo := &repoStub{
		resource: models.HostResource{
			ProviderID:   "p1",
			CPUFreeCores: 4,
			RAMFreeMB:    4096,
			GPUFreeUnits: 1,
		},
	}
	svc := NewResourceService(repo, cgStub{})

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
