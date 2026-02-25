package main

import (
	"context"
	"errors"
	"time"

	"github.com/MidasWR/ShareMTC/services/hostagent/config"
	"github.com/MidasWR/ShareMTC/services/hostagent/internal/adapter/httpclient"
	"github.com/MidasWR/ShareMTC/services/hostagent/internal/adapter/kafka"
	"github.com/MidasWR/ShareMTC/services/hostagent/internal/models"
	"github.com/MidasWR/ShareMTC/services/hostagent/internal/service"
	"github.com/MidasWR/ShareMTC/services/sdk/logging"
)

func main() {
	cfg := config.Load()
	logger, err := logging.New(logging.Config{
		ServiceName: "hostagent",
		WriterAddr:  cfg.MidasWriterAddr,
	})
	if err != nil {
		panic(err)
	}

	var producer *kafka.Producer
	if len(cfg.KafkaBrokers) > 0 {
		producer, err = kafka.New(cfg.KafkaBrokers)
		if err != nil {
			logger.Fatal().Err(err).Msg("kafka connect failed")
		}
		defer producer.Close()
	}
	if producer == nil && cfg.ResourceAPIURL == "" {
		logger.Fatal().Err(errors.New("no output configured")).Msg("set KAFKA_BROKERS or RESOURCE_API_URL")
	}

	ticker := time.NewTicker(cfg.Interval)
	defer ticker.Stop()

	state := service.NetState{}
	logger.Info().
		Strs("brokers", cfg.KafkaBrokers).
		Str("topic", cfg.KafkaTopic).
		Str("resource_api_url", cfg.ResourceAPIURL).
		Msg("hostagent started")
	for range ticker.C {
		metric, nextState, err := service.Collect(cfg.ProviderID, state)
		if err != nil {
			logger.Error().Err(err).Msg("collect metric failed")
			continue
		}
		state = nextState
		if producer != nil {
			if err := producer.PublishMetric(context.Background(), cfg.KafkaTopic, metric); err != nil {
				logger.Error().Err(err).Msg("publish metric failed")
			}
		}
		if cfg.ResourceAPIURL != "" {
			if err := httpclient.SendHeartbeat(context.Background(), cfg.ResourceAPIURL, cfg.AgentToken, metric); err != nil {
				logger.Error().Err(err).Msg("heartbeat http failed")
			}
			logLevel := "info"
			if metric.GPUFreeUnits == 0 {
				logLevel = "warning"
			}
			logMessage := "heartbeat delivered"
			if metric.NetworkMbps == 0 {
				logLevel = "warning"
				logMessage = "network throughput is zero on heartbeat"
			}
			if err := httpclient.SendAgentLog(context.Background(), cfg.ResourceAPIURL, cfg.AgentToken, serviceLog(metric.ProviderID, logLevel, logMessage)); err != nil {
				logger.Error().Err(err).Msg("agent log http failed")
			}
		}
		logger.Info().
			Str("provider_id", metric.ProviderID).
			Int("cpu_free_cores", metric.CPUFreeCores).
			Int("ram_free_mb", metric.RAMFreeMB).
			Int("gpu_free_units", metric.GPUFreeUnits).
			Int("gpu_total_units", metric.GPUTotalUnits).
			Int("gpu_memory_total_mb", metric.GPUMemoryTotalMB).
			Int("gpu_memory_used_mb", metric.GPUMemoryUsedMB).
			Int("network_mbps", metric.NetworkMbps).
			Msg("metric sent")
	}
}

func serviceLog(providerID string, level string, message string) models.AgentLog {
	return models.AgentLog{
		ProviderID: providerID,
		Level:      level,
		Message:    message,
		Source:     "hostagent",
		CreatedAt:  time.Now().UTC(),
	}
}
