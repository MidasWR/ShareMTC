package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/MidasWR/ShareMTC/services/provisioningservice/internal/adapter/providers/digitalocean"
	"github.com/MidasWR/ShareMTC/services/provisioningservice/internal/adapter/providers/runpod"
	"github.com/MidasWR/ShareMTC/services/provisioningservice/internal/models"
)

type Repository interface {
	GetJobByRequestID(ctx context.Context, requestID string) (models.Job, error)
	GetJobByID(ctx context.Context, jobID string) (models.Job, error)
	CreateJob(ctx context.Context, item models.Job) (models.Job, error)
	MarkJobSucceeded(ctx context.Context, jobID string, externalID string, response any) error
	MarkJobFailed(ctx context.Context, jobID string, nextRetryAt time.Time, errorMessage string) error
	UpsertExternalResource(ctx context.Context, item models.ExternalResource) (models.ExternalResource, error)
	LockExpiredResources(ctx context.Context, now time.Time, limit int) ([]models.ExternalResource, error)
	MarkExternalResourceDeleted(ctx context.Context, id string) error
	MarkExternalResourceDeleteError(ctx context.Context, id string, errorMessage string) error
}

type DigitalOceanProvider interface {
	CreateVM(ctx context.Context, req digitalocean.CreateVMRequest) (digitalocean.CreateVMResult, error)
	DeleteVM(ctx context.Context, externalID string) error
}

type RunPodProvider interface {
	CreatePod(ctx context.Context, req runpod.CreatePodRequest) (runpod.CreatePodResult, error)
	DeletePod(ctx context.Context, podID string) error
}

type ProvisioningService struct {
	repo           Repository
	doProvider     DigitalOceanProvider
	runPodProvider RunPodProvider
	maxDeleteRetry int
}

func NewProvisioningService(repo Repository, doProvider DigitalOceanProvider, runPodProvider RunPodProvider, maxDeleteRetry int) *ProvisioningService {
	if maxDeleteRetry <= 0 {
		maxDeleteRetry = 6
	}
	return &ProvisioningService{
		repo:           repo,
		doProvider:     doProvider,
		runPodProvider: runPodProvider,
		maxDeleteRetry: maxDeleteRetry,
	}
}

func (s *ProvisioningService) CreateVM(ctx context.Context, req models.ProvisionVMRequest) (models.ProvisionResult, error) {
	if req.RequestID == "" || req.UserID == "" || req.ProviderID == "" || req.Name == "" || req.Region == "" || req.Size == "" || req.Image == "" {
		return models.ProvisionResult{}, errors.New("request_id, user_id, provider_id, name, region, size and image are required")
	}
	if !req.ExpiresAt.After(time.Now().UTC()) {
		return models.ProvisionResult{}, errors.New("expires_at must be in the future")
	}
	if existing, err := s.repo.GetJobByRequestID(ctx, req.RequestID); err == nil {
		return s.jobToResult(existing), nil
	}

	job, err := s.repo.CreateJob(ctx, models.Job{
		RequestID:    req.RequestID,
		TraceID:      req.TraceID,
		Action:       models.ActionCreate,
		ResourceType: models.ResourceTypeVM,
		Provider:     models.ProviderDigitalOcean,
		Status:       models.JobStatusRunning,
		ExpiresAt:    req.ExpiresAt,
	})
	if err != nil {
		return models.ProvisionResult{}, err
	}

	provisioned, err := s.doProvider.CreateVM(ctx, digitalocean.CreateVMRequest{
		Name:               req.Name,
		Region:             req.Region,
		Size:               req.Size,
		Image:              req.Image,
		SSHKeyFingerprints: req.SSHKeyFingerprints,
		UserData:           req.UserData,
	})
	if err != nil {
		nextRetry := time.Now().UTC().Add(30 * time.Second)
		_ = s.repo.MarkJobFailed(ctx, job.ID, nextRetry, err.Error())
		return models.ProvisionResult{}, err
	}

	response := map[string]any{"external_id": provisioned.ID, "public_ip": provisioned.PublicIP}
	if err := s.repo.MarkJobSucceeded(ctx, job.ID, provisioned.ID, response); err != nil {
		return models.ProvisionResult{}, err
	}
	if _, err := s.repo.UpsertExternalResource(ctx, models.ExternalResource{
		Provider:     models.ProviderDigitalOcean,
		ResourceType: models.ResourceTypeVM,
		ProviderID:   req.ProviderID,
		UserID:       req.UserID,
		ExternalID:   provisioned.ID,
		Status:       "running",
		PublicIP:     provisioned.PublicIP,
		ExpiresAt:    req.ExpiresAt,
	}); err != nil {
		return models.ProvisionResult{}, err
	}
	job.Status = models.JobStatusSucceeded
	job.ExternalID = provisioned.ID
	return models.ProvisionResult{
		JobID:        job.ID,
		RequestID:    job.RequestID,
		TraceID:      job.TraceID,
		Provider:     models.ProviderDigitalOcean,
		ResourceType: models.ResourceTypeVM,
		ExternalID:   provisioned.ID,
		PublicIP:     provisioned.PublicIP,
		Status:       models.JobStatusSucceeded,
		CreatedAt:    job.CreatedAt,
		UpdatedAt:    time.Now().UTC(),
	}, nil
}

func (s *ProvisioningService) CreatePod(ctx context.Context, req models.ProvisionPodRequest) (models.ProvisionResult, error) {
	if req.RequestID == "" || req.UserID == "" || req.ProviderID == "" || req.Name == "" || req.ImageName == "" || req.GPUTypeID == "" {
		return models.ProvisionResult{}, errors.New("request_id, user_id, provider_id, name, image_name and gpu_type_id are required")
	}
	if req.GPUCount <= 0 || req.CPUCount <= 0 || req.MemoryGB <= 0 {
		return models.ProvisionResult{}, errors.New("gpu_count, cpu_count and memory_gb must be positive")
	}
	if !req.ExpiresAt.After(time.Now().UTC()) {
		return models.ProvisionResult{}, errors.New("expires_at must be in the future")
	}
	if existing, err := s.repo.GetJobByRequestID(ctx, req.RequestID); err == nil {
		return s.jobToResult(existing), nil
	}
	job, err := s.repo.CreateJob(ctx, models.Job{
		RequestID:    req.RequestID,
		TraceID:      req.TraceID,
		Action:       models.ActionCreate,
		ResourceType: models.ResourceTypePod,
		Provider:     models.ProviderRunPod,
		Status:       models.JobStatusRunning,
		ExpiresAt:    req.ExpiresAt,
	})
	if err != nil {
		return models.ProvisionResult{}, err
	}

	provisioned, err := s.runPodProvider.CreatePod(ctx, runpod.CreatePodRequest{
		Name:      req.Name,
		ImageName: req.ImageName,
		GPUTypeID: req.GPUTypeID,
		GPUCount:  req.GPUCount,
		CPUCount:  req.CPUCount,
		MemoryGB:  req.MemoryGB,
	})
	if err != nil {
		nextRetry := time.Now().UTC().Add(30 * time.Second)
		_ = s.repo.MarkJobFailed(ctx, job.ID, nextRetry, err.Error())
		return models.ProvisionResult{}, err
	}
	response := map[string]any{"external_id": provisioned.ID}
	if err := s.repo.MarkJobSucceeded(ctx, job.ID, provisioned.ID, response); err != nil {
		return models.ProvisionResult{}, err
	}
	if _, err := s.repo.UpsertExternalResource(ctx, models.ExternalResource{
		Provider:     models.ProviderRunPod,
		ResourceType: models.ResourceTypePod,
		ProviderID:   req.ProviderID,
		UserID:       req.UserID,
		ExternalID:   provisioned.ID,
		Status:       "active",
		ExpiresAt:    req.ExpiresAt,
	}); err != nil {
		return models.ProvisionResult{}, err
	}
	return models.ProvisionResult{
		JobID:        job.ID,
		RequestID:    job.RequestID,
		TraceID:      job.TraceID,
		Provider:     models.ProviderRunPod,
		ResourceType: models.ResourceTypePod,
		ExternalID:   provisioned.ID,
		Status:       models.JobStatusSucceeded,
		CreatedAt:    job.CreatedAt,
		UpdatedAt:    time.Now().UTC(),
	}, nil
}

func (s *ProvisioningService) DeleteResource(ctx context.Context, req models.DeleteResourceRequest) (models.ProvisionResult, error) {
	if req.RequestID == "" || req.ExternalID == "" {
		return models.ProvisionResult{}, errors.New("request_id and external_id are required")
	}
	if existing, err := s.repo.GetJobByRequestID(ctx, req.RequestID); err == nil {
		return s.jobToResult(existing), nil
	}
	job, err := s.repo.CreateJob(ctx, models.Job{
		RequestID:    req.RequestID,
		TraceID:      req.TraceID,
		Action:       models.ActionDelete,
		ResourceType: req.ResourceType,
		Provider:     req.Provider,
		Status:       models.JobStatusRunning,
		ExternalID:   req.ExternalID,
	})
	if err != nil {
		return models.ProvisionResult{}, err
	}
	if err := s.deleteExternal(ctx, req.Provider, req.ResourceType, req.ExternalID); err != nil {
		nextRetry := time.Now().UTC().Add(30 * time.Second)
		_ = s.repo.MarkJobFailed(ctx, job.ID, nextRetry, err.Error())
		return models.ProvisionResult{}, err
	}
	if err := s.repo.MarkJobSucceeded(ctx, job.ID, req.ExternalID, map[string]any{"deleted": true}); err != nil {
		return models.ProvisionResult{}, err
	}
	return models.ProvisionResult{
		JobID:        job.ID,
		RequestID:    job.RequestID,
		TraceID:      job.TraceID,
		Provider:     req.Provider,
		ResourceType: req.ResourceType,
		ExternalID:   req.ExternalID,
		Status:       models.JobStatusSucceeded,
		CreatedAt:    job.CreatedAt,
		UpdatedAt:    time.Now().UTC(),
	}, nil
}

func (s *ProvisioningService) GetJob(ctx context.Context, jobID string) (models.ProvisionResult, error) {
	job, err := s.repo.GetJobByID(ctx, jobID)
	if err != nil {
		return models.ProvisionResult{}, err
	}
	return s.jobToResult(job), nil
}

func (s *ProvisioningService) RunTTLPass(ctx context.Context) error {
	expired, err := s.repo.LockExpiredResources(ctx, time.Now().UTC(), 100)
	if err != nil {
		return err
	}
	for _, item := range expired {
		if err := s.deleteExternal(ctx, item.Provider, item.ResourceType, item.ExternalID); err != nil {
			_ = s.repo.MarkExternalResourceDeleteError(ctx, item.ID, err.Error())
			continue
		}
		if err := s.repo.MarkExternalResourceDeleted(ctx, item.ID); err != nil {
			return err
		}
	}
	return nil
}

func (s *ProvisioningService) deleteExternal(ctx context.Context, provider models.Provider, resourceType models.ResourceType, externalID string) error {
	switch {
	case provider == models.ProviderDigitalOcean && resourceType == models.ResourceTypeVM:
		return s.doProvider.DeleteVM(ctx, externalID)
	case provider == models.ProviderRunPod && resourceType == models.ResourceTypePod:
		return s.runPodProvider.DeletePod(ctx, externalID)
	default:
		return fmt.Errorf("unsupported provider/resource combination %s/%s", provider, resourceType)
	}
}

func (s *ProvisioningService) jobToResult(job models.Job) models.ProvisionResult {
	result := models.ProvisionResult{
		JobID:        job.ID,
		RequestID:    job.RequestID,
		TraceID:      job.TraceID,
		Provider:     job.Provider,
		ResourceType: job.ResourceType,
		ExternalID:   job.ExternalID,
		Status:       job.Status,
		CreatedAt:    job.CreatedAt,
		UpdatedAt:    job.UpdatedAt,
		Error:        job.Error,
	}
	if job.ResponseJSON != "" {
		var payload map[string]any
		if err := json.Unmarshal([]byte(job.ResponseJSON), &payload); err == nil {
			publicIP, _ := payload["public_ip"].(string)
			result.PublicIP = publicIP
		}
	}
	return result
}
