package main

import (
	"context"
	"net/http"
	"time"

	"github.com/MidasWR/ShareMTC/services/provisioningservice/config"
	httpadapter "github.com/MidasWR/ShareMTC/services/provisioningservice/internal/adapter/http"
	"github.com/MidasWR/ShareMTC/services/provisioningservice/internal/adapter/providers/digitalocean"
	"github.com/MidasWR/ShareMTC/services/provisioningservice/internal/adapter/providers/runpod"
	"github.com/MidasWR/ShareMTC/services/provisioningservice/internal/adapter/storage"
	"github.com/MidasWR/ShareMTC/services/provisioningservice/internal/service"
	"github.com/MidasWR/ShareMTC/services/sdk/db"
	"github.com/MidasWR/ShareMTC/services/sdk/logging"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"
)

func main() {
	cfg := config.Load()
	logger, err := logging.New(logging.Config{
		ServiceName: "provisioningservice",
		WriterAddr:  cfg.MidasWriterAddr,
	})
	if err != nil {
		panic(err)
	}
	logger.Info().
		Str("port", cfg.Port).
		Str("do_base_url", cfg.DigitalOceanBaseURL).
		Str("runpod_base_url", cfg.RunPodBaseURL).
		Dur("http_client_timeout", cfg.HTTPClientTimeout).
		Dur("ttl_worker_interval", cfg.TTLWorkerInterval).
		Int("max_delete_retry", cfg.MaxDeleteRetry).
		Msg("provisioningservice configuration loaded")
	pool, err := db.Connect(context.Background(), cfg.PostgresDSN)
	if err != nil {
		logger.Fatal().Err(err).Msg("postgres connect failed")
	}
	defer pool.Close()

	repo := storage.NewRepo(pool)
	logger.Info().Msg("provisioning repository initialized")
	if err := repo.Migrate(context.Background()); err != nil {
		logger.Fatal().Err(err).Msg("migration failed")
	}
	logger.Info().Msg("provisioning database migrations applied")

	doProvider := digitalocean.NewClient(cfg.DigitalOceanBaseURL, cfg.DigitalOceanToken, cfg.HTTPClientTimeout)
	rpProvider := runpod.NewClient(cfg.RunPodBaseURL, cfg.RunPodAPIKey, cfg.HTTPClientTimeout)
	logger.Info().Msg("provider clients initialized")
	svc := service.NewProvisioningService(repo, doProvider, rpProvider, cfg.MaxDeleteRetry)
	logger.Info().Msg("provisioning service initialized")
	handler := httpadapter.NewHandler(svc, cfg.ServiceToken)
	logger.Info().Msg("provisioning http handler initialized")

	go runTTLWorker(logger, svc, cfg.TTLWorkerInterval)
	logger.Info().Msg("provisioning ttl worker started")

	r := chi.NewRouter()
	r.Get("/healthz", handler.Health)
	r.Route("/v1/provisioning", func(api chi.Router) {
		api.Use(handler.ServiceAuth)
		api.Post("/vm", handler.CreateVM)
		api.Delete("/vm/{id}", handler.DeleteVM)
		api.Post("/pod", handler.CreatePod)
		api.Delete("/pod/{id}", handler.DeletePod)
		api.Get("/jobs/{jobID}", handler.GetJob)
	})

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}
	logger.Info().Str("addr", server.Addr).Msg("provisioningservice started")
	if err := server.ListenAndServe(); err != nil {
		logger.Fatal().Err(err).Msg("provisioningservice stopped")
	}
}

func runTTLWorker(logger zerolog.Logger, svc *service.ProvisioningService, interval time.Duration) {
	if interval <= 0 {
		interval = 15 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	logger.Debug().Dur("interval", interval).Msg("ttl worker ticker initialized")
	for {
		if err := svc.RunTTLPass(context.Background()); err != nil {
			logger.Error().Err(err).Msg("ttl worker pass failed")
		}
		<-ticker.C
	}
}
