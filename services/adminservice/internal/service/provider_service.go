package service

import (
	"context"

	"github.com/MidasWR/ShareMTC/services/adminservice/internal/models"
)

type ProviderRepository interface {
	Create(context.Context, models.Provider) (models.Provider, error)
	List(context.Context) ([]models.Provider, error)
	UpdateOnlineStatus(ctx context.Context, providerID string, online bool) error
	GetByID(ctx context.Context, providerID string) (models.Provider, error)
	Stats(ctx context.Context) (models.AdminStats, error)
	ProviderMetrics(ctx context.Context, providerID string) (models.ProviderMetrics, error)
	ListPodCatalog(ctx context.Context) ([]models.PodCatalogItem, error)
	UpsertPodCatalog(ctx context.Context, item models.PodCatalogItem) (models.PodCatalogItem, error)
	DeletePodCatalog(ctx context.Context, id string) error
	ListPodTemplates(ctx context.Context) ([]models.PodTemplate, error)
	UpsertPodTemplate(ctx context.Context, item models.PodTemplate) (models.PodTemplate, error)
	DeletePodTemplate(ctx context.Context, id string) error
}

type ProviderService struct {
	repo ProviderRepository
}

func NewProviderService(repo ProviderRepository) *ProviderService {
	return &ProviderService{repo: repo}
}

func (s *ProviderService) Create(ctx context.Context, provider models.Provider) (models.Provider, error) {
	return s.repo.Create(ctx, provider)
}

func (s *ProviderService) List(ctx context.Context) ([]models.Provider, error) {
	return s.repo.List(ctx)
}

func (s *ProviderService) UpdateOnlineStatus(ctx context.Context, providerID string, online bool) error {
	return s.repo.UpdateOnlineStatus(ctx, providerID, online)
}

func (s *ProviderService) GetByID(ctx context.Context, providerID string) (models.Provider, error) {
	return s.repo.GetByID(ctx, providerID)
}

func (s *ProviderService) Stats(ctx context.Context) (models.AdminStats, error) {
	return s.repo.Stats(ctx)
}

func (s *ProviderService) ProviderMetrics(ctx context.Context, providerID string) (models.ProviderMetrics, error) {
	return s.repo.ProviderMetrics(ctx, providerID)
}

func (s *ProviderService) ListPodCatalog(ctx context.Context) ([]models.PodCatalogItem, error) {
	return s.repo.ListPodCatalog(ctx)
}

func (s *ProviderService) UpsertPodCatalog(ctx context.Context, item models.PodCatalogItem) (models.PodCatalogItem, error) {
	return s.repo.UpsertPodCatalog(ctx, item)
}

func (s *ProviderService) DeletePodCatalog(ctx context.Context, id string) error {
	return s.repo.DeletePodCatalog(ctx, id)
}

func (s *ProviderService) ListPodTemplates(ctx context.Context) ([]models.PodTemplate, error) {
	return s.repo.ListPodTemplates(ctx)
}

func (s *ProviderService) UpsertPodTemplate(ctx context.Context, item models.PodTemplate) (models.PodTemplate, error) {
	return s.repo.UpsertPodTemplate(ctx, item)
}

func (s *ProviderService) DeletePodTemplate(ctx context.Context, id string) error {
	return s.repo.DeletePodTemplate(ctx, id)
}
