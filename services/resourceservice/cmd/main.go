package main

import (
	"context"
	"net/http"
	"time"

	"github.com/MidasWR/ShareMTC/services/resourceservice/config"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/cgroups"
	httpadapter "github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/http"
	kafkaadapter "github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/kafka"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/orchestrator"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/provisioning"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/adapter/storage"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/models"
	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/service"
	sdkauth "github.com/MidasWR/ShareMTC/services/sdk/auth"
	"github.com/MidasWR/ShareMTC/services/sdk/db"
	"github.com/MidasWR/ShareMTC/services/sdk/logging"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"
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
	provisioningClient := provisioning.NewClient(cfg.ProvisioningURL, cfg.ProvisioningServiceToken, cfg.ProvisioningHTTPTimeout)
	svc := service.NewResourceService(
		repo,
		cgroups.NewV2Applier(""),
		orchestrator.NewInternalRuntime(),
		provisioningClient,
		cfg.HeartbeatMaxAge,
		cfg.CreateRateLimitRPM,
		time.Duration(cfg.VMTTLMinutes)*time.Minute,
		cfg.VMDaemonDownloadURL,
		joinCSV(cfg.KafkaBrokers),
		cfg.VMDaemonKafkaTopic,
	)
	go runExpiryWorker(logger, svc)
	if len(cfg.KafkaBrokers) > 0 {
		consumer := kafkaadapter.NewConsumer(cfg.KafkaBrokers, cfg.VMDaemonKafkaTopic, cfg.VMDaemonKafkaGroup, kafkaIngestHandler(svc))
		go func() {
			if err := consumer.Run(context.Background()); err != nil {
				logger.Error().Err(err).Msg("vmdaemon kafka consumer stopped")
			}
		}()
	}
	handler := httpadapter.NewHandler(svc)

	r := chi.NewRouter()
	r.Get("/healthz", handler.Health)
	r.Route("/v1/resources", func(api chi.Router) {
		api.Use(sdkauth.RequireAuth(cfg.JWTSecret))
		api.Post("/heartbeat", handler.Heartbeat)
		api.Post("/health-checks", handler.RecordHealthCheck)
		api.Post("/metrics", handler.RecordMetric)
		api.Post("/agent-logs", handler.RecordAgentLog)
		api.Post("/root-input-logs", handler.RecordRootInputLog)
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
		api.Post("/pods", handler.CreatePod)
		api.Get("/pods", handler.ListPods)
		api.Get("/pods/{podID}", handler.GetPod)
		api.Post("/pods/{podID}/terminate", handler.TerminatePod)
		api.Post("/shared/vms", handler.ShareVM)
		api.Get("/shared/vms", handler.ListSharedVMs)
		api.Post("/shared/pods", handler.SharePod)
		api.Get("/shared/pods", handler.ListSharedPods)
		api.Post("/shared/offers", handler.UpsertSharedInventoryOffer)
		api.Get("/shared/offers", handler.ListSharedInventoryOffers)
		api.Post("/shared/offers/reserve", handler.ReserveSharedInventoryOffer)
		api.Get("/health-checks", handler.ListHealthChecks)
		api.Get("/metrics", handler.ListMetrics)
		api.Get("/metrics/summary", handler.MetricSummaries)
		api.Get("/agent-logs", handler.ListAgentLogs)
		api.Get("/root-input-logs", handler.ListRootInputLogs)
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

func runExpiryWorker(logger zerolog.Logger, svc *service.ResourceService) {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		if err := svc.ExpireResources(context.Background(), time.Now().UTC()); err != nil {
			logger.Error().Err(err).Msg("resource expiry pass failed")
		}
		<-ticker.C
	}
}

func kafkaIngestHandler(svc *service.ResourceService) func(context.Context, kafkaadapter.Event) error {
	return func(ctx context.Context, event kafkaadapter.Event) error {
		switch event.EventType {
		case "health_check":
			return handleHealthCheckEvent(ctx, svc, event)
		case "metric":
			return handleMetricEvent(ctx, svc, event)
		case "agent_log":
			return handleAgentLogEvent(ctx, svc, event)
		case "root_input_log":
			return handleRootInputLogEvent(ctx, svc, event)
		default:
			return nil
		}
	}
}

func handleHealthCheckEvent(ctx context.Context, svc *service.ResourceService, event kafkaadapter.Event) error {
	item := models.HealthCheck{
		ResourceType: "vm",
		ResourceID:   event.ResourceID,
		CheckType:    getString(event.Payload, "check_type", "daemon_heartbeat"),
		Status:       models.HealthStatus(getString(event.Payload, "status", "ok")),
		Details:      getString(event.Payload, "details", ""),
		CheckedAt:    event.OccurredAt,
	}
	_, err := svc.RecordHealthCheck(ctx, item)
	return err
}

func handleMetricEvent(ctx context.Context, svc *service.ResourceService, event kafkaadapter.Event) error {
	item := models.MetricPoint{
		ResourceType: "vm",
		ResourceID:   event.ResourceID,
		MetricType:   getString(event.Payload, "metric_type", "unknown"),
		Value:        getFloat(event.Payload, "value", 0),
		CapturedAt:   event.OccurredAt,
	}
	_, err := svc.RecordMetric(ctx, item)
	return err
}

func handleAgentLogEvent(ctx context.Context, svc *service.ResourceService, event kafkaadapter.Event) error {
	item := models.AgentLog{
		ProviderID: event.ProviderID,
		ResourceID: event.ResourceID,
		Level:      models.AgentLogLevel(getString(event.Payload, "level", "info")),
		Message:    getString(event.Payload, "message", "vmdaemon event"),
		Source:     getString(event.Payload, "source", "vmdaemon"),
	}
	_, err := svc.RecordAgentLog(ctx, item)
	return err
}

func handleRootInputLogEvent(ctx context.Context, svc *service.ResourceService, event kafkaadapter.Event) error {
	item := models.RootInputLog{
		ProviderID: event.ProviderID,
		ResourceID: event.ResourceID,
		Username:   getString(event.Payload, "username", "root"),
		TTY:        getString(event.Payload, "tty", ""),
		Command:    getString(event.Payload, "command", ""),
		Source:     getString(event.Payload, "source", "auditd"),
		ExecutedAt: event.OccurredAt,
	}
	_, err := svc.RecordRootInputLog(ctx, item)
	return err
}

func getString(payload map[string]interface{}, key string, fallback string) string {
	value, ok := payload[key]
	if !ok {
		return fallback
	}
	asString, ok := value.(string)
	if !ok || asString == "" {
		return fallback
	}
	return asString
}

func getFloat(payload map[string]interface{}, key string, fallback float64) float64 {
	value, ok := payload[key]
	if !ok {
		return fallback
	}
	switch typed := value.(type) {
	case float64:
		return typed
	case float32:
		return float64(typed)
	case int:
		return float64(typed)
	default:
		return fallback
	}
}

func joinCSV(items []string) string {
	if len(items) == 0 {
		return ""
	}
	value := items[0]
	for i := 1; i < len(items); i++ {
		value += "," + items[i]
	}
	return value
}
