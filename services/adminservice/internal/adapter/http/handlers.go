package httpadapter

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/MidasWR/ShareMTC/services/adminservice/internal/models"
	"github.com/MidasWR/ShareMTC/services/adminservice/internal/service"
	sdkauth "github.com/MidasWR/ShareMTC/services/sdk/auth"
	"github.com/MidasWR/ShareMTC/services/sdk/httpx"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	svc               *service.ProviderService
	gitHubRepo        string
	releaseTag        string
	agentResourceURL  string
	agentKafkaBrokers string
	agentImageRepo    string
}

func NewHandler(svc *service.ProviderService, gitHubRepo string, releaseTag string, agentResourceURL string, agentKafkaBrokers string, agentImageRepo string) *Handler {
	return &Handler{
		svc:               svc,
		gitHubRepo:        strings.TrimSpace(gitHubRepo),
		releaseTag:        strings.TrimSpace(releaseTag),
		agentResourceURL:  strings.TrimSpace(agentResourceURL),
		agentKafkaBrokers: strings.TrimSpace(agentKafkaBrokers),
		agentImageRepo:    strings.TrimSpace(agentImageRepo),
	}
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

func (h *Handler) AgentInstallCommand(w http.ResponseWriter, r *http.Request) {
	claims := sdkauth.ClaimsFromContext(r.Context())
	userID := strings.TrimSpace(r.URL.Query().Get("user_id"))
	if userID == "" && claims != nil {
		userID = strings.TrimSpace(claims.UserID)
	}
	resourceURL := h.agentResourceURL
	kafkaBrokers := h.agentKafkaBrokers
	if resourceURL == "" || kafkaBrokers == "" {
		host := strings.TrimSpace(r.Header.Get("X-Forwarded-Host"))
		if host == "" {
			host = strings.TrimSpace(r.Host)
		}
		proto := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto"))
		if proto == "" {
			if r.TLS != nil {
				proto = "https"
			} else {
				proto = "http"
			}
		}
		hostname := host
		if parsedHost, _, err := net.SplitHostPort(host); err == nil {
			hostname = parsedHost
		} else if strings.Contains(host, ":") {
			hostname = strings.Split(host, ":")[0]
		}
		if resourceURL == "" && hostname != "" {
			resourceURL = fmt.Sprintf("%s://%s", proto, host)
		}
		if kafkaBrokers == "" && hostname != "" {
			kafkaBrokers = hostname + ":9092"
		}
	}
	if resourceURL == "" {
		resourceURL = "http://resourceservice"
	}
	if kafkaBrokers == "" {
		kafkaBrokers = "host-kafka-kafka-bootstrap:9092"
	}
	repo := h.gitHubRepo
	if repo == "" {
		repo = "MidasWR/ShareMTC"
	}
	releaseTag := h.releaseTag
	if releaseTag == "" {
		releaseTag = "latest"
	}
	imageRepo := h.agentImageRepo
	if imageRepo == "" {
		imageRepo = "midaswr/host-hostagent"
	}
	installerURL := buildInstallerURL(repo, releaseTag)
	if userID != "" {
		if parsed, err := url.Parse(installerURL); err == nil {
			q := parsed.Query()
			q.Set("provider_id", userID)
			parsed.RawQuery = q.Encode()
			installerURL = parsed.String()
		}
	}
	providerID := userID
	if providerID == "" {
		providerID = "local-host"
	}
	if userID != "" {
		_ = h.svc.EnsureProvider(r.Context(), userID)
	}
	installCommand := fmt.Sprintf(
		"curl -fsSL %s | sudo RESOURCE_API_URL=%s KAFKA_BROKERS=%s IMAGE_REPO=%s IMAGE_TAG=%s PROVIDER_ID=%s bash",
		shellQuote(installerURL),
		shellQuote(resourceURL),
		shellQuote(kafkaBrokers),
		shellQuote(imageRepo),
		shellQuote(releaseTag),
		shellQuote(providerID),
	)
	httpx.JSON(w, http.StatusOK, models.AgentInstallCommand{
		Command:      installCommand,
		InstallerURL: installerURL,
	})
}

func buildInstallerURL(repo string, releaseTag string) string {
	if strings.TrimSpace(releaseTag) == "" || strings.EqualFold(strings.TrimSpace(releaseTag), "latest") {
		return fmt.Sprintf("https://github.com/%s/releases/latest/download/hostagent-node-installer.sh", strings.TrimSpace(repo))
	}
	return fmt.Sprintf("https://github.com/%s/releases/download/%s/hostagent-node-installer.sh", strings.TrimSpace(repo), strings.TrimSpace(releaseTag))
}

func shellQuote(value string) string {
	escaped := strings.ReplaceAll(value, "'", `'"'"'`)
	return "'" + escaped + "'"
}

func (h *Handler) PodProxyInfo(w http.ResponseWriter, r *http.Request) {
	podID := chi.URLParam(r, "podID")
	if strings.TrimSpace(podID) == "" {
		httpx.Error(w, http.StatusBadRequest, "podID is required")
		return
	}
	items, err := h.svc.ListPodCatalog(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	for _, item := range items {
		if item.ID == podID {
			httpx.JSON(w, http.StatusOK, map[string]string{
				"pod_id":       item.ID,
				"route_target": item.RouteTarget,
				"host_ip":      item.HostIP,
				"ssh_user":     item.SSHUser,
			})
			return
		}
	}
	httpx.Error(w, http.StatusNotFound, "pod not found")
}

func (h *Handler) PodProxy(w http.ResponseWriter, r *http.Request) {
	podID := chi.URLParam(r, "podID")
	if strings.TrimSpace(podID) == "" {
		httpx.Error(w, http.StatusBadRequest, "podID is required")
		return
	}
	items, err := h.svc.ListPodCatalog(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	for _, item := range items {
		if item.ID != podID {
			continue
		}
		if strings.TrimSpace(item.RouteTarget) == "" {
			httpx.Error(w, http.StatusBadRequest, "route target is not configured for pod")
			return
		}
		target, err := url.Parse(item.RouteTarget)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid route target")
			return
		}
		proxy := httputil.NewSingleHostReverseProxy(target)
		r.URL.Path = strings.TrimPrefix(r.URL.Path, "/v1/admin/pods/"+podID+"/proxy")
		if r.URL.Path == "" {
			r.URL.Path = "/"
		}
		proxy.ServeHTTP(w, r)
		return
	}
	httpx.Error(w, http.StatusNotFound, "pod not found")
}
