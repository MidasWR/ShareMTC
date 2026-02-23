package main

import (
	"context"
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
	handler := httpadapter.NewHandler(svc)
	r := chi.NewRouter()
	r.Get("/healthz", handler.Health)
	r.Route("/v1/admin", func(api chi.Router) {
		api.Use(sdkauth.RequireAuth(cfg.JWTSecret))
		api.Use(sdkauth.RequireAnyRole("admin", "super-admin", "ops-admin"))
		api.Get("/stats", handler.Stats)
		api.Route("/providers", func(providers chi.Router) {
			providers.Post("/", handler.CreateProvider)
			providers.Get("/", handler.ListProviders)
			providers.Get("/{providerID}", handler.GetProvider)
			providers.Get("/{providerID}/metrics", handler.ProviderMetrics)
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
