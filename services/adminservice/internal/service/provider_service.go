package service

import (
	"context"

	"github.com/MidasWR/ShareMTC/services/adminservice/internal/models"
)

type ProviderRepository interface {
	Create(context.Context, models.Provider) (models.Provider, error)
	List(context.Context) ([]models.Provider, error)
	UpdateOnlineStatus(ctx context.Context, providerID string, online bool) error
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
