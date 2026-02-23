package httpadapter

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/MidasWR/ShareMTC/services/billingservice/internal/models"
	"github.com/MidasWR/ShareMTC/services/billingservice/internal/service"
	"github.com/MidasWR/ShareMTC/services/sdk/httpx"
)

type Handler struct {
	svc *service.BillingService
}

func NewHandler(svc *service.BillingService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) CreatePlan(w http.ResponseWriter, r *http.Request) {
	var req models.Plan
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	plan, err := h.svc.CreatePlan(r.Context(), req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, plan)
}

func (h *Handler) ProcessUsage(w http.ResponseWriter, r *http.Request) {
	var req models.UsageRecord
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	accrual, err := h.svc.ProcessUsage(r.Context(), req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, accrual)
}

func (h *Handler) ListAccruals(w http.ResponseWriter, r *http.Request) {
	providerID := r.URL.Query().Get("provider_id")
	if providerID == "" {
		httpx.Error(w, http.StatusBadRequest, "provider_id is required")
		return
	}
	accruals, err := h.svc.ListAccruals(r.Context(), providerID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, accruals)
}

func (h *Handler) Health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) ListAllAccruals(w http.ResponseWriter, r *http.Request) {
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
	rows, err := h.svc.ListAllAccruals(r.Context(), limit, offset)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, rows)
}

func (h *Handler) Stats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.Stats(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, stats)
}
