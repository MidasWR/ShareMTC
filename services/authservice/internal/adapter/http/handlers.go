package httpadapter

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/MidasWR/ShareMTC/services/authservice/internal/models"
	"github.com/MidasWR/ShareMTC/services/authservice/internal/service"
	sdkauth "github.com/MidasWR/ShareMTC/services/sdk/auth"
	"github.com/MidasWR/ShareMTC/services/sdk/httpx"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	googleoauth "google.golang.org/api/oauth2/v2"
	"google.golang.org/api/option"
)

type Handler struct {
	auth  *service.AuthService
	log   zerolog.Logger
	oauth *oauth2.Config
}

func NewHandler(auth *service.AuthService, logger zerolog.Logger, googleClientID string, googleSecret string, redirectURL string) *Handler {
	return &Handler{
		auth: auth,
		log:  logger,
		oauth: &oauth2.Config{
			ClientID:     googleClientID,
			ClientSecret: googleSecret,
			RedirectURL:  redirectURL,
			Scopes:       []string{"email", "profile"},
			Endpoint:     google.Endpoint,
		},
	}
}

type credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type directAdminLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req credentials
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	user, token, err := h.auth.Register(r.Context(), req.Email, req.Password)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"user": user, "token": token})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req credentials
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	user, token, err := h.auth.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": user, "token": token})
}

func (h *Handler) GoogleStart(w http.ResponseWriter, r *http.Request) {
	state := time.Now().Format("20060102150405")
	http.Redirect(w, r, h.oauth.AuthCodeURL(state), http.StatusTemporaryRedirect)
}

func (h *Handler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		httpx.Error(w, http.StatusBadRequest, "missing code")
		return
	}
	token, err := h.oauth.Exchange(r.Context(), code)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "oauth exchange failed")
		return
	}

	ctx := context.Background()
	client := h.oauth.Client(ctx, token)
	api, err := googleoauth.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "oauth service init failed")
		return
	}
	profile, err := api.Userinfo.Get().Do()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "unable to fetch google profile")
		return
	}

	user, jwtToken, err := h.auth.LoginGoogle(r.Context(), profile.Email, profile.Id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": user, "token": jwtToken})
}

func (h *Handler) Health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) DirectAdminLogin(w http.ResponseWriter, r *http.Request) {
	var req directAdminLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	user, token, err := h.auth.LoginDirectAdmin(r.Context(), req.Username, req.Password, r.RemoteAddr)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": user, "token": token})
}

func (h *Handler) GetSettings(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	settings, err := h.auth.GetSettings(r.Context(), claims.UserID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, settings)
}

func (h *Handler) UpsertSettings(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req models.UserSettings
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	settings, err := h.auth.UpsertSettings(r.Context(), claims.UserID, req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, settings)
}

func (h *Handler) ListSSHKeys(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	keys, err := h.auth.ListSSHKeys(r.Context(), claims.UserID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, keys)
}

func (h *Handler) CreateSSHKey(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req models.SSHKey
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	key, err := h.auth.CreateSSHKey(r.Context(), claims.UserID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, key)
}

func (h *Handler) DeleteSSHKey(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	keyID := chi.URLParam(r, "keyID")
	if keyID == "" {
		httpx.Error(w, http.StatusBadRequest, "keyID is required")
		return
	}
	if err := h.auth.DeleteSSHKey(r.Context(), claims.UserID, keyID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
