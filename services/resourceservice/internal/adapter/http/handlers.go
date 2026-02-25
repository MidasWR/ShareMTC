package httpadapter

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/models"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/service"
	sdkauth "github.com/MidasWR/ShareMTC/services/sdk/auth"
	"github.com/MidasWR/ShareMTC/services/sdk/httpx"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc *service.ResourceService
}

func NewHandler(svc *service.ResourceService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Heartbeat(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req models.HostResource
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := validateAgentIdentity(claims, req.ProviderID); err != nil {
		httpx.Error(w, http.StatusForbidden, err.Error())
		return
	}
	if err := h.svc.UpdateHeartbeat(r.Context(), req); err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) Allocate(w http.ResponseWriter, r *http.Request) {
	var req models.Allocation
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	alloc, err := h.svc.Allocate(r.Context(), req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, alloc)
}

func (h *Handler) Release(w http.ResponseWriter, r *http.Request) {
	allocationID := chi.URLParam(r, "allocationID")
	if allocationID == "" {
		httpx.Error(w, http.StatusBadRequest, "allocationID is required")
		return
	}
	if err := h.svc.Release(r.Context(), allocationID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "released"})
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	providerID := r.URL.Query().Get("provider_id")
	if providerID == "" {
		httpx.Error(w, http.StatusBadRequest, "provider_id is required")
		return
	}
	list, err := h.svc.List(r.Context(), providerID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, list)
}

func (h *Handler) Health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) ListAll(w http.ResponseWriter, r *http.Request) {
	limit := intQuery(r, "limit", 50)
	offset := intQuery(r, "offset", 0)
	items, err := h.svc.ListAll(r.Context(), limit, offset)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

func (h *Handler) Stats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.Stats(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, stats)
}

func (h *Handler) UpsertVMTemplate(w http.ResponseWriter, r *http.Request) {
	var req models.VMTemplate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	item, err := h.svc.UpsertVMTemplate(r.Context(), req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, item)
}

func (h *Handler) ListVMTemplates(w http.ResponseWriter, r *http.Request) {
	filter := readCatalogFilter(r)
	items, err := h.svc.ListVMTemplates(r.Context(), filter)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

func (h *Handler) CreateVM(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req models.VM
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	req.UserID = claims.UserID
	vm, err := h.svc.CreateVM(r.Context(), req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, vm)
}

func (h *Handler) ListVMs(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	filter := readCatalogFilter(r)
	items, err := h.svc.ListVMs(r.Context(), claims.UserID, filter)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

func (h *Handler) GetVM(w http.ResponseWriter, r *http.Request) {
	vmID := chi.URLParam(r, "vmID")
	if vmID == "" {
		httpx.Error(w, http.StatusBadRequest, "vmID is required")
		return
	}
	item, err := h.svc.GetVM(r.Context(), vmID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, item)
}

func (h *Handler) StartVM(w http.ResponseWriter, r *http.Request) {
	vmID := chi.URLParam(r, "vmID")
	item, err := h.svc.StartVM(r.Context(), vmID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, item)
}

func (h *Handler) StopVM(w http.ResponseWriter, r *http.Request) {
	vmID := chi.URLParam(r, "vmID")
	item, err := h.svc.StopVM(r.Context(), vmID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, item)
}

func (h *Handler) RebootVM(w http.ResponseWriter, r *http.Request) {
	vmID := chi.URLParam(r, "vmID")
	item, err := h.svc.RebootVM(r.Context(), vmID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, item)
}

func (h *Handler) TerminateVM(w http.ResponseWriter, r *http.Request) {
	vmID := chi.URLParam(r, "vmID")
	item, err := h.svc.TerminateVM(r.Context(), vmID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, item)
}

type shareRequest struct {
	VMID        string                   `json:"vm_id"`
	PodCode     string                   `json:"pod_code"`
	SharedWith  []string                 `json:"shared_with"`
	AccessLevel models.SharedAccessLevel `json:"access_level"`
}

type sharedInventoryReserveRequest struct {
	OfferID  string `json:"offer_id"`
	Quantity int    `json:"quantity"`
}

type sharedInventoryUpsertRequest struct {
	ID           string  `json:"id"`
	ProviderID   string  `json:"provider_id"`
	ResourceType string  `json:"resource_type"`
	Title        string  `json:"title"`
	Description  string  `json:"description"`
	CPUCores     int     `json:"cpu_cores"`
	RAMMB        int     `json:"ram_mb"`
	GPUUnits     int     `json:"gpu_units"`
	NetworkMbps  int     `json:"network_mbps"`
	Quantity     int     `json:"quantity"`
	AvailableQty int     `json:"available_qty"`
	PriceHourly  float64 `json:"price_hourly_usd"`
	Status       string  `json:"status"`
}

type agentLogRequest struct {
	ProviderID string `json:"provider_id"`
	ResourceID string `json:"resource_id"`
	Level      string `json:"level"`
	Message    string `json:"message"`
	Source     string `json:"source"`
}

func (h *Handler) ShareVM(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req shareRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	item, err := h.svc.ShareVM(r.Context(), models.SharedVM{
		VMID:        req.VMID,
		OwnerUserID: claims.UserID,
		SharedWith:  req.SharedWith,
		AccessLevel: req.AccessLevel,
	})
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, item)
}

func (h *Handler) ListSharedVMs(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	items, err := h.svc.ListSharedVMs(r.Context(), claims.UserID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

func (h *Handler) SharePod(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req shareRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	item, err := h.svc.SharePod(r.Context(), models.SharedPod{
		PodCode:     req.PodCode,
		OwnerUserID: claims.UserID,
		SharedWith:  req.SharedWith,
		AccessLevel: req.AccessLevel,
	})
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, item)
}

func (h *Handler) ListSharedPods(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	items, err := h.svc.ListSharedPods(r.Context(), claims.UserID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

func (h *Handler) UpsertSharedInventoryOffer(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req sharedInventoryUpsertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	item, err := h.svc.UpsertSharedInventoryOffer(r.Context(), models.SharedInventoryOffer{
		ID:           req.ID,
		ProviderID:   req.ProviderID,
		ResourceType: req.ResourceType,
		Title:        req.Title,
		Description:  req.Description,
		CPUCores:     req.CPUCores,
		RAMMB:        req.RAMMB,
		GPUUnits:     req.GPUUnits,
		NetworkMbps:  req.NetworkMbps,
		Quantity:     req.Quantity,
		AvailableQty: req.AvailableQty,
		PriceHourly:  req.PriceHourly,
		Status:       models.SharedInventoryStatus(req.Status),
		CreatedBy:    claims.UserID,
	})
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, item)
}

func (h *Handler) ListSharedInventoryOffers(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	providerID := strings.TrimSpace(r.URL.Query().Get("provider_id"))
	items, err := h.svc.ListSharedInventoryOffers(r.Context(), status, providerID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

func (h *Handler) ReserveSharedInventoryOffer(w http.ResponseWriter, r *http.Request) {
	var req sharedInventoryReserveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	item, err := h.svc.ReserveSharedInventoryOffer(r.Context(), req.OfferID, req.Quantity)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, item)
}

func (h *Handler) RecordHealthCheck(w http.ResponseWriter, r *http.Request) {
	var req models.HealthCheck
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	item, err := h.svc.RecordHealthCheck(r.Context(), req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, item)
}

func (h *Handler) ListHealthChecks(w http.ResponseWriter, r *http.Request) {
	resourceType := r.URL.Query().Get("resource_type")
	resourceID := r.URL.Query().Get("resource_id")
	limit := intQuery(r, "limit", 100)
	items, err := h.svc.ListHealthChecks(r.Context(), resourceType, resourceID, limit)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

func (h *Handler) RecordMetric(w http.ResponseWriter, r *http.Request) {
	var req models.MetricPoint
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	item, err := h.svc.RecordMetric(r.Context(), req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, item)
}

func (h *Handler) ListMetrics(w http.ResponseWriter, r *http.Request) {
	resourceType := r.URL.Query().Get("resource_type")
	resourceID := r.URL.Query().Get("resource_id")
	metricType := r.URL.Query().Get("metric_type")
	limit := intQuery(r, "limit", 500)
	from := parseTimeQuery(r.URL.Query().Get("from"))
	to := parseTimeQuery(r.URL.Query().Get("to"))
	items, err := h.svc.ListMetrics(r.Context(), resourceType, resourceID, metricType, from, to, limit)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

func (h *Handler) MetricSummaries(w http.ResponseWriter, r *http.Request) {
	limit := intQuery(r, "limit", 100)
	items, err := h.svc.MetricSummaries(r.Context(), limit)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

func (h *Handler) RecordAgentLog(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req agentLogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := validateAgentIdentity(claims, req.ProviderID); err != nil {
		httpx.Error(w, http.StatusForbidden, err.Error())
		return
	}
	item, err := h.svc.RecordAgentLog(r.Context(), models.AgentLog{
		ProviderID: req.ProviderID,
		ResourceID: req.ResourceID,
		Level:      models.AgentLogLevel(req.Level),
		Message:    req.Message,
		Source:     req.Source,
	})
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, item)
}

func (h *Handler) ListAgentLogs(w http.ResponseWriter, r *http.Request) {
	providerID := strings.TrimSpace(r.URL.Query().Get("provider_id"))
	resourceID := strings.TrimSpace(r.URL.Query().Get("resource_id"))
	level := strings.TrimSpace(r.URL.Query().Get("level"))
	limit := intQuery(r, "limit", 200)
	items, err := h.svc.ListAgentLogs(r.Context(), providerID, resourceID, level, limit)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

func (h *Handler) CreateKubernetesCluster(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req models.KubernetesCluster
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	req.UserID = claims.UserID
	item, err := h.svc.CreateKubernetesCluster(r.Context(), req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, item)
}

func (h *Handler) ListKubernetesClusters(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	items, err := h.svc.ListKubernetesClusters(r.Context(), claims.UserID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

func (h *Handler) RefreshKubernetesCluster(w http.ResponseWriter, r *http.Request) {
	clusterID := chi.URLParam(r, "clusterID")
	item, err := h.svc.RefreshKubernetesCluster(r.Context(), clusterID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, item)
}

func (h *Handler) DeleteKubernetesCluster(w http.ResponseWriter, r *http.Request) {
	clusterID := chi.URLParam(r, "clusterID")
	if err := h.svc.DeleteKubernetesCluster(r.Context(), clusterID); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func intQuery(r *http.Request, key string, fallback int) int {
	raw := strings.TrimSpace(r.URL.Query().Get(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

func parseTimeQuery(raw string) time.Time {
	if strings.TrimSpace(raw) == "" {
		return time.Time{}
	}
	parsed, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return time.Time{}
	}
	return parsed
}

func readCatalogFilter(r *http.Request) models.CatalogFilter {
	return models.CatalogFilter{
		Search:                    strings.TrimSpace(r.URL.Query().Get("search")),
		Region:                    strings.TrimSpace(r.URL.Query().Get("region")),
		CloudType:                 strings.TrimSpace(r.URL.Query().Get("cloud_type")),
		AvailabilityTier:          strings.TrimSpace(r.URL.Query().Get("availability_tier")),
		Status:                    strings.TrimSpace(r.URL.Query().Get("status")),
		SortBy:                    strings.TrimSpace(r.URL.Query().Get("sort_by")),
		NetworkVolumeSupported:    strings.TrimSpace(r.URL.Query().Get("network_volume_supported")),
		GlobalNetworkingSupported: strings.TrimSpace(r.URL.Query().Get("global_networking_supported")),
		MinVRAMGB:                 intQuery(r, "min_vram_gb", 0),
	}
}

func validateAgentIdentity(claims *sdkauth.Claims, providerID string) error {
	if strings.TrimSpace(providerID) == "" {
		return errors.New("provider_id is required")
	}
	switch claims.Role {
	case "admin", "super-admin", "ops-admin":
		return nil
	case "agent":
		if claims.UserID == providerID {
			return nil
		}
		return errors.New("agent token does not match provider_id")
	default:
		return errors.New("insufficient role for agent telemetry")
	}
}
