package main

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/MidasWR/ShareMTC/services/adminservice/config"
	httpadapter "github.com/MidasWR/ShareMTC/services/adminservice/internal/adapter/http"
	"github.com/MidasWR/ShareMTC/services/adminservice/internal/adapter/storage"
	"github.com/MidasWR/ShareMTC/services/adminservice/internal/service"
	sdkauth "github.com/MidasWR/ShareMTC/services/sdk/auth"
	"github.com/MidasWR/ShareMTC/services/sdk/db"
	"github.com/MidasWR/ShareMTC/services/sdk/logging"
	"github.com/go-chi/chi/v5"
)

func main() {
	cfg := config.Load()
	logger, err := logging.New(logging.Config{
		ServiceName: "adminservice",
		WriterAddr:  cfg.MidasWriterAddr,
	})
	if err != nil {
		panic(err)
	}
	pool, err := db.Connect(context.Background(), cfg.PostgresDSN)
	if err != nil {
		logger.Fatal().Err(err).Msg("postgres connection failed")
	}
	defer pool.Close()

	repo := storage.NewProviderRepo(pool)
	if err := repo.Migrate(context.Background()); err != nil {
		logger.Fatal().Err(err).Msg("migration failed")
	}

	svc := service.NewProviderService(repo)
	installCommand := fmt.Sprintf(
		"curl -fsSL https://raw.githubusercontent.com/%s/%s/installer/hostagent-node-installer.sh | sudo RESOURCE_API_URL=%s KAFKA_BROKERS=%s IMAGE_REPO=%s IMAGE_TAG=%s bash",
		cfg.GitHubRepo,
		cfg.ReleaseTag,
		cfg.AgentResourceURL,
		cfg.AgentKafkaBrokers,
		cfg.AgentImageRepo,
		cfg.ReleaseTag,
	)
	handler := httpadapter.NewHandler(svc, installCommand)
	r := chi.NewRouter()
	r.Get("/healthz", handler.Health)
	r.Route("/v1/catalog", func(api chi.Router) {
		api.Get("/pods", handler.ListPodCatalog)
		api.Get("/templates", handler.ListPodTemplates)
	})
	r.Route("/v1/admin", func(api chi.Router) {
		api.Use(sdkauth.RequireAuth(cfg.JWTSecret))
		api.Use(sdkauth.RequireAnyRole("admin", "super-admin", "ops-admin"))
		api.Get("/stats", handler.Stats)
		api.Get("/agent/install-command", handler.AgentInstallCommand)
		api.Route("/providers", func(providers chi.Router) {
			providers.Post("/", handler.CreateProvider)
			providers.Get("/", handler.ListProviders)
			providers.Get("/{providerID}", handler.GetProvider)
			providers.Get("/{providerID}/metrics", handler.ProviderMetrics)
		})
		api.Route("/pods", func(pods chi.Router) {
			pods.Post("/", handler.UpsertPodCatalog)
			pods.Delete("/{podID}", handler.DeletePodCatalog)
			pods.Get("/{podID}/proxy-info", handler.PodProxyInfo)
			pods.Handle("/{podID}/proxy/*", http.HandlerFunc(handler.PodProxy))
		})
		api.Route("/templates", func(templates chi.Router) {
			templates.Post("/", handler.UpsertPodTemplate)
			templates.Delete("/{templateID}", handler.DeletePodTemplate)
		})
	})

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}
	logger.Info().Str("addr", server.Addr).Msg("adminservice started")
	if err := server.ListenAndServe(); err != nil {
		logger.Fatal().Err(err).Msg("adminservice stopped")
	}
}
