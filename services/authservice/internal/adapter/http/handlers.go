package httpadapter

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"
	"strings"
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
	auth             *service.AuthService
	log              zerolog.Logger
	oauth            *oauth2.Config
	frontendBaseURL  string
	oauthStateSecret string
}

func NewHandler(auth *service.AuthService, logger zerolog.Logger, googleClientID string, googleSecret string, redirectURL string, frontendBaseURL string, oauthStateSecret string) *Handler {
	return &Handler{
		auth:             auth,
		log:              logger,
		frontendBaseURL:  strings.TrimRight(frontendBaseURL, "/"),
		oauthStateSecret: oauthStateSecret,
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
	state, err := h.buildOAuthState()
	if err != nil {
		h.log.Error().Err(err).Msg("failed to generate oauth state")
		httpx.Error(w, http.StatusInternalServerError, "failed to start oauth")
		return
	}
	http.Redirect(w, r, h.oauth.AuthCodeURL(state), http.StatusTemporaryRedirect)
}

func (h *Handler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	if oauthErr := r.URL.Query().Get("error"); oauthErr != "" {
		http.Redirect(w, r, h.buildFrontendRedirect("", "", "myCompute", "OAuth access was denied"), http.StatusTemporaryRedirect)
		return
	}
	state := r.URL.Query().Get("state")
	if !h.validateOAuthState(state) {
		http.Redirect(w, r, h.buildFrontendRedirect("", "", "myCompute", "Invalid OAuth state"), http.StatusTemporaryRedirect)
		return
	}
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Redirect(w, r, h.buildFrontendRedirect("", "", "myCompute", "Missing OAuth code"), http.StatusTemporaryRedirect)
		return
	}
	token, err := h.oauth.Exchange(r.Context(), code)
	if err != nil {
		http.Redirect(w, r, h.buildFrontendRedirect("", "", "myCompute", "OAuth exchange failed"), http.StatusTemporaryRedirect)
		return
	}

	ctx := context.Background()
	client := h.oauth.Client(ctx, token)
	api, err := googleoauth.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		http.Redirect(w, r, h.buildFrontendRedirect("", "", "myCompute", "OAuth service init failed"), http.StatusTemporaryRedirect)
		return
	}
	profile, err := api.Userinfo.Get().Do()
	if err != nil {
		http.Redirect(w, r, h.buildFrontendRedirect("", "", "myCompute", "Unable to fetch Google profile"), http.StatusTemporaryRedirect)
		return
	}

	user, jwtToken, err := h.auth.LoginGoogle(r.Context(), profile.Email, profile.Id)
	if err != nil {
		http.Redirect(w, r, h.buildFrontendRedirect("", "", "myCompute", err.Error()), http.StatusTemporaryRedirect)
		return
	}
	encodedUser, err := json.Marshal(user)
	if err != nil {
		http.Redirect(w, r, h.buildFrontendRedirect("", "", "myCompute", "Failed to encode user payload"), http.StatusTemporaryRedirect)
		return
	}
	userPayload := base64.RawURLEncoding.EncodeToString(encodedUser)
	section := "myCompute"
	if strings.EqualFold(user.Role, "admin") || strings.EqualFold(user.Role, "super-admin") || strings.EqualFold(user.Role, "ops-admin") {
		section = "admin"
	}
	http.Redirect(w, r, h.buildFrontendRedirect(jwtToken, userPayload, section, ""), http.StatusTemporaryRedirect)
}

func (h *Handler) buildOAuthState() (string, error) {
	nonce := make([]byte, 16)
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	noncePart := base64.RawURLEncoding.EncodeToString(nonce)
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	payload := timestamp + "." + noncePart
	mac := hmac.New(sha256.New, []byte(h.oauthStateSecret))
	if _, err := mac.Write([]byte(payload)); err != nil {
		return "", err
	}
	signature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return payload + "." + signature, nil
}

func (h *Handler) validateOAuthState(state string) bool {
	parts := strings.Split(state, ".")
	if len(parts) != 3 {
		return false
	}
	payload := parts[0] + "." + parts[1]
	mac := hmac.New(sha256.New, []byte(h.oauthStateSecret))
	if _, err := mac.Write([]byte(payload)); err != nil {
		return false
	}
	expected := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(parts[2])) {
		return false
	}
	ts, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return false
	}
	issuedAt := time.Unix(ts, 0)
	age := time.Since(issuedAt)
	return age >= 0 && age <= 10*time.Minute
}

func (h *Handler) buildFrontendRedirect(token string, user string, section string, authError string) string {
	baseURL := h.frontendBaseURL
	if baseURL == "" {
		baseURL = "/"
	}
	redirectURL, err := url.Parse(baseURL)
	if err != nil {
		redirectURL = &url.URL{Path: "/"}
	}
	query := redirectURL.Query()
	if section == "" {
		section = "myCompute"
	}
	query.Set("section", section)
	redirectURL.RawQuery = query.Encode()

	fragment := url.Values{}
	if token != "" {
		fragment.Set("token", token)
	}
	if user != "" {
		fragment.Set("user", user)
	}
	if authError != "" {
		fragment.Set("auth_error", authError)
	}
	redirectURL.Fragment = fragment.Encode()
	return redirectURL.String()
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
