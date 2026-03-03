package main

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/MidasWR/ShareMTC/services/adminservice/config"
	httpadapter "github.com/MidasWR/ShareMTC/services/adminservice/internal/adapter/http"
	"github.com/MidasWR/ShareMTC/services/adminservice/internal/adapter/storage"
	"github.com/MidasWR/ShareMTC/services/adminservice/internal/service"
	sdkauth "github.com/MidasWR/ShareMTC/services/sdk/auth"
	"github.com/MidasWR/ShareMTC/services/sdk/db"
	"github.com/MidasWR/ShareMTC/services/sdk/httpx"
	"github.com/MidasWR/ShareMTC/services/sdk/logging"
	"github.com/go-chi/chi/v5"
)

func main() {
	cfg := config.Load()
	loggerConfig := logging.Config{
		ServiceName: "adminservice",
		WriterAddr:  cfg.MidasWriterAddr,
	}
	logger, err := logging.New(logging.Config{
		ServiceName: loggerConfig.ServiceName,
		WriterAddr:  loggerConfig.WriterAddr,
	})
	if err != nil {
		_, _ = os.Stdout.WriteString("adminservice logger init failed: " + err.Error() + "\n")
		os.Exit(1)
	}
	logger.Info().
		Str("port", cfg.Port).
		Bool("synthetic_catalog_seed", cfg.EnableSyntheticCatalogSeed).
		Str("github_repo", cfg.GitHubRepo).
		Str("release_tag", cfg.ReleaseTag).
		Msg("adminservice configuration loaded")
	pool, err := db.Connect(context.Background(), cfg.PostgresDSN)
	if err != nil {
		logger.Fatal().Err(err).Msg("postgres connection failed")
	}
	defer pool.Close()

	repo := storage.NewProviderRepo(pool, cfg.EnableSyntheticCatalogSeed)
	logger.Info().Msg("provider repository initialized")
	if err := repo.Migrate(context.Background()); err != nil {
		logger.Fatal().Err(err).Msg("migration failed")
	}
	logger.Info().Msg("database migrations applied")

	svc := service.NewProviderService(repo)
	logger.Info().Msg("provider service initialized")
	handler := httpadapter.NewHandler(svc, cfg.GitHubRepo, cfg.ReleaseTag, cfg.AgentResourceURL, cfg.AgentKafkaBrokers, cfg.AgentImageRepo)
	logger.Info().Msg("http handler initialized")
	r := chi.NewRouter()
	r.Use(httpx.RequestLogger(logger))
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
