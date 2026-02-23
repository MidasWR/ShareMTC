package main

import (
	"context"
	"net/http"
	"time"

	"github.com/MidasWR/ShareMTC/services/billingservice/config"
	httpadapter "github.com/MidasWR/ShareMTC/services/billingservice/internal/adapter/http"
	"github.com/MidasWR/ShareMTC/services/billingservice/internal/adapter/storage"
	"github.com/MidasWR/ShareMTC/services/billingservice/internal/service"
	sdkauth "github.com/MidasWR/ShareMTC/services/sdk/auth"
	"github.com/MidasWR/ShareMTC/services/sdk/db"
	"github.com/MidasWR/ShareMTC/services/sdk/logging"
	"github.com/go-chi/chi/v5"
)

func main() {
	cfg := config.Load()
	logger, err := logging.New(logging.Config{
		ServiceName: "billingservice",
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
	svc := service.New(repo)
	handler := httpadapter.NewHandler(svc)

	r := chi.NewRouter()
	r.Get("/healthz", handler.Health)
	r.Route("/v1/billing", func(api chi.Router) {
		api.Use(sdkauth.RequireAuth(cfg.JWTSecret))
		api.Post("/plans", handler.CreatePlan)
		api.Post("/usage", handler.ProcessUsage)
		api.Get("/accruals", handler.ListAccruals)
		api.Group(func(admin chi.Router) {
			admin.Use(sdkauth.RequireAnyRole("admin", "super-admin", "ops-admin"))
			admin.Get("/admin/accruals", handler.ListAllAccruals)
			admin.Get("/admin/stats", handler.Stats)
		})
	})

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}
	logger.Info().Str("addr", server.Addr).Msg("billingservice started")
	if err := server.ListenAndServe(); err != nil {
		logger.Fatal().Err(err).Msg("billingservice stopped")
	}
}
