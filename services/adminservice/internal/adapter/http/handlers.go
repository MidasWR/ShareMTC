package httpadapter

import (
	"encoding/json"
	"net/http"

	"github.com/MidasWR/ShareMTC/services/adminservice/internal/models"
	"github.com/MidasWR/ShareMTC/services/adminservice/internal/service"
	"github.com/MidasWR/ShareMTC/services/sdk/httpx"
)

type Handler struct {
	svc *service.ProviderService
}

func NewHandler(svc *service.ProviderService) *Handler {
	return &Handler{svc: svc}
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

func (h *Handler) Health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
