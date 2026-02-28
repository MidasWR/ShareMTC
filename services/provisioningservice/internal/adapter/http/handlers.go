package httpadapter

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/MidasWR/ShareMTC/services/provisioningservice/internal/models"
	"github.com/MidasWR/ShareMTC/services/provisioningservice/internal/service"
	"github.com/MidasWR/ShareMTC/services/sdk/httpx"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc          *service.ProvisioningService
	serviceToken string
}

func NewHandler(svc *service.ProvisioningService, serviceToken string) *Handler {
	return &Handler{svc: svc, serviceToken: strings.TrimSpace(serviceToken)}
}

func (h *Handler) ServiceAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if h.serviceToken == "" {
			httpx.Error(w, http.StatusInternalServerError, "service token is not configured")
			return
		}
		token := strings.TrimSpace(r.Header.Get("X-Service-Token"))
		if token == "" || token != h.serviceToken {
			httpx.Error(w, http.StatusUnauthorized, "invalid service token")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (h *Handler) Health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) CreateVM(w http.ResponseWriter, r *http.Request) {
	var req models.ProvisionVMRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	result, err := h.svc.CreateVM(r.Context(), req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, result)
}

func (h *Handler) CreatePod(w http.ResponseWriter, r *http.Request) {
	var req models.ProvisionPodRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	result, err := h.svc.CreatePod(r.Context(), req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, result)
}

func (h *Handler) DeleteVM(w http.ResponseWriter, r *http.Request) {
	externalID := strings.TrimSpace(chi.URLParam(r, "id"))
	if externalID == "" {
		httpx.Error(w, http.StatusBadRequest, "id is required")
		return
	}
	var req models.DeleteResourceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	req.ExternalID = externalID
	req.Provider = models.ProviderDigitalOcean
	req.ResourceType = models.ResourceTypeVM
	result, err := h.svc.DeleteResource(r.Context(), req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, result)
}

func (h *Handler) DeletePod(w http.ResponseWriter, r *http.Request) {
	externalID := strings.TrimSpace(chi.URLParam(r, "id"))
	if externalID == "" {
		httpx.Error(w, http.StatusBadRequest, "id is required")
		return
	}
	var req models.DeleteResourceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	req.ExternalID = externalID
	req.Provider = models.ProviderRunPod
	req.ResourceType = models.ResourceTypePod
	result, err := h.svc.DeleteResource(r.Context(), req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, result)
}

func (h *Handler) GetJob(w http.ResponseWriter, r *http.Request) {
	jobID := strings.TrimSpace(chi.URLParam(r, "jobID"))
	if jobID == "" {
		httpx.Error(w, http.StatusBadRequest, "jobID is required")
		return
	}
	result, err := h.svc.GetJob(r.Context(), jobID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, result)
}
