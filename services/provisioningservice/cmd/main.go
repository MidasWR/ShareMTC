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
	pool, err := db.Connect(context.Background(), cfg.PostgresDSN)
	if err != nil {
		logger.Fatal().Err(err).Msg("postgres connect failed")
	}
	defer pool.Close()

	repo := storage.NewRepo(pool)
	if err := repo.Migrate(context.Background()); err != nil {
		logger.Fatal().Err(err).Msg("migration failed")
	}

	doProvider := digitalocean.NewClient(cfg.DigitalOceanBaseURL, cfg.DigitalOceanToken, cfg.HTTPClientTimeout)
	rpProvider := runpod.NewClient(cfg.RunPodBaseURL, cfg.RunPodAPIKey, cfg.HTTPClientTimeout)
	svc := service.NewProvisioningService(repo, doProvider, rpProvider, cfg.MaxDeleteRetry)
	handler := httpadapter.NewHandler(svc, cfg.ServiceToken)

	go runTTLWorker(logger, svc, cfg.TTLWorkerInterval)

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
	for {
		if err := svc.RunTTLPass(context.Background()); err != nil {
			logger.Error().Err(err).Msg("ttl worker pass failed")
		}
		<-ticker.C
	}
}
