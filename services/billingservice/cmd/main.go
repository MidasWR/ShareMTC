package main

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/MidasWR/ShareMTC/services/billingservice/config"
	httpadapter "github.com/MidasWR/ShareMTC/services/billingservice/internal/adapter/http"
	"github.com/MidasWR/ShareMTC/services/billingservice/internal/adapter/storage"
	"github.com/MidasWR/ShareMTC/services/billingservice/internal/service"
	sdkauth "github.com/MidasWR/ShareMTC/services/sdk/auth"
	"github.com/MidasWR/ShareMTC/services/sdk/db"
	"github.com/MidasWR/ShareMTC/services/sdk/httpx"
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
		_, _ = os.Stdout.WriteString("billingservice logger init failed: " + err.Error() + "\n")
		os.Exit(1)
	}
	logger.Info().
		Str("port", cfg.Port).
		Msg("billingservice configuration loaded")

	pool, err := db.Connect(context.Background(), cfg.PostgresDSN)
	if err != nil {
		logger.Fatal().Err(err).Msg("postgres connect failed")
	}
	defer pool.Close()

	repo := storage.NewRepo(pool)
	logger.Info().Msg("billing repository initialized")
	if err := repo.Migrate(context.Background()); err != nil {
		logger.Fatal().Err(err).Msg("migration failed")
	}
	logger.Info().Msg("billing database migrations applied")
	svc := service.New(repo)
	logger.Info().Msg("billing service initialized")
	handler := httpadapter.NewHandler(svc)
	logger.Info().Msg("billing http handler initialized")

	r := chi.NewRouter()
	r.Use(httpx.RequestLogger(logger))
	r.Get("/healthz", handler.Health)
	r.Route("/v1/billing", func(api chi.Router) {
		api.Use(sdkauth.RequireAuth(cfg.JWTSecret))
		api.Post("/plans", handler.CreatePlan)
		api.Post("/usage", handler.ProcessUsage)
		api.Get("/accruals", handler.ListAccruals)
		api.Get("/rental/plans", handler.ListRentalPlans)
		api.Post("/rental/estimate", handler.EstimateServerOrder)
		api.Post("/rental/orders", handler.CreateServerOrder)
		api.Get("/rental/orders", handler.ListServerOrders)
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
