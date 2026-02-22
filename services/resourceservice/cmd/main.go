package main

import (
	"context"
	"net/http"
	"time"

	"github.com/MidasWR/ShareMTC/services/resourceservice/config"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/cgroups"
	httpadapter "github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/http"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/storage"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/service"
	"github.com/MidasWR/ShareMTC/services/sdk/db"
	"github.com/MidasWR/ShareMTC/services/sdk/logging"
	"github.com/go-chi/chi/v5"
)

func main() {
	cfg := config.Load()
	logger, err := logging.New(logging.Config{
		ServiceName: "resourceservice",
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
	svc := service.NewResourceService(repo, cgroups.NewV2Applier(""))
	handler := httpadapter.NewHandler(svc)

	r := chi.NewRouter()
	r.Get("/healthz", handler.Health)
	r.Route("/v1/resources", func(api chi.Router) {
		api.Post("/heartbeat", handler.Heartbeat)
		api.Post("/allocate", handler.Allocate)
		api.Post("/release/{allocationID}", handler.Release)
		api.Get("/allocations", handler.List)
	})

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}
	logger.Info().Str("addr", server.Addr).Msg("resourceservice started")
	if err := server.ListenAndServe(); err != nil {
		logger.Fatal().Err(err).Msg("resourceservice stopped")
	}
}
