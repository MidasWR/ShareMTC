package httpadapter

import (
	"encoding/json"
	"net/http"

	"github.com/MidasWR/ShareMTC/services/adminservice/internal/models"
	"github.com/MidasWR/ShareMTC/services/adminservice/internal/service"
	"github.com/MidasWR/ShareMTC/services/sdk/httpx"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc            *service.ProviderService
	installCommand string
}

func NewHandler(svc *service.ProviderService, installCommand string) *Handler {
	return &Handler{svc: svc, installCommand: installCommand}
}

func (h *Handler) CreateProvider(w http.ResponseWriter, r *http.Request) {
	var req models.Provider
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.DisplayName == "" || req.MachineID == "" {
		httpx.Error(w, http.StatusBadRequest, "display_name and machine_id are required")
		return
	}
	created, err := h.svc.Create(r.Context(), req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, created)
}

func (h *Handler) ListProviders(w http.ResponseWriter, r *http.Request) {
	list, err := h.svc.List(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, list)
}

func (h *Handler) GetProvider(w http.ResponseWriter, r *http.Request) {
	providerID := chi.URLParam(r, "providerID")
	if providerID == "" {
		httpx.Error(w, http.StatusBadRequest, "providerID is required")
		return
	}
	item, err := h.svc.GetByID(r.Context(), providerID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, item)
}

func (h *Handler) Stats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.Stats(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, stats)
}

func (h *Handler) ProviderMetrics(w http.ResponseWriter, r *http.Request) {
	providerID := chi.URLParam(r, "providerID")
	if providerID == "" {
		httpx.Error(w, http.StatusBadRequest, "providerID is required")
		return
	}
	metrics, err := h.svc.ProviderMetrics(r.Context(), providerID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, metrics)
}

func (h *Handler) Health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) ListPodCatalog(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListPodCatalog(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

func (h *Handler) UpsertPodCatalog(w http.ResponseWriter, r *http.Request) {
	var req models.PodCatalogItem
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Name == "" || req.GPUModel == "" || req.Code == "" {
		httpx.Error(w, http.StatusBadRequest, "code, name and gpu_model are required")
		return
	}
	item, err := h.svc.UpsertPodCatalog(r.Context(), req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, item)
}

func (h *Handler) DeletePodCatalog(w http.ResponseWriter, r *http.Request) {
	podID := chi.URLParam(r, "podID")
	if podID == "" {
		httpx.Error(w, http.StatusBadRequest, "podID is required")
		return
	}
	if err := h.svc.DeletePodCatalog(r.Context(), podID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *Handler) ListPodTemplates(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListPodTemplates(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

func (h *Handler) UpsertPodTemplate(w http.ResponseWriter, r *http.Request) {
	var req models.PodTemplate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Name == "" || req.Code == "" {
		httpx.Error(w, http.StatusBadRequest, "code and name are required")
		return
	}
	item, err := h.svc.UpsertPodTemplate(r.Context(), req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, item)
}

func (h *Handler) DeletePodTemplate(w http.ResponseWriter, r *http.Request) {
	templateID := chi.URLParam(r, "templateID")
	if templateID == "" {
		httpx.Error(w, http.StatusBadRequest, "templateID is required")
		return
	}
	if err := h.svc.DeletePodTemplate(r.Context(), templateID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *Handler) AgentInstallCommand(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, models.AgentInstallCommand{
		Command: h.installCommand,
	})
}
