package httpadapter

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/models"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/service"
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
	var req models.HostResource
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
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
	limit := 50
	offset := 0
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if raw := r.URL.Query().Get("offset"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed >= 0 {
			offset = parsed
		}
	}
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
