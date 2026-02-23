package service

import (
	"context"
	"errors"

	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/models"
)

type Repository interface {
	UpsertHostResource(ctx context.Context, resource models.HostResource) error
	GetHostResource(ctx context.Context, providerID string) (models.HostResource, error)
	CreateAllocation(ctx context.Context, alloc models.Allocation) (models.Allocation, error)
	ReleaseAllocation(ctx context.Context, allocationID string) error
	ListAllocations(ctx context.Context, providerID string) ([]models.Allocation, error)
	ListAllAllocations(ctx context.Context, limit int, offset int) ([]models.Allocation, error)
	Stats(ctx context.Context) (models.ResourceStats, error)
}

type CGroupApplier interface {
	Apply(providerID string, cpuCores int, ramMB int, gpuUnits int) error
	Release(allocationID string) error
}

type ResourceService struct {
	repo    Repository
	cgroups CGroupApplier
}

func NewResourceService(repo Repository, cgroups CGroupApplier) *ResourceService {
	return &ResourceService{repo: repo, cgroups: cgroups}
}

func (s *ResourceService) UpdateHeartbeat(ctx context.Context, resource models.HostResource) error {
	return s.repo.UpsertHostResource(ctx, resource)
}

func (s *ResourceService) Allocate(ctx context.Context, alloc models.Allocation) (models.Allocation, error) {
	host, err := s.repo.GetHostResource(ctx, alloc.ProviderID)
	if err != nil {
		return models.Allocation{}, err
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
