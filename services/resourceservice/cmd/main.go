package main

import (
	"context"
	"net/http"
	"time"

	"github.com/MidasWR/ShareMTC/services/resourceservice/config"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/cgroups"
	httpadapter "github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/http"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/orchestrator"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/storage"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/service"
	sdkauth "github.com/MidasWR/ShareMTC/services/sdk/auth"
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
	// MVP runtime: control-plane telemetry and lifecycle orchestration, not secure sandbox execution.
	svc := service.NewResourceService(repo, cgroups.NewV2Applier(""), orchestrator.NewInternalRuntime(), cfg.HeartbeatMaxAge)
	handler := httpadapter.NewHandler(svc)

	r := chi.NewRouter()
	r.Get("/healthz", handler.Health)
	r.Route("/v1/resources", func(api chi.Router) {
		api.Use(sdkauth.RequireAuth(cfg.JWTSecret))
		api.Post("/heartbeat", handler.Heartbeat)
		api.Post("/allocate", handler.Allocate)
		api.Post("/release/{allocationID}", handler.Release)
		api.Get("/allocations", handler.List)
		api.Post("/vm-templates", handler.UpsertVMTemplate)
		api.Get("/vm-templates", handler.ListVMTemplates)
		api.Post("/vms", handler.CreateVM)
		api.Get("/vms", handler.ListVMs)
		api.Get("/vms/{vmID}", handler.GetVM)
		api.Post("/vms/{vmID}/start", handler.StartVM)
		api.Post("/vms/{vmID}/stop", handler.StopVM)
		api.Post("/vms/{vmID}/reboot", handler.RebootVM)
		api.Post("/vms/{vmID}/terminate", handler.TerminateVM)
		api.Post("/shared/vms", handler.ShareVM)
		api.Get("/shared/vms", handler.ListSharedVMs)
		api.Post("/shared/pods", handler.SharePod)
		api.Get("/shared/pods", handler.ListSharedPods)
		api.Post("/shared/offers", handler.UpsertSharedInventoryOffer)
		api.Get("/shared/offers", handler.ListSharedInventoryOffers)
		api.Post("/shared/offers/reserve", handler.ReserveSharedInventoryOffer)
		api.Post("/health-checks", handler.RecordHealthCheck)
		api.Get("/health-checks", handler.ListHealthChecks)
		api.Post("/metrics", handler.RecordMetric)
		api.Get("/metrics", handler.ListMetrics)
		api.Get("/metrics/summary", handler.MetricSummaries)
		api.Post("/agent-logs", handler.RecordAgentLog)
		api.Get("/agent-logs", handler.ListAgentLogs)
		api.Post("/k8s/clusters", handler.CreateKubernetesCluster)
		api.Get("/k8s/clusters", handler.ListKubernetesClusters)
		api.Post("/k8s/clusters/{clusterID}/refresh", handler.RefreshKubernetesCluster)
		api.Delete("/k8s/clusters/{clusterID}", handler.DeleteKubernetesCluster)
		api.Group(func(admin chi.Router) {
			admin.Use(sdkauth.RequireAnyRole("admin", "super-admin", "ops-admin"))
			admin.Get("/admin/allocations", handler.ListAll)
			admin.Get("/admin/stats", handler.Stats)
		})
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
