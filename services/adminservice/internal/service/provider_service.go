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
